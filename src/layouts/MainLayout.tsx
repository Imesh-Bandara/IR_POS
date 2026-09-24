import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, ShoppingCart, Package, Users, Settings, LogOut, ClipboardList, Monitor, Truck, FileText, Receipt, BarChart2, Database, Printer } from "lucide-react";
import { useAuthStore } from "../features/auth/auth.store";
import { invoke } from "@tauri-apps/api/core";

export function MainLayout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, clearAuth, hasPermission } = useAuthStore();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'si' : 'en';
    i18n.changeLanguage(newLang);
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await invoke("logout", { token });
      } catch (e) {
        console.error("Logout error", e);
      }
    }
    clearAuth();
    navigate("/login");
  };

  const isActive = (path: string) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(path);
  };

  const getLinkClass = (path: string) => {
    return `flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors ${
      isActive(path) 
        ? "text-blue-600 bg-blue-50" 
        : "text-gray-700 hover:bg-gray-50"
    }`;
  };

  const getPosLinkClass = (path: string) => {
    return `flex items-center space-x-3 px-4 py-3 rounded-lg font-bold transition-colors ${
      isActive(path)
        ? "text-white bg-blue-700"
        : "text-white bg-blue-600 hover:bg-blue-700"
    }`;
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center justify-center border-b border-gray-200">
          <h1 className="text-xl font-bold text-blue-600">IR POS</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {hasPermission("dashboard.view") && (
            <Link to="/" className={getLinkClass("/")}>
              <LayoutDashboard size={20} />
              <span>{t('dashboard')}</span>
            </Link>
          )}
          {hasPermission("sales.view") && (
            <Link to="/sales" className={getLinkClass("/sales")}>
              <ShoppingCart size={20} />
              <span>{t('sales')}</span>
            </Link>
          )}
          {hasPermission("sales.create") && (
            <Link to="/pos" className={getPosLinkClass("/pos")}>
              <Monitor size={20} />
              <span>POS / Billing</span>
            </Link>
          )}
          {hasPermission("products.view") && (
            <Link to="/products" className={getLinkClass("/products")}>
              <Package size={20} />
              <span>{t('products')}</span>
            </Link>
          )}
          {hasPermission("inventory.view") && (
            <Link to="/inventory" className={getLinkClass("/inventory")}>
              <ClipboardList size={20} />
              <span>Inventory</span>
            </Link>
          )}
          {hasPermission("suppliers.view") && (
            <Link to="/suppliers" className={getLinkClass("/suppliers")}>
              <Truck size={20} />
              <span>Suppliers</span>
            </Link>
          )}
          {hasPermission("purchases.view") && (
            <Link to="/purchase-orders" className={getLinkClass("/purchase-orders")}>
              <FileText size={20} />
              <span>Purchase Orders</span>
            </Link>
          )}
          {hasPermission("purchases.view") && (
            <Link to="/purchases" className={getLinkClass("/purchases")}>
              <Receipt size={20} />
              <span>Purchases</span>
            </Link>
          )}
          {hasPermission("sales.view") && (
            <Link to="/reports" className={getLinkClass("/reports")}>
              <BarChart2 size={20} />
              <span>Reports</span>
            </Link>
          )}
          {hasPermission("customers.view") && (
            <div className="flex items-center space-x-3 text-gray-400 px-4 py-3 rounded-lg font-medium cursor-not-allowed" title="Not implemented yet">
              <Users size={20} />
              <span>{t('customers')} (WIP)</span>
            </div>
          )}
          {hasPermission("products.create") && (
            <Link to="/settings/metadata" className={getLinkClass("/settings/metadata")}>
              <Settings size={20} />
              <span>Metadata Settings</span>
            </Link>
          )}
          {hasPermission("backup.view") && (
            <Link to="/settings/backup-restore" className={getLinkClass("/settings/backup-restore")}>
              <Database size={20} />
              <span>Backup & Restore</span>
            </Link>
          )}
          {hasPermission("hardware.view") && (
            <Link to="/settings/hardware" className={getLinkClass("/settings/hardware")}>
              <Printer size={20} />
              <span>Hardware</span>
            </Link>
          )}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button onClick={handleLogout} className="flex w-full items-center justify-center space-x-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg font-medium transition-colors">
            <LogOut size={20} />
            <span>{t('logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <h2 className="text-xl font-semibold text-gray-800">{t('dashboard')}</h2>
          <div className="flex items-center space-x-4">
            <button 
              onClick={toggleLanguage}
              className="px-3 py-1 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              {i18n.language === 'en' ? 'සිංහල' : 'English'}
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold uppercase">
                {user?.username.charAt(0) || 'U'}
              </div>
              <span className="font-medium text-sm">{user?.username || 'User'}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
