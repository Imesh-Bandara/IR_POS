import { Outlet, Link, useLocation } from "react-router-dom";
import { Monitor, Package, RefreshCw, BarChart2 } from "lucide-react";

export function ReportsLayout() {
  const location = useLocation();

  const links = [
    { name: "Sales Report", path: "/reports/sales", icon: <Monitor size={18} /> },
    { name: "Product Performance", path: "/reports/products", icon: <Package size={18} /> },
    { name: "Inventory Value", path: "/reports/inventory", icon: <BarChart2 size={18} /> },
    { name: "Purchase Report", path: "/reports/purchases", icon: <RefreshCw size={18} /> },
  ];

  return (
    <div className="flex h-full bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="w-64 border-r border-gray-200 p-4">
        <h2 className="text-lg font-bold text-gray-800 mb-4 px-2">Reports</h2>
        <nav className="space-y-1">
          {links.map((link) => {
            const isActive = location.pathname.startsWith(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                  isActive 
                    ? "bg-blue-50 text-blue-700 font-medium" 
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {link.icon}
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
