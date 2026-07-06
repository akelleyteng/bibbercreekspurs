import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CheckoutPage from '../pages/CheckoutPage';

jest.mock('../utils/authFetch', () => ({ authFetch: jest.fn() }));
jest.mock('../context/CartContext', () => ({ useCart: jest.fn() }));
jest.mock('../context/AuthContext', () => ({ useAuth: jest.fn() }));

import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
const mockUseCart = useCart as jest.MockedFunction<typeof useCart>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

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

describe('CheckoutPage', () => {
  beforeEach(() => {
    mockUseCart.mockReturnValue({ items: [item], subtotalCents: 5000, clearCart: jest.fn() } as any);
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false } as any);
  });

  it('shows the order summary and a Place Order button for a logged-in user', () => {
    renderCheckout();
    expect(screen.getByText('Checkout')).toBeInTheDocument();
    expect(screen.getByText('Order summary')).toBeInTheDocument();
    expect(screen.getByText(/2× Club Tee/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /place order/i })).toBeInTheDocument();
  });

  it('prompts to log in when the user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false } as any);
    renderCheckout();
    expect(screen.getByText(/please log in to place your order/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /place order/i })).not.toBeInTheDocument();
  });

  it('shows an empty state when the cart is empty', () => {
    mockUseCart.mockReturnValue({ items: [], subtotalCents: 0, clearCart: jest.fn() } as any);
    renderCheckout();
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });
});
