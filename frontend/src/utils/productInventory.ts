/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Product, ProductWeightPrice } from '../types/contextTypes';

export type ProductWeightOption = {
  value: number;
  unit: string;
  stock?: number;
};

export type ProductWeightPriceOption = ProductWeightPrice;

const normalizeWeightEntry = (
  entry: any,
): ProductWeightPriceOption | null => {
  if (!entry || typeof entry !== 'object') return null;

  const value =
    entry.value !== undefined ? Number(entry.value) : Number(entry.units);
  const unit =
    entry.unit !== undefined
      ? String(entry.unit).trim()
      : String(entry.name ?? '').trim();
  const stock =
    entry.stock !== undefined && entry.stock !== null && entry.stock !== ''
      ? Number(entry.stock)
      : undefined;

  if (Number.isNaN(value) || value <= 0 || !unit) return null;

  return {
    value,
    unit,
    price: entry.price !== undefined ? Number(entry.price) || 0 : 0,
    originalPrice:
      entry.originalPrice !== undefined &&
        entry.originalPrice !== null &&
        entry.originalPrice !== ''
        ? Number(entry.originalPrice)
        : undefined,
    stock,
  };
};

const normalizeSelection = (selection?: string) =>
  String(selection ?? '').trim().toLowerCase();

export const normalizeProductWeights = (
  product?: Product,
): ProductWeightPriceOption[] => {
  const raw = product?.availableWeight;
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw
      .map(normalizeWeightEntry)
      .filter(
        (entry): entry is ProductWeightPriceOption => Boolean(entry),
      );
  }

  const single = normalizeWeightEntry(raw);
  return single ? [single] : [];
};

export const normalizeProductInventory = (product?: Product) => {
  return {
    inventoryType:
      product?.inventoryType === 'unit' ? ('unit' as const) : ('weight' as const),
    availableWeight: normalizeProductWeights(product),
  };
};

export const getAvailableWeightOption = (
  product?: Product,
): ProductWeightPriceOption | null =>
  product ? getWeightOptions(product)[0] ?? null : null;

export const getInventoryDisplayLabel = (product?: Product) => {
  const option = getAvailableWeightOption(product);
  if (!option || option.value <= 0) return '';

  return product?.inventoryType === 'unit'
    ? `${option.value} ${option.unit}`.trim()
    : `${option.value}${option.unit}`.trim();
};

export const getDefaultInventorySelection = (product?: Product) => {
  const option = getAvailableWeightOption(product);
  if (!option || option.value <= 0) return '';

  if (product?.inventoryType === 'unit') {
    return option.unit || 'unit';
  }

  return String(option.value);
};

export const getProductInventoryState = (product: Product) => {
  const weightOptions = normalizeProductWeights(product);
  const hasInventory = weightOptions.length > 0;
  const outOfStock =
    product?.inStock === false ||
    !hasInventory ||
    weightOptions.every((option) => {
      const stock = option.stock;
      if (stock === undefined || stock === null) return false;
      return stock <= 0;
    });

  return {
    weightOptions,
    hasInventory,
    isOutOfStock: outOfStock,
  };
};

export const getSelectedWeightOption = (
  product: any,
  selectedValue?: string,
): ProductWeightPriceOption | null => {
  const options = getWeightOptions(product);
  if (!options.length) return null;

  if (product?.inventoryType === 'unit') return options[0];

  const normalizedSelection = normalizeSelection(selectedValue);
  if (!normalizedSelection) return options[0];

  const match = options.find((option) => {
    const normalizedValue = String(option.value).toLowerCase();
    const normalizedUnit = option.unit.toLowerCase();

    return (
      normalizedSelection === normalizedValue ||
      normalizedSelection === normalizedUnit ||
      normalizedSelection === `${normalizedValue}${normalizedUnit}` ||
      normalizedSelection === `${normalizedValue} ${normalizedUnit}`
    );
  });

  return match ?? options[0];
};

export const getProductPrice = (product: Product): number => {
  if (product.inventoryType === 'unit') {
    return Number(product.price) || 0;
  }

  const options = normalizeProductWeights(product);
  return options[0]?.price || 0;
};

export const getProductOriginalPrice = (product: Product): number | undefined => {
  if (product.inventoryType === 'unit') {
    return product.originalPrice;
  }

  const options = normalizeProductWeights(product);
  return options[0]?.originalPrice;
};

export const getWeightOptions = (product?: Product): ProductWeightPriceOption[] =>
  [...normalizeProductWeights(product)].sort((a, b) => {
    if (a.value !== b.value) return a.value - b.value;
    return a.unit.localeCompare(b.unit);
  });

export const getOptionPrice = (
  option: ProductWeightPriceOption | null,
): number => (option ? Number(option.price) || 0 : 0);

export const getOptionOriginalPrice = (
  option: ProductWeightPriceOption | null,
): number | undefined => option?.originalPrice;

export const isCartItemAvailable = (item: any, products: any[] = []) => {
  const product = products.find((entry) => entry._id === item?.product?._id);
  const weightOption = getSelectedWeightOption(
    product || item?.product,
    item?.weight,
  );

  if (!weightOption) return false;
  const stock = weightOption.stock;
  if (stock === undefined || stock === null) return weightOption.value > 0;
  return stock > 0;
};

export const getProductStockLabel = (product: Product): any => {
  const weightOptions = normalizeProductWeights(product);
  const hasInventory = weightOptions.length > 0;

  if (!hasInventory || product?.inStock === false) return '';

  if (product?.inventoryType === 'unit') {
    const option = weightOptions[0];
    if (!option || (option.stock ?? 0) <= 0) return '';
    return `${option.stock} ${option.unit}(s) available`;
  }

  if (product?.inventoryType === 'weight') {
    return weightOptions
      .filter(opt => (opt.stock ?? 0) > 0)
      .map(opt => `${opt.value} gms - ${opt.stock} Units`);
  }

  return '';
};
