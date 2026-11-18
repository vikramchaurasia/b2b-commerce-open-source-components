import { LightningElement, wire } from 'lwc';
import { CartConfigurationContextAdapter } from 'commerce/contextApi';
import { isDesignMode } from 'experience/clientApi';
import labels from './labels';

/**
 * @slot heading - Slot for the title displayed at the top-left of the header row.
 * @slot newCartButton - Slot for the create-cart action button at the top-right of the header row.
 * @slot cartListTabs - Slot for the tabbed cart list
 * @slot cartList - Slot for the flat, single-view cart list
 */
export default class CartListContainer extends LightningElement {
  static renderMode = 'light';
  _isCancelInProgress = false;
  get _cancelOperationSpinnerLabel() {
    return labels.cancelOperationSpinnerLabel;
  }
  get _appContextLoadingLabel() {
    return labels.loadingCarts;
  }
  _isShareCartEnabled = false;
  _isAppContextResolved = false;
  @wire(CartConfigurationContextAdapter)
  handleCartConfiguration({
    data,
    loaded
  }) {
    if (!loaded) {
      return;
    }
    this._isShareCartEnabled = data?.shareCart?.isEnabled ?? false;
    this._isAppContextResolved = true;
  }
  get _showCartListBody() {
    return this._isAppContextResolved || isDesignMode;
  }
  get _showCartListTabs() {
    return isDesignMode || this._isShareCartEnabled;
  }
  get _showCartList() {
    return isDesignMode || !this._isShareCartEnabled;
  }
  _boundCancelOperationTriggeredHandler = null;
  _boundCancelOperationCompletedHandler = null;
  _boundReloadCartListHandler = null;
  connectedCallback() {
    if (!import.meta.env.SSR) {
      this._boundCancelOperationTriggeredHandler = () => {
        this._isCancelInProgress = true;
      };
      this._boundCancelOperationCompletedHandler = () => {
        this._isCancelInProgress = false;
      };
      this._boundReloadCartListHandler = event => {
        const shouldSwitch = event.detail?.switchToMyCarts === true;
        if (!shouldSwitch) {
          return;
        }
        const tabs = this.querySelector('dxp_layout-tabs');
        tabs?.dispatchEvent(new CustomEvent('activetab', {
          bubbles: true,
          detail: {
            activeTab: 'myCarts'
          }
        }));
      };
      document.addEventListener('canceloperationstarted', this._boundCancelOperationTriggeredHandler);
      document.addEventListener('canceloperationcompleted', this._boundCancelOperationCompletedHandler);
      document.addEventListener('reloadCartList', this._boundReloadCartListHandler);
    }
  }
  disconnectedCallback() {
    if (this._boundCancelOperationTriggeredHandler) {
      globalThis.document?.removeEventListener('canceloperationstarted', this._boundCancelOperationTriggeredHandler);
      this._boundCancelOperationTriggeredHandler = null;
    }
    if (this._boundCancelOperationCompletedHandler) {
      globalThis.document?.removeEventListener('canceloperationcompleted', this._boundCancelOperationCompletedHandler);
      this._boundCancelOperationCompletedHandler = null;
    }
    if (this._boundReloadCartListHandler) {
      globalThis.document?.removeEventListener('reloadCartList', this._boundReloadCartListHandler);
      this._boundReloadCartListHandler = null;
    }
  }
}