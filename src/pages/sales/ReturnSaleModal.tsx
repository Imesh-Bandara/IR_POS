import { useState, useMemo } from "react";
import { CornerUpLeft, X, Minus, Plus } from "lucide-react";
import { useAuthStore } from "../../features/auth/auth.store";
import { SalesAPI, SaleDetails } from "../../features/sales/sales.api";
import toast from "react-hot-toast";

interface Props {
  details: SaleDetails;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReturnSaleModal({ details, onClose, onSuccess }: Props) {
  const { token } = useAuthStore();
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState("CASH");
  const [loading, setLoading] = useState(false);

  // Map of sale_item_id -> return quantity
  const [returnQty, setReturnQty] = useState<Record<string, number>>({});

  const { sale, items } = details;

  const returnableItems = useMemo(() => {
    return items.map(item => ({
      ...item,
      returnable: item.quantity - item.returned_quantity
    })).filter(item => item.returnable > 0);
  }, [items]);

  const updateQty = (id: string, qty: number, max: number) => {
    const validQty = Math.max(0, Math.min(qty, max));
    setReturnQty(prev => ({
      ...prev,
      [id]: validQty
    }));
  };

  const totalRefund = useMemo(() => {
    return returnableItems.reduce((acc, item) => {
      const qty = returnQty[item.id] || 0;
      return acc + (qty * item.unit_price);
    }, 0);
  }, [returnableItems, returnQty]);

  const totalItemsReturning = Object.values(returnQty).reduce((acc, q) => acc + q, 0);

  const handleReturn = async () => {
    if (!token) return;
    if (totalItemsReturning === 0) {
      toast.error("Select at least one item to return");
      return;
    }
    if (reason.trim().length < 5) {
      toast.error("Please provide a valid reason (min 5 characters)");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        sale_id: sale.id,
        reason,
        refund_method: refundMethod,
        items: Object.entries(returnQty)
          .filter(([_, qty]) => qty > 0)
          .map(([sale_item_id, quantity]) => ({ sale_item_id, quantity }))
      };

      await SalesAPI.processReturn(token, payload);
      toast.success("Return processed successfully");
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || "Failed to process return");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-4 bg-orange-500 text-white flex justify-between items-center rounded-t-xl">
          <h2 className="font-bold flex items-center gap-2">
            <CornerUpLeft size={20} /> Process Return — {sale.invoice_number}
          </h2>
          <button onClick={onClose} className="text-orange-200 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-lg text-sm">
            Select the quantities to return below. The system will automatically calculate the refund and securely restore inventory levels.
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 font-bold">Item</th>
                  <th className="px-4 py-3 font-bold text-center">Returnable Qty</th>
                  <th className="px-4 py-3 font-bold text-right">Unit Price</th>
                  <th className="px-4 py-3 font-bold text-center">Return Qty</th>
                  <th className="px-4 py-3 font-bold text-right">Refund</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {returnableItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No items available to return on this invoice.
                    </td>
                  </tr>
                ) : (
                  returnableItems.map(item => {
                    const qty = returnQty[item.id] || 0;
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{item.name_en}</td>
                        <td className="px-4 py-3 text-center text-gray-500">{item.returnable}</td>
                        <td className="px-4 py-3 text-right">{(item.unit_price / 100).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center items-center gap-2 bg-white border border-gray-300 rounded p-1 w-max mx-auto">
                            <button 
                              onClick={() => updateQty(item.id, qty - 1, item.returnable)}
                              className="p-1 hover:bg-gray-100 rounded text-gray-600"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-6 text-center font-bold">{qty}</span>
                            <button 
                              onClick={() => updateQty(item.id, qty + 1, item.returnable)}
                              className="p-1 hover:bg-gray-100 rounded text-gray-600"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-orange-600">
                          {((qty * item.unit_price) / 100).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Return Reason</label>
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g., Damaged, Customer Changed Mind..."
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Refund Method</label>
                <select
                  value={refundMethod}
                  onChange={e => setRefundMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="CASH">Cash Refund</option>
                  <option value="CARD">Card Refund (Internal Record Only)</option>
                  <option value="STORE_CREDIT">Store Credit</option>
                </select>
              </div>
            </div>

            <div className="bg-gray-900 text-white p-6 rounded-xl flex flex-col justify-center items-end">
              <div className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-1">Total Refund Amount</div>
              <div className="text-4xl font-extrabold text-orange-400">Rs. {(totalRefund / 100).toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-200 rounded-b-xl">
          <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 font-bold rounded-lg hover:bg-gray-300">
            Cancel
          </button>
          <button 
            onClick={handleReturn}
            disabled={loading || totalItemsReturning === 0}
            className="px-6 py-2 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? "Processing..." : "Confirm Return & Refund"}
          </button>
        </div>
      </div>
    </div>
  );
}
