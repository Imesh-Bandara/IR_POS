import { useState } from "react";
import { Ban, X } from "lucide-react";
import { useAuthStore } from "../../features/auth/auth.store";
import { SalesAPI } from "../../features/sales/sales.api";
import toast from "react-hot-toast";

interface Props {
  saleId: string;
  invoiceNumber: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function VoidSaleModal({ saleId, invoiceNumber, onClose, onSuccess }: Props) {
  const { token } = useAuthStore();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVoid = async () => {
    if (!token) return;
    if (reason.trim().length < 5) {
      toast.error("Please provide a valid reason (min 5 characters).");
      return;
    }

    setLoading(true);
    try {
      await SalesAPI.voidSale(token, saleId, reason);
      toast.success(`Invoice ${invoiceNumber} voided successfully`);
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || "Failed to void sale");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-4 bg-red-600 text-white flex justify-between items-center">
          <h2 className="font-bold flex items-center gap-2">
            <Ban size={20} /> Void Sale
          </h2>
          <button onClick={onClose} className="text-red-200 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-red-50 text-red-800 p-4 rounded-lg text-sm border border-red-200">
            <strong>Warning:</strong> Voiding Invoice <strong>{invoiceNumber}</strong> is permanent. It will instantly restore inventory levels and mark this record as VOIDED.
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Reason for Voiding</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              rows={3}
              placeholder="e.g., Cashier error, duplicate entry..."
            />
          </div>
        </div>

        <div className="p-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 font-bold rounded-lg hover:bg-gray-300">
            Cancel
          </button>
          <button 
            onClick={handleVoid}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? "Processing..." : "Confirm Void"}
          </button>
        </div>
      </div>
    </div>
  );
}
