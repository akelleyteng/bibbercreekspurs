import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';

export interface CartItem {
  printfulVariantId: number;
  printfulProductId: number;
  productName: string;
  variantName: string;
  size?: string;
  color?: string;
  quantity: number;
  unitPriceCents: number;
  thumbnailUrl?: string;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (variantId: number) => void;
  updateQuantity: (variantId: number, qty: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotalCents: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const STORAGE_KEY = 'bibber-cart';

const CartContext = createContext<CartContextValue | null>(null);

function loadCart(): CartItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore parse errors
  }
  return [];
}

function saveCart(items: CartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage errors
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    saveCart(items);
  }, [items]);

  const addItem = useCallback((newItem: CartItem) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.printfulVariantId === newItem.printfulVariantId,
      );
      if (existing) {
        return prev.map((i) =>
          i.printfulVariantId === newItem.printfulVariantId
            ? { ...i, quantity: Math.min(10, i.quantity + newItem.quantity) }
            : i,
        );
      }
      return [...prev, newItem];
    });
  }, []);

  const removeItem = useCallback((variantId: number) => {
    setItems((prev) => prev.filter((i) => i.printfulVariantId !== variantId));
  }, []);

  const updateQuantity = useCallback((variantId: number, qty: number) => {
    if (qty < 1) return;
    setItems((prev) =>
      prev.map((i) =>
        i.printfulVariantId === variantId
          ? { ...i, quantity: Math.min(10, qty) }
          : i,
      ),
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const itemCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  );

  const subtotalCents = useMemo(
    () => items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0),
    [items],
  );

  const value: CartContextValue = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    itemCount,
    subtotalCents,
    isDrawerOpen,
    openDrawer,
    closeDrawer,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
