import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { PayPalButtons } from '@paypal/react-paypal-js';
import { useCart } from '../context/CartContext';
import { authFetch } from '../utils/authFetch';

interface CheckoutForm {
  buyerEmail: string;
  buyerName: string;
  shippingName: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
}

interface ShippingRate {
  id: string;
  name: string;
  rate: string;
  currency: string;
  minDeliveryDays: number;
  maxDeliveryDays: number;
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

const ESTIMATE_SHIPPING_QUERY = `
  mutation EstimateShipping($input: EstimateShippingInput!) {
    estimateShipping(input: $input) {
      id name rate currency minDeliveryDays maxDeliveryDays
    }
  }
`;

const CREATE_PAYPAL_ORDER_QUERY = `
  mutation CreatePayPalOrder($input: CreatePayPalOrderInput!) {
    createPayPalOrder(input: $input) {
      paypalOrderId confirmationCode
    }
  }
`;

const CAPTURE_PAYPAL_ORDER_QUERY = `
  mutation CapturePayPalOrder($paypalOrderId: String!) {
    capturePayPalOrder(paypalOrderId: $paypalOrderId) {
      success confirmationCode status
    }
  }
`;

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotalCents, clearCart } = useCart();
  const { register, handleSubmit, getValues, formState: { errors } } = useForm<CheckoutForm>({
    defaultValues: { state: 'CO' },
  });

  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const [shippingCents, setShippingCents] = useState(0);
  const [estimatingShipping, setEstimatingShipping] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const totalCents = subtotalCents + shippingCents;

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <span className="text-5xl mb-4 block" aria-hidden="true">🛒</span>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Your cart is empty</h2>
        <Link to="/shop" className="btn-primary mt-4 inline-block">
          Browse Shop
        </Link>
      </div>
    );
  }

  const handleEstimateShipping = async () => {
    const values = getValues();
    if (!values.address1 || !values.city || !values.state || !values.zip || !values.shippingName) {
      setShippingError('Please fill in the shipping address first.');
      return;
    }

    setEstimatingShipping(true);
    setShippingError(null);
    setShippingRates([]);
    setSelectedRateId(null);
    setShippingCents(0);

    try {
      const result = await authFetch(ESTIMATE_SHIPPING_QUERY, {
        input: {
          address: {
            name: values.shippingName,
            address1: values.address1,
            address2: values.address2 || undefined,
            city: values.city,
            state: values.state,
            zip: values.zip,
            country: 'US',
          },
          items: items.map((item) => ({
            printfulVariantId: item.printfulVariantId,
            printfulProductId: item.printfulProductId,
            productName: item.productName,
            variantName: item.variantName,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
          })),
        },
      });

      if (result.errors) {
        setShippingError(result.errors[0]?.message || 'Failed to estimate shipping');
      } else {
        const rates = result.data.estimateShipping;
        setShippingRates(rates);
        if (rates.length > 0) {
          setSelectedRateId(rates[0].id);
          setShippingCents(Math.round(parseFloat(rates[0].rate) * 100));
        }
      }
    } catch (err: any) {
      setShippingError(err.message || 'Failed to estimate shipping');
    } finally {
      setEstimatingShipping(false);
    }
  };

  const handleRateSelect = (rate: ShippingRate) => {
    setSelectedRateId(rate.id);
    setShippingCents(Math.round(parseFloat(rate.rate) * 100));
  };

  const createOrder = async (): Promise<string> => {
    const values = getValues();

    const result = await authFetch(CREATE_PAYPAL_ORDER_QUERY, {
      input: {
        buyerEmail: values.buyerEmail,
        buyerName: values.buyerName,
        address: {
          name: values.shippingName,
          address1: values.address1,
          address2: values.address2 || undefined,
          city: values.city,
          state: values.state,
          zip: values.zip,
          country: 'US',
        },
        items: items.map((item) => ({
          printfulVariantId: item.printfulVariantId,
          printfulProductId: item.printfulProductId,
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
        })),
        shippingRateId: selectedRateId || '',
        shippingCents,
      },
    });

    if (result.errors) {
      throw new Error(result.errors[0]?.message || 'Failed to create order');
    }

    return result.data.createPayPalOrder.paypalOrderId;
  };

  const onApprove = async (data: { orderID: string }) => {
    setProcessing(true);
    setPaymentError(null);

    try {
      const result = await authFetch(CAPTURE_PAYPAL_ORDER_QUERY, {
        paypalOrderId: data.orderID,
      });

      if (result.errors) {
        setPaymentError(result.errors[0]?.message || 'Payment capture failed');
        return;
      }

      const { success, confirmationCode } = result.data.capturePayPalOrder;
      if (success) {
        clearCart();
        navigate(`/shop/order-confirmation?code=${confirmationCode}`);
      } else {
        setPaymentError('Payment was not completed. Please try again.');
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const isReadyToPay =
    !estimatingShipping &&
    selectedRateId !== null &&
    shippingRates.length > 0;

  return (
    <div>
      <Link to="/shop/cart" className="text-primary-600 hover:text-primary-700 font-medium mb-6 inline-block">
        &larr; Back to Cart
      </Link>

      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left column: Forms */}
        <div className="lg:col-span-2 space-y-8">
          {/* Contact Info */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  {...register('buyerName', { required: 'Name is required' })}
                  className="input w-full"
                  placeholder="John Smith"
                />
                {errors.buyerName && <p className="text-red-500 text-xs mt-1">{errors.buyerName.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  {...register('buyerEmail', {
                    required: 'Email is required',
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
                  })}
                  type="email"
                  className="input w-full"
                  placeholder="john@example.com"
                />
                {errors.buyerEmail && <p className="text-red-500 text-xs mt-1">{errors.buyerEmail.message}</p>}
              </div>
            </div>
          </section>

          {/* Shipping Address */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping Address</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Name *</label>
                <input
                  {...register('shippingName', { required: 'Recipient name is required' })}
                  className="input w-full"
                  placeholder="John Smith"
                />
                {errors.shippingName && <p className="text-red-500 text-xs mt-1">{errors.shippingName.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1 *</label>
                <input
                  {...register('address1', { required: 'Address is required' })}
                  className="input w-full"
                  placeholder="123 Main St"
                />
                {errors.address1 && <p className="text-red-500 text-xs mt-1">{errors.address1.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                <input {...register('address2')} className="input w-full" placeholder="Apt 4B" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="col-span-2 sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input
                    {...register('city', { required: 'City is required' })}
                    className="input w-full"
                    placeholder="Denver"
                  />
                  {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                  <select
                    {...register('state', { required: 'State is required' })}
                    className="input w-full"
                  >
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP *</label>
                  <input
                    {...register('zip', { required: 'ZIP is required', pattern: { value: /^\d{5}(-\d{4})?$/, message: 'Invalid ZIP' } })}
                    className="input w-full"
                    placeholder="80202"
                  />
                  {errors.zip && <p className="text-red-500 text-xs mt-1">{errors.zip.message}</p>}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmit(handleEstimateShipping)}
                disabled={estimatingShipping}
                className="btn-primary"
              >
                {estimatingShipping ? 'Estimating...' : 'Estimate Shipping'}
              </button>

              {shippingError && (
                <p className="text-red-500 text-sm">{shippingError}</p>
              )}
            </div>
          </section>

          {/* Shipping Rates */}
          {shippingRates.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping Method</h2>
              <div className="space-y-2">
                {shippingRates.map((rate) => (
                  <label
                    key={rate.id}
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedRateId === rate.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shippingRate"
                        checked={selectedRateId === rate.id}
                        onChange={() => handleRateSelect(rate)}
                        className="text-primary-600"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{rate.name}</p>
                        <p className="text-sm text-gray-500">
                          {rate.minDeliveryDays}-{rate.maxDeliveryDays} business days
                        </p>
                      </div>
                    </div>
                    <p className="font-medium text-gray-900">${rate.rate}</p>
                  </label>
                ))}
              </div>
            </section>
          )}

          {/* Payment */}
          {isReadyToPay && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment</h2>
              {paymentError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                  {paymentError}
                </div>
              )}
              {processing ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Processing your payment...</p>
                </div>
              ) : (
                <PayPalButtons
                  style={{ layout: 'vertical', shape: 'rect', label: 'pay' }}
                  createOrder={async () => {
                    try {
                      return await createOrder();
                    } catch (err: any) {
                      setPaymentError(err.message || 'Failed to create order');
                      throw err;
                    }
                  }}
                  onApprove={async (data) => {
                    await onApprove(data);
                  }}
                  onError={(err) => {
                    setPaymentError('Payment was cancelled or failed. Please try again.');
                  }}
                />
              )}
            </section>
          )}
        </div>

        {/* Right column: Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 rounded-lg p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
            <ul className="divide-y divide-gray-200 mb-4">
              {items.map((item) => (
                <li key={item.printfulVariantId} className="py-3 flex justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                    <p className="text-xs text-gray-500">{item.variantName} x {item.quantity}</p>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatPrice(item.unitPriceCents * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">{formatPrice(subtotalCents)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span className="text-gray-900">
                  {shippingCents > 0 ? formatPrice(shippingCents) : '—'}
                </span>
              </div>
              <div className="flex justify-between text-base font-semibold border-t pt-2">
                <span>Total</span>
                <span>{formatPrice(totalCents)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
