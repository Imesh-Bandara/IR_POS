import { useState, useEffect } from "react";
import { useAuthStore } from "../../features/auth/auth.store";
import { HardwareAPI, HardwareSetting } from "../../features/hardware/hardware.api";
import { Printer, Monitor, MonitorSmartphone, Settings as SettingsIcon, Save } from "lucide-react";
import toast from "react-hot-toast";

export function HardwareSettingsPage() {
  const { token } = useAuthStore();
  
  const [settings, setSettings] = useState<Record<string, string>>({
    receipt_printer_enabled: "false",
    receipt_printer_connection: "LAN",
    receipt_printer_ip: "192.168.1.100",
    receipt_printer_port: "9100",
    receipt_paper_width: "80mm",
    auto_print_receipt: "true",
    cash_drawer_enabled: "false",
    cash_drawer_auto_open: "true",
    customer_display_enabled: "false",
    label_printer_enabled: "false"
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [token]);

  const loadSettings = async () => {
    if (!token) return;
    try {
      const data = await HardwareAPI.getSettings(token);
      const newSettings = { ...settings };
      data.forEach(s => {
        newSettings[s.key] = s.value;
      });
      setSettings(newSettings);
    } catch (err: any) {
      toast.error("Failed to load hardware settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const payload: HardwareSetting[] = Object.keys(settings).map(key => ({
        key,
        value: settings[key]
      }));
      await HardwareAPI.updateSettings(token, payload);
      toast.success("Hardware settings saved successfully");
    } catch (err: any) {
      toast.error(err.toString());
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleTestPrint = async () => {
    if (!token) return;
    try {
      await HardwareAPI.testPrinter(token);
      toast.success("Test print signal sent");
    } catch (err: any) {
      toast.error(err.toString());
    }
  };

  const handleTestDrawer = async () => {
    if (!token) return;
    try {
      await HardwareAPI.openCashDrawer(token);
      toast.success("Cash drawer open signal sent");
    } catch (err: any) {
      toast.error(err.toString());
    }
  };

  const handleTestDisplay = async () => {
    if (!token) return;
    try {
      await HardwareAPI.testCustomerDisplay(token, "Welcome to IR POS", "Hardware Test");
      toast.success("Customer display signal sent");
    } catch (err: any) {
      toast.error(err.toString());
    }
  };

  if (loading) {
    return <div className="p-6">Loading hardware settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hardware Integration</h1>
          <p className="text-sm text-gray-500 mt-1">Configure physical point-of-sale devices.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Save size={20} />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Receipt Printer */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Printer size={24} />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Receipt Printer</h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-center space-x-3">
              <input 
                type="checkbox" 
                checked={settings.receipt_printer_enabled === "true"}
                onChange={(e) => handleChange("receipt_printer_enabled", e.target.checked ? "true" : "false")}
                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-gray-700 font-medium">Enable Receipt Printer</span>
            </label>

            {settings.receipt_printer_enabled === "true" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Connection Type</label>
                  <select 
                    value={settings.receipt_printer_connection}
                    onChange={(e) => handleChange("receipt_printer_connection", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="LAN">Network / LAN (ESC/POS)</option>
                    <option value="USB">USB (Not Supported natively yet)</option>
                  </select>
                </div>

                {settings.receipt_printer_connection === "LAN" && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                      <input 
                        type="text" 
                        value={settings.receipt_printer_ip}
                        onChange={(e) => handleChange("receipt_printer_ip", e.target.value)}
                        placeholder="192.168.1.100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                      <input 
                        type="text" 
                        value={settings.receipt_printer_port}
                        onChange={(e) => handleChange("receipt_printer_port", e.target.value)}
                        placeholder="9100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paper Width</label>
                  <select 
                    value={settings.receipt_paper_width}
                    onChange={(e) => handleChange("receipt_paper_width", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="80mm">80mm</option>
                    <option value="58mm">58mm</option>
                  </select>
                </div>

                <label className="flex items-center space-x-3 pt-2 border-t border-gray-100">
                  <input 
                    type="checkbox" 
                    checked={settings.auto_print_receipt === "true"}
                    onChange={(e) => handleChange("auto_print_receipt", e.target.checked ? "true" : "false")}
                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-gray-700 text-sm">Auto-print receipt after successful checkout</span>
                </label>

                <button
                  onClick={handleTestPrint}
                  className="mt-4 w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors"
                >
                  Test Print
                </button>
              </>
            )}
          </div>
        </div>

        {/* Cash Drawer */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <SettingsIcon size={24} />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Cash Drawer</h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-center space-x-3">
              <input 
                type="checkbox" 
                checked={settings.cash_drawer_enabled === "true"}
                onChange={(e) => handleChange("cash_drawer_enabled", e.target.checked ? "true" : "false")}
                className="w-5 h-5 text-green-600 rounded border-gray-300 focus:ring-green-500"
              />
              <span className="text-gray-700 font-medium">Enable Cash Drawer</span>
            </label>

            {settings.cash_drawer_enabled === "true" && (
              <>
                <p className="text-sm text-gray-500">
                  Cash drawers are operated via the receipt printer kick signal. Make sure your receipt printer is connected and configured.
                </p>

                <label className="flex items-center space-x-3 pt-2">
                  <input 
                    type="checkbox" 
                    checked={settings.cash_drawer_auto_open === "true"}
                    onChange={(e) => handleChange("cash_drawer_auto_open", e.target.checked ? "true" : "false")}
                    className="w-5 h-5 text-green-600 rounded border-gray-300 focus:ring-green-500"
                  />
                  <span className="text-gray-700 text-sm">Automatically open after CASH sales</span>
                </label>

                <button
                  onClick={handleTestDrawer}
                  className="mt-4 w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors"
                >
                  Test Cash Drawer
                </button>
              </>
            )}
          </div>
        </div>

        {/* Customer Display */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Monitor size={24} />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Customer Display</h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-center space-x-3">
              <input 
                type="checkbox" 
                checked={settings.customer_display_enabled === "true"}
                onChange={(e) => handleChange("customer_display_enabled", e.target.checked ? "true" : "false")}
                className="w-5 h-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
              />
              <span className="text-gray-700 font-medium">Enable Customer Display</span>
            </label>

            {settings.customer_display_enabled === "true" && (
              <>
                <p className="text-sm text-gray-500">
                  Displays idle messages and cart totals for the customer.
                </p>
                <button
                  onClick={handleTestDisplay}
                  className="mt-4 w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors"
                >
                  Test Customer Display
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Barcode Scanner Info */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <MonitorSmartphone size={24} />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Barcode Scanner</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg border border-green-100">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-medium text-sm">Keyboard Emulation Active</span>
            </div>
            
            <p className="text-sm text-gray-600">
              The barcode scanner operates in standard HID (keyboard) mode. It is automatically active in the POS checkout screen.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
