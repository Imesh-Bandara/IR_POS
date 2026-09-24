import { useState, useEffect, useRef } from "react";
import { Search, Plus, Minus, Trash2, PauseCircle, PlayCircle, CreditCard, List, Package } from "lucide-react";
import { usePOSStore } from "../../features/pos/pos.store";
import { POSAPI, HeldSaleDetails } from "../../features/pos/pos.api";
import { InventoryProduct } from "../../features/inventory/inventory.api";
import { useAuthStore } from "../../features/auth/auth.store";
import { useBarcodeScanner } from "../../features/pos/useBarcodeScanner";
import { PaymentModal } from "./PaymentModal";
import { QuickAddProductModal } from "./QuickAddProductModal";
import toast, { Toaster } from "react-hot-toast";

export function POSPage() {
  const { token } = useAuthStore();
  const store = usePOSStore();
  
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<InventoryProduct[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [heldCarts, setHeldCarts] = useState<HeldSaleDetails[]>([]);
  const [showHeldModal, setShowHeldModal] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [quantityPromptProduct, setQuantityPromptProduct] = useState<InventoryProduct | null>(null);
  const [manualQuantity, setManualQuantity] = useState<string>("1");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const fetchHeldSales = async () => {
    if (!token) return;
    try {
      const data = await POSAPI.getHeldSales(token);
      setHeldCarts(data);
    } catch (e) {
      console.error("Failed to fetch held sales", e);
    }
  };

  useEffect(() => {
    fetchHeldSales();
  }, [token]);

  // Barcode Scanner Integration
  useBarcodeScanner(async (barcode) => {
    if (!token) return;
    try {
      const res = await POSAPI.searchProducts(token, barcode);
      if (res.length > 0) {
        // Direct match found
        const p = res[0];
        if (p.current_stock <= 0) {
          toast.error(`Out of stock: ${p.name_en}`);
          return;
        }
        store.addItem({
          product_id: p.id,
          name: p.name_en,
          barcode: p.barcode,
          sku: p.sku,
          quantity: 1,
          unit_price: p.selling_price,
          discount_amount: p.discount_amount || 0,
          tax_amount: 0, // Simplified tax
          stock: p.current_stock
        });
        toast.success(`Added ${p.name_en}`);
      } else {
        setScannedBarcode(barcode);
        setShowQuickAddModal(true);
      }
    } catch (e) {
      console.error(e);
      toast.error("Scanner error");
    }
  });

  // Manual Search Effect
  useEffect(() => {
    if (!token) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await POSAPI.searchProducts(token, search);
        setResults(res);
      } catch (e) {
        console.error("Search failed", e);
      }
    }, search.length > 0 ? 200 : 0);
    return () => clearTimeout(timer);
  }, [search, token]);

  const handleHoldSale = async () => {
    if (!token || store.cart.length === 0) return;
    try {
      await POSAPI.saveHeldSale(token, {
        subtotal: store.subtotal,
        discount_total: store.discountTotal,
        tax_total: store.taxTotal,
        grand_total: store.grandTotal,
        items: store.cart.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          discount_amount: i.discount_amount,
          tax_amount: i.tax_amount,
          subtotal: i.subtotal,
          total: i.total
        }))
      });
      store.clearCart();
      toast.success("Sale held successfully");
      fetchHeldSales();
    } catch (e: any) {
      toast.error(typeof e === "string" ? e : "Failed to hold sale");
    }
  };

  const handleResumeSale = async (held: HeldSaleDetails) => {
    if (!token) return;
    try {
      if (store.cart.length > 0) {
        toast.error("Please clear or hold the current cart first");
        return;
      }

      // Re-fetch product data for stock
      const cartItems = [];
      for (const item of held.items) {
        // Find product manually for stock limits
        await POSAPI.searchProducts(token, ""); // we need a better way, but for now we assume they exist
        // Real implementation should load products by IDs or we just trust held data and let backend validate checkout
        cartItems.push({
          product_id: item.product_id,
          name: "Item " + item.product_id.substring(0, 4), // Placeholder until proper backend join
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_amount: item.discount_amount,
          tax_amount: item.tax_amount,
          subtotal: item.subtotal,
          total: item.total,
          stock: 9999 // Defer to checkout validation
        });
      }
      
      store.setCartFromHeld(cartItems);
      await POSAPI.deleteHeldSale(token, held.sale.id);
      setShowHeldModal(false);
      fetchHeldSales();
      toast.success("Sale resumed");
    } catch (e) {
      console.error(e);
      toast.error("Failed to resume sale");
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "F9") {
        e.preventDefault();
        if (store.cart.length > 0) setShowPayment(true);
      } else if (e.key === "F8") {
        e.preventDefault();
        if (store.cart.length > 0) handleHoldSale();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [store]);

  const handleProductClick = (p: InventoryProduct) => {
    if (p.current_stock <= 0) {
      toast.error("Product is out of stock");
      return;
    }
    
    // If product has no barcode, it's likely a manual/weight-based product.
    if (!p.barcode) {
      setQuantityPromptProduct(p);
      setManualQuantity("1");
      return;
    }

    store.addItem({
      product_id: p.id,
      name: p.name_en,
      barcode: p.barcode,
      sku: p.sku,
      quantity: 1,
      unit_price: p.selling_price,
      discount_amount: p.discount_amount || 0,
      tax_amount: 0,
      stock: p.current_stock
    });
    setSearch("");
    searchInputRef.current?.focus();
  };

  const handleManualQuantitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(manualQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Invalid quantity");
      return;
    }
    if (quantityPromptProduct) {
      if (qty > quantityPromptProduct.current_stock) {
        toast.error(`Only ${quantityPromptProduct.current_stock} in stock`);
        return;
      }
      store.addItem({
        product_id: quantityPromptProduct.id,
        name: quantityPromptProduct.name_en,
        barcode: quantityPromptProduct.barcode,
        sku: quantityPromptProduct.sku,
        quantity: qty,
        unit_price: quantityPromptProduct.selling_price,
        discount_amount: quantityPromptProduct.discount_amount || 0,
        tax_amount: 0,
        stock: quantityPromptProduct.current_stock
      });
      toast.success(`Added ${quantityPromptProduct.name_en}`);
    }
    setQuantityPromptProduct(null);
    setSearch("");
    searchInputRef.current?.focus();
  };

  return (
    <div className="h-[calc(100vh-64px)] flex bg-gray-100 p-4 gap-4 overflow-hidden">
      <Toaster position="top-right" />
      
      {/* LEFT PANE: Search and Products */}
      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header / Search */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="F2 to search by Name, SKU, or Barcode... (Press Enter to Quick Add)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && search.trim().length > 0) {
                  e.preventDefault();
                  const exactMatch = results.find(r => r.barcode === search.trim() || r.sku === search.trim());
                  if (exactMatch) {
                    handleProductClick(exactMatch);
                  } else {
                    setScannedBarcode(search.trim());
                    setShowQuickAddModal(true);
                  }
                }
              }}
              className="w-full pl-12 pr-4 py-3 text-lg rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:ring-0 outline-none transition-colors"
            />
          </div>
          <button 
            onClick={() => {
              setScannedBarcode(search.trim());
              setShowQuickAddModal(true);
            }}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
            title="Manual Quick Add"
          >
            <Plus size={24} /> New
          </button>
        </div>
        
        {/* Product Grid / Results */}
        <div className="flex-1 p-4 overflow-y-auto">
          {results.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {results.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleProductClick(p)}
                  disabled={p.current_stock <= 0}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    p.current_stock > 0 
                      ? "border-gray-200 hover:border-blue-500 hover:shadow-md bg-white" 
                      : "border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <div className="font-bold text-gray-800 line-clamp-2 min-h-[3rem]">{p.name_en}</div>
                  <div className="text-sm text-gray-500 mb-2">{p.barcode || p.sku}</div>
                  <div className="flex justify-between items-end">
                    <div className="font-bold text-blue-600 text-lg">Rs. {(p.selling_price / 100).toFixed(2)}</div>
                    <div className={`text-xs font-bold px-2 py-1 rounded ${p.current_stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {p.current_stock > 0 ? `${p.current_stock} in stock` : 'Out of Stock'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : search.length > 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
              <Search size={64} className="opacity-20" />
              <div className="text-xl font-medium">No products found</div>
              <div className="text-sm">Try a different search term</div>
              <button 
                onClick={() => {
                  setScannedBarcode(search.trim());
                  setShowQuickAddModal(true);
                }}
                className="mt-4 px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus size={20} /> Quick Add "{search}"
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
              <Package size={64} className="opacity-20" />
              <div className="text-xl font-medium">No products available</div>
              <div className="text-sm">Add some products to your inventory first</div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANE: Cart */}
      <div className="w-[450px] flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Cart Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-900 text-white flex justify-between items-center">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <CreditCard size={20} /> Current Sale
          </h2>
          <div className="flex gap-2">
            {heldCarts.length > 0 && (
              <button 
                onClick={() => setShowHeldModal(true)}
                className="px-3 py-1 bg-yellow-500 text-yellow-900 text-sm font-bold rounded hover:bg-yellow-400 flex items-center gap-1"
                title="View held sales"
              >
                <List size={16} /> Held ({heldCarts.length})
              </button>
            )}
            <button 
              onClick={handleHoldSale}
              disabled={store.cart.length === 0}
              className="px-3 py-1 bg-gray-700 text-gray-300 text-sm font-bold rounded hover:bg-gray-600 disabled:opacity-50 flex items-center gap-1"
              title="Hold Sale (F8)"
            >
              <PauseCircle size={16} /> Hold (F8)
            </button>
            <button 
              onClick={() => store.clearCart()}
              disabled={store.cart.length === 0}
              className="px-3 py-1 bg-red-900/50 text-red-300 text-sm font-bold rounded hover:bg-red-900 disabled:opacity-50 flex items-center gap-1"
            >
              <Trash2 size={16} /> Clear
            </button>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-2">
          {store.cart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-lg font-medium">
              Cart is empty
            </div>
          ) : (
            <div className="space-y-2">
              {store.cart.map(item => (
                <div key={item.product_id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div className="font-bold text-gray-800 leading-tight pr-2">{item.name}</div>
                    <div className="font-bold text-gray-900">Rs. {(item.total / 100).toFixed(2)}</div>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <div>@ Rs. {(item.unit_price / 100).toFixed(2)}</div>
                    
                    {/* Qty Controls */}
                    <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-1 border border-gray-200">
                      <button 
                        onClick={() => store.updateQuantity(item.product_id, item.quantity - 1)}
                        className="p-1 rounded bg-white hover:bg-gray-200 shadow-sm text-gray-700"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="font-bold text-gray-800 w-6 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => store.updateQuantity(item.product_id, item.quantity + 1)}
                        className="p-1 rounded bg-white hover:bg-gray-200 shadow-sm text-gray-700"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals & Pay */}
        <div className="bg-white border-t border-gray-200 p-4 space-y-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between text-gray-500 font-medium">
            <span>Subtotal</span>
            <span>{(store.subtotal / 100).toFixed(2)}</span>
          </div>
          {store.discountTotal > 0 && (
            <div className="flex justify-between text-red-500 font-medium">
              <span>Discount</span>
              <span>- {(store.discountTotal / 100).toFixed(2)}</span>
            </div>
          )}
          {store.taxTotal > 0 && (
            <div className="flex justify-between text-gray-500 font-medium">
              <span>Tax</span>
              <span>+ {(store.taxTotal / 100).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="text-xl font-bold text-gray-800">TOTAL</span>
            <span className="text-3xl font-extrabold text-blue-600">Rs. {(store.grandTotal / 100).toFixed(2)}</span>
          </div>

          <button
            disabled={store.cart.length === 0}
            onClick={() => setShowPayment(true)}
            className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:hover:bg-green-600 text-white text-xl font-bold rounded-xl shadow-lg transition-all flex justify-center items-center gap-2"
          >
            PAY (F9)
          </button>
        </div>
      </div>

      {showPayment && (
        <PaymentModal 
          onClose={() => setShowPayment(false)} 
          onSuccess={(inv) => {
            setShowPayment(false);
            toast.success(`Sale Complete: ${inv}`, { duration: 4000 });
            searchInputRef.current?.focus();
          }} 
        />
      )}

      {/* Held Sales Modal */}
      {showHeldModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center rounded-t-xl">
              <h2 className="text-xl font-bold text-gray-800">Held Sales ({heldCarts.length})</h2>
              <button onClick={() => setShowHeldModal(false)} className="text-gray-500 hover:text-gray-700">
                <Trash2 size={24} className="opacity-0" /> {/* Spacer */}
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {heldCarts.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No held sales.</div>
              ) : (
                heldCarts.map((h) => (
                  <div key={h.sale.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                    <div>
                      <div className="font-bold text-gray-800">{h.sale.name || `Held Sale ${h.sale.id.substring(0, 8)}`}</div>
                      <div className="text-sm text-gray-500">{h.items.length} items • Rs. {(h.sale.grand_total / 100).toFixed(2)}</div>
                      <div className="text-xs text-gray-400">{h.sale.created_at}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (confirm("Delete this held sale?")) {
                            if (!token) return;
                            await POSAPI.deleteHeldSale(token, h.sale.id);
                            fetchHeldSales();
                          }
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 size={20} />
                      </button>
                      <button
                        onClick={() => handleResumeSale(h)}
                        className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 flex items-center gap-2"
                      >
                        <PlayCircle size={18} /> Resume
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Product Modal */}
      {showQuickAddModal && (
        <QuickAddProductModal 
          initialBarcode={scannedBarcode}
          onClose={() => {
            setShowQuickAddModal(false);
            searchInputRef.current?.focus();
          }}
          onSuccess={(product) => {
            setShowQuickAddModal(false);
            toast.success("Product created successfully");
            // Add to cart directly
            store.addItem({
              product_id: product.id,
              name: product.name_en,
              barcode: product.barcode,
              sku: product.sku,
              quantity: 1,
              unit_price: product.selling_price,
              discount_amount: product.discount_amount || 0,
              tax_amount: 0,
              stock: product.current_stock
            });
            searchInputRef.current?.focus();
          }}
        />
      )}

      {/* Manual Quantity Modal */}
      {quantityPromptProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Enter Quantity</h2>
              <button onClick={() => setQuantityPromptProduct(null)} className="text-gray-500 hover:text-gray-700">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <form onSubmit={handleManualQuantitySubmit} className="p-6 space-y-4">
              <div>
                <div className="font-bold text-gray-800 mb-2">{quantityPromptProduct.name_en}</div>
                <div className="text-sm text-gray-500 mb-4">Price: Rs. {(quantityPromptProduct.selling_price / 100).toFixed(2)}</div>
                
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input 
                  type="number"
                  step="0.001"
                  value={manualQuantity}
                  onChange={(e) => setManualQuantity(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono" 
                  autoFocus
                />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-200">
                <button 
                  type="button" 
                  onClick={() => setQuantityPromptProduct(null)} 
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-blue-600 rounded-lg text-white font-medium hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
