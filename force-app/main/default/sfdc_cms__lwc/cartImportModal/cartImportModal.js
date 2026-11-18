import LightningModal from 'lightning/modal';
import Toast from 'site/commonToast';
import LABELS from './labels';
import { api, track } from 'lwc';
export default class CartImportModal extends LightningModal {
  @api
  cartId;
  @api
  modalTitleLabel;
  @api
  modalSubtitleLabel;
  @api
  uploadFileLabel;
  @api
  dropFileLabel;
  @api
  startImportLabel;
  @api
  cancelLabel;
  @api
  mappingTitleLabel;
  get _labels() {
    return {
      ...LABELS,
      importCartHeader: this.modalTitleLabel || LABELS.importCartHeader,
      startImportButtonLabel: this.startImportLabel || LABELS.startImportButtonLabel,
      cancelButtonLabel: this.cancelLabel || LABELS.cancelButtonLabel
    };
  }
  get _formLabels() {
    const overrides = {};
    if (this.modalSubtitleLabel) {
      overrides.fileUploadLabel = this.modalSubtitleLabel;
    }
    if (this.uploadFileLabel) {
      overrides.uploadFileText = this.uploadFileLabel;
    }
    if (this.dropFileLabel) {
      overrides.dropFileText = this.dropFileLabel;
    }
    if (this.cancelLabel) {
      overrides.cancelButtonLabel = this.cancelLabel;
    }
    if (this.mappingTitleLabel) {
      overrides.cartItemIdentifiersLabel = this.mappingTitleLabel;
    }
    return overrides;
  }
  @track
  isImportInProgress = false;
  @track
  _isReadyToImport = false;
  @track
  _areMappingsVisible = false;
  _importStarted = false;
  get _isNotLoading() {
    return !this.isImportInProgress;
  }
  get _isStartImportDisabled() {
    return !this._isReadyToImport;
  }
  get _cancelButtonVariant() {
    return 'secondary';
  }
  get _controllerWrapperClass() {
    return this.isImportInProgress ? 'slds-hide' : 'import-modal-content';
  }
  get _controller() {
    return this.refs?.controller ?? null;
  }
  handleReadinessChange(event) {
    this._isReadyToImport = event.detail.isReady;
  }
  handleMappingsVisibleChange(event) {
    this._areMappingsVisible = event.detail.mappingsVisible;
  }
  async handleStartImport() {
    const controller = this._controller;
    if (!controller || this._isStartImportDisabled) {
      return;
    }
    this.disableClose = true;
    this.isImportInProgress = true;
    const result = await controller.startImport();
    if (result) {
      this._importStarted = true;
      this.disableClose = false;
      this.close(result);
      return;
    }
    this.isImportInProgress = false;
    this.disableClose = false;
    Toast.show({
      label: controller.resolveSubmitErrorLabel(this._labels.importFailedError),
      variant: 'error'
    }, this);
  }
  handleClose() {
    this.close('cancelled');
  }
  close(result) {
    if (!this._importStarted && !this.isImportInProgress) {
      this._controller?.cleanup();
    }
    super.close(result);
  }
}