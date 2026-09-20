import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";

export function FirstRunSetup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    business_name: "",
    address: "",
    phone: "",
    email: "",
    language: "en",
    currency: "LKR",
    timezone: "Asia/Colombo",
    admin_username: "admin",
    admin_password: "",
    confirm_password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.admin_password !== formData.confirm_password) {
      setError("Passwords do not match");
      return;
    }

    if (formData.admin_password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      await invoke("setup_first_run", { payload: formData });
      navigate("/login");
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Welcome to IR POS</h1>
          <p className="text-gray-600 mt-2">Let's set up your business profile to get started.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Business Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Business Name</label>
                <input required type="text" name="business_name" value={formData.business_name} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <input type="text" name="address" value={formData.address} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">System & Admin</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Default Language</label>
                <select name="language" value={formData.language} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border">
                  <option value="en">English</option>
                  <option value="si">Sinhala (සිංහල)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Admin Username</label>
                <input required type="text" name="admin_username" value={formData.admin_username} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Admin Password</label>
                <input required type="password" name="admin_password" value={formData.admin_password} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                <input required type="password" name="confirm_password" value={formData.confirm_password} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? "Initializing System..." : "Complete Setup"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
