import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { usePOSStore } from "../../features/pos/pos.store";
import { POSAPI } from "../../features/pos/pos.api";
import { useAuthStore } from "../../features/auth/auth.store";
// removed

interface Props {
  onClose: () => void;
  onSuccess: (invoiceNumber: string) => void;
}

export function PaymentModal({ onClose, onSuccess }: Props) {
  const { token } = useAuthStore();
  const store = usePOSStore();
  const [method, setMethod] = useState<"CASH" | "CARD">("CASH");
  const [amountStr, setAmountStr] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (method === "CASH") {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setAmountStr((store.grandTotal / 100).toFixed(2));
    }
  }, [method, store.grandTotal]);

  const amountReceivedCents = Math.round(parseFloat(amountStr || "0") * 100);
  const changeCents = amountReceivedCents - store.grandTotal;

  const handleCheckout = async () => {
    if (!token) return;
    if (amountReceivedCents < store.grandTotal) {
      setError("Insufficient payment amount.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await POSAPI.checkout(token, {
        items: store.cart,
        subtotal: store.subtotal,
        discount_total: store.discountTotal,
        tax_total: store.taxTotal,
        grand_total: store.grandTotal,
        payment: {
          payment_method: method,
          amount_received: amountReceivedCents
        }
      });
      store.clearCart();
      onSuccess(res.invoice_number);
    } catch (err: any) {
      setError(typeof err === "string" ? err : err.message || "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && amountReceivedCents >= store.grandTotal) {
      handleCheckout();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="p-5 bg-gray-900 text-white flex justify-between items-center">
          <h2 className="text-xl font-bold">Complete Sale</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center">
            <div className="text-sm font-semibold text-gray-500 tracking-wide uppercase">Grand Total</div>
            <div className="text-5xl font-extrabold text-blue-600 mt-2">
              Rs. {(store.grandTotal / 100).toFixed(2)}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setMethod("CASH")}
              className={`flex-1 py-3 text-lg font-bold rounded-lg border-2 transition-all ${
                method === "CASH" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              CASH
            </button>
            <button
              onClick={() => setMethod("CARD")}
              className={`flex-1 py-3 text-lg font-bold rounded-lg border-2 transition-all ${
                method === "CARD" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              CARD
            </button>
          </div>

          <div className="space-y-4">
            {error && <div className="p-3 bg-red-100 text-red-700 text-sm font-medium rounded-lg border border-red-200">{error}</div>}
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Amount Received (Rs.)</label>
              <input
                ref={inputRef}
                type="number"
                disabled={method === "CARD"}
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-4 text-3xl font-mono border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:ring-0 outline-none transition-colors"
                placeholder="0.00"
              />
            </div>

            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <span className="font-bold text-gray-600 uppercase">Change</span>
              <span className={`text-2xl font-bold font-mono ${changeCents < 0 ? "text-red-500" : "text-green-600"}`}>
                Rs. {changeCents < 0 ? "0.00" : (changeCents / 100).toFixed(2)}
              </span>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading || amountReceivedCents < store.grandTotal}
            className="w-full py-4 text-xl font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:hover:bg-green-600 rounded-lg shadow-lg transition-all"
          >
            {loading ? "Processing..." : "PAY & COMPLETE (Enter)"}
          </button>
        </div>
      </div>
    </div>
  );
}
