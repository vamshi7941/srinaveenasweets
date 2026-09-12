/* eslint-disable @typescript-eslint/no-explicit-any */
// this is a modal to update the catalogue of products in the admin panel as form
import { useState } from 'react';
import { IoMdAdd } from 'react-icons/io';
import { IoCloseSharp } from 'react-icons/io5';
import type { Product } from '../../types/contextTypes';
import {
  uploadImageToCloudinary,
  uploadImagesToCloudinary,
  sanitizeRichHtml,
  isRichHtmlEmpty,
} from '../../utils/utils';
import { useStore } from '../../context/StoreContext';
import {
  normalizeProductWeights,
  type ProductWeightPriceOption,
} from '../../utils/productInventory';
import ProductApi from '../../api/product';
import { ImageUploadZone } from '../app-customize/image-upload-zone';
import RichTextEditor from '../app-customize/rich-text-editor';

const UpdateCatalogue = ({
  action,
  closeModal,
  product,
}: {
  action: string;
  closeModal: () => void;
  product?: Product;
}) => {
  const { siteContent, setProducts } = useStore();
  const categoryOptions = siteContent.categories.filter(
    (cat) => cat.type !== 'subcategory',
  );

  const getDefaultCategoryId = (currentProduct?: Product) => {
    const matchingCategory = categoryOptions.find(
      (cat) => cat.name === currentProduct?.category,
    );
    return matchingCategory?._id ?? categoryOptions[0]?._id ?? '';
  };

  const getInitialDescription = (value = '') => {
    const description = value ?? '';
    return description.includes('<')
      ? description
      : description.replace(/\n/g, '<br/>');
  };

  const getInitialInventoryType = (currentProduct?: Product) =>
    currentProduct?.inventoryType === 'unit' ? 'unit' : 'weight';

  const getInitialWeightOptions = (currentProduct?: Product) => {
    const existing = normalizeProductWeights(currentProduct);
    if (existing.length) return existing;
    return inventoryType === 'unit'
      ? [
          {
            value: 1,
            unit: 'unit',
            price: 0,
            originalPrice: undefined,
            stock: 0,
          },
        ]
      : [
          {
            value: 250,
            unit: '',
            price: 0,
            originalPrice: undefined,
            stock: 0,
          },
        ];
  };

  const generateProductId = () => {
    const randomLetter = () =>
      String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const randomNumber = () => String(Math.floor(Math.random() * 10));
    return `SNSPID-${randomLetter()}${randomLetter()}${randomLetter()}${randomNumber()}${randomNumber()}${randomNumber()}`;
  };

  const productId =
    action === 'add' ? generateProductId() : (product?._id ?? '');
  const [name, setName] = useState(product?.name ?? '');
  const [subcategoryId, setSubcategoryId] = useState(
    product?.subcategory ?? '',
  );
  const [description, setDescription] = useState(() =>
    getInitialDescription(product?.description ?? ''),
  );
  const [image, setImage] = useState(product?.image ?? '');
  const [badge, setBadge] = useState(product?.badge ?? '');
  const [inStock, setInStock] = useState(product?.inStock ?? true);
  const [gstIncluded, setGstIncluded] = useState(product?.gstIncluded ?? false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [additionalImages, setAdditionalImages] = useState(
    product?.images ?? [],
  );
  const [pendingAdditionalFiles, setPendingAdditionalFiles] = useState<File[]>(
    [],
  );

  const [selectedCategoryId, setSelectedCategoryId] = useState(
    getDefaultCategoryId(product),
  );

  const subcategoryOptions = siteContent.categories.filter(
    (cat) => cat.type === 'subcategory' && cat.parentId === selectedCategoryId,
  );

  const api = ProductApi();

  const [inventoryType, setInventoryType] = useState<'weight' | 'unit'>(
    getInitialInventoryType(product),
  );
  const [weightOptions, setWeightOptions] = useState<
    ProductWeightPriceOption[]
  >(getInitialWeightOptions(product));

  const [descriptionMode, setDescriptionMode] = useState<'edit' | 'view'>(
    'edit',
  );

  const updateWeightOption = (
    index: number,
    field: keyof ProductWeightPriceOption,
    rawValue: string | number,
  ) => {
    setWeightOptions((prev) =>
      prev.map((option, i) => {
        if (i !== index) return option;
        if (field === 'value' || field === 'price' || field === 'stock') {
          return { ...option, [field]: Number(rawValue) || 0 };
        }
        if (field === 'originalPrice') {
          return {
            ...option,
            originalPrice:
              rawValue === '' || rawValue === null || rawValue === undefined
                ? undefined
                : Number(rawValue),
          };
        }
        return { ...option, [field]: String(rawValue) };
      }),
    );
  };

  const addWeightOption = () => {
    setWeightOptions((prev) => [
      ...prev,
      inventoryType === 'unit'
        ? {
            value: 1,
            unit: 'unit',
            price: 0,
            originalPrice: undefined,
            stock: 0,
          }
        : {
            value: 250,
            unit: '',
            price: 0,
            originalPrice: undefined,
            stock: 0,
          },
    ]);
  };

  const removeWeightOption = (index: number) => {
    setWeightOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const selectedCategoryName =
    categoryOptions.find((cat) => cat._id === selectedCategoryId)?.name ?? '';
  const selectedSubcategoryName =
    subcategoryOptions.find((cat) => cat._id === subcategoryId)?.name ?? '';

  const makeProductPayload = () => {
    const payload: any = {
      _id: productId.trim(),
      name: name.trim(),
      category: selectedCategoryName,
      subcategory: selectedSubcategoryName,
      image,
      images: additionalImages,
      badge: badge.trim() || undefined,
      description: isRichHtmlEmpty(description)
        ? ''
        : sanitizeRichHtml(description),
      inStock,
      inventoryType,
      gstIncluded,
    };

    const normalizedOptions = weightOptions.map((option) => ({
      value: Number(option.value) || 0,
      unit:
        String(option.unit).trim() || (inventoryType === 'unit' ? 'unit' : 'g'),
      price: Number(option.price) || 0,
      originalPrice:
        option.originalPrice !== undefined
          ? Number(option.originalPrice)
          : undefined,
      stock: Number(option.stock) || 0,
    }));

    payload.availableWeight = normalizedOptions;
    payload.price = normalizedOptions[0]?.price || 0;
    payload.originalPrice = normalizedOptions[0]?.originalPrice;

    if (!payload.badge) {
      delete payload.badge;
    }

    return payload;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let finalImage = image;
      let finalAdditionalImages = additionalImages.filter(
        (src) => !src.startsWith('blob:'),
      );

      if (pendingImageFile) {
        finalImage = await uploadImageToCloudinary(pendingImageFile);
      }

      if (pendingAdditionalFiles.length) {
        const uploadedAdditionalImages = await uploadImagesToCloudinary(
          pendingAdditionalFiles,
        );
        finalAdditionalImages = [
          ...finalAdditionalImages,
          ...uploadedAdditionalImages,
        ];
      }

      const payload = {
        ...makeProductPayload(),
        image: finalImage,
        images: finalAdditionalImages,
      };

      const result = await api.saveProduct(payload);
      if (result?.success && result.product) {
        setProducts((prevProducts) => [...prevProducts, result.product]);
        closeModal();
      }
    } catch (error) {
      console.error('Product save failed:', error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let finalImage = image;
      let finalAdditionalImages = additionalImages.filter(
        (src) => !src.startsWith('blob:'),
      );

      if (pendingImageFile) {
        finalImage = await uploadImageToCloudinary(pendingImageFile);
      }

      if (pendingAdditionalFiles.length) {
        const uploadedAdditionalImages = await uploadImagesToCloudinary(
          pendingAdditionalFiles,
        );
        finalAdditionalImages = [
          ...finalAdditionalImages,
          ...uploadedAdditionalImages,
        ];
      }

      const payload = {
        ...makeProductPayload(),
        image: finalImage,
        images: finalAdditionalImages,
      };

      const result = await api.updateProduct(productId, payload);
      if (result?.success && result.product) {
        setProducts((prevProducts) =>
          prevProducts.map((item) =>
            item._id === result.product._id ? result.product : item,
          ),
        );
        closeModal();
      }
    } catch (error) {
      console.error('Product update failed:', error);
    }
  };

  const inputClassName =
    'w-full rounded-2xl border border-[#f3d48a]/70 bg-[#fffdf7] px-3 py-2.5 text-sm text-[#4d2b1f] shadow-sm outline-none transition focus:border-[#8b1e2d] focus:ring-2 focus:ring-[#f3d48a]/50 disabled:cursor-not-allowed disabled:bg-[#f8efe3]';
  const labelClassName =
    'mb-1 block text-[11px] font-bold uppercase tracking-[0.24em] text-[#5f1021]';

  return (
    <div className="fixed inset-0 z-999 flex items-center justify-center bg-[#5f1021]/60 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-4xl border border-[#f3d48a]/70 bg-[#fffdf7] shadow-[0_24px_70px_rgba(95,16,33,0.2)]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#f3d48a]/70 bg-[#fffdf7]/95 px-6 py-5 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#8b1e2d] text-xl text-[#fff8ef] shadow-[0_10px_24px_rgba(139,30,45,0.18)]">
              <IoMdAdd />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#5f1021]">
                {action === 'add' ? 'Add New Product' : 'Edit Product'}
              </h2>
              <p className="text-xs text-[#8a6a4a]">Publishes instantly</p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="rounded-full p-2 text-[#8b1e2d] transition hover:bg-[#fef4da]"
          >
            <IoCloseSharp />
          </button>
        </div>
        <form
          onSubmit={action === 'add' ? handleAdd : handleSave}
          className="space-y-5 p-6"
        >
          <div className="rounded-3xl border border-[#f3d48a]/70 bg-[linear-gradient(135deg,#fffdf7_0%,#fff8ef_100%)] p-4 shadow-[0_14px_35px_rgba(95,16,33,0.06)] sm:p-5">
            <div>
              <label className={labelClassName}>Product Id</label>
              <input
                required
                type="text"
                disabled
                value={productId}
                readOnly
                className={`${inputClassName} cursor-not-allowed`}
              />
            </div>
            <div className="mt-5">
              <label className={labelClassName}>Main Image</label>
              <div className="rounded-2xl border border-[#f3d48a]/70 bg-[#fffdf7] p-3">
                <ImageUploadZone
                  value={image}
                  onChange={setImage}
                  onFileSelect={setPendingImageFile}
                />
              </div>
            </div>
            <div className="mt-5">
              <label className={labelClassName}>Additional Images</label>
              <input
                type="file"
                accept="image/*"
                multiple
                className="w-full rounded-2xl border border-[#f3d48a]/70 bg-[#fffdf7] p-3 text-sm text-[#4d2b1f]"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (!files.length) return;

                  const previewUrls = files.map((file) =>
                    URL.createObjectURL(file),
                  );
                  setAdditionalImages((prev) => [...prev, ...previewUrls]);
                  setPendingAdditionalFiles((prev) => [...prev, ...files]);
                  if (e.target) e.target.value = '';
                }}
              />
              {additionalImages.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {additionalImages.map((src, index) => (
                    <div
                      key={index}
                      className="relative overflow-hidden rounded-2xl border border-[#f3d48a]/70"
                    >
                      <img
                        src={src}
                        alt={`Additional ${index + 1}`}
                        className="h-24 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setAdditionalImages((prev) =>
                            prev.filter((_, i) => i !== index),
                          )
                        }
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-sm text-[#5f1021]"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClassName}>Name *</label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Product Name"
                className={inputClassName}
              />
            </div>
            <div>
              <label className={labelClassName}>Category</label>
              <select
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value);
                  setSubcategoryId('');
                }}
                className={`${inputClassName} cursor-pointer bg-[#fffdf7]`}
              >
                {categoryOptions.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClassName}>
                Subcategory{' '}
                <span className="font-normal text-[#8a6a4a]">optional</span>
              </label>
              <select
                value={subcategoryId}
                onChange={(e) => setSubcategoryId(e.target.value)}
                className={`${inputClassName} cursor-pointer bg-[#fffdf7]`}
              >
                <option value="">None</option>
                {subcategoryOptions.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClassName}>Badge</label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="Optional"
                className={inputClassName}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={`${labelClassName} mb-2`}>
                Product Measurement
              </label>
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-[#f3d48a]/70 bg-[#fff8ef] p-3">
                  <input
                    type="radio"
                    name="inventoryType"
                    value="weight"
                    checked={inventoryType === 'weight'}
                    onChange={() => {
                      setInventoryType('weight');
                      setWeightOptions((prev) =>
                        prev.map((option) => ({
                          ...option,
                          unit:
                            option.unit && option.unit !== 'unit'
                              ? option.unit
                              : 'g',
                        })),
                      );
                    }}
                    className="accent-[#8b1e2d]"
                  />
                  <span className="text-sm font-medium text-[#5f1021]">
                    Weight
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-[#f3d48a]/70 bg-[#fff8ef] p-3">
                  <input
                    type="radio"
                    name="inventoryType"
                    value="unit"
                    checked={inventoryType === 'unit'}
                    onChange={() => {
                      setInventoryType('unit');
                      setWeightOptions((prev) =>
                        prev.map((option) => ({
                          ...option,
                          unit:
                            option.unit && option.unit !== 'g'
                              ? option.unit
                              : 'unit',
                        })),
                      );
                    }}
                    className="accent-[#8b1e2d]"
                  />
                  <span className="text-sm font-medium text-[#5f1021]">
                    Units
                  </span>
                </label>
              </div>
            </div>
            <div className="sm:col-span-2 rounded-3xl border border-[#f3d48a]/70 bg-[#fff8ef] p-4">
              <label className={`${labelClassName} mb-1`}>
                {inventoryType === 'unit'
                  ? 'Unit Inventory'
                  : 'Weight Inventory'}
              </label>
              <p className="mb-4 text-[11px] text-[#8a6a4a]">
                {inventoryType === 'unit'
                  ? 'Set a number of units and its price for this product.'
                  : 'Add one or more weights, each with its own price (and optional original price for discounts).'}
              </p>
              {inventoryType === 'unit' ? (
                <div className="grid items-end gap-3 sm:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#5f1021]">
                      Stock
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={weightOptions[0]?.stock ?? 0}
                      onChange={(e) =>
                        updateWeightOption(0, 'stock', e.target.value)
                      }
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#5f1021]">
                      Price (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={weightOptions[0]?.price ?? 0}
                      onChange={(e) =>
                        updateWeightOption(0, 'price', e.target.value)
                      }
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#5f1021]">
                      Orig. Price
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={weightOptions[0]?.originalPrice ?? ''}
                      onChange={(e) =>
                        updateWeightOption(0, 'originalPrice', e.target.value)
                      }
                      placeholder="Optional"
                      className={inputClassName}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {weightOptions.map((option, index) => (
                      <div
                        key={index}
                        className="flex flex-col lg:flex-row items-end gap-3 rounded-2xl border border-[#f3d48a]/60 bg-[#fffdf7] p-3 sm:grid-cols-[90px_90px_1fr_1fr_36px]"
                      >
                        <div className="flex gap-3">
                          <div>
                            <label className="mb-1 whitespace-nowrap block text-[10px] font-bold uppercase tracking-wider text-[#5f1021]">
                              Avl Weight (gms)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step={50}
                              value={option.value}
                              onChange={(e) =>
                                updateWeightOption(
                                  index,
                                  'value',
                                  e.target.value,
                                )
                              }
                              className={inputClassName}
                            />
                          </div>

                          <div className="flex gap-3 items-end">
                            <div>
                              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#5f1021]">
                                Stock
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={option.stock ?? 0}
                                onChange={(e) =>
                                  updateWeightOption(
                                    index,
                                    'stock',
                                    e.target.value,
                                  )
                                }
                                className={inputClassName}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-3 items-end">
                          <div>
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#5f1021]">
                              Selling Price (₹)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={option.price}
                              onChange={(e) =>
                                updateWeightOption(
                                  index,
                                  'price',
                                  e.target.value,
                                )
                              }
                              className={inputClassName}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#5f1021]">
                              Orig. Price
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={option.originalPrice ?? ''}
                              onChange={(e) =>
                                updateWeightOption(
                                  index,
                                  'originalPrice',
                                  e.target.value,
                                )
                              }
                              placeholder="Optional"
                              className={inputClassName}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeWeightOption(index)}
                            disabled={weightOptions.length === 1}
                            className="flex h-10.5 w-10.5 items-center justify-center rounded-xl border border-[#f3d48a]/70 bg-[#fff8ef] text-lg text-[#8b1e2d] transition hover:bg-[#fef4da] disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Remove weight option"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addWeightOption}
                    className="mt-3 flex items-center gap-2 rounded-2xl border border-dashed border-[#8b1e2d]/50 bg-[#fff8ef] px-4 py-2.5 text-sm font-semibold text-[#8b1e2d] transition hover:bg-[#fef4da]"
                  >
                    <IoMdAdd /> Add weight option
                  </button>
                </>
              )}
            </div>
            <div className="sm:col-span-2 flex items-center justify-between rounded-2xl border border-[#f3d48a]/70 bg-[#fffdf7] p-3">
              <span className="text-xs font-bold text-[#5f1021]">
                Available in Stock immediately
              </span>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={inStock}
                  onChange={(e) => setInStock(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-[#8b1e2d] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                <span className="ml-3 min-w-17.5 text-xs font-bold text-[#5f1021]">
                  {inStock ? '✓ In Stock' : '✗ Sold Out'}
                </span>
              </label>
            </div>
            <div className="sm:col-span-2 flex items-center justify-between rounded-2xl border border-[#f3d48a]/70 bg-[#fffdf7] p-3">
              <span className="text-xs font-bold text-[#5f1021]">
                GST included in price
              </span>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={gstIncluded}
                  onChange={(e) => setGstIncluded(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-[#8b1e2d] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                <span className="ml-3 min-w-17.5 text-xs font-bold text-[#5f1021]">
                  {gstIncluded ? '✓ Included' : ''}
                </span>
              </label>
            </div>
            <div className="sm:col-span-2">
              <div className="mb-2 flex items-center justify-between gap-2">
                <label className={`${labelClassName} mb-0`}>Description</label>

                {/* Edit / View toggle */}
                <div className="inline-flex rounded-lg border border-[#f3d48a]/70 bg-[#fffdf7] p-0.5">
                  {(['edit', 'view'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setDescriptionMode(option)}
                      className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition ${
                        descriptionMode === option
                          ? 'bg-[#8b1e2d] text-[#fff8ef]'
                          : 'text-[#5f1021] hover:bg-[#fef4da]'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {descriptionMode === 'edit' ? (
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Write the product description. Use the toolbar for bold, italic, links, lists and more."
                />
              ) : (
                <div className="rounded-2xl border border-[#f3d48a]/70 bg-[#fffdf7] p-4">
                  {isRichHtmlEmpty(sanitizeRichHtml(description)) ? (
                    <p className="text-sm text-[#b7997a]">
                      Nothing to preview yet.
                    </p>
                  ) : (
                    <div
                      className="legal-rich-text text-[#4d2b1f]"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeRichHtml(description),
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 rounded-2xl border border-[#f3d48a]/70 bg-[#fffdf7] py-3 text-sm font-semibold text-[#5f1021] transition hover:bg-[#fef4da]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#8b1e2d] py-3 text-sm font-semibold text-[#fff8ef] shadow-[0_10px_24px_rgba(139,30,45,0.18)] transition hover:bg-[#a02233]"
            >
              <IoMdAdd /> Publish
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateCatalogue;
