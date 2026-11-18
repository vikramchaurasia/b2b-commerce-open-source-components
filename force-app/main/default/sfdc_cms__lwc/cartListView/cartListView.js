import { LightningElement } from 'lwc';
import { isDesignMode } from 'experience/clientApi';
import { CART_LIST_SORT_CHANGE_EVENT, DEFAULT_SORT_VALUE } from 'site/cartListSortDropdownUi';
import ImportCartModal from 'site/cartImportModal';
import { launchImportErrorReport } from 'site/cartImportErrorReportLauncher';
import LABELS from './labels';
import BasePath from '@salesforce/community/basePath';

/**
 * @slot sortDropdown - Slot for the sort options component
 * @slot emptyListView - Custom empty state content for the current filter
 * @slot cartsRepeater - Slot for dxp_content_layout:list with cart items
 */
export default class CartListView extends LightningElement {
  static renderMode = 'light';
  _labels = LABELS;
  _cartsCount;
  _error = false;
  _isLoading = true;
  _sortOrder = DEFAULT_SORT_VALUE;
  _handleStatus = evt => this._onStatus(evt);
  _handleLoading = evt => this._onLoading(evt);
  _reload = () => {
    document.dispatchEvent(new CustomEvent('reloadCartList', {
      bubbles: true,
      composed: true
    }));
  };
  _handleReimport = evt => {
    evt.stopPropagation();
    const cartId = evt.detail?.cartId;
    if (!cartId) {
      return;
    }
    this._openReimportModal(cartId, evt.detail?.modalLabels).catch(err => {
      console.error('CartListViewV2: re-import modal failed', err);
    });
  };
  async _openReimportModal(cartId, modalLabels) {
    const result = await ImportCartModal.open({
      size: 'small',
      cartId,
      ...modalLabels
    });
    if (result && result !== 'cancelled' && typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('reloadCartList'));
    }
  }
  _handleViewErrors = evt => {
    evt.stopPropagation();
    launchImportErrorReport(evt.detail, 'CartListViewV2');
  };
  connectedCallback() {
    this._sortOrder = DEFAULT_SORT_VALUE;
    this.addEventListener('cartliststatus', this._handleStatus);
    this.addEventListener('loadingcarts', this._handleLoading);
    this.addEventListener('importstarted', this._reload);
    this.addEventListener('cartoperationreimport', this._handleReimport);
    this.addEventListener('cartoperationviewerrors', this._handleViewErrors);
    this.addEventListener(CART_LIST_SORT_CHANGE_EVENT, this._handleSortChange);
  }
  disconnectedCallback() {
    this.removeEventListener('cartliststatus', this._handleStatus);
    this.removeEventListener('loadingcarts', this._handleLoading);
    this.removeEventListener('importstarted', this._reload);
    this.removeEventListener('cartoperationreimport', this._handleReimport);
    this.removeEventListener('cartoperationviewerrors', this._handleViewErrors);
    this.removeEventListener(CART_LIST_SORT_CHANGE_EVENT, this._handleSortChange);
  }
  _onStatus(event) {
    event.stopPropagation();
    this._cartsCount = event.detail?.count;
    this._error = Boolean(event.detail?.error);
  }
  _onLoading(event) {
    event.stopPropagation();
    this._isLoading = Boolean(event.detail?.loading);
  }
  isValidSortOrder(value) {
    return ['Default', 'CreatedDateAsc', 'CreatedDateDesc', 'LastModifiedDateAsc', 'LastModifiedDateDesc'].includes(value);
  }
  _handleSortChange = event => {
    event.stopPropagation();
    const newSortOrder = event.detail;
    if (!newSortOrder || !this.isValidSortOrder(newSortOrder)) {
      return;
    }
    this._sortOrder = newSortOrder;
    const dataProvider = this.querySelector('commerce_data_provider-cart-list-data-provider');
    if (!dataProvider) {
      return;
    }
    dataProvider.dispatchEvent(new CustomEvent(CART_LIST_SORT_CHANGE_EVENT, {
      bubbles: false,
      detail: {
        sort: newSortOrder
      }
    }));
  };
  get _showLoading() {
    return !isDesignMode && this._isLoading;
  }
  get _loadingSpinnerClasses() {
    return this._hasCarts ? 'cart-list-loading cart-list-loading_overlay' : 'cart-list-loading';
  }
  get _showSlotEmptyState() {
    return isDesignMode || this._cartsCount === 0 && !this._error && !this._isLoading;
  }
  get _hasError() {
    return !isDesignMode && this._error && !this._isLoading;
  }
  get _errorSvg() {
    return `${BasePath}/assets/icons/warning-outline.svg`;
  }
  get _emptySvg() {
    return `${BasePath}/assets/images/empty-cart.svg`;
  }
  get _hasCarts() {
    return isDesignMode || (this._cartsCount ?? 0) > 0;
  }
  get _sortDropdownSlotClasses() {
    return isDesignMode ? 'cart-list-sort-dropdown-slot is-design-mode' : 'cart-list-sort-dropdown-slot';
  }
}