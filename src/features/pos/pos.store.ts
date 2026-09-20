import { create } from 'zustand';
import { CartItem } from './pos.api';

interface POSState {
  cart: CartItem[];
  cartDiscountAmount: number; // Flat discount on the entire cart
  customer_id?: string;
  
  // Computed values
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;

  addItem: (item: Omit<CartItem, 'subtotal' | 'total'>) => void;
  removeItem: (product_id: string) => void;
  updateQuantity: (product_id: string, qty: number) => void;
  setCartDiscount: (amount: number) => void;
  clearCart: () => void;
  setCartFromHeld: (items: CartItem[]) => void;
}

const calculateTotals = (cart: CartItem[], cartDiscount: number) => {
  let subtotal = 0;
  let taxTotal = 0;
  let discountTotal = cartDiscount;

  cart.forEach(item => {
    subtotal += item.subtotal;
    taxTotal += item.tax_amount * item.quantity;
    discountTotal += item.discount_amount * item.quantity;
  });

  const grandTotal = subtotal + taxTotal - discountTotal;
  return { subtotal, taxTotal, discountTotal, grandTotal: Math.max(0, grandTotal) };
};

export const usePOSStore = create<POSState>((set) => ({
  cart: [],
  cartDiscountAmount: 0,
  
  subtotal: 0,
  taxTotal: 0,
  discountTotal: 0,
  grandTotal: 0,

  addItem: (newItem) => set((state) => {
    const existing = state.cart.find(i => i.product_id === newItem.product_id);
    let newCart = [...state.cart];
    
    if (existing) {
      if (existing.quantity >= existing.stock) {
        // Can't add more than stock
        return state;
      }
      
      newCart = newCart.map(i => {
        if (i.product_id === newItem.product_id) {
          const qty = i.quantity + 1;
          const sub = i.unit_price * qty;
          return {
            ...i,
            quantity: qty,
            subtotal: sub,
            total: sub - (i.discount_amount * qty) + (i.tax_amount * qty)
          };
        }
        return i;
      });
    } else {
      const sub = newItem.unit_price * newItem.quantity;
      newCart.push({
        ...newItem,
        subtotal: sub,
        total: sub - (newItem.discount_amount * newItem.quantity) + (newItem.tax_amount * newItem.quantity)
      });
    }

    const totals = calculateTotals(newCart, state.cartDiscountAmount);
    return { cart: newCart, ...totals };
  }),

  removeItem: (product_id) => set((state) => {
    const newCart = state.cart.filter(i => i.product_id !== product_id);
    const totals = calculateTotals(newCart, state.cartDiscountAmount);
    return { cart: newCart, ...totals };
  }),

  updateQuantity: (product_id, qty) => set((state) => {
    if (qty <= 0) {
      const newCart = state.cart.filter(i => i.product_id !== product_id);
      const totals = calculateTotals(newCart, state.cartDiscountAmount);
      return { cart: newCart, ...totals };
    }

    const newCart = state.cart.map(i => {
      if (i.product_id === product_id) {
        const validQty = Math.min(qty, i.stock);
        const sub = i.unit_price * validQty;
        return {
          ...i,
          quantity: validQty,
          subtotal: sub,
          total: sub - (i.discount_amount * validQty) + (i.tax_amount * validQty)
        };
      }
      return i;
    });

    const totals = calculateTotals(newCart, state.cartDiscountAmount);
    return { cart: newCart, ...totals };
  }),

  setCartDiscount: (amount) => set((state) => {
    const totals = calculateTotals(state.cart, amount);
    return { cartDiscountAmount: amount, ...totals };
  }),

  clearCart: () => set({ cart: [], cartDiscountAmount: 0, subtotal: 0, taxTotal: 0, discountTotal: 0, grandTotal: 0, customer_id: undefined }),

  setCartFromHeld: (items) => set(() => {
    const totals = calculateTotals(items, 0);
    return { cart: items, cartDiscountAmount: 0, ...totals };
  })
}));
