import { api } from 'lwc';
import LightningModal from 'lightning/modal';
import BasePath from '@salesforce/community/basePath';
import LABELS from './labels';
export default class CartDeleteAllExportsConfirmModal extends LightningModal {
  @api
  modalTitle;
  @api
  modalDescription;
  @api
  confirmButtonLabel;
  @api
  cancelButtonLabel;
  @api
  disableConfirm = false;
  static DISMISSAL = {
    confirm: 'confirm',
    cancel: 'cancel'
  };
  get _headerLabel() {
    return this.modalTitle ?? LABELS.deleteAllConfirmTitle;
  }
  get _bodyLabel() {
    return this.modalDescription ?? LABELS.deleteAllConfirmBody;
  }
  get _confirmLabel() {
    return this.confirmButtonLabel ?? LABELS.deleteAllConfirmButton;
  }
  get _cancelLabel() {
    return this.cancelButtonLabel ?? LABELS.deleteAllCancelButton;
  }
  get _warningIconUrl() {
    return `${BasePath}/assets/icons/warning-filled.svg#warning-filled`;
  }
  handleConfirm() {
    if (this.disableConfirm) {
      return;
    }
    this.close(CartDeleteAllExportsConfirmModal.DISMISSAL.confirm);
  }
  handleCancel() {
    this.close(CartDeleteAllExportsConfirmModal.DISMISSAL.cancel);
  }
}
export const DELETE_ALL_EXPORTS_DISMISSAL = CartDeleteAllExportsConfirmModal.DISMISSAL;