import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PurchaseDetails, PurchaseAPI, PurchaseReturnPayload } from '../../features/purchases/purchase.api';
import { Product, ProductAPI } from '../../features/products/product.api';
import { Supplier, SupplierAPI } from '../../features/purchases/supplier.api';
import { useAuthStore } from '../../features/auth/auth.store';

export function PurchaseReturnForm() {
  const { id } = useParams<{ id: string }>(); // Purchase ID
  const navigate = useNavigate();
  const { token, hasPermission } = useAuthStore();

  const [details, setDetails] = useState<PurchaseDetails | null>(null);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  
  // return qty state: item id -> qty to return
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
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

      const prods = await ProductAPI.getProducts(token!, { limit: 1000, offset: 0 });
      const prodMap = prods.items.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as Record<string, Product>);
      setProducts(prodMap);

      const initialQtys: Record<string, number> = {};
      purData.items.forEach(item => {
        initialQtys[item.id] = 0;
      });
      setReturnQtys(initialQtys);

    } catch (e) {
      console.error(e);
      alert('Failed to load purchase details');
      navigate('/purchases');
    }
  };

  const handleQtyChange = (itemId: string, qty: number, maxAllowed: number) => {
    setReturnQtys(prev => ({
      ...prev,
      [itemId]: Math.min(Math.max(0, qty), maxAllowed)
    }));
  };

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !details) return;

    const itemsToReturn = details.items
      .filter(item => returnQtys[item.id] > 0)
      .map(item => ({
        purchase_item_id: item.id,
        product_id: item.product_id,
        quantity: returnQtys[item.id]
      }));

    if (itemsToReturn.length === 0) {
      alert("Please enter a quantity greater than 0 for at least one item.");
      return;
    }

    if (!window.confirm("Processing this return will reduce branch inventory and adjust supplier balance. Continue?")) {
      return;
    }

    const payload: PurchaseReturnPayload = {
      original_purchase_id: details.purchase.id,
      reason: reason || undefined,
      items: itemsToReturn
    };

    try {
      setSaving(true);
      await PurchaseAPI.processPurchaseReturn(token, payload);
      navigate('/purchases');
    } catch (err) {
      console.error(err);
      alert('Failed to process return: ' + err);
    } finally {
      setSaving(false);
    }
  };

  if (!hasPermission('purchases.return')) {
    return <div className="p-6 text-center text-red-500">No permission to access this page.</div>;
  }

  if (!details || !supplier) return <div className="p-6">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Purchase Return</h1>
        <button onClick={() => navigate('/purchases')} className="text-gray-600 hover:text-gray-900">Cancel</button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase">Original Purchase Invoice</h2>
          <p className="font-bold text-lg">{details.purchase.invoice_number}</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase">Supplier</h2>
          <p className="font-bold">{supplier.company_name}</p>
        </div>
      </div>

      <form onSubmit={handleReturn} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Return Reason</label>
          <input 
            type="text" required
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="e.g. Damaged goods, Wrong items"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm">
                <th className="p-3">Product</th>
                <th className="p-3 w-24">Received</th>
                <th className="p-3 w-24">Already Returned</th>
                <th className="p-3 w-32">Unit Cost</th>
                <th className="p-3 w-32">Return Qty</th>
                <th className="p-3 w-32">Refund Value</th>
              </tr>
            </thead>
            <tbody>
              {details.items.map(item => {
                const prodName = products[item.product_id]?.name_en || 'Unknown';
                const returnable = item.quantity_received - item.quantity_returned;
                const returnVal = returnQtys[item.id] || 0;
                
                return (
                  <tr key={item.id} className="border-t">
                    <td className="p-3 font-medium">{prodName}</td>
                    <td className="p-3">{item.quantity_received}</td>
                    <td className="p-3">{item.quantity_returned}</td>
                    <td className="p-3">LKR {(item.unit_cost / 100).toFixed(2)}</td>
                    <td className="p-3">
                      <input 
                        type="number" min="0" max={returnable}
                        value={returnVal}
                        onChange={e => handleQtyChange(item.id, Number(e.target.value), returnable)}
                        className="w-full px-2 py-1 border rounded"
                        disabled={returnable <= 0}
                      />
                    </td>
                    <td className="p-3 font-medium text-orange-600">
                      LKR {((returnVal * item.unit_cost) / 100).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium disabled:opacity-50"
          >
            {saving ? 'Processing...' : 'Process Return'}
          </button>
        </div>
      </form>
    </div>
  );
}
