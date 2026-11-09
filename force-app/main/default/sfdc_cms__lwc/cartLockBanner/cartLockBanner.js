import { LightningElement, api, wire } from 'lwc';
import { isDesignMode } from 'experience/clientApi';
import { SessionContextAdapter } from 'commerce/contextApi';
import { generateStyleProperties } from 'experience/styling';
import { isCartLocked, isLockHolder } from 'site/cartDetailsCardUtils';

/**
 * @slot message - Slot for the lock message, authored as a `dxp_base:textBlock` and forwarded to
 */
export default class CartLockBanner extends LightningElement {
  static renderMode = 'light';
  @api
  cartSummary;
  @api
  alignItems;
  @api
  backgroundColor;
  @api
  borderColor;
  @api
  borderRadius;
  @api
  iconColor;
  @wire(SessionContextAdapter)
  sessionContext;
  get showBanner() {
    if (isDesignMode) {
      return true;
    }
    return isCartLocked(this.cartSummary) && !isLockHolder(this.cartSummary, this.sessionContext?.data?.userId);
  }
  get bannerStyle() {
    return generateStyleProperties([{
      name: '--com-c-cart-lock-align-items',
      value: this.alignItems
    }, {
      name: '--com-c-cart-lock-background-color',
      value: this.backgroundColor
    }, {
      name: '--com-c-cart-lock-border-color',
      value: this.borderColor
    }, {
      name: '--com-c-cart-lock-border-radius',
      value: this.borderRadius,
      suffix: 'px'
    }, {
      name: '--com-c-cart-lock-icon-color',
      value: this.iconColor
    }]);
  }
}