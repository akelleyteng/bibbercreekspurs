import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';

// A chosen decoration on a cart line (e.g. front logo, or a back name with text).
export interface CartDecoration {
  decorationId: string;
  label: string;
  placement?: string;
  text?: string; // personalization text, when the decoration requires it
  priceCents: number;
}

// A configured, ready-to-order line: a product + color/size + decorations.
export interface CartItem {
  lineId: string; // stable key derived from the configuration (identical configs merge)
  productId: string;
  productName: string;
  itemType: string;
  imageUrl?: string;
  color?: string;
  size?: string;
  decorations: CartDecoration[];
  unitPriceCents: number; // blank cost + sum of decoration prices
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'lineId'>) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, qty: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotalCents: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

// v2: custom screen-print cart shape (replaces the Printful variant cart).
const STORAGE_KEY = 'bibber-cart-v2';
const MAX_QTY = 20;

const CartContext = createContext<CartContextValue | null>(null);

/** Stable identity for a configured line so identical configs stack quantity. */
function computeLineId(item: Omit<CartItem, 'lineId'>): string {
  const decos = [...item.decorations]
    .sort((a, b) => a.decorationId.localeCompare(b.decorationId))
    .map((d) => `${d.decorationId}:${d.text ?? ''}:${d.placement ?? ''}`);
  return [item.productId, item.color ?? '', item.size ?? '', ...decos].join('|');
}

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

  const addItem = useCallback((newItem: Omit<CartItem, 'lineId'>) => {
    const lineId = computeLineId(newItem);
    setItems((prev) => {
      const existing = prev.find((i) => i.lineId === lineId);
      if (existing) {
        return prev.map((i) =>
          i.lineId === lineId ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + newItem.quantity) } : i
        );
      }
      return [...prev, { ...newItem, lineId }];
    });
  }, []);

  const removeItem = useCallback((lineId: string) => {
    setItems((prev) => prev.filter((i) => i.lineId !== lineId));
  }, []);

  const updateQuantity = useCallback((lineId: string, qty: number) => {
    if (qty < 1) return;
    setItems((prev) =>
      prev.map((i) => (i.lineId === lineId ? { ...i, quantity: Math.min(MAX_QTY, qty) } : i))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);
  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
  const subtotalCents = useMemo(
    () => items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0),
    [items]
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
