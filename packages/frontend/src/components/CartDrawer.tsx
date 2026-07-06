import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CartDrawer() {
  const { items, isDrawerOpen, closeDrawer, removeItem, updateQuantity, subtotalCents, itemCount } = useCart();

  return (
    <Transition.Root show={isDrawerOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={closeDrawer}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col bg-white shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-4 border-b">
                      <Dialog.Title className="text-lg font-semibold text-gray-900">
                        Cart ({itemCount})
                      </Dialog.Title>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-500"
                        onClick={closeDrawer}
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    </div>

                    {/* Items */}
                    <div className="flex-1 overflow-y-auto px-4 py-4">
                      {items.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-gray-500 mb-4">Your cart is empty</p>
                          <Link
                            to="/shop"
                            onClick={closeDrawer}
                            className="text-primary-600 hover:text-primary-700 font-medium"
                          >
                            Browse Shop
                          </Link>
                        </div>
                      ) : (
                        <ul className="divide-y divide-gray-200">
                          {items.map((item) => (
                            <li key={item.lineId} className="flex py-4 gap-4">
                              {/* Thumbnail */}
                              <div className="h-16 w-16 flex-shrink-0 rounded-md bg-gray-100 overflow-hidden">
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.productName}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-gray-400 text-2xl">
                                    <span aria-hidden="true">👕</span>
                                  </div>
                                )}
                              </div>

                              {/* Details */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {item.productName}
                                </p>
                                <p className="text-sm text-gray-500 truncate">
                                  {[item.color, item.size].filter(Boolean).join(' · ') || item.itemType}
                                </p>
                                {item.decorations.length > 0 && (
                                  <ul className="text-xs text-gray-500 mt-0.5">
                                    {item.decorations.map((d, i) => (
                                      <li key={i} className="truncate">
                                        + {d.label}{d.text ? `: “${d.text}”` : ''}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                <p className="text-sm font-medium text-gray-800 mt-1">
                                  {formatPrice(item.unitPriceCents)}
                                </p>

                                {/* Quantity controls */}
                                <div className="flex items-center gap-2 mt-2">
                                  <button
                                    onClick={() => updateQuantity(item.lineId, item.quantity - 1)}
                                    disabled={item.quantity <= 1}
                                    className="w-6 h-6 rounded border border-gray-300 text-gray-600 text-xs hover:bg-gray-50 disabled:opacity-40"
                                  >
                                    -
                                  </button>
                                  <span className="text-sm w-6 text-center">{item.quantity}</span>
                                  <button
                                    onClick={() => updateQuantity(item.lineId, item.quantity + 1)}
                                    className="w-6 h-6 rounded border border-gray-300 text-gray-600 text-xs hover:bg-gray-50 disabled:opacity-40"
                                  >
                                    +
                                  </button>
                                  <button
                                    onClick={() => removeItem(item.lineId)}
                                    className="ml-auto text-xs text-red-500 hover:text-red-700"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Footer */}
                    {items.length > 0 && (
                      <div className="border-t px-4 py-4 space-y-3">
                        <div className="flex justify-between text-base font-medium text-gray-900">
                          <p>Subtotal</p>
                          <p>{formatPrice(subtotalCents)}</p>
                        </div>
                        <p className="text-sm text-gray-500">
                          Shipping calculated at checkout.
                        </p>
                        <Link
                          to="/shop/checkout"
                          onClick={closeDrawer}
                          className="block w-full text-center px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
                        >
                          Checkout
                        </Link>
                        <Link
                          to="/shop/cart"
                          onClick={closeDrawer}
                          className="block w-full text-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                        >
                          View Cart
                        </Link>
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
