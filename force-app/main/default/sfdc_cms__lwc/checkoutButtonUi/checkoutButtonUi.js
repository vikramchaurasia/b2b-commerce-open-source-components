import { LightningElement, wire, api } from 'lwc';
import { navigate, NavigationContext } from 'lightning/navigation';
import { generateElementAlignmentClass } from 'experience/styling';
import { createCheckoutBeginDataEvent, dispatchDataEvent } from 'commerce/dataEventApi';
import BasePath from '@salesforce/community/basePath';
import { SessionContextAdapter } from 'commerce/contextApi';
export default class CheckoutButtonUi extends LightningElement {
  static renderMode = 'light';
  @wire(NavigationContext)
  navContext;
  @wire(SessionContextAdapter)
  _sessionContext;
  @api
  cartId;
  @api
  cartTotal;
  @api
  currencyCode;
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
  disabled = false;
  @api
  buttonStyle;
  @api
  canCheckout;
  _managedCheckoutVersion;
  @api
  set managedCheckoutVersion(value) {
    this._managedCheckoutVersion = value;
    this.prefetchManagedCheckout();
  }
  get managedCheckoutVersion() {
    return this._managedCheckoutVersion;
  }
  prefetchManagedCheckout() {
    const mcUrl = `${BasePath}/webruntime/commerce/managed-checkout-${this._managedCheckoutVersion || ''}.js`;
    if (!import.meta.env.SSR) {
      if (this._managedCheckoutVersion && !this.isManagedCheckoutLoaded(mcUrl)) {
        const preloadManagedCheckoutLink = document.createElement('link');
        preloadManagedCheckoutLink.setAttribute('rel', 'prefetch');
        preloadManagedCheckoutLink.setAttribute('href', mcUrl);
        preloadManagedCheckoutLink.setAttribute('as', 'script');
        document.head.appendChild(preloadManagedCheckoutLink);
      }
    }
  }
  isManagedCheckoutLoaded(mcUrl) {
    if (!import.meta.env.SSR) {
      const links = document.getElementsByTagName('link');
      for (let i = 0; i < links.length; i++) {
        if (links[i]?.href.includes(mcUrl)) {
          return true;
        }
      }
    }
    return false;
  }
  get content() {
    return this.text;
  }
  get customButtonClasses() {
    return generateElementAlignmentClass(this.alignment || 'center');
  }
  get isLoggedIn() {
    return this._sessionContext?.data?.isLoggedIn === true;
  }
  get shouldIncludeCartId() {
    return this.canCheckout === true && !!this.cartId && this.isLoggedIn;
  }
  handleButtonClick() {
    if (this.canCheckout && this.cartId) {
      dispatchDataEvent(this, createCheckoutBeginDataEvent(this.cartId));
    }
    navigate(this.navContext, {
      type: 'comm__namedPage',
      attributes: {
        name: this.canCheckout ? 'Current_Checkout' : 'Login'
      },
      ...(this.shouldIncludeCartId ? {
        state: {
          recordId: this.cartId
        }
      } : {})
    });
  }
}