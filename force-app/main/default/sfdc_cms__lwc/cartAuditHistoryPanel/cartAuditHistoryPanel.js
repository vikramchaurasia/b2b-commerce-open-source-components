import { LightningElement, api } from 'lwc';
import BasePath from '@salesforce/community/basePath';
import { cartCollaboratorHistoryLoadApi } from 'commerce/checkoutCartApi';
import LABELS from './labels';
import { toRows } from './utils';
export default class CartAuditHistoryPanel extends LightningElement {
  static renderMode = 'light';
  @api
  cartId;
  _entries = [];
  _rows = [];
  _isLoading = true;
  _hasError = false;
  _hasFocused = false;
  _loadRequestToken = 0;
  connectedCallback() {
    this.loadHistory();
  }
  renderedCallback() {
    const dialog = this.refs?.dialog;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    if (!this._isLoading && !this._hasFocused) {
      const heading = this.refs?.panelHeading;
      if (heading) {
        heading.focus();
        this._hasFocused = true;
      }
    }
  }
  async loadHistory() {
    this._isLoading = true;
    this._hasError = false;
    this._entries = [];
    this._rows = [];
    this._hasFocused = false;
    const requestToken = ++this._loadRequestToken;
    const isStale = () => requestToken !== this._loadRequestToken;
    try {
      const response = await cartCollaboratorHistoryLoadApi(this.cartId ? {
        cartId: this.cartId
      } : {});
      if (isStale()) {
        return;
      }
      this._entries = response?.entries ?? [];
      this._rows = toRows(this._entries);
    } catch {
      if (isStale()) {
        return;
      }
      this._entries = [];
      this._rows = [];
      this._hasError = true;
    } finally {
      if (!isStale()) {
        this._isLoading = false;
      }
    }
  }
  handleCloseClick() {
    this.close();
  }
  handleDialogClick(event) {
    const dialog = event.currentTarget;
    if (event.target === dialog && event.clientX < dialog.getBoundingClientRect().left) {
      this.close();
    }
  }
  handleCancel(event) {
    event.preventDefault();
    this.close();
  }
  handleNativeClose() {
    this.close();
  }
  handleRetryClick() {
    this.loadHistory();
  }
  close() {
    this.dispatchEvent(new CustomEvent('close'));
  }
  get panelHeaderLabel() {
    return LABELS.panelHeader;
  }
  get closeButtonLabel() {
    return LABELS.closeButtonLabel;
  }
  get spinnerAltText() {
    return LABELS.spinnerAltText;
  }
  get loadingText() {
    return LABELS.loadingText;
  }
  get emptyStateHeader() {
    return LABELS.emptyStateHeader;
  }
  get emptyStateMessage() {
    return LABELS.emptyStateMessage;
  }
  get loadErrorMessage() {
    return LABELS.loadErrorMessage;
  }
  get retryButtonLabel() {
    return LABELS.retryButton;
  }
  get performedByPrefix() {
    return LABELS.performedByPrefix;
  }
  get performedOnPrefix() {
    return LABELS.performedOnPrefix;
  }
  get quantityFromLabel() {
    return LABELS.quantityFromLabel;
  }
  get quantityToLabel() {
    return LABELS.quantityToLabel;
  }
  get couponCodeLabel() {
    return LABELS.couponCodeLabel;
  }
  get rows() {
    return this._rows;
  }
  get isLoading() {
    return this._isLoading;
  }
  get hasError() {
    return !this._isLoading && this._hasError;
  }
  get showEmptyState() {
    return !this._isLoading && !this._hasError && this._entries.length === 0;
  }
  get showEntries() {
    return !this._isLoading && !this._hasError && this._entries.length > 0;
  }
  get emptySvg() {
    return `${BasePath}/assets/images/empty-search.svg`;
  }
  get errorSvg() {
    return `${BasePath}/assets/icons/warning-outline.svg`;
  }
}