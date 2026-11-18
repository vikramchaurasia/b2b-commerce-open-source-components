import { api } from 'lwc';
import LightningModal from 'lightning/modal';
import BasePath from '@salesforce/community/basePath';
export default class CartOptionsConfirmationModal extends LightningModal {
  @api
  headerText;
  @api
  confirmationMessage;
  @api
  confirmButtonLabel;
  @api
  closeButtonLabel;
  @api
  iconType;
  @api
  spinnerHelpText;
  @api
  confirmAction;
  get _showIcon() {
    return this.iconType === 'confirmDelete' || this.iconType === 'confirmSave';
  }
  get _iconClass() {
    return `confirmation-icon icon-${this.iconType}`;
  }
  get _iconUrl() {
    if (this.iconType === 'confirmDelete') {
      return `${BasePath}/assets/icons/warning-filled.svg#warning-filled`;
    }
    if (this.iconType === 'confirmSave') {
      return `${BasePath}/assets/icons/info-filled.svg#info-filled`;
    }
    return '';
  }
  _isLoading = false;
  get _isNotLoading() {
    return !this._isLoading;
  }
  handleClose() {
    this.close('close');
  }
  async handleConfirm() {
    if (this.confirmAction) {
      this._isLoading = true;
      try {
        await this.confirmAction();
        this.close('confirm');
      } catch {
        this._isLoading = false;
        this.close('error');
      }
    } else {
      this.close('confirm');
    }
  }
}