import { LightningElement, api } from 'lwc';
import { isDesignMode } from 'experience/clientApi';
import { createCartExportJobsDeleteAllAction, createCartExportJobsGetAction, dispatchActionAsync } from 'commerce/actionApi';
import Toast from 'site/commonToast';
import DeleteAllExportsConfirmModal, { DELETE_ALL_EXPORTS_DISMISSAL } from 'site/cartDeleteAllExportsConfirmModal';
import { extractApiError, CART_EXPORT_JOB_MUTATION_STARTED_EVENT, CART_EXPORT_JOB_MUTATION_COMPLETED_EVENT } from 'site/cartExportJobCardConstants';
import LABELS from './labels';
export default class CartDeleteAllExportsButton extends LightningElement {
  static renderMode = 'light';
  @api
  cartExportJobListData;
  @api
  buttonLabel;
  @api
  modalTitle;
  @api
  modalDescription;
  @api
  confirmButtonLabel;
  @api
  cancelButtonLabel;
  _isDeleting = false;
  _isBusy = false;
  get _buttonLabel() {
    return this.buttonLabel ?? LABELS.deleteAllButton;
  }
  get _hasJobs() {
    if (isDesignMode) {
      return true;
    }
    return (this.cartExportJobListData?.jobs?.length ?? 0) > 0;
  }
  async handleDeleteAll(event) {
    event.stopPropagation();
    if (this._isBusy) {
      return;
    }
    const trigger = event.currentTarget;
    this._isBusy = true;
    let willEmptyList = false;
    try {
      const result = await DeleteAllExportsConfirmModal.open({
        label: this.modalTitle ?? LABELS.deleteAllConfirmTitle,
        size: 'small',
        modalTitle: this.modalTitle,
        modalDescription: this.modalDescription,
        confirmButtonLabel: this.confirmButtonLabel,
        cancelButtonLabel: this.cancelButtonLabel,
        disableConfirm: isDesignMode
      });
      if (result !== DELETE_ALL_EXPORTS_DISMISSAL.confirm || isDesignMode) {
        return;
      }
      this._isDeleting = true;
      document.dispatchEvent(new CustomEvent(CART_EXPORT_JOB_MUTATION_STARTED_EVENT));
      try {
        const deleteResult = await dispatchActionAsync(this, createCartExportJobsDeleteAllAction());
        willEmptyList = deleteResult !== undefined && (deleteResult.jobs?.length ?? 0) === 0;
        const toast = {
          label: LABELS.deleteAllSuccess,
          variant: 'success'
        };
        Toast.show(toast, this);
      } catch (error) {
        Toast.show({
          label: this.resolveErrorLabel(error),
          variant: 'error'
        }, this);
        await dispatchActionAsync(this, createCartExportJobsGetAction()).catch(() => {
          /* best-effort refresh */
        });
      } finally {
        document.dispatchEvent(new CustomEvent(CART_EXPORT_JOB_MUTATION_COMPLETED_EVENT));
      }
    } catch {
      const toast = {
        label: LABELS.deleteAllError,
        variant: 'error'
      };
      Toast.show(toast, this);
    } finally {
      this._isDeleting = false;
      this._isBusy = false;
      this.restoreFocus(trigger, willEmptyList);
    }
  }
  resolveErrorLabel(error) {
    const {
      errorCode,
      message
    } = extractApiError(error);
    if (message) {
      return message;
    }
    return errorCode === 'MAX_LIMIT_EXCEEDED' ? LABELS.deleteAllRateLimitError : LABELS.deleteAllError;
  }
  restoreFocus(trigger, willEmptyList) {
    if (!willEmptyList && trigger?.isConnected) {
      trigger.focus();
      return;
    }
    const host = this.hostElement;
    this.setAttribute('tabindex', '-1');
    const onHostBlur = () => {
      host.removeEventListener('blur', onHostBlur);
      this.removeAttribute('tabindex');
    };
    host.addEventListener('blur', onHostBlur);
    host.focus({
      preventScroll: true
    });
  }
}