import LightningModal from 'lightning/modal';
import { api } from 'lwc';
import Toast from 'site/commonToast';
import { getCartExportFields, createCartExportJob } from 'commerce/checkoutCartApi';
import { extractApiError } from 'site/cartExportJobCardConstants';
import LABELS from './labels';
import { MAX_OPTIONAL_FIELDS, EXPORT_FORMAT_CSV } from './constants';
export default class CartExportModal extends LightningModal {
  @api
  cartData;
  @api
  modalTitleLabel;
  @api
  exportNameLabel;
  @api
  exportAsLabel;
  @api
  mandatoryFieldsLabel;
  @api
  optionalFieldsLabel;
  @api
  exportButtonLabel;
  @api
  cancelButtonLabel;
  get _labels() {
    return {
      ...LABELS,
      exportCartHeader: this.modalTitleLabel || LABELS.exportCartHeader,
      exportNameLabel: this.exportNameLabel || LABELS.exportNameLabel,
      exportAsLabel: this.exportAsLabel || LABELS.exportAsLabel,
      mandatoryFieldsLabel: this.mandatoryFieldsLabel || LABELS.mandatoryFieldsLabel,
      optionalFieldsLabel: (this.optionalFieldsLabel || LABELS.optionalFieldsLabel).replace('{0}', String(this._maxSelectableFields)),
      confirmExportButtonLabel: this.exportButtonLabel || LABELS.confirmExportButtonLabel,
      cancelButtonLabel: this.cancelButtonLabel || LABELS.cancelButtonLabel
    };
  }
  static DISMISSAL = {
    success: 'success',
    error: 'error',
    cancelled: 'cancelled'
  };
  _maxSelectableFields = MAX_OPTIONAL_FIELDS;
  _exportName = '';
  _exportFormat = EXPORT_FORMAT_CSV;
  _mandatoryFields = [];
  _optionalFields = [];
  isExportInProgress = false;
  async connectedCallback() {
    this._exportName = this.cartData?.name ?? '';
    this._applyFallbackFields();
    this._loadExportFields();
  }
  async _loadExportFields() {
    try {
      const data = await getCartExportFields();
      const mandatory = data.cartItem.filter(f => f.isMandatory).map(f => ({
        ...f,
        inputId: `export-field-mandatory-${f.name}`
      }));
      if (mandatory.length === 0) {
        console.warn('[ExportCartModal] No mandatory fields returned; keeping fallback fields.');
        return;
      }
      this._mandatoryFields = mandatory;
      this._optionalFields = data.cartItem.filter(f => !f.isMandatory).map(f => ({
        ...f,
        selected: false,
        inputId: `export-field-optional-${f.name}`
      }));
      if (data.maxSelectableFields !== undefined && data.maxSelectableFields > 0) {
        this._maxSelectableFields = data.maxSelectableFields;
      }
    } catch {
      // fallback already applied - nothing to do
    }
  }
  _applyFallbackFields() {
    this._mandatoryFields = [{
      name: 'Sku',
      label: 'SKU',
      isMandatory: true,
      inputId: 'export-field-mandatory-Sku'
    }, {
      name: 'Quantity',
      label: 'Quantity',
      isMandatory: true,
      inputId: 'export-field-mandatory-Quantity'
    }];
    this._optionalFields = [];
  }
  get _headerLabel() {
    return this._labels.exportCartHeader;
  }
  get _cartName() {
    return this.cartData?.name ?? '';
  }
  get _cartMeta() {
    const count = this.cartData?.totalProductCount ?? 0;
    const visibility = this.cartData?.visibility ?? '';
    const parts = [`${count} Items`];
    if (visibility) {
      parts.push(visibility);
    }
    return parts.join(' • ');
  }
  get _cartDescription() {
    return this.cartData?.description ?? '';
  }
  get _isDefaultCart() {
    return this.cartData?.isSecondary === false;
  }
  get _hasCartTotal() {
    return Boolean(this.cartData?.grandTotalAmount);
  }
  get _cartTotalAmount() {
    return parseFloat(this.cartData.grandTotalAmount);
  }
  get _cartCurrencyCode() {
    return this.cartData?.currencyIsoCode ?? 'USD';
  }
  get _isNotLoading() {
    return !this.isExportInProgress;
  }
  get _isCsvSelected() {
    return this._exportFormat === EXPORT_FORMAT_CSV;
  }
  get _selectedOptionalCount() {
    return this._optionalFields.filter(f => f.selected).length;
  }
  get _isExportButtonDisabled() {
    return this.isExportInProgress || !this._exportName.trim();
  }
  get _hasOptionalFields() {
    return this._optionalFields.length > 0;
  }
  get _optionalFieldOptions() {
    const atCap = this._selectedOptionalCount >= this._maxSelectableFields;
    return this._optionalFields.map(f => ({
      ...f,
      disabled: atCap && !f.selected
    }));
  }
  handleExportNameChange(event) {
    this._exportName = event.detail.value ?? '';
    const input = event.currentTarget;
    input.setCustomValidity('');
    input.reportValidity();
  }
  handleExportNameBlur(event) {
    const input = event.currentTarget;
    if (!input.value?.trim()) {
      input.setCustomValidity(LABELS.exportNameRequired);
    } else {
      input.setCustomValidity('');
    }
    input.reportValidity();
  }
  _queryExportNameInput() {
    return this.template?.querySelector('lightning-input[data-name="exportName"]');
  }
  handleOptionalFieldChange(event) {
    const target = event.target;
    const key = target.dataset.fieldKey;
    if (!key) {
      return;
    }
    const field = this._optionalFields.find(f => f.name === key);
    if (!field) {
      return;
    }
    if (!field.selected && this._selectedOptionalCount >= this._maxSelectableFields) {
      target.checked = false;
      return;
    }
    this._optionalFields = this._optionalFields.map(f => {
      return f.name === key ? {
        ...f,
        selected: target.checked
      } : f;
    });
  }
  async handleConfirmExport() {
    const cartId = this.cartData?.cartId;
    if (!cartId) {
      return;
    }
    const input = this._queryExportNameInput();
    if (input && !input.value?.trim()) {
      input.setCustomValidity(LABELS.exportNameRequired);
      input.reportValidity();
      return;
    }
    this.isExportInProgress = true;
    try {
      const allSelectedFields = [...this._mandatoryFields.map(f => f.name), ...this._optionalFields.filter(f => f.selected).map(f => f.name)];
      await createCartExportJob({
        cartId,
        exportName: this._exportName.trim(),
        fieldNames: allSelectedFields
      });
      const toast = {
        label: LABELS.exportSuccessMessage,
        variant: 'processing'
      };
      Toast.show(toast, this);
      this.close(CartExportModal.DISMISSAL.success);
    } catch (error) {
      const {
        errorCode,
        message
      } = extractApiError(error);
      const label = message || (errorCode === 'MAX_LIMIT_EXCEEDED' ? LABELS.exportRateLimitError : LABELS.exportFailedError);
      const toast = {
        label,
        variant: 'error'
      };
      Toast.show(toast, this);
      this.close(CartExportModal.DISMISSAL.error);
    } finally {
      this.isExportInProgress = false;
    }
  }
  handleClose() {
    this.close(CartExportModal.DISMISSAL.cancelled);
  }
}
export const EXPORT_CART_DISMISSAL = CartExportModal.DISMISSAL;