import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ShopPage from '../pages/ShopPage';

// Mock authFetch
jest.mock('../utils/authFetch', () => ({
  authFetch: jest.fn(),
}));

// Mock AuthContext
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }),
}));

import { authFetch } from '../utils/authFetch';
const mockAuthFetch = authFetch as jest.MockedFunction<typeof authFetch>;

function renderShopPage() {
  return render(
    <MemoryRouter>
      <ShopPage />
    </MemoryRouter>
  );
}

describe('ShopPage', () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
  });

  it('renders loading skeletons initially', () => {
    mockAuthFetch.mockReturnValue(new Promise(() => {})); // Never resolves
    renderShopPage();

    expect(screen.getByText('Club Shop')).toBeInTheDocument();
  });

  it('renders product grid when products are loaded', async () => {
    mockAuthFetch.mockResolvedValue({
      data: {
        shopProducts: [
          {
            id: '1',
            printfulId: 123,
            name: 'Club Tee',
            description: 'A great tee',
            thumbnailUrl: 'https://img.com/tee.jpg',
            retailPriceCents: 2500,
            creditEligible: false,
            variants: [
              { variantId: 1, name: 'S', size: 'S', color: 'Black', inStock: true },
              { variantId: 2, name: 'M', size: 'M', color: 'Black', inStock: true },
            ],
          },
          {
            id: '2',
            printfulId: 456,
            name: 'Club Hoodie',
            description: 'Warm and cozy',
            thumbnailUrl: 'https://img.com/hoodie.jpg',
            retailPriceCents: 4500,
            creditEligible: true,
            variants: [],
          },
        ],
      },
    });

    renderShopPage();

    await waitFor(() => {
      expect(screen.getByText('Club Tee')).toBeInTheDocument();
      expect(screen.getByText('Club Hoodie')).toBeInTheDocument();
    });

    // Check price display
    expect(screen.getByText('$25.00')).toBeInTheDocument();
    expect(screen.getByText('$45.00')).toBeInTheDocument();
  });

  it('renders empty state when no products', async () => {
    mockAuthFetch.mockResolvedValue({
      data: { shopProducts: [] },
    });

    renderShopPage();

    await waitFor(() => {
      expect(screen.getByText(/check back soon/i)).toBeInTheDocument();
    });
  });

  it('renders error state on fetch failure', async () => {
    mockAuthFetch.mockResolvedValue({
      errors: [{ message: 'Server error' }],
    });

    renderShopPage();

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('displays size count for products with variants', async () => {
    mockAuthFetch.mockResolvedValue({
      data: {
        shopProducts: [
          {
            id: '1',
            printfulId: 123,
            name: 'Club Tee',
            retailPriceCents: 2500,
            creditEligible: false,
            variants: [
              { variantId: 1, name: 'S', size: 'S', inStock: true },
              { variantId: 2, name: 'M', size: 'M', inStock: true },
              { variantId: 3, name: 'L', size: 'L', inStock: true },
            ],
          },
        ],
      },
    });

    renderShopPage();

    await waitFor(() => {
      expect(screen.getByText('3 sizes available')).toBeInTheDocument();
    });
  });

  it('shows "From $X" when variants have different prices and no retail price', async () => {
    mockAuthFetch.mockResolvedValue({
      data: {
        shopProducts: [
          {
            id: '1',
            printfulId: 123,
            name: 'Club Tee',
            retailPriceCents: null,
            creditEligible: false,
            variants: [
              { variantId: 1, name: 'S', retailPriceCents: 2000, inStock: true },
              { variantId: 2, name: 'XL', retailPriceCents: 2500, inStock: true },
            ],
          },
        ],
      },
    });

    renderShopPage();

    await waitFor(() => {
      expect(screen.getByText('From $20.00')).toBeInTheDocument();
    });
  });
});
