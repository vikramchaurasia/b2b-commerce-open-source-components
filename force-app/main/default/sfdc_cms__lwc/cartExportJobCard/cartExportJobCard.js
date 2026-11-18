import { LightningElement, api } from 'lwc';
import { generateStyleProperties } from 'experience/styling';
import { DXP_TEXT_SIZE, generateDxpClassForSize } from './utils';
import { createCartExportJobCancelAction, createCartExportJobDeleteAction, dispatchAction } from 'commerce/actionApi';
import Toast from 'site/commonToast';
import { extractApiError, interpolateLabel, EXPORT_JOB_DELETED_EVENT, EXPORT_JOB_CANCELLED_EVENT, CART_EXPORT_JOB_MUTATION_STARTED_EVENT, CART_EXPORT_JOB_MUTATION_COMPLETED_EVENT } from 'site/cartExportJobCardConstants';
import LABELS from './labels';
export default class CartExportJobCard extends LightningElement {
  static renderMode = 'light';
  @api
  cartExportJobData;
  _isBusy = false;
  @api
  exportDateLabel;
  @api
  downloadButtonLabel;
  @api
  cancelExportLabel;
  @api
  exportPillTextSize;
  @api
  exportPillTextColor;
  @api
  exportPillBackgroundColor;
  @api
  exportPillBorderColor;
  @api
  exportPillBorderRadius;
  @api
  exportedPillLabel;
  @api
  exportInProgressPillLabel;
  @api
  exportFailedPillLabel;
  @api
  deleteButtonLabel;
  get _pillTextSizeClass() {
    return generateDxpClassForSize(this.exportPillTextSize || DXP_TEXT_SIZE.BODY_SMALL);
  }
  get _customStyles() {
    return generateStyleProperties([{
      name: '--com-c-cart-export-job-badge-text-color',
      value: this.exportPillTextColor
    }, {
      name: '--com-c-cart-export-job-badge-background-color',
      value: this.exportPillBackgroundColor
    }, {
      name: '--com-c-cart-export-job-badge-border-color',
      value: this.exportPillBorderColor
    }, {
      name: '--com-c-cart-export-job-badge-border-radius',
      value: this.exportPillBorderRadius || this.exportPillBorderRadius === 0 ? `${this.exportPillBorderRadius}px` : ''
    }]);
  }
  handleDeleteRequested(event) {
    event.stopPropagation();
    const {
      jobId,
      cartName
    } = event.detail;
    if (this._isBusy || !jobId) {
      return;
    }
    this._isBusy = true;
    document.dispatchEvent(new CustomEvent(CART_EXPORT_JOB_MUTATION_STARTED_EVENT));
    dispatchAction(this, createCartExportJobDeleteAction(jobId), {
      onSuccess: () => {
        const toast = {
          label: interpolateLabel(LABELS.deleteSuccess, cartName),
          variant: 'success'
        };
        Toast.show(toast, this);
        this.dispatchEvent(new CustomEvent(EXPORT_JOB_DELETED_EVENT, {
          bubbles: true,
          composed: true
        }));
        this._isBusy = false;
        document.dispatchEvent(new CustomEvent(CART_EXPORT_JOB_MUTATION_COMPLETED_EVENT));
      },
      onError: error => {
        const toast = {
          label: this.resolveErrorLabel(error, LABELS.deleteError),
          variant: 'error'
        };
        Toast.show(toast, this);
        this._isBusy = false;
        document.dispatchEvent(new CustomEvent(CART_EXPORT_JOB_MUTATION_COMPLETED_EVENT));
      }
    });
  }
  handleCancelRequested(event) {
    event.stopPropagation();
    const {
      jobId,
      cartName
    } = event.detail;
    if (this._isBusy || !jobId) {
      return;
    }
    this._isBusy = true;
    document.dispatchEvent(new CustomEvent(CART_EXPORT_JOB_MUTATION_STARTED_EVENT));
    dispatchAction(this, createCartExportJobCancelAction(jobId), {
      onSuccess: () => {
        const toast = {
          label: LABELS.cancelSuccess,
          variant: 'success'
        };
        Toast.show(toast, this);
        this.dispatchEvent(new CustomEvent(EXPORT_JOB_CANCELLED_EVENT, {
          bubbles: true,
          composed: true
        }));
        this._isBusy = false;
        document.dispatchEvent(new CustomEvent(CART_EXPORT_JOB_MUTATION_COMPLETED_EVENT));
      },
      onError: error => {
        const toast = {
          label: this.resolveErrorLabel(error, LABELS.cancelError),
          variant: 'error'
        };
        Toast.show(toast, this);
        this._isBusy = false;
        document.dispatchEvent(new CustomEvent(CART_EXPORT_JOB_MUTATION_COMPLETED_EVENT));
      }
    });
  }
  resolveErrorLabel(error, fallback) {
    const {
      message
    } = extractApiError(error);
    return message || fallback;
  }
}