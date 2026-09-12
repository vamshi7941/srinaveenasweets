/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useMemo, useState, useRef } from 'react';
import type { TouchEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import type { Product } from '../types/contextTypes';
import { FiHeart, FiShare2, FiCheck, FiChevronLeft } from 'react-icons/fi';
import { findProductBySlug, sanitizeRichHtml, isRichHtmlEmpty } from '../utils/utils';
import CustomerUtils from '../utils/customer';
import {
  getDefaultInventorySelection,
  getProductInventoryState,
  getSelectedWeightOption,
  getWeightOptions,
} from '../utils/productInventory';

const ProductDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { showToast, products, user, isInWishlist } = useStore();
  const { addToCart, toggleWishlist } = CustomerUtils();

  const selectedProduct = slug ? findProductBySlug(products, slug) : null;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedWeight, setSelectedWeight] = useState<string>(() =>
    getDefaultInventorySelection(selectedProduct ?? undefined),
  );

  const isAdmin = user.role === 'admin';

  // Mock data for testing - replace with actual API calls
  useEffect(() => {
    const fetchProductData = async () => {
      try {
        setLoading(true);

        setProduct(selectedProduct || null);
        setSelectedImage(0);
        setSelectedWeight(
          getDefaultInventorySelection(selectedProduct ?? undefined),
        );
      } catch (error) {
        showToast('Failed to load product details', 'error');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
  }, [slug, navigate, showToast, selectedProduct]);

  const discount = product?.originalPrice
    ? Math.round(
      ((product.originalPrice - product.price) / product.originalPrice) * 100,
    )
    : 0;
  const inventoryState = product ? getProductInventoryState(product) : null;
  const selectedInventoryOption = getSelectedWeightOption(
    product,
    selectedWeight,
  );

  const handleAddToCart = () => {
    if (isAdmin) return;
    const selectedUnitOrWeightOption = getSelectedWeightOption(
      product,
      selectedWeight,
    );
    if (!selectedUnitOrWeightOption || selectedUnitOrWeightOption.value <= 0) {
      showToast('This is currently out of stock.', 'warning');
      return;
    }

    if (product) {
      addToCart(product, quantity, selectedWeight);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.name,
        text: product?.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard', 'success');
    }
  };

  const galleryImages = useMemo(
    () =>
      product
        ? [product.image, ...(product.images || [])]
          .filter(Boolean)
          .filter((v, i, a) => a.indexOf(v) === i)
        : [],
    [product],
  );

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = touchStartX.current - endX;
    const dy = (touchStartY.current ?? 0) - endY;
    const threshold = 40;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
      if (dx > 0) {
        setSelectedImage((prev) =>
          Math.min(galleryImages.length - 1, prev + 1),
        );
      } else {
        setSelectedImage((prev) => Math.max(0, prev - 1));
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  const [indexPulse, setIndexPulse] = useState(false);

  // trigger a short animation when selected image changes
  useEffect(() => {
    if (!galleryImages || galleryImages.length === 0) return;
    const indexPulseSetter = () => setIndexPulse(true);
    indexPulseSetter();
    const t = setTimeout(() => setIndexPulse(false), 400);
    return () => clearTimeout(t);
  }, [selectedImage, galleryImages]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[--color-accent] border-t-[--color-primary] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[--color-text]">
            Product not found
          </h1>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-6 py-2 bg-(--color-accent) text-(--color-primary) font-semibold rounded-full hover:bg-(--color-accent-light) transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--color-background)">
      {/* Breadcrumb */}
      <div className="border-b border-(--color-border) bg-(--color-surface) px-4 sm:px-6 lg:px-12 py-4">
        <div className="flex items-center gap-2 text-sm text-(--color-muted)">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-(--color-muted) hover:text-(--color-accent) transition"
          >
            <FiChevronLeft size={16} />
            Back
          </button>
          <span className="text-(--color-border)">•</span>
          <span className="text-(--color-muted)">{product.category}</span>
          <span className="text-(--color-border)">•</span>
          <span className="text-(--color-text) font-semibold">
            {product.name}
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div
              className="relative w-full rounded-2xl overflow-hidden bg-(--color-surface) border-2 border-(--color-border) shadow-sm"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <img
                src={galleryImages[selectedImage] || product.image}
                alt={product.name}
                className="w-full h-auto max-h-[80vh] object-contain"
              />

              {/* Progress line + dot indicators */}
              {galleryImages.length > 0 && (
                <div className="absolute left-1/2 bottom-4 -translate-x-1/2 pointer-events-auto w-full max-w-xs px-4">
                  <div className="mt-2 flex items-center justify-center gap-3">
                    {galleryImages.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImage(idx)}
                        aria-label={`Go to image ${idx + 1}`}
                        className={`w-3 h-3 rounded-full transition-transform focus:outline-none ${selectedImage === idx
                          ? 'scale-125 bg-(--color-accent) border border-(--color-accent)'
                          : 'scale-100 bg-(--color-border)'
                          } ${indexPulse && selectedImage === idx ? 'animate-pulse' : ''}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Stock Badge */}
              {inventoryState?.isOutOfStock && (
                <div className="absolute inset-0 bg-(--color-primary)/60 backdrop-blur-sm flex items-center justify-center">
                  <span className="bg-(--color-primary) border border-(--color-accent) text-(--color-accent) px-6 py-3 rounded-full font-bold">
                    Out of Stock
                  </span>
                </div>
              )}

              {/* Discount Badge */}
              {discount > 0 && (
                <div className="absolute top-4 right-4 bg-(--color-accent) text-(--color-primary) rounded-full w-16 h-16 flex flex-col items-center justify-center shadow-lg">
                  <span className="text-xl font-bold">{discount}%</span>
                  <span className="text-xs font-semibold">OFF</span>
                </div>
              )}

              {/* Badge */}
              {product.badge && (
                <div className="absolute top-4 left-4 bg-(--color-primary) text-(--color-accent) px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg border border-(--color-accent)/30">
                  {product.badge}
                </div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {galleryImages && galleryImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`shrink-0 w-20 h-20 rounded-lg border-2 overflow-hidden transition hover:border-(--color-accent) ${selectedImage === idx
                      ? 'border-(--color-accent) ring-2 ring-(--color-accent)/30'
                      : 'border-(--color-border)'
                      }`}
                  >
                    <img
                      src={img}
                      alt={`View ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="flex flex-col">
            {/* Header */}
            <div className="border-b-2 border-(--color-border) pb-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-xs text-(--color-accent) font-bold uppercase tracking-widest">
                    {product.category}
                  </p>
                  <h1 className="text-3xl sm:text-4xl font-bold text-(--color-primary) mt-3">
                    {product.name}
                  </h1>
                </div>

                {/* Wishlist & Share */}
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      !isAdmin ? toggleWishlist(product._id) : null
                    }
                    className={`p-3 rounded-full transition border-2 ${isInWishlist(product._id)
                      ? 'bg-(--color-accent) text-(--color-primary) border-(--color-accent)'
                      : 'bg-(--color-surface) text-(--color-primary) border-(--color-border) hover:border-(--color-accent)'
                      }`}
                  >
                    <FiHeart
                      size={20}
                      className={
                        isInWishlist(product._id) ? 'fill-current' : ''
                      }
                    />
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-3 rounded-full bg-(--color-surface) text-(--color-primary) border-2 border-(--color-border) hover:border-(--color-accent) hover:bg-(--color-surface-alt) transition"
                  >
                    <FiShare2 size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="py-6 border-b-2 border-(--color-border)">
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-(--color-accent)">
                  ₹{selectedInventoryOption?.price ?? product.price}/-
                </div>
                {selectedInventoryOption?.originalPrice && (
                  <div className="text-lg text-(--color-muted) line-through">
                    ₹{selectedInventoryOption.originalPrice}/-
                  </div>
                )}
                {product.gstIncluded && (
                  <span className="rounded bg-(--color-surface-alt) px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-(--color-accent-dark)">
                    + GST
                  </span>
                )}
              </div>
              <p className="text-sm text-(--color-success) mt-3 flex items-center gap-2 font-medium">
                <FiCheck size={16} className="shrink-0" />
                Free Delivery on orders above ₹500
              </p>
            </div>


            {/* Weight/Quantity Selection */}
            <div className="py-4 border-b-2 border-(--color-border) space-y-1">
              {product.inventoryType === 'weight' && (
                <div>
                  <div className="flex gap-3 flex-wrap">
                    {getWeightOptions(product).map((option) => {
                      const key = `${option.value}${option.unit}`;
                      const label = `${option.value}`;
                      return (
                        <button
                          key={key}
                          onClick={() =>
                            setSelectedWeight(String(option.value))
                          }
                          className={`px-4 py-2 rounded-lg border-2 font-medium transition ${selectedWeight === String(option.value)
                            ? 'border-(--color-accent) bg-(--color-accent) text-(--color-primary)'
                            : 'border-(--color-border) text-(--color-text) hover:border-(--color-accent) hover:bg-(--color-surface-alt)'
                            }`}
                        >
                          {label} g
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block pt-4 text-sm font-semibold text-(--color-primary) mb-3">
                  Quantity
                </label>
                <div className="flex items-center border-2 border-(--color-border) rounded-lg w-fit">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-2 text-(--color-primary) hover:bg-(--color-surface-alt) hover:border-(--color-accent) transition font-semibold"
                  >
                    −
                  </button>
                  <span className="px-6 py-2 font-bold text-(--color-primary)">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-4 py-2 text-(--color-primary) hover:bg-(--color-surface-alt) transition font-semibold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 space-y-3">
              <button
                onClick={handleAddToCart}
                disabled={!product.inStock}
                className="w-full py-4 bg-(--color-accent) text-(--color-primary) font-bold rounded-lg hover:bg-(--color-accent-light) disabled:bg-(--color-muted) disabled:text-(--color-text) disabled:cursor-not-allowed transition uppercase tracking-wider"
              >
                {product.inStock ? 'Add to Cart' : 'Out of Stock'}
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full py-4 border-2 border-(--color-accent) text-(--color-accent) font-bold rounded-lg hover:bg-(--color-accent) hover:text-(--color-primary) transition uppercase tracking-wider"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>

        {/* Product Description */}
        <div className="py-6 border-b-2 border-(--color-border)">
          {isRichHtmlEmpty(sanitizeRichHtml(product.description || '')) ? (
            <p className="text-(--color-muted) leading-relaxed">
              {product.description}
            </p>
          ) : (
            <div
              className="legal-rich-text text-(--color-muted)"
              dangerouslySetInnerHTML={{
                __html: sanitizeRichHtml(product.description || ''),
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
