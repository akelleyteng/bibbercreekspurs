import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProductDetailPage from '../pages/ProductDetailPage';

// Mock authFetch
jest.mock('../utils/authFetch', () => ({
  authFetch: jest.fn(),
}));

// Mock AuthContext
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }),
}));

// Mock CartContext
jest.mock('../context/CartContext', () => ({
  useCart: () => ({
    addItem: jest.fn(),
    openDrawer: jest.fn(),
  }),
}));

import { authFetch } from '../utils/authFetch';
const mockAuthFetch = authFetch as jest.MockedFunction<typeof authFetch>;

const mockProduct = {
  id: '1',
  printfulId: 123,
  name: 'Club Embroidered Tee',
  description: 'Premium embroidered club tee shirt',
  thumbnailUrl: 'https://img.com/tee.jpg',
  retailPriceCents: 2500,
  creditEligible: false,
  variants: [
    { variantId: 1, name: 'S / Black', size: 'S', color: 'Black', colorHex: '#000000', inStock: true, retailPriceCents: 2500 },
    { variantId: 2, name: 'M / Black', size: 'M', color: 'Black', colorHex: '#000000', inStock: true, retailPriceCents: 2500 },
    { variantId: 3, name: 'L / Black', size: 'L', color: 'Black', colorHex: '#000000', inStock: true, retailPriceCents: 2500 },
    { variantId: 4, name: 'S / White', size: 'S', color: 'White', colorHex: '#FFFFFF', inStock: true, retailPriceCents: 2500 },
    { variantId: 5, name: 'XL / Black', size: 'XL', color: 'Black', colorHex: '#000000', inStock: false, retailPriceCents: 2500 },
  ],
};

function renderDetailPage(productId = '123') {
  return render(
    <MemoryRouter initialEntries={[`/shop/${productId}`]}>
      <Routes>
        <Route path="/shop/:productId" element={<ProductDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProductDetailPage', () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
  });

  it('renders product details', async () => {
    mockAuthFetch.mockResolvedValue({
      data: { shopProduct: mockProduct },
    });

    renderDetailPage();

    await waitFor(() => {
      expect(screen.getByText('Club Embroidered Tee')).toBeInTheDocument();
      expect(screen.getByText('$25.00')).toBeInTheDocument();
      expect(screen.getByText('Premium embroidered club tee shirt')).toBeInTheDocument();
    });
  });

  it('renders size selector buttons', async () => {
    mockAuthFetch.mockResolvedValue({
      data: { shopProduct: mockProduct },
    });

    renderDetailPage();

    await waitFor(() => {
      expect(screen.getByText('S')).toBeInTheDocument();
      expect(screen.getByText('M')).toBeInTheDocument();
      expect(screen.getByText('L')).toBeInTheDocument();
      expect(screen.getByText('XL')).toBeInTheDocument();
    });
  });

  it('renders color selector', async () => {
    mockAuthFetch.mockResolvedValue({
      data: { shopProduct: mockProduct },
    });

    renderDetailPage();

    await waitFor(() => {
      expect(screen.getByText(/Color/)).toBeInTheDocument();
    });
  });

  it('shows enabled Add to Cart button when variant is available', async () => {
    mockAuthFetch.mockResolvedValue({
      data: { shopProduct: mockProduct },
    });

    renderDetailPage();

    await waitFor(() => {
      const button = screen.getByText('Add to Cart');
      expect(button).not.toBeDisabled();
    });
  });

  it('renders quantity selector', async () => {
    mockAuthFetch.mockResolvedValue({
      data: { shopProduct: mockProduct },
    });

    renderDetailPage();

    await waitFor(() => {
      expect(screen.getByText('Quantity')).toBeInTheDocument();
    });
  });

  it('renders loading state', () => {
    mockAuthFetch.mockReturnValue(new Promise(() => {})); // Never resolves
    renderDetailPage();

    expect(screen.getByText(/Back to Shop/)).toBeInTheDocument();
  });

  it('renders error state for missing product', async () => {
    mockAuthFetch.mockResolvedValue({
      data: { shopProduct: null },
    });

    renderDetailPage();

    await waitFor(() => {
      expect(screen.getByText('Product not found')).toBeInTheDocument();
      expect(screen.getByText('Browse Shop')).toBeInTheDocument();
    });
  });

  it('renders error state on fetch error', async () => {
    mockAuthFetch.mockResolvedValue({
      errors: [{ message: 'Server error' }],
    });

    renderDetailPage();

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });

  it('shows out of stock message for unavailable variants', async () => {
    // Product with only one variant that's out of stock
    const outOfStockProduct = {
      ...mockProduct,
      variants: [
        { variantId: 1, name: 'S / Black', size: 'S', color: 'Black', colorHex: '#000000', inStock: false, retailPriceCents: 2500 },
      ],
    };

    mockAuthFetch.mockResolvedValue({
      data: { shopProduct: outOfStockProduct },
    });

    renderDetailPage();

    await waitFor(() => {
      expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
    });
  });

  it('has back to shop link', async () => {
    mockAuthFetch.mockResolvedValue({
      data: { shopProduct: mockProduct },
    });

    renderDetailPage();

    await waitFor(() => {
      const backLink = screen.getByText(/Back to Shop/);
      expect(backLink).toBeInTheDocument();
      expect(backLink.closest('a')).toHaveAttribute('href', '/shop');
    });
  });
});
