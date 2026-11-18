import { api, LightningElement } from 'lwc';
import BasePath from '@salesforce/community/basePath';
import { resolve as resourceResolver } from 'experience/resourceResolver';
import { createImageDataMap } from 'experience/picture';
import Labels from './labels';
const MAX_SLOTS = 4;
const DEFAULT_PRODUCT_IMAGE_PATH = '/assets/images/defaultProductImage.svg';
const EMPTY_CART_THUMBNAIL_IMAGE_PATH = '/assets/images/empty-cart-thumbnail.svg';
export default class CartImagePreviewGrid extends LightningElement {
  static renderMode = 'light';
  get _imageSizes() {
    const isSingleCell = this._slotCount <= 1;
    return isSingleCell ? {
      mobile: 90,
      tablet: 100,
      desktop: 100
    } : {
      mobile: 46,
      tablet: 50,
      desktop: 50
    };
  }
  _preview;
  @api
  get cartPreview() {
    return this._preview;
  }
  set cartPreview(value) {
    if (this._slotsComputed && value === this._preview) {
      return;
    }
    this._preview = value;
    this._slots = this._buildSlots();
    this._slotsComputed = true;
  }
  _slots = [];
  _slotsComputed = false;
  get _products() {
    const products = this._preview?.products;
    return Array.isArray(products) ? products : [];
  }
  get hasProducts() {
    return this._products.length > 0;
  }
  get _slotCount() {
    return Math.min(this._products.length, MAX_SLOTS);
  }
  get gridClasses() {
    const classes = ['cart-image-preview-grid'];
    classes.push(this.hasProducts ? `slots-${this._slotCount}` : 'is-empty');
    return classes.join(' ');
  }
  get slots() {
    return this._slots;
  }
  _buildSlots() {
    return this._products.slice(0, MAX_SLOTS).map((product, index) => {
      const rawUrl = this._rawUrl(product);
      return {
        key: `${product?.productId ?? 'product'}-${index}`,
        url: resourceResolver(rawUrl, false, {
          width: 100
        }),
        images: createImageDataMap(rawUrl, this._imageSizes),
        altText: this._resolveAltText(product)
      };
    });
  }
  get gridAriaLabel() {
    return Labels.imageGridLabel;
  }
  get placeholderAltText() {
    return Labels.emptyPreviewLabel;
  }
  get placeholderImageUrl() {
    return `${BasePath}${EMPTY_CART_THUMBNAIL_IMAGE_PATH}`;
  }
  _rawUrl(product) {
    return product?.thumbnailImage?.thumbnailUrl ?? product?.thumbnailImage?.url ?? `${BasePath}${DEFAULT_PRODUCT_IMAGE_PATH}`;
  }
  _resolveAltText(product) {
    return product?.thumbnailImage?.alternateText || '';
  }
}