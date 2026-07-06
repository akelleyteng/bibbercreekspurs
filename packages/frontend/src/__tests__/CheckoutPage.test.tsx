import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CheckoutPage from '../pages/CheckoutPage';

jest.mock('../context/CartContext', () => ({ useCart: jest.fn() }));
import { useCart } from '../context/CartContext';
const mockUseCart = useCart as jest.MockedFunction<typeof useCart>;

const item = {
  lineId: 'l1',
  productId: 'p1',
  productName: 'Club Tee',
  itemType: 'Tee',
  color: 'Black',
  size: 'M',
  decorations: [],
  unitPriceCents: 2500,
  quantity: 2,
};

function renderCheckout() {
  return render(
    <MemoryRouter>
      <CheckoutPage />
    </MemoryRouter>
  );
}

describe('CheckoutPage (interim)', () => {
  it('shows the order summary and subtotal for a non-empty cart', () => {
    mockUseCart.mockReturnValue({ items: [item], subtotalCents: 5000 } as any);
    renderCheckout();

    expect(screen.getByText('Checkout')).toBeInTheDocument();
    expect(screen.getByText(/2× Club Tee/)).toBeInTheDocument();
    // Appears twice (line total + subtotal) since there's a single line.
    expect(screen.getAllByText('$50.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/almost ready/i)).toBeInTheDocument();
  });

  it('shows an empty state when the cart is empty', () => {
    mockUseCart.mockReturnValue({ items: [], subtotalCents: 0 } as any);
    renderCheckout();

    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });
});
