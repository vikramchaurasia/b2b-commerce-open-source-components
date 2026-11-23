import { LightningElement, api, wire } from 'lwc';
import { isDesignMode } from 'experience/clientApi';
import { CurrentPageReference } from 'lightning/navigation';
import { CartContentsAdapter, CartStatusAdapter } from 'commerce/checkoutCartApi';
import currency from '@salesforce/i18n/currency';
import { DESIGN_MODE_SAMPLE_CART_TOTAL, LAYOUT_LABEL_AND_TOTAL_PRICE } from './constants';
import { AppContextAdapter, CartConfigurationContextAdapter, SessionContextAdapter } from 'commerce/contextApi';
import { generateStyleProperties } from 'experience/styling';
import { isCartLocked, isLockHolder, shouldRestrictOwnerActions, getCurrentUserAccessLevel } from 'site/cartDetailsCardUtils';
import { hasActiveAsyncOperationFromWires } from 'site/commonUtils';
import { asNonEmptyString } from './utils';
export { LAYOUT_LABEL, LAYOUT_LABEL_AND_TOTAL_PRICE } from './constants';
export default class CheckoutButton extends LightningElement {
  static renderMode = 'light';
  @api
  text;
  @api
  variant;
  @api
  size;
  @api
  width;
  @api
  alignment;
  @api
  buttonTextColor;
  @api
  buttonTextHoverColor;
  @api
  buttonBackgroundColor;
  @api
  buttonBackgroundHoverColor;
  @api
  buttonBorderColor;
  @api
  buttonBorderRadius;
  @api
  layoutDesktop;
  @api
  layoutMobile;
  get hasProducts() {
    return Number(this.cartSummary?.totalProductCount) > 0;
  }
  get showButton() {
    if (isDesignMode) {
      return true;
    }
    return this.hasProducts && !this.isRestrictedCollaborator;
  }
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
  @wire(CartContentsAdapter, {
    cartId: '$effectiveCartId'
  })
  cartContentsEntry;
  get cartSummary() {
    return this.cartContentsEntry?.data?.cartSummary;
  }
  @wire(CartStatusAdapter)
  cartStatusHandler;
  @wire(SessionContextAdapter)
  sessionContext;
  _managedCheckoutVersion;
  @wire(CartConfigurationContextAdapter)
  _cartConfiguration;
  get _isShareCartEnabled() {
    return Boolean(this._cartConfiguration?.data?.shareCart?.isEnabled);
  }
  @wire(AppContextAdapter)
  appContextHandler(response) {
    if (response.data && response?.data?.checkoutSettings) {
      const managedCheckoutVersion = response?.data?.managedCheckoutVersion;
      const isManagedCheckoutEnabled = !!response?.data?.checkoutSettings?.isManagedCheckoutEnabled;
      if (isManagedCheckoutEnabled && managedCheckoutVersion && managedCheckoutVersion !== '0.117.0') {
        this._managedCheckoutVersion = managedCheckoutVersion;
      }
    }
  }
  get cartId() {
    return this.cartSummary?.cartId;
  }
  get currencyCode() {
    return this.cartSummary?.currencyIsoCode || currency;
  }
  get isCartProcessing() {
    let val = !!this.cartStatusHandler?.data?.isProcessing || !!this.cartContentsEntry?.loading;
    if (typeof window !== 'undefined') {
      val = val || !!this.cartStatusHandler?.loading;
    }
    return val;
  }
  get cartHasError() {
    return !!this.cartStatusHandler?.error || !!this.cartContentsEntry?.error;
  }
  get _cartTotal() {
    if (isDesignMode && !this.hasProducts) {
      return DESIGN_MODE_SAMPLE_CART_TOTAL;
    }
    return this.cartSummary?.grandTotalAmount;
  }
  get mediumCartTotal() {
    const cartTotal = this._cartTotal;
    if (cartTotal && this.layoutDesktop === LAYOUT_LABEL_AND_TOTAL_PRICE) {
      return cartTotal;
    }
    return undefined;
  }
  get smallCartTotal() {
    const cartTotal = this._cartTotal;
    if (cartTotal && this.layoutMobile === LAYOUT_LABEL_AND_TOTAL_PRICE) {
      return cartTotal;
    }
    return undefined;
  }
  get _hasActiveAsyncOperation() {
    return hasActiveAsyncOperationFromWires(this.cartStatusHandler?.data, this.cartSummary);
  }
  get isGuest() {
    return this.sessionContext?.data?.isLoggedIn === false;
  }
  get isRestrictedCollaborator() {
    if (!this._isShareCartEnabled) {
      return false;
    }
    if (this.isGuest) {
      return false;
    }
    if (!shouldRestrictOwnerActions(this.cartSummary, this.sessionContext?.data?.userId)) {
      return false;
    }
    return getCurrentUserAccessLevel(this.cartSummary, this.sessionContext?.data?.userId) !== 'Checkout';
  }
  get isLockedForViewer() {
    return isCartLocked(this.cartSummary) && !isLockHolder(this.cartSummary, this.sessionContext?.data?.userId);
  }
  get isDisabled() {
    if (isDesignMode) {
      return false;
    }
    return !this.hasProducts || this.isCartProcessing || this.cartHasError || this.cartStatusHandler?.data?.isReadyForCheckout === false || this._hasActiveAsyncOperation || this.isLockedForViewer;
  }
  get buttonStyle() {
    const styles = [{
      name: '--com-c-button-color',
      value: this.buttonTextColor
    }, {
      name: '--com-c-button-color-hover',
      value: this.buttonTextHoverColor
    }, {
      name: '--com-c-button-color-background',
      value: this.buttonBackgroundColor
    }, {
      name: '--com-c-button-color-background-hover',
      value: this.buttonBackgroundHoverColor
    }, {
      name: '--com-c-button-radius-border',
      value: this.buttonBorderRadius ? this.buttonBorderRadius + 'px' : ''
    }, {
      name: '--com-c-button-color-border',
      value: this.buttonBorderColor
    }];
    return generateStyleProperties(styles);
  }
  get _hasSubscriptions() {
    return Boolean(this.cartSummary?.totalSubProductCount && parseFloat(this.cartSummary?.totalSubProductCount) > 0);
  }
  get _cannotCheckoutWithSubscriptionProducts() {
    return this.sessionContext?.data?.isLoggedIn === false && this._hasSubscriptions;
  }
  get canCheckout() {
    return !this.isCartProcessing && this.cartStatusHandler?.data?.isGuestCheckoutEnabled === true && !this._cannotCheckoutWithSubscriptionProducts;
  }
}