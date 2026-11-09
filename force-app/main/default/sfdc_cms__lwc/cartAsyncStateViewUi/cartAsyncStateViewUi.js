import { LightningElement, api, wire } from 'lwc';
import { isDesignMode } from 'experience/clientApi';
import { AppContextAdapter, CartConfigurationContextAdapter } from 'commerce/contextApi';
import BasePath from '@salesforce/community/basePath';
import { createCartCancelAction, dispatchActionAsync } from 'commerce/actionApi';
import { cartReload } from 'commerce/checkoutCartApi';
import { cancelImportJob } from 'commerce/cartImportApi';
import Toast from 'site/commonToast';
import labels from './labels';
import { BANNER_DISPLAY_DURATION_MS, OPERATION_CONFIG } from './cartOperationConfig';
import { CART_OPERATION_TYPE, isOperationActive, isOperationCompleted, isOperationFailed, isImportCartOperation, isClearCartOperation, extractServerErrorMessage } from 'site/commonUtils';
export default class CartAsyncStateViewUi extends LightningElement {
  static renderMode = 'light';
  @api
  cartSummaryData;
  @api
  cancelButtonLabel;
  @api
  showImportAgainOption;
  @api
  importAgainButtonLabel;
  @api
  viewErrorsButtonLabel;
  @api
  importModalTitleLabel;
  @api
  importModalSubtitleLabel;
  @api
  importUploadFileLabel;
  @api
  importDropFileLabel;
  @api
  importStartImportLabel;
  @api
  importCancelButtonLabel;
  @api
  importMappingTitleLabel;
  @api
  mappingErrorPopupLabel;
  @api
  mappingErrorMessageLabel;
  @api
  mappingErrorCloseButtonLabel;
  _webstoreId = '';
  _isImportProductsEnabled = false;
  _cancelledJobId;
  @wire(AppContextAdapter)
  appContextHandler(entry) {
    this._webstoreId = entry?.data?.webstoreId ?? '';
  }
  @wire(CartConfigurationContextAdapter)
  cartConfigurationHandler(entry) {
    this._isImportProductsEnabled = Boolean(entry?.data?.importProductsToCart?.isEnabled);
  }
  get _activeSlot() {
    const cart = this.cartSummaryData;
    if (!cart) {
      return null;
    }
    const config = OPERATION_CONFIG[cart.lastOperationType];
    if (!config) {
      return null;
    }
    if (isOperationActive(cart)) {
      return config.inProgress;
    }
    if (isOperationCompleted(cart)) {
      if (config.success.requireEmpty && Number(cart.totalProductCount ?? '1') !== 0) {
        return null;
      }
      if (!this.isWithinDisplayWindow(cart, config.success.displayDurationMs)) {
        return null;
      }
      return config.success;
    }
    if (isOperationFailed(cart)) {
      if (!this.isWithinDisplayWindow(cart, config.failed.displayDurationMs)) {
        return null;
      }
      return config.failed;
    }
    return null;
  }
  isWithinDisplayWindow(cart, durationMs = BANNER_DISPLAY_DURATION_MS) {
    const {
      lastOperationFinishedAt
    } = cart;
    if (!lastOperationFinishedAt) {
      return true;
    }
    const finishedAtTime = new Date(lastOperationFinishedAt).getTime();
    const elapsedMs = Date.now() - finishedAtTime;
    return elapsedMs >= 0 && elapsedMs < durationMs;
  }
  _resolveShowReimport(slot) {
    if (!slot || !slot.actions.includes('reimport')) {
      return false;
    }
    return this.showImportAgainOption !== false && (isDesignMode || this._isImportProductsEnabled);
  }
  get _view() {
    const slot = this._activeSlot;
    const isImport = isImportCartOperation(this.cartSummaryData?.lastOperationType);
    const cancelOverride = isImport ? this.cancelButtonLabel : undefined;
    const viewErrorsOverride = isImport ? this.viewErrorsButtonLabel : undefined;
    const reimportOverride = isImport ? this.importAgainButtonLabel : undefined;
    return {
      visible: slot !== null,
      label: slot ? labels[slot.labelKey] : '',
      ariaLabelTemplate: slot ? labels[slot.ariaLabelKey ?? slot.labelKey] : '',
      iconPath: slot ? `${BasePath}/assets/icons/subscriptions-status.svg#${slot.iconState}` : '',
      cancelLabel: slot && slot.cancelLabelKey ? cancelOverride || labels[slot.cancelLabelKey] : '',
      viewErrorsLabel: slot && slot.viewErrorsLabelKey ? viewErrorsOverride || labels[slot.viewErrorsLabelKey] : '',
      reimportLabel: slot && slot.reimportLabelKey ? reimportOverride || labels[slot.reimportLabelKey] : '',
      showCancel: slot ? slot.actions.includes('cancel') : false,
      showViewErrors: slot ? slot.actions.includes('viewErrors') : false,
      showReimport: this._resolveShowReimport(slot)
    };
  }
  get _isVisible() {
    if (this._cancelledJobId && this._cancelledJobId === this.cartSummaryData?.lastOperationJobId) {
      return false;
    }
    return this._view.visible;
  }
  get _label() {
    return this._view.label;
  }
  get _iconPath() {
    return this._view.iconPath;
  }
  get _cartStatusAriaLabel() {
    if (!this._isVisible) {
      return '';
    }
    const cartName = this.cartSummaryData?.name ?? '';
    return this._view.ariaLabelTemplate.replace('{cart_name}', cartName);
  }
  get _cancelLabel() {
    return this._view.cancelLabel;
  }
  get _showCancelAction() {
    return this._view.showCancel;
  }
  get _showViewErrorsAction() {
    return this._view.showViewErrors;
  }
  get _showReimportAction() {
    return this._view.showReimport;
  }
  get _viewErrorsLabel() {
    return this._view.viewErrorsLabel;
  }
  get _reimportLabel() {
    return this._view.reimportLabel;
  }
  async handleCancelOperation(event) {
    event.stopPropagation();
    event.preventDefault();
    if (isImportCartOperation(this.cartSummaryData?.lastOperationType)) {
      await this.handleImportCartCancel();
      return;
    }
    if (isClearCartOperation(this.cartSummaryData?.lastOperationType)) {
      await this.handleClearCartCancel();
    }
  }
  handleViewErrors(event) {
    event.stopPropagation();
    event.preventDefault();
    this.dispatchOperationEvent('cartoperationviewerrors', this._viewErrorsModalLabels);
  }
  handleReimport(event) {
    event.stopPropagation();
    event.preventDefault();
    this.dispatchOperationEvent('cartoperationreimport', this._reimportModalLabels);
  }
  get _reimportModalLabels() {
    return this.pickDefined({
      modalTitleLabel: this.importModalTitleLabel,
      modalSubtitleLabel: this.importModalSubtitleLabel,
      uploadFileLabel: this.importUploadFileLabel,
      dropFileLabel: this.importDropFileLabel,
      startImportLabel: this.importStartImportLabel,
      cancelLabel: this.importCancelButtonLabel,
      mappingTitleLabel: this.importMappingTitleLabel
    });
  }
  get _viewErrorsModalLabels() {
    return this.pickDefined({
      popupLabel: this.mappingErrorPopupLabel,
      messageLabel: this.mappingErrorMessageLabel,
      closeButtonLabel: this.mappingErrorCloseButtonLabel
    });
  }
  pickDefined(source) {
    const result = {};
    Object.keys(source).forEach(key => {
      if (source[key]) {
        result[key] = source[key];
      }
    });
    return result;
  }
  dispatchOperationEvent(name, modalLabels) {
    const detail = {
      cartId: this.cartSummaryData.cartId,
      operationType: this.cartSummaryData.lastOperationType,
      jobId: this.cartSummaryData.lastOperationJobId,
      webstoreId: this._webstoreId
    };
    if (modalLabels && Object.keys(modalLabels).length > 0) {
      detail.modalLabels = modalLabels;
    }
    this.dispatchEvent(new CustomEvent(name, {
      bubbles: true,
      composed: true,
      detail
    }));
  }
  getToastSource() {
    return this.isConnected ? this : document.body;
  }
  async handleImportCartCancel() {
    const webstoreId = this._webstoreId;
    const jobId = this.cartSummaryData?.lastOperationJobId;
    if (!webstoreId || !jobId) {
      this.dispatchOperationEvent('cartoperationcancel');
      return;
    }
    let toastConfig;
    try {
      const result = await cancelImportJob({
        webstoreId,
        jobId
      });
      if (!result.errorCode) {
        this._cancelledJobId = jobId;
        toastConfig = {
          label: labels.cancelOperationSuccessLabel,
          variant: 'success'
        };
        cartReload();
        document.dispatchEvent(new CustomEvent('reloadCartList'));
      } else {
        toastConfig = {
          label: result.errorMessage ?? labels.cancelOperationErrorLabel,
          variant: 'error'
        };
      }
      this.dispatchEvent(new CustomEvent('cartupdated', {
        bubbles: true,
        composed: true
      }));
    } catch (error) {
      toastConfig = {
        label: extractServerErrorMessage(error) ?? labels.cancelOperationErrorLabel,
        variant: 'error'
      };
    } finally {
      if (toastConfig) {
        Toast.show(toastConfig, this.getToastSource());
      }
    }
  }
  async handleClearCartCancel() {
    document.dispatchEvent(new CustomEvent('canceloperationstarted'));
    let toastConfig;
    const cartId = this.cartSummaryData?.cartId;
    const jobId = this.cartSummaryData?.lastOperationJobId;
    const type = CART_OPERATION_TYPE.CLEAR_CART;
    try {
      const result = await dispatchActionAsync(this, createCartCancelAction({
        cartId,
        jobId,
        type
      }));
      const isSuccess = result.isSuccess;
      toastConfig = {
        label: result.message ?? (isSuccess ? labels.cancelOperationSuccessLabel : labels.cancelOperationErrorLabel),
        variant: isSuccess ? 'success' : 'error'
      };
    } catch (error) {
      toastConfig = {
        label: labels.cancelOperationErrorLabel,
        variant: 'error'
      };
      this.dispatchEvent(new CustomEvent('cartupdated', {
        bubbles: true,
        composed: true
      }));
    } finally {
      document.dispatchEvent(new CustomEvent('canceloperationcompleted'));
      if (toastConfig) {
        const configToShow = toastConfig;
        const toastSource = this.getToastSource();
        Promise.resolve().then(() => {
          Toast.show(configToShow, toastSource);
        });
      }
    }
  }
}