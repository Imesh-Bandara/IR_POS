import { useState, useEffect } from "react";
import { X, CornerUpLeft, Ban, AlertCircle } from "lucide-react";
import { useAuthStore } from "../../features/auth/auth.store";
import { SalesAPI, SaleDetails, ReturnRecord, RefundRecord } from "../../features/sales/sales.api";
import { HardwareAPI } from "../../features/hardware/hardware.api";
import { VoidSaleModal } from "./VoidSaleModal";
import { ReturnSaleModal } from "./ReturnSaleModal";
import toast from "react-hot-toast";
import { Printer } from "lucide-react";

interface Props {
  saleId: string;
  onClose: () => void;
}

export function SaleDetailsModal({ saleId, onClose }: Props) {
  const { token, hasPermission } = useAuthStore();
  
  const [details, setDetails] = useState<SaleDetails | null>(null);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [showVoid, setShowVoid] = useState(false);
  const [showReturn, setShowReturn] = useState(false);

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [d, ret, ref] = await Promise.all([
        SalesAPI.getSaleDetails(token, saleId),
        SalesAPI.getSaleReturns(token, saleId),
        SalesAPI.getSaleRefunds(token, saleId)
      ]);
      setDetails(d);
      setReturns(ret);
      setRefunds(ref);
    } catch (e: any) {
      toast.error(e.message || e);
    } finally {
      setLoading(false);
    }
  };

  const handleReprint = async () => {
    if (!token || !details) return;
    try {
      await HardwareAPI.printReceipt(token, details.sale.invoice_number);
      toast.success("Reprint receipt sent to printer");
    } catch (err: any) {
      toast.error(typeof err === 'string' ? err : err.message || "Printer error");
    }
  };

  useEffect(() => {
    loadData();
  }, [saleId, token]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-xl">Loading...</div>
      </div>
    );
  }

  if (!details) return null;

  const { sale, items, payments } = details;
  const canVoid = sale.status === "COMPLETED" && hasPermission("sales.void");
  const canReturn = (sale.status === "COMPLETED" || sale.status === "PARTIALLY_RETURNED") && hasPermission("sales.return");
  const canReprint = hasPermission("receipt.print");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gray-900 text-white flex justify-between items-center rounded-t-xl">
          <h2 className="text-xl font-bold flex items-center gap-3">
            Invoice {sale.invoice_number}
            <span className={`px-2 py-1 text-xs font-bold rounded-full ${
              sale.status === 'COMPLETED' ? 'bg-green-500 text-white' :
              sale.status === 'VOIDED' ? 'bg-red-500 text-white' :
              'bg-yellow-500 text-white'
            }`}>
              {sale.status}
            </span>
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-4 text-sm bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div>
              <span className="text-gray-500 block">Date & Time</span>
              <span className="font-bold text-gray-800">{sale.created_at}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Cashier ID</span>
              <span className="font-bold text-gray-800">{sale.cashier_id}</span>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <h3 className="px-4 py-3 bg-gray-100 font-bold border-b border-gray-200">Purchased Items</h3>
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-500">
                  <th className="px-4 py-2 font-medium">Item</th>
                  <th className="px-4 py-2 font-medium text-right">Qty</th>
                  <th className="px-4 py-2 font-medium text-right">Price</th>
                  <th className="px-4 py-2 font-medium text-right">Total</th>
                  <th className="px-4 py-2 font-medium text-center">Returned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map(item => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{item.name_en}</td>
                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">{(item.unit_price / 100).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-bold">{(item.total / 100).toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      {item.returned_quantity > 0 ? (
                        <span className="text-red-600 font-bold">{item.returned_quantity}</span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Payments */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-2">
              <h3 className="font-bold border-b border-gray-100 pb-2 mb-2">Original Payments</h3>
              {payments.map(p => (
                <div key={p.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">{p.payment_method}</span>
                  <span className="font-bold text-gray-900">{(p.amount_received / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{(sale.subtotal / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-100">
                <span>Grand Total</span>
                <span>Rs. {(sale.grand_total / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Returns & Refunds History */}
          {(returns.length > 0 || refunds.length > 0) && (
            <div className="bg-red-50 rounded-lg border border-red-100 p-4 space-y-4">
              <h3 className="font-bold text-red-800 flex items-center gap-2">
                <AlertCircle size={18} /> Return & Refund History
              </h3>
              
              {returns.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-red-700">Returns</h4>
                  {returns.map(r => (
                    <div key={r.id} className="bg-white p-3 rounded shadow-sm text-sm border border-red-100">
                      <div className="flex justify-between font-bold text-gray-800 mb-1">
                        <span>{r.return_invoice_number}</span>
                        <span>Rs. {(r.total_refund / 100).toFixed(2)}</span>
                      </div>
                      <div className="text-gray-500 flex justify-between">
                        <span>{r.created_at}</span>
                        <span>Reason: {r.reason || 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {refunds.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-red-700">Refunds Issued</h4>
                  {refunds.map(r => (
                    <div key={r.id} className="bg-white p-3 rounded shadow-sm text-sm border border-red-100 flex justify-between">
                      <span className="font-medium">{r.payment_method} Refund</span>
                      <span className="font-bold text-red-600">Rs. {(r.refund_amount / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 bg-white flex justify-end gap-3 rounded-b-xl">
          {canReprint && (
            <button 
              onClick={handleReprint}
              className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-bold rounded-lg flex items-center gap-2 transition-colors mr-auto"
            >
              <Printer size={18} /> Reprint Receipt
            </button>
          )}
          {canVoid && (
            <button 
              onClick={() => setShowVoid(true)}
              className="px-4 py-2 border-2 border-red-500 text-red-600 hover:bg-red-50 font-bold rounded-lg flex items-center gap-2 transition-colors"
            >
              <Ban size={18} /> Void Sale
            </button>
          )}
          {canReturn && (
            <button 
              onClick={() => setShowReturn(true)}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg flex items-center gap-2 transition-colors"
            >
              <CornerUpLeft size={18} /> Process Return
            </button>
          )}
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {showVoid && (
        <VoidSaleModal 
          saleId={saleId} 
          invoiceNumber={sale.invoice_number} 
          onClose={() => setShowVoid(false)}
          onSuccess={() => {
            setShowVoid(false);
            loadData();
          }} 
        />
      )}

      {showReturn && (
        <ReturnSaleModal 
          details={details}
          onClose={() => setShowReturn(false)}
          onSuccess={() => {
            setShowReturn(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
