import { AppContextAdapter } from 'commerce/contextApi';
import { isDesignMode } from 'experience/clientApi';
import { LightningElement, api, wire } from 'lwc';
import { Labels } from './labels';
import { SAMPLE_CART_ITEMS, SAMPLE_CHECKOUT_DETAILS, SAMPLE_GIFT_WRAPS } from './designSampleData';
export default class CheckoutGiftOptions extends LightningElement {
  static renderMode = 'light';
  get isGiftingEnabled() {
    return isDesignMode || Boolean(this.appContext?.data?.giftingConfig?.isGiftingEnabled);
  }
  get isGiftWrapEnabled() {
    return isDesignMode || Boolean(this.appContext?.data?.giftingConfig?.isGiftWrapEnabled);
  }
  get isGiftMessageEnabled() {
    return isDesignMode || Boolean(this.appContext?.data?.giftingConfig?.isGiftMessageEnabled);
  }
  @api
  items;
  @api
  giftWraps;
  @api
  checkoutDetails;
  @api
  cartDetails;
  get isSecondaryCart() {
    return Boolean(this.cartDetails?.isSecondary);
  }
  get displayItems() {
    return isDesignMode ? SAMPLE_CART_ITEMS : this.items;
  }
  get displayGiftWraps() {
    return isDesignMode ? SAMPLE_GIFT_WRAPS : this.giftWraps;
  }
  get displayCheckoutDetails() {
    return isDesignMode ? SAMPLE_CHECKOUT_DETAILS : this.checkoutDetails;
  }
  get labels() {
    return Labels;
  }
  @wire(AppContextAdapter)
  appContext;
}