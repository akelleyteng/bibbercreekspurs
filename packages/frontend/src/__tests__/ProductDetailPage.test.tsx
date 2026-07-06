import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProductDetailPage from '../pages/ProductDetailPage';
import { CartProvider } from '../context/CartContext';

jest.mock('../utils/authFetch', () => ({ authFetch: jest.fn() }));
import { authFetch } from '../utils/authFetch';
const mockAuthFetch = authFetch as jest.MockedFunction<typeof authFetch>;

const product = {
  id: 'p1',
  itemType: 'Hoodie',
  name: 'Club Hoodie',
  brandStyle: 'Gildan SF500',
  description: 'Warm and cozy',
  imageUrl: null,
  blankCostCents: 1250,
  colors: [{ name: 'Black', hex: '#000000' }],
  sizes: ['Adult M', 'Adult L'],
  creditEligible: true,
  decorations: [
    { id: 'd1', decorationType: 'back_name', label: 'Name on Back', placementOptions: [], priceCents: 500, requiresText: true, sortOrder: 0 },
  ],
};

function renderDetail() {
  return render(
    <CartProvider>
      <MemoryRouter initialEntries={['/shop/p1']}>
        <Routes>
          <Route path="/shop/:productId" element={<ProductDetailPage />} />
        </Routes>
      </MemoryRouter>
    </CartProvider>
  );
}

describe('ProductDetailPage', () => {
  beforeEach(() => mockAuthFetch.mockReset());

  it('renders the loading state', () => {
    mockAuthFetch.mockReturnValue(new Promise(() => {}));
    renderDetail();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders product details, color/size options, and add-to-cart with the at-cost price', async () => {
    mockAuthFetch.mockResolvedValue({ data: { catalogProduct: product } });
    renderDetail();

    await waitFor(() => expect(screen.getByText('Club Hoodie')).toBeInTheDocument());
    expect(screen.getByText('Black')).toBeInTheDocument();
    expect(screen.getByText('Adult M')).toBeInTheDocument();
    expect(screen.getByText('Name on Back')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add to Cart — \$12\.50/i })).toBeInTheDocument();
  });

  it('renders a not-found state when the product is missing', async () => {
    mockAuthFetch.mockResolvedValue({ data: { catalogProduct: null } });
    renderDetail();
    await waitFor(() => expect(screen.getByText(/not found/i)).toBeInTheDocument());
  });
});
