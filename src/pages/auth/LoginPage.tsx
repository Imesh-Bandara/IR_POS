import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { useAuthStore } from "../../features/auth/auth.store";
import { useTranslation } from "react-i18next";
import { Store } from "lucide-react";

export function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { i18n } = useTranslation();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if first run on mount
  useEffect(() => {
    async function checkSetup() {
      try {
        const isFirstRun: boolean = await invoke("check_is_first_run");
        if (isFirstRun) {
          navigate("/setup");
        }
      } catch (err) {
        console.error("Failed to check first run status:", err);
      }
    }
    checkSetup();
  }, [navigate]);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'si' : 'en');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response: any = await invoke("login", { username, password });
      setAuth(response.token, response.user, response.permissions);
      navigate("/");
    } catch (err: any) {
      setError(typeof err === 'string' ? err : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-blue-600 p-8 text-center">
          <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Store className="text-white" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white">IR POS SYSTEM</h2>
          <p className="text-blue-100 mt-1">Sign in to continue</p>
        </div>
        
        <div className="p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="Enter username"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="Enter password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "LOGIN"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={toggleLanguage} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
              {i18n.language === 'en' ? 'සිංහල භාෂාවට මාරු වන්න' : 'Switch to English'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
