import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CheckoutPage from '../pages/CheckoutPage';

// Mock authFetch
jest.mock('../utils/authFetch', () => ({
  authFetch: jest.fn(),
}));

// Mock CartContext
const mockClearCart = jest.fn();
const mockCartItems = [
  {
    printfulVariantId: 1001,
    printfulProductId: 123,
    productName: 'Club Tee',
    variantName: 'M / Black',
    quantity: 1,
    unitPriceCents: 2500,
    thumbnailUrl: 'https://img.com/tee.jpg',
  },
];

jest.mock('../context/CartContext', () => ({
  useCart: jest.fn(() => ({
    items: mockCartItems,
    itemCount: 1,
    subtotalCents: 2500,
    clearCart: mockClearCart,
  })),
}));

// Mock PayPal
jest.mock('@paypal/react-paypal-js', () => ({
  PayPalButtons: (props: any) => (
    <div data-testid="paypal-buttons">PayPal Buttons Mock</div>
  ),
}));

import { authFetch } from '../utils/authFetch';
import { useCart } from '../context/CartContext';
const mockAuthFetch = authFetch as jest.MockedFunction<typeof authFetch>;
const mockUseCart = useCart as jest.MockedFunction<typeof useCart>;

function renderCheckout() {
  return render(
    <MemoryRouter initialEntries={['/shop/checkout']}>
      <CheckoutPage />
    </MemoryRouter>,
  );
}

describe('CheckoutPage', () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
    mockClearCart.mockReset();
    mockUseCart.mockReturnValue({
      items: mockCartItems,
      itemCount: 1,
      subtotalCents: 2500,
      clearCart: mockClearCart,
    } as any);
  });

  it('renders checkout heading and order summary', () => {
    renderCheckout();

    expect(screen.getByText('Checkout')).toBeInTheDocument();
    expect(screen.getByText('Order Summary')).toBeInTheDocument();
    expect(screen.getByText('Club Tee')).toBeInTheDocument();
    expect(screen.getByText(/M \/ Black/)).toBeInTheDocument();
  });

  it('renders contact and shipping form fields', () => {
    renderCheckout();

    expect(screen.getByPlaceholderText('john@example.com')).toBeInTheDocument();
    // Two "John Smith" placeholders: buyerName and shippingName
    expect(screen.getAllByPlaceholderText('John Smith')).toHaveLength(2);
    expect(screen.getByPlaceholderText('123 Main St')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Denver')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('80202')).toBeInTheDocument();
  });

  it('renders estimate shipping button', () => {
    renderCheckout();

    expect(
      screen.getByRole('button', { name: /estimate shipping/i }),
    ).toBeInTheDocument();
  });

  it('does not show PayPal buttons until shipping is estimated', () => {
    renderCheckout();

    expect(screen.queryByTestId('paypal-buttons')).not.toBeInTheDocument();
  });

  it('shows subtotal in order summary', () => {
    renderCheckout();

    // $25.00 appears in item price, subtotal, and total
    expect(screen.getAllByText('$25.00').length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty cart message when cart is empty', () => {
    mockUseCart.mockReturnValue({
      items: [],
      itemCount: 0,
      subtotalCents: 0,
      clearCart: mockClearCart,
    } as any);

    renderCheckout();

    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    expect(screen.getByText('Browse Shop')).toBeInTheDocument();
  });

  it('displays shipping options after estimation', async () => {
    mockAuthFetch.mockResolvedValue({
      data: {
        estimateShipping: [
          {
            id: 'STANDARD',
            name: 'Standard Shipping',
            rate: '5.95',
            currency: 'USD',
            minDeliveryDays: 5,
            maxDeliveryDays: 8,
          },
        ],
      },
    });

    renderCheckout();
    const user = userEvent.setup();

    // Fill all required fields
    const nameInputs = screen.getAllByPlaceholderText('John Smith');
    await user.type(nameInputs[0], 'Jane Doe'); // buyerName
    await user.type(screen.getByPlaceholderText('john@example.com'), 'test@example.com');
    await user.type(nameInputs[1], 'Jane Doe'); // shippingName
    await user.type(screen.getByPlaceholderText('123 Main St'), '456 Oak Ave');
    await user.type(screen.getByPlaceholderText('Denver'), 'Boulder');
    await user.type(screen.getByPlaceholderText('80202'), '80301');

    await user.click(screen.getByRole('button', { name: /estimate shipping/i }));

    await waitFor(() => {
      expect(screen.getByText('Standard Shipping')).toBeInTheDocument();
      // $5.95 appears in both rate label and order summary shipping line
      expect(screen.getAllByText(/\$?5\.95/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/5-8 business days/)).toBeInTheDocument();
    });
  });

  it('shows PayPal buttons after shipping rates load (auto-selects first)', async () => {
    mockAuthFetch.mockResolvedValue({
      data: {
        estimateShipping: [
          {
            id: 'STANDARD',
            name: 'Standard Shipping',
            rate: '5.95',
            currency: 'USD',
            minDeliveryDays: 5,
            maxDeliveryDays: 8,
          },
        ],
      },
    });

    renderCheckout();
    const user = userEvent.setup();

    const nameInputs = screen.getAllByPlaceholderText('John Smith');
    await user.type(nameInputs[0], 'Jane Doe');
    await user.type(screen.getByPlaceholderText('john@example.com'), 'test@example.com');
    await user.type(nameInputs[1], 'Jane Doe');
    await user.type(screen.getByPlaceholderText('123 Main St'), '456 Oak Ave');
    await user.type(screen.getByPlaceholderText('Denver'), 'Boulder');
    await user.type(screen.getByPlaceholderText('80202'), '80301');

    await user.click(screen.getByRole('button', { name: /estimate shipping/i }));

    // Auto-selects first rate, so PayPal should appear
    await waitFor(() => {
      expect(screen.getByTestId('paypal-buttons')).toBeInTheDocument();
    });
  });

  it('displays shipping error message', async () => {
    mockAuthFetch.mockResolvedValue({
      errors: [{ message: 'Could not estimate shipping for this address' }],
    });

    renderCheckout();
    const user = userEvent.setup();

    const nameInputs = screen.getAllByPlaceholderText('John Smith');
    await user.type(nameInputs[0], 'Jane Doe');
    await user.type(screen.getByPlaceholderText('john@example.com'), 'test@example.com');
    await user.type(nameInputs[1], 'Jane Doe');
    await user.type(screen.getByPlaceholderText('123 Main St'), '456 Oak Ave');
    await user.type(screen.getByPlaceholderText('Denver'), 'Boulder');
    await user.type(screen.getByPlaceholderText('80202'), '80301');

    await user.click(screen.getByRole('button', { name: /estimate shipping/i }));

    await waitFor(() => {
      expect(screen.getByText('Could not estimate shipping for this address')).toBeInTheDocument();
    });
  });
});
