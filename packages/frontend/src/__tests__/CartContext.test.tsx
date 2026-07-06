import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart, CartItem } from '../context/CartContext';

// Mock localStorage
const mockStorage: Record<string, string> = {};
beforeEach(() => {
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => mockStorage[key] || null);
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
    mockStorage[key] = value;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CartProvider>{children}</CartProvider>
);

type NewItem = Omit<CartItem, 'lineId'>;

const teeItem: NewItem = {
  productId: 'p-tee',
  productName: 'Club Tee',
  itemType: 'Tee',
  color: 'Black',
  size: 'M',
  decorations: [],
  unitPriceCents: 2500,
  quantity: 1,
};

const hoodieItem: NewItem = {
  productId: 'p-hoodie',
  productName: 'Club Hoodie',
  itemType: 'Hoodie',
  color: 'Navy',
  size: 'L',
  decorations: [],
  unitPriceCents: 4500,
  quantity: 1,
};

describe('CartContext', () => {
  describe('useCart outside provider', () => {
    it('should throw when used outside CartProvider', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => renderHook(() => useCart())).toThrow('useCart must be used within a CartProvider');
      spy.mockRestore();
    });
  });

  describe('addItem', () => {
    it('adds a new item and assigns a lineId', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      act(() => result.current.addItem(teeItem));

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].lineId).toBeTruthy();
      expect(result.current.items[0].productName).toBe('Club Tee');
      expect(result.current.itemCount).toBe(1);
      expect(result.current.subtotalCents).toBe(2500);
    });

    it('merges quantity when the same configuration is added again', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      act(() => result.current.addItem(teeItem));
      act(() => result.current.addItem({ ...teeItem, quantity: 2 }));

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(3);
    });

    it('treats a different size as a separate line', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      act(() => result.current.addItem(teeItem));
      act(() => result.current.addItem({ ...teeItem, size: 'L' }));

      expect(result.current.items).toHaveLength(2);
    });

    it('treats different personalization text as a separate line', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const withName = (text: string): NewItem => ({
        ...teeItem,
        decorations: [{ decorationId: 'd1', label: 'Name', text, priceCents: 500 }],
        unitPriceCents: 3000,
      });
      act(() => result.current.addItem(withName('Riley')));
      act(() => result.current.addItem(withName('Cameran')));

      expect(result.current.items).toHaveLength(2);
    });

    it('caps merged quantity at 20', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      act(() => result.current.addItem({ ...teeItem, quantity: 15 }));
      act(() => result.current.addItem({ ...teeItem, quantity: 10 }));

      expect(result.current.items[0].quantity).toBe(20);
    });

    it('adds different products as separate items', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      act(() => result.current.addItem(teeItem));
      act(() => result.current.addItem(hoodieItem));

      expect(result.current.items).toHaveLength(2);
      expect(result.current.subtotalCents).toBe(7000);
    });
  });

  describe('removeItem / updateQuantity by lineId', () => {
    it('removes an item by lineId', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      act(() => result.current.addItem(teeItem));
      act(() => result.current.addItem(hoodieItem));
      const lineId = result.current.items[0].lineId;
      act(() => result.current.removeItem(lineId));

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].productName).toBe('Club Hoodie');
    });

    it('updates quantity by lineId and caps at 20', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      act(() => result.current.addItem(teeItem));
      const lineId = result.current.items[0].lineId;

      act(() => result.current.updateQuantity(lineId, 3));
      expect(result.current.items[0].quantity).toBe(3);

      act(() => result.current.updateQuantity(lineId, 99));
      expect(result.current.items[0].quantity).toBe(20);
    });

    it('ignores quantity less than 1', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      act(() => result.current.addItem(teeItem));
      const lineId = result.current.items[0].lineId;
      act(() => result.current.updateQuantity(lineId, 0));
      expect(result.current.items[0].quantity).toBe(1);
    });
  });

  describe('clearCart & computed values', () => {
    it('clears all items', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      act(() => result.current.addItem(teeItem));
      act(() => result.current.addItem(hoodieItem));
      act(() => result.current.clearCart());
      expect(result.current.items).toHaveLength(0);
      expect(result.current.itemCount).toBe(0);
      expect(result.current.subtotalCents).toBe(0);
    });

    it('computes itemCount and subtotal across lines', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      act(() => result.current.addItem({ ...teeItem, quantity: 2 }));   // 5000
      act(() => result.current.addItem({ ...hoodieItem, quantity: 1 })); // 4500
      expect(result.current.itemCount).toBe(3);
      expect(result.current.subtotalCents).toBe(9500);
    });
  });

  describe('drawer state', () => {
    it('opens and closes the drawer', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      expect(result.current.isDrawerOpen).toBe(false);
      act(() => result.current.openDrawer());
      expect(result.current.isDrawerOpen).toBe(true);
      act(() => result.current.closeDrawer());
      expect(result.current.isDrawerOpen).toBe(false);
    });
  });

  describe('localStorage persistence', () => {
    it('saves the cart under the v2 key', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      act(() => result.current.addItem(teeItem));
      const stored = JSON.parse(mockStorage['bibber-cart-v2']);
      expect(stored).toHaveLength(1);
      expect(stored[0].productName).toBe('Club Tee');
      expect(stored[0].lineId).toBeTruthy();
    });

    it('loads the cart from localStorage on mount', () => {
      mockStorage['bibber-cart-v2'] = JSON.stringify([{ ...teeItem, lineId: 'x' }]);
      const { result } = renderHook(() => useCart(), { wrapper });
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].productName).toBe('Club Tee');
    });

    it('handles invalid localStorage data gracefully', () => {
      mockStorage['bibber-cart-v2'] = 'not-json';
      const { result } = renderHook(() => useCart(), { wrapper });
      expect(result.current.items).toHaveLength(0);
    });
  });
});
