import { api, LightningElement, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { CartContentsAdapter, CartStatusAdapter } from 'commerce/checkoutCartApi';
import { SessionContextAdapter } from 'commerce/contextApi';
import { asNonEmptyString, isCartLocked, isLockHolder } from 'site/cartDetailsCardUtils';
import { generateStyleProperties } from 'experience/styling';
/**
 * @slot termsAndConditions
 * @slot discountAmount
 */

export default class CartPromotionApplied extends LightningElement {
  static renderMode = 'light';
  _currentPageReference;
  get effectiveCartId() {
    const cartIdFromRecordId = asNonEmptyString(this._currentPageReference?.state?.recordId);
    return cartIdFromRecordId ?? 'current';
  }
  @wire(CurrentPageReference)
  wireCurrentPageReference(pageRef) {
    if (pageRef) {
      this._currentPageReference = pageRef;
    }
  }
  @wire(CartStatusAdapter)
  cartStatus;
  @wire(CartContentsAdapter, {
    cartId: '$effectiveCartId'
  })
  cartContentsEntry;
  @wire(SessionContextAdapter)
  sessionContext;
  get hasActiveAsyncOperation() {
    return Boolean(this.cartStatus?.data?.isAsyncOperationInProgress);
  }
  get isLockedForViewer() {
    const cartSummary = this.cartContentsEntry?.data?.cartSummary;
    return isCartLocked(cartSummary) && !isLockHolder(cartSummary, this.sessionContext?.data?.userId);
  }
  @api
  couponCode;
  @api
  name;
  @api
  tierLabel;
  @api
  showDiscountAmount = false;
  @api
  showTermsAndConditions = false;
  @api
  couponId;
  @api
  termsAndConditions;
  @api
  termsAndConditionsTitleText;
  @api
  backgroundColor;
  @api
  borderRadius;
  @api
  borderColor;
  @api
  appliedPromotionTextColor;
  @api
  appliedPromotionBackgroundColor;
  @api
  appliedPromotionFontSize;
  get appliedPromotionCssStyles() {
    const styles = [{
      name: '--com-c-cart-applied-promotion-background-color',
      value: this.backgroundColor
    }, {
      name: '--com-c-pill-text-color',
      value: this.appliedPromotionTextColor
    }, {
      name: '--com-c-pill-background-color',
      value: this.appliedPromotionBackgroundColor || 'rgb(217, 223, 231)'
    }, {
      name: '--com-c-pill-border-radius',
      value: this.borderRadius ? this.borderRadius + 'px' : ''
    }, {
      name: '--com-c-pill-border-color',
      value: this.borderColor
    }, {
      name: '--com-c-pill-font-size',
      value: this.getDxpButtonFontSize(this.appliedPromotionFontSize)
    }];
    return generateStyleProperties(styles);
  }
  getDxpButtonFontSize(fontSize) {
    switch (fontSize) {
      case 'small':
        return 'var(--dxp-s-button-small-font-size)';
      case 'medium':
        return 'var(--dxp-s-button-font-size)';
      case 'large':
        return 'var(--dxp-s-button-large-font-size)';
      default:
        return '';
    }
  }
}