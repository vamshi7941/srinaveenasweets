/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import type { Product } from '../types/contextTypes';
import {
  getProductInventoryState,
  getProductPrice,
  getProductOriginalPrice,
  getWeightOptions,
  getSelectedWeightOption,
} from '../utils/productInventory';
import { generateSlug, stripHtml } from '../utils/utils';
import CustomerUtils from '../utils/customer';
import { getDefaultInventorySelection } from '../utils/productInventory';
import CustomDropdown from './CustomDropdown';

export default function ProductCard({ product }: { product: Product }) {
  const { isInWishlist, user, cart, showToast } = useStore();
  const { addToCart, updateQuantity, toggleWishlist } = CustomerUtils();
  const displayPrice = getProductPrice(product);
  const displayOriginalPrice = getProductOriginalPrice(product);
  const discount = displayOriginalPrice
    ? Math.round(
        ((displayOriginalPrice - displayPrice) / displayOriginalPrice) * 100,
      )
    : 0;

  const liked = isInWishlist(product._id);
  const inventoryState = getProductInventoryState(product);
  const outOfStock = inventoryState.isOutOfStock;
  const isAdmin = user.role === 'admin';
  const isWeightProduct = product.inventoryType === 'weight';
  const productUrl = `/product/${generateSlug(product._id, product.name)}`;
  const weightOptions = getWeightOptions(product);
  const defaultWeight = getDefaultInventorySelection(product);

  const inStockWeightOptions = isWeightProduct
    ? weightOptions.filter((option) => {
        const stock = option.stock;
        if (stock === undefined || stock === null) return true;
        return stock > 0;
      })
    : weightOptions;

  const effectiveWeightOptions =
    inStockWeightOptions.length > 0 ? inStockWeightOptions : weightOptions;
  const effectiveDefaultWeight =
    effectiveWeightOptions.find(
      (opt) => opt.value.toString() === defaultWeight,
    ) || effectiveWeightOptions[0];

  const displaySelectedWeight =
    effectiveDefaultWeight?.value.toString() || defaultWeight;
  const [selectedWeight, setSelectedWeight] = useState<string>(
    displaySelectedWeight,
  );

  const selectedWeightOption = getSelectedWeightOption(product, selectedWeight);
  const selectedStock = selectedWeightOption?.stock;
  const maxStock =
    selectedStock !== undefined && selectedStock !== null
      ? selectedStock
      : selectedWeightOption?.value || 0;

  const hasAnyStock = effectiveWeightOptions.length > 0;
  const showOutOfStockOverlay = outOfStock || !hasAnyStock;

  // For unit products: quantity is fully derived from cart (real-time sync).
  // For weight products: a local staging quantity is used before committing via ADD TO BAG.
  const cartItem = cart.find(
    (item) =>
      item.product._id === product._id && item.weight === selectedWeight,
  );
  const cartQuantity = cartItem ? cartItem.quantity : 0;
  const [stagingQuantity, setStagingQuantity] = useState(0);

  // Keep staging quantity in sync with cart when weight selection changes
  useEffect(() => {
    setStagingQuantity(cartQuantity);
  }, [selectedWeight, cartQuantity]);

  // Reset selected weight when product changes
  useEffect(() => {
    setSelectedWeight(displaySelectedWeight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product._id]);

  // --- Unit product handlers (directly update cart, silently) ---
  const handleUnitIncrement = (e: React.MouseEvent) => {
    if (user.role === 'admin') return;
    e.preventDefault();
    e.stopPropagation();
    if (cartQuantity === 0) {
      addToCart(product, 1, selectedWeight, true);
    } else if (cartQuantity < maxStock) {
      updateQuantity(product._id, cartQuantity + 1, selectedWeight, true);
    } else {
      showToast(`Only ${maxStock} units available.`, 'warning');
    }
  };

  const handleUnitDecrement = (e: React.MouseEvent) => {
    if (user.role === 'admin') return;
    e.preventDefault();
    e.stopPropagation();
    if (cartQuantity > 0) {
      updateQuantity(product._id, cartQuantity - 1, selectedWeight, true);
    }
  };

  // --- Weight product handlers (stage locally, commit via ADD TO BAG) ---
  const handleWeightIncrement = (e: React.MouseEvent) => {
    if (user.role === 'admin') return;
    e.preventDefault();
    e.stopPropagation();
    if (cartQuantity > 0) {
      if (cartQuantity < maxStock) {
        updateQuantity(product._id, cartQuantity + 1, selectedWeight, true);
      } else {
        showToast(
          `Only ${maxStock} units available for ${selectedWeight} g.`,
          'warning',
        );
      }
    } else {
      setStagingQuantity((q) => Math.min(q + 1, maxStock));
    }
  };

  const handleWeightDecrement = (e: React.MouseEvent) => {
    if (user.role === 'admin') return;
    e.preventDefault();
    e.stopPropagation();
    if (cartQuantity > 0) {
      updateQuantity(product._id, cartQuantity - 1, selectedWeight, true);
    } else {
      setStagingQuantity((q) => Math.max(0, q - 1));
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    if (user.role === 'admin') return;
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1, selectedWeight, true);
  };

  return (
    <div className="group relative flex h-full flex-col rounded-3xl border border-(--color-border) bg-(--color-surface) shadow-[0_10px_30px_rgba(95,16,33,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-(--color-accent) hover:shadow-[0_22px_48px_-24px_rgba(26,15,15,0.35)]">
      {/* Image section */}
      <div className="flex flex-col">
        <Link
          to={productUrl}
          className="relative block aspect-3/4 overflow-hidden bg-(--color-surface-alt) cursor-pointer"
        >
          <img
            src={product.image}
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${
              showOutOfStockOverlay ? 'opacity-65 grayscale-30' : ''
            }`}
          />

          {/* Out of stock overlay */}
          {showOutOfStockOverlay && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-(--color-primary-dark)/70 backdrop-blur-[2px]">
              <span className="rounded-full border border-(--color-accent)/60 bg-(--color-primary) px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-(--color-accent-light) shadow-2xl">
                Out of stock
              </span>
            </div>
          )}

          {/* Badges */}
          <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-1.5">
            {product.badge && (
              <span className="rounded-full bg-(--color-primary) px-2.5 py-1 text-[9px] font-bold tracking-[0.2em] text-(--color-accent-light) shadow-lg">
                {product.badge.toUpperCase()}
              </span>
            )}
            {discount > 0 && (
              <span className="rounded-full bg-(--color-accent) px-2.5 py-1 text-[9px] font-extrabold tracking-[0.2em] text-(--color-primary-dark) shadow-lg">
                -{discount}% OFF
              </span>
            )}
          </div>

          {/* Wishlist toggle */}
          {!isAdmin && (
            <button
              onClick={(e) => {
                if (user.role === 'admin') return;
                e.preventDefault();
                e.stopPropagation();
                toggleWishlist(product._id);
              }}
              className={`absolute right-3 top-3 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full shadow-lg transition-all sm:h-10 sm:w-10 ${
                liked
                  ? 'scale-100 bg-(--color-primary) text-(--color-accent)'
                  : 'bg-(--color-surface)/95 text-(--color-primary-dark) backdrop-blur-sm hover:bg-(--color-surface) hover:text-(--color-primary)'
              }`}
              title={liked ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <svg
                viewBox="0 0 24 24"
                fill={liked ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={liked ? 0 : 1.8}
                className="h-4 w-4 sm:h-5 sm:w-5 transition-all duration-200"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          )}

          {/* Quantity & weight controls on hover for larger screens */}
          {!showOutOfStockOverlay && !isAdmin && (
            <div
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 hidden p-3 transition-transform duration-300 group-hover:translate-y-0 md:pointer-events-auto md:flex md:translate-y-full"
            >
              <div className="grid grid-cols-2 w-full items-center gap-2 rounded-xl bg-(--color-surface)/95 backdrop-blur-sm border border-(--color-border) p-1.5">
                {cartQuantity === 0 ? (
                  isWeightProduct && effectiveWeightOptions.length > 0 ? (
                    <>
                      <select
                        value={selectedWeight}
                        onChange={(e) => setSelectedWeight(e.target.value)}
                        className="h-9 rounded-lg border border-(--color-border) bg-(--color-surface) px-2 text-xs font-semibold text-(--color-primary-dark) focus:border-(--color-accent) focus:outline-none"
                      >
                        {effectiveWeightOptions.map((option) => (
                          <option
                            key={`${option.value}${option.unit}`}
                            value={String(option.value)}
                          >
                            {option.value} g
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleAddToCart}
                        className={`flex h-9 items-center justify-center rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-[0.2em] shadow-md transition-all ${
                          isWeightProduct
                            ? 'cursor-pointer bg-[linear-gradient(135deg,var(--color-primary)_0%,var(--color-primary-light)_100%)] text-(--color-accent-light) hover:brightness-110 active:scale-[0.97]'
                            : 'cursor-pointer bg-[linear-gradient(135deg,var(--color-primary)_0%,var(--color-primary-light)_100%)] text-(--color-accent-light) hover:brightness-110 active:scale-[0.97]'
                        }`}
                      >
                        ADD TO BAG
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleAddToCart}
                      className={`flex h-9 items-center justify-center rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-[0.2em] shadow-md transition-all col-span-2 ${
                        isWeightProduct
                          ? 'cursor-pointer bg-[linear-gradient(135deg,var(--color-primary)_0%,var(--color-primary-light)_100%)] text-(--color-accent-light) hover:brightness-110 active:scale-[0.97]'
                          : 'cursor-pointer bg-[linear-gradient(135deg,var(--color-primary)_0%,var(--color-primary-light)_100%)] text-(--color-accent-light) hover:brightness-110 active:scale-[0.97]'
                      }`}
                    >
                      ADD TO BAG
                    </button>
                  )
                ) : (
                  <>
                    {isWeightProduct && effectiveWeightOptions.length > 0 && (
                      <CustomDropdown
                        value={selectedWeight}
                        onChange={setSelectedWeight}
                        options={effectiveWeightOptions.map((option) => ({
                          label: `${option.value} g`,
                          value: String(option.value),
                        }))}
                        className="h-9"
                        buttonClassName="h-9"
                      />
                    )}
                    <div
                      className={`flex items-center border border-(--color-border) rounded-lg ${!isWeightProduct ? 'col-span-2' : ''}`}
                    >
                      <button
                        onClick={
                          isWeightProduct
                            ? handleWeightDecrement
                            : handleUnitDecrement
                        }
                        className="h-9 w-9 cursor-pointer flex items-center justify-center rounded-l-lg text-(--color-primary-dark) transition hover:bg-(--color-surface-alt) hover:text-(--color-accent) active:scale-95"
                      >
                        −
                      </button>
                      <span className="flex-1 text-center text-sm font-bold text-(--color-primary-dark)">
                        {isWeightProduct ? stagingQuantity : cartQuantity}
                      </span>
                      <button
                        onClick={
                          isWeightProduct
                            ? handleWeightIncrement
                            : handleUnitIncrement
                        }
                        className="h-9 w-9 cursor-pointer flex items-center justify-center rounded-r-lg text-(--color-primary-dark) transition hover:bg-(--color-surface-alt) hover:text-(--color-accent) active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </Link>

        {!showOutOfStockOverlay && !isAdmin && (
          <div className="px-3 pb-3 pt-3 md:hidden">
            <div
              className={`w-full ${isWeightProduct && effectiveWeightOptions.length > 0 ? 'flex flex-col gap-2' : 'grid grid-cols-2 items-center gap-2'}`}
            >
              {cartQuantity === 0 ? (
                isWeightProduct && effectiveWeightOptions.length > 0 ? (
                  <>
                    <CustomDropdown
                      value={selectedWeight}
                      onChange={setSelectedWeight}
                      options={effectiveWeightOptions.map((option) => ({
                        label: `${option.value} g`,
                        value: String(option.value),
                      }))}
                      className="h-10"
                      buttonClassName="h-10"
                    />
                    <button
                      onClick={handleAddToCart}
                      className={`flex h-10 items-center justify-center rounded-lg px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] shadow-lg transition-all ${
                        isWeightProduct
                          ? 'cursor-pointer bg-[linear-gradient(135deg,var(--color-primary)_0%,var(--color-primary-light)_100%)] text-(--color-accent-light) hover:brightness-110 active:scale-[0.97]'
                          : 'cursor-pointer bg-[linear-gradient(135deg,var(--color-primary)_0%,var(--color-primary-light)_100%)] text-(--color-accent-light) hover:brightness-110 active:scale-[0.97]'
                      }`}
                    >
                      ADD TO BAG
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleAddToCart}
                    className={`flex h-10 items-center justify-center rounded-lg px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] shadow-lg transition-all col-span-2 ${
                      isWeightProduct
                        ? 'cursor-pointer bg-[linear-gradient(135deg,var(--color-primary)_0%,var(--color-primary-light)_100%)] text-(--color-accent-light) hover:brightness-110 active:scale-[0.97]'
                        : 'cursor-pointer bg-[linear-gradient(135deg,var(--color-primary)_0%,var(--color-primary-light)_100%)] text-(--color-accent-light) hover:brightness-110 active:scale-[0.97]'
                    }`}
                  >
                    ADD TO BAG
                  </button>
                )
              ) : (
                <>
                  {isWeightProduct && effectiveWeightOptions.length > 0 && (
                    <CustomDropdown
                      value={selectedWeight}
                      onChange={setSelectedWeight}
                      options={effectiveWeightOptions.map((option) => ({
                        label: `${option.value} g`,
                        value: String(option.value),
                      }))}
                      className="h-10"
                      buttonClassName="h-10"
                    />
                  )}
                  <div
                    className={`flex items-center justify-between border border-(--color-border) rounded-lg ${!isWeightProduct ? 'col-span-2' : ''}`}
                  >
                    <button
                      onClick={
                        isWeightProduct
                          ? handleWeightDecrement
                          : handleUnitDecrement
                      }
                      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-l-lg text-(--color-primary-dark) transition hover:bg-(--color-surface-alt) hover:text-(--color-accent) active:scale-95 font-bold"
                    >
                      −
                    </button>
                    <span className="flex flex-1 items-center justify-center text-sm font-bold text-(--color-primary-dark)">
                      {isWeightProduct ? stagingQuantity : cartQuantity}
                    </span>
                    <button
                      onClick={
                        isWeightProduct
                          ? handleWeightIncrement
                          : handleUnitIncrement
                      }
                      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-r-lg text-(--color-primary-dark) transition hover:bg-(--color-surface-alt) hover:text-(--color-accent) active:scale-95 font-bold"
                    >
                      +
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Info section */}
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <Link
          to={productUrl}
          className="mb-1 cursor-pointer text-[9px] font-bold uppercase tracking-[0.24em] text-(--color-accent-dark) hover:underline sm:text-[10px]"
        >
          {product.category}
        </Link>
        <p className="mb-1.5 truncate text-[9px] font-medium text-(--color-muted) sm:text-[10px]">
          {product.subcategory}
        </p>
        <Link
          to={productUrl}
          className="font-display mb-1.5 cursor-pointer text-sm font-bold leading-tight text-(--color-primary-dark) transition-colors hover:text-(--color-primary) sm:text-base lg:text-lg"
        >
          {product.name}
        </Link>
        {product.description && (
          <p className="line-clamp-3 mb-2 text-xs text-(--color-muted) leading-relaxed">
            {stripHtml(product.description)}
          </p>
        )}

        {/* Price */}
        <div className="mt-auto flex items-baseline justify-between gap-2 border-t border-(--color-border) pt-2.5">
          <div>
            <span className="font-display text-base font-bold text-(--color-primary-dark) sm:text-lg lg:text-xl">
              ₹{displayPrice.toLocaleString('en-IN')}/-
            </span>
            {displayOriginalPrice && (
              <span className="ml-2 text-xs text-(--color-muted) line-through sm:text-sm">
                ₹{displayOriginalPrice.toLocaleString('en-IN')}/-
              </span>
            )}
            {product.gstIncluded && (
              <span className="ml-1.5 rounded bg-(--color-surface-alt) px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-(--color-accent-dark)">
                + GST
              </span>
            )}
          </div>
          {showOutOfStockOverlay && (
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-(--color-muted)">
              Sold Out
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
