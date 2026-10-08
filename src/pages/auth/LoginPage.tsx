import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { useAuthStore } from "../../features/auth/auth.store";
import { useTranslation } from "react-i18next";
import { Store } from "lucide-react";

export function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { t, i18n } = useTranslation();
  
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

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
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
          <p className="text-blue-100 mt-1">{t('signInToContinue')}</p>
        </div>
        
        <div className="p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('username')}</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder={t('enterUsername')}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('password')}</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder={t('enterPassword')}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? t('authenticating') : t('loginButton')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <select
              value={i18n.language}
              onChange={handleLanguageChange}
              className="text-sm font-medium border border-gray-300 rounded-md px-2 py-1 outline-none cursor-pointer bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <option value="en">English</option>
              <option value="si">සිංහල</option>
              <option value="ta">தமிழ்</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
