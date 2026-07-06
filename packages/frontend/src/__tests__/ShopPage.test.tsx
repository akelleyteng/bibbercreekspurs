import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ShopPage from '../pages/ShopPage';

jest.mock('../utils/authFetch', () => ({ authFetch: jest.fn() }));
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

const products = [
  { id: 'p1', itemType: 'Tee', name: 'Club Tee', brandStyle: 'Bella 3001CVC', imageUrl: null, blankCostCents: 500 },
  { id: 'p2', itemType: 'Hoodie', name: 'Club Hoodie', brandStyle: 'Gildan SF500', imageUrl: null, blankCostCents: 1250 },
];

describe('ShopPage', () => {
  beforeEach(() => mockAuthFetch.mockReset());

  it('renders the heading immediately', () => {
    mockAuthFetch.mockReturnValue(new Promise(() => {})); // never resolves
    renderShopPage();
    expect(screen.getByText('Club Shop')).toBeInTheDocument();
  });

  it('renders the product grid from catalogProducts', async () => {
    mockAuthFetch.mockResolvedValue({ data: { catalogProducts: products } });
    renderShopPage();

    await waitFor(() => {
      expect(screen.getByText('Club Tee')).toBeInTheDocument();
      expect(screen.getByText('Club Hoodie')).toBeInTheDocument();
    });
    expect(screen.getByText('From $5.00')).toBeInTheDocument();
    expect(screen.getByText('From $12.50')).toBeInTheDocument();
  });

  it('renders the empty state when there are no products', async () => {
    mockAuthFetch.mockResolvedValue({ data: { catalogProducts: [] } });
    renderShopPage();
    await waitFor(() => expect(screen.getByText(/check back soon/i)).toBeInTheDocument());
  });

  it('renders the error state on fetch failure', async () => {
    mockAuthFetch.mockResolvedValue({ errors: [{ message: 'Server error' }] });
    renderShopPage();
    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });
});
