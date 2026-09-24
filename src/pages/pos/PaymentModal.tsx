import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { usePOSStore } from "../../features/pos/pos.store";
import { POSAPI } from "../../features/pos/pos.api";
import { useAuthStore } from "../../features/auth/auth.store";
import { HardwareAPI } from "../../features/hardware/hardware.api";
import toast from "react-hot-toast";

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
  const [successData, setSuccessData] = useState<{invoice: string, change: number} | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!successData) {
      if (method === "CASH") {
        setTimeout(() => inputRef.current?.focus(), 50);
      } else {
        setAmountStr((store.grandTotal / 100).toFixed(2));
      }
    }
  }, [method, store.grandTotal, successData]);

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
      setSuccessData({ invoice: res.invoice_number, change: changeCents });
      
      // Hardware Operations (Non-blocking, fail-safe)
      if (method === "CASH") {
        HardwareAPI.openCashDrawer(token).catch(err => {
          console.warn("Cash drawer failed:", err);
          toast.error("Failed to open cash drawer: " + err.toString());
        });
      }

      HardwareAPI.printReceipt(token, res.invoice_number).catch(err => {
        console.warn("Auto-print failed:", err);
        // It could just be disabled in settings, which returns an error string.
        // We'll only toast if it's not the disabled message, or we can just toast everything.
        if (typeof err === 'string' && !err.includes('disabled')) {
          toast.error("Printer error: " + err);
        }
      });

    } catch (err: any) {
      setError(typeof err === "string" ? err : err.message || "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (successData && e.key === "Enter") {
      handleComplete();
      return;
    }
    if (!successData && e.key === "Enter" && amountReceivedCents >= store.grandTotal) {
      handleCheckout();
    }
    if (e.key === "Escape") {
      if (!successData) onClose();
      else handleComplete();
    }
  };

  const handlePrint = async () => {
    if (!token || !successData) return;
    try {
      await HardwareAPI.printReceipt(token, successData.invoice);
      toast.success("Receipt sent to printer");
    } catch (err: any) {
      toast.error(err.toString());
    }
  };

  const handleComplete = () => {
    store.clearCart();
    onSuccess(successData!.invoice);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 print:bg-white print:p-0">
      
      {/* Hidden Printable Receipt */}
      {successData && (
        <div className="hidden print:block text-black w-full text-sm font-mono p-4">
          <div className="text-center font-bold text-xl mb-2">IR POS</div>
          <div className="text-center mb-4">Invoice: {successData.invoice}</div>
          <div className="border-b border-black mb-2"></div>
          {store.cart.map(item => (
            <div key={item.product_id} className="flex justify-between mb-1">
              <span>{item.quantity}x {item.name}</span>
              <span>Rs. {(item.total / 100).toFixed(2)}</span>
            </div>
          ))}
          <div className="border-b border-black my-2"></div>
          <div className="flex justify-between font-bold">
            <span>TOTAL:</span>
            <span>Rs. {(store.grandTotal / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>CASH/CARD:</span>
            <span>Rs. {(amountReceivedCents / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>CHANGE:</span>
            <span>Rs. {(successData.change / 100).toFixed(2)}</span>
          </div>
          <div className="text-center mt-6">Thank You!</div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col print:hidden">
        <div className="p-5 bg-gray-900 text-white flex justify-between items-center">
          <h2 className="text-xl font-bold">{successData ? "Transaction Complete" : "Complete Sale"}</h2>
          {!successData && (
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
          )}
        </div>

        {successData ? (
          <div className="p-8 space-y-6 text-center">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-3xl font-bold text-gray-800">Success!</h3>
            <p className="text-gray-500 text-lg mb-2">Invoice: <span className="font-mono font-bold text-gray-800">{successData.invoice}</span></p>
            
            <div className="bg-gray-50 rounded-lg p-6 my-6 border border-gray-200">
              <div className="text-sm font-semibold text-gray-500 tracking-wide uppercase mb-1">Change to Return</div>
              <div className="text-5xl font-extrabold text-blue-600">
                Rs. {(successData.change / 100).toFixed(2)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8">
              <button
                onClick={handlePrint}
                autoFocus
                onKeyDown={handleKeyDown}
                className="py-4 font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border-2 border-blue-200 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                PRINT (P)
              </button>
              <button
                onClick={handleComplete}
                className="py-4 font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-lg transition-all"
              >
                NEW SALE (Enter)
              </button>
            </div>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
