import { LightningElement, api } from 'lwc';
import { isDesignMode } from 'experience/clientApi';
import { createCartExportJobsGetAction, dispatchActionAsync } from 'commerce/actionApi';
import BasePath from '@salesforce/community/basePath';
import { CART_EXPORT_JOB_MUTATION_STARTED_EVENT, CART_EXPORT_JOB_MUTATION_COMPLETED_EVENT } from 'site/cartExportJobCardConstants';
import LABELS from './labels';
/**
 * @slot emptyBody
 * @slot jobsRepeater
 */
export default class CartExportJobListView extends LightningElement {
  static renderMode = 'light';
  _labels = LABELS;
  _jobsCount;
  _isLoading = true;
  _error = false;
  @api
  set cartExportJobListData(value) {
    this._cartExportJobListData = value;
    if (!this._isLoading) {
      this._jobsCount = value?.jobs?.length ?? 0;
    }
  }
  get cartExportJobListData() {
    return this._cartExportJobListData;
  }
  _cartExportJobListData;
  _mutationCount = 0;
  get _isMutating() {
    return this._mutationCount > 0;
  }
  _handleMutationStarted = () => {
    this._mutationCount += 1;
  };
  _handleMutationCompleted = () => {
    this._mutationCount = Math.max(0, this._mutationCount - 1);
  };
  connectedCallback() {
    globalThis?.document?.addEventListener(CART_EXPORT_JOB_MUTATION_STARTED_EVENT, this._handleMutationStarted);
    globalThis?.document?.addEventListener(CART_EXPORT_JOB_MUTATION_COMPLETED_EVENT, this._handleMutationCompleted);
    this.loadJobs().catch(err => {
      console.error('CartExportJobListView: loadJobs (initial load) failed', err);
    });
  }
  disconnectedCallback() {
    globalThis?.document?.removeEventListener(CART_EXPORT_JOB_MUTATION_STARTED_EVENT, this._handleMutationStarted);
    globalThis?.document?.removeEventListener(CART_EXPORT_JOB_MUTATION_COMPLETED_EVENT, this._handleMutationCompleted);
  }
  async loadJobs() {
    if (isDesignMode) {
      this._isLoading = false;
      return;
    }
    try {
      const data = await dispatchActionAsync(this, createCartExportJobsGetAction());
      this._jobsCount = data?.jobs?.length ?? 0;
      this._error = false;
    } catch (err) {
      console.error('CartExportJobListView: ACTION_CART_EXPORT_JOBS_LOAD failed', {
        err
      });
      this._jobsCount = 0;
      this._error = true;
    } finally {
      this._isLoading = false;
    }
  }
  @api
  get jobsCount() {
    return this._jobsCount ?? 0;
  }
  get _showLoading() {
    return !isDesignMode && this._isLoading;
  }
  get _showSlotEmptyState() {
    return isDesignMode || this._jobsCount === 0 && !this._error;
  }
  get _hasError() {
    return !isDesignMode && this._error;
  }
  get _showRepeater() {
    return isDesignMode || !this._error && (this._jobsCount ?? 0) > 0;
  }
  get _emptySvg() {
    return `${BasePath}/assets/images/cart-export.svg`;
  }
  get _showMutationOverlay() {
    return !isDesignMode && this._isMutating;
  }
  get _backgroundInert() {
    return this._showMutationOverlay ? true : undefined;
  }
  handleJobDeleted(event) {
    event.stopPropagation();
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
    this.reloadJobs();
  }
  handleJobCancelled(event) {
    event.stopPropagation();
    this.reloadJobs();
  }
  reloadJobs() {
    this._reloadJobsAsync().catch(err => {
      console.error('CartExportJobListView: reloadJobs (post-mutation reload) failed', err);
    });
  }
  async _reloadJobsAsync() {
    if (isDesignMode) {
      return;
    }
    try {
      const data = await dispatchActionAsync(this, createCartExportJobsGetAction());
      this._jobsCount = data?.jobs?.length ?? 0;
      this._error = false;
    } catch (err) {
      console.error('CartExportJobListView: post-mutation reload failed', {
        err
      });
    }
  }
}