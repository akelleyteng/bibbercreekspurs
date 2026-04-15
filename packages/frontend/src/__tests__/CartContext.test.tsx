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

const teeItem: CartItem = {
  printfulVariantId: 1001,
  printfulProductId: 123,
  productName: 'Club Tee',
  variantName: 'M / Black',
  quantity: 1,
  unitPriceCents: 2500,
};

const hoodieItem: CartItem = {
  printfulVariantId: 2002,
  printfulProductId: 456,
  productName: 'Club Hoodie',
  variantName: 'L / Navy',
  quantity: 1,
  unitPriceCents: 4500,
};

describe('CartContext', () => {
  describe('useCart outside provider', () => {
    it('should throw when used outside CartProvider', () => {
      // Suppress console.error from React for this test
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => renderHook(() => useCart())).toThrow(
        'useCart must be used within a CartProvider',
      );
      spy.mockRestore();
    });
  });

  describe('addItem', () => {
    it('should add a new item to the cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => result.current.addItem(teeItem));

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].productName).toBe('Club Tee');
      expect(result.current.itemCount).toBe(1);
      expect(result.current.subtotalCents).toBe(2500);
    });

    it('should merge quantity when adding same variant', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => result.current.addItem(teeItem));
      act(() => result.current.addItem({ ...teeItem, quantity: 2 }));

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(3);
      expect(result.current.itemCount).toBe(3);
    });

    it('should cap merged quantity at 10', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => result.current.addItem({ ...teeItem, quantity: 7 }));
      act(() => result.current.addItem({ ...teeItem, quantity: 5 }));

      expect(result.current.items[0].quantity).toBe(10);
    });

    it('should add different variants as separate items', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => result.current.addItem(teeItem));
      act(() => result.current.addItem(hoodieItem));

      expect(result.current.items).toHaveLength(2);
      expect(result.current.itemCount).toBe(2);
      expect(result.current.subtotalCents).toBe(7000);
    });
  });

  describe('removeItem', () => {
    it('should remove an item by variant ID', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => result.current.addItem(teeItem));
      act(() => result.current.addItem(hoodieItem));
      act(() => result.current.removeItem(1001));

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].productName).toBe('Club Hoodie');
    });

    it('should do nothing when removing non-existent variant', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => result.current.addItem(teeItem));
      act(() => result.current.removeItem(9999));

      expect(result.current.items).toHaveLength(1);
    });
  });

  describe('updateQuantity', () => {
    it('should update quantity for a variant', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => result.current.addItem(teeItem));
      act(() => result.current.updateQuantity(1001, 3));

      expect(result.current.items[0].quantity).toBe(3);
      expect(result.current.subtotalCents).toBe(7500);
    });

    it('should cap quantity at 10', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => result.current.addItem(teeItem));
      act(() => result.current.updateQuantity(1001, 15));

      expect(result.current.items[0].quantity).toBe(10);
    });

    it('should ignore quantity less than 1', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => result.current.addItem(teeItem));
      act(() => result.current.updateQuantity(1001, 0));

      expect(result.current.items[0].quantity).toBe(1); // Unchanged
    });
  });

  describe('clearCart', () => {
    it('should remove all items', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => result.current.addItem(teeItem));
      act(() => result.current.addItem(hoodieItem));
      act(() => result.current.clearCart());

      expect(result.current.items).toHaveLength(0);
      expect(result.current.itemCount).toBe(0);
      expect(result.current.subtotalCents).toBe(0);
    });
  });

  describe('computed values', () => {
    it('should calculate itemCount as total quantity', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => result.current.addItem({ ...teeItem, quantity: 3 }));
      act(() => result.current.addItem({ ...hoodieItem, quantity: 2 }));

      expect(result.current.itemCount).toBe(5);
    });

    it('should calculate subtotalCents correctly', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => result.current.addItem({ ...teeItem, quantity: 2 }));   // 2500 * 2 = 5000
      act(() => result.current.addItem({ ...hoodieItem, quantity: 1 })); // 4500 * 1 = 4500

      expect(result.current.subtotalCents).toBe(9500);
    });
  });

  describe('drawer state', () => {
    it('should start with drawer closed', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      expect(result.current.isDrawerOpen).toBe(false);
    });

    it('should open and close drawer', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => result.current.openDrawer());
      expect(result.current.isDrawerOpen).toBe(true);

      act(() => result.current.closeDrawer());
      expect(result.current.isDrawerOpen).toBe(false);
    });
  });

  describe('localStorage persistence', () => {
    it('should save cart to localStorage on change', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => result.current.addItem(teeItem));

      const stored = JSON.parse(mockStorage['bibber-cart']);
      expect(stored).toHaveLength(1);
      expect(stored[0].productName).toBe('Club Tee');
    });

    it('should load cart from localStorage on mount', () => {
      mockStorage['bibber-cart'] = JSON.stringify([teeItem]);

      const { result } = renderHook(() => useCart(), { wrapper });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].productName).toBe('Club Tee');
    });

    it('should handle invalid localStorage data gracefully', () => {
      mockStorage['bibber-cart'] = 'not-json';

      const { result } = renderHook(() => useCart(), { wrapper });

      expect(result.current.items).toHaveLength(0);
    });
  });
});
