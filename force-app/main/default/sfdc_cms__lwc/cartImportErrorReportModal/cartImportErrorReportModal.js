import LightningModal from 'lightning/modal';
import { api } from 'lwc';
import { fetchImportJobResults } from 'commerce/cartImportApi';
import { interpolateCountLabel } from './countLabel';
import LABELS from './labels';
import { LABEL_PARAM_TOKEN } from './constants';
export default class CartImportErrorReportModal extends LightningModal {
  @api
  jobId;
  @api
  webstoreId;
  @api
  popupLabel;
  @api
  messageLabel;
  @api
  closeButtonLabel;
  _labels = LABELS;
  _errors = [];
  _summary = {
    totalRecords: 0,
    successfulRecords: 0,
    failedRecords: 0
  };
  _isLoading = true;
  _hasError = false;
  async connectedCallback() {
    await this._loadResults();
  }
  async _loadResults() {
    this._isLoading = true;
    this._hasError = false;
    try {
      const result = await fetchImportJobResults({
        webstoreId: this.webstoreId,
        jobId: this.jobId
      });
      this._summary = result.summary;
      this._errors = result.errors.map((err, index) => ({
        ...err,
        key: `import-error-${index}`,
        rowLabel: LABELS.rowPrefix.replace(LABEL_PARAM_TOKEN, String(err.rowNumber))
      }));
    } catch {
      this._hasError = true;
      this._errors = [];
    } finally {
      this._isLoading = false;
    }
  }
  get _headerLabel() {
    return this.popupLabel || LABELS.errorReportHeader;
  }
  get _closeButtonLabel() {
    return this.closeButtonLabel || LABELS.closeButtonLabel;
  }
  get _hasErrors() {
    return !this._isLoading && !this._hasError && this._errors.length > 0;
  }
  get _errorRows() {
    return this._errors;
  }
  get _summaryLabel() {
    const count = this._summary.failedRecords || this._errors.length;
    return interpolateCountLabel(LABELS.fieldMappingErrorFound, this.messageLabel || LABELS.fieldMappingErrorsFound, count);
  }
  get _liveRegionText() {
    return this._hasErrors ? this._summaryLabel : '';
  }
  get _isLoadingState() {
    return this._isLoading;
  }
  get _isNotLoadingState() {
    return !this._isLoading;
  }
  get _isErrorState() {
    return !this._isLoading && this._hasError;
  }
  handleClose() {
    this.close('closed');
  }
}