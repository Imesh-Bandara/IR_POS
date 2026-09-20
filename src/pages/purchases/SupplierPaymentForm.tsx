import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PurchaseDetails, PurchaseAPI, SupplierPaymentPayload } from '../../features/purchases/purchase.api';
import { Supplier, SupplierAPI } from '../../features/purchases/supplier.api';
import { useAuthStore } from '../../features/auth/auth.store';

export function SupplierPaymentForm() {
  const { id } = useParams<{ id: string }>(); // Purchase ID
  const navigate = useNavigate();
  const { token, hasPermission } = useAuthStore();

  const [details, setDetails] = useState<PurchaseDetails | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (token && id) loadData();
  }, [token, id]);

  const loadData = async () => {
    try {
      const purData = await PurchaseAPI.getPurchaseDetails(token!, id!);
      setDetails(purData);

      if (purData.purchase.supplier_id) {
        const sup = await SupplierAPI.getSupplier(token!, purData.purchase.supplier_id);
        setSupplier(sup);
      }
      setAmount(purData.purchase.outstanding_amount / 100);
    } catch (e) {
      console.error(e);
      alert('Failed to load purchase details');
      navigate('/purchases');
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !details) return;

    if (amount <= 0 || amount > (details.purchase.outstanding_amount / 100)) {
      alert("Invalid payment amount.");
      return;
    }

    if (!window.confirm("Confirm payment?")) return;

    const payload: SupplierPaymentPayload = {
      supplier_id: details.purchase.supplier_id,
      purchase_id: details.purchase.id,
      amount: Math.round(amount * 100),
      payment_method: paymentMethod,
      reference: reference || undefined,
      notes: notes || undefined
    };

    try {
      setSaving(true);
      await PurchaseAPI.recordSupplierPayment(token, payload);
      navigate('/purchases');
    } catch (err) {
      console.error(err);
      alert('Failed to record payment: ' + err);
    } finally {
      setSaving(false);
    }
  };

  if (!hasPermission('supplier_payments.create')) {
    return <div className="p-6 text-center text-red-500">No permission to access this page.</div>;
  }

  if (!details || !supplier) return <div className="p-6">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Record Supplier Payment</h1>
        <button onClick={() => navigate('/purchases')} className="text-gray-600 hover:text-gray-900">Cancel</button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase">Purchase Invoice</h2>
          <p className="font-bold text-lg">{details.purchase.invoice_number}</p>
          <p className="text-sm text-gray-600">Outstanding: <span className="font-bold text-red-600">LKR {(details.purchase.outstanding_amount / 100).toFixed(2)}</span></p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase">Supplier Balance</h2>
          <p className="font-bold text-lg">{supplier.company_name}</p>
          <p className="text-sm text-gray-600">Total Outstanding: <span className="font-bold">LKR {((supplier.outstanding_balance || 0) / 100).toFixed(2)}</span></p>
        </div>
      </div>

      <form onSubmit={handlePayment} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount (LKR) *</label>
          <input 
            type="number" min="0.01" step="0.01" max={details.purchase.outstanding_amount / 100} required
            value={amount}
            onChange={e => setAmount(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded-md font-bold text-lg"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
            <select 
              required
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Card">Card</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
            <input 
              type="text"
              value={reference}
              onChange={e => setReference(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="e.g. Cheque / Trx ID"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            rows={2}
          ></textarea>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
          >
            {saving ? 'Processing...' : 'Confirm Payment'}
          </button>
        </div>
      </form>
    </div>
  );
}
