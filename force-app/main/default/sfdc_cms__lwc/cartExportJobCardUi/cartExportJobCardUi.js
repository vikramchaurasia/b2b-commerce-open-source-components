import { LightningElement, api, track } from 'lwc';
import { generateUrl } from 'lightning/fileDownload';
import Toast from 'site/commonToast';
import BasePath from '@salesforce/community/basePath';
import currentSiteLanguage from '@salesforce/i18n/lang';
import LABELS from './labels';
import { stripLocaleFromDownloadUrl } from './utils';
import { STATUS_THEME_MAP, DOWNLOADABLE_JOB_STATUSES, OPTIONS_JOB_STATUSES, IN_PROGRESS_JOB_STATUSES, EXPORT_JOB_DELETE_REQUESTED_EVENT, EXPORT_JOB_CANCEL_REQUESTED_EVENT, interpolateLabel } from 'site/cartExportJobCardConstants';
export default class CartExportJobCardUi extends LightningElement {
  static renderMode = 'light';
  @track
  _isOptionsOpen = false;
  _shouldFocusDeleteOption = false;
  _labels = LABELS;
  @api
  cartExportJobData;
  @api
  exportDateLabel;
  @api
  downloadButtonLabel;
  @api
  cancelExportLabel;
  @api
  exportedPillLabel;
  @api
  exportInProgressPillLabel;
  @api
  exportFailedPillLabel;
  @api
  deleteButtonLabel;
  @api
  exportPillTextSizeClass;
  get _onDateLabel() {
    return this.exportDateLabel ?? this._labels.onDateLabel;
  }
  get _downloadButtonLabel() {
    return this.downloadButtonLabel ?? this._labels.downloadButton;
  }
  get _downloadAssistiveText() {
    return [this._downloadButtonLabel, this._cartName].filter(Boolean).join(' — ');
  }
  get _cancelButtonLabel() {
    return this.cancelExportLabel ?? this._labels.cancelButton;
  }
  get _deleteExportOptionLabel() {
    return this.deleteButtonLabel ?? this._labels.deleteExportOption;
  }
  get _badgeLabelClass() {
    return `export-job-badge__label ${this.exportPillTextSizeClass ?? ''}`.trim();
  }
  get _trashIconUrl() {
    return `${BasePath}/assets/icons/trash.svg#trash`;
  }
  get _infoIconUrl() {
    return `${BasePath}/assets/icons/info-filled.svg#info-filled`;
  }
  get _status() {
    return this.cartExportJobData?.jobStatus;
  }
  get _cartName() {
    return this.cartExportJobData?.cartName ?? '';
  }
  get _createdDate() {
    return this.cartExportJobData?.startTime;
  }
  get _statusLabel() {
    switch (this._status) {
      case 'Completed':
        return this.exportedPillLabel ?? this._labels.statusJobComplete;
      case 'Failed':
        return this.exportFailedPillLabel ?? this._labels.statusFailed;
      case 'InProgress':
        return this.exportInProgressPillLabel ?? this._labels.statusInProgress;
      case 'Initiated':
        return this.exportInProgressPillLabel ?? this._labels.statusNew;
      case 'Cancelled':
        return this._labels.statusAborted;
      default:
        return this._status ?? '';
    }
  }
  get _statusTheme() {
    return this._status && STATUS_THEME_MAP[this._status] || 'neutral';
  }
  get _badgeClass() {
    return `export-job-badge export-job-badge_${this._statusTheme}`;
  }
  get _mainClass() {
    const base = 'export-job-card__main';
    const hasBottomActions = this._showDownload || this._showOptions;
    return hasBottomActions ? `${base} ${base}--stacked` : base;
  }
  get _isCartDeleted() {
    return this.cartExportJobData?.cartDeleted === true;
  }
  get _downloadUrl() {
    const file = this.cartExportJobData?.fileInfos?.[0];
    return file ? stripLocaleFromDownloadUrl(generateUrl(file.fileId), BasePath, currentSiteLanguage) : undefined;
  }
  get _showDownload() {
    const status = this._status;
    return !!status && DOWNLOADABLE_JOB_STATUSES.includes(status) && this._downloadUrl !== undefined;
  }
  handleDownload() {
    Toast.show({
      label: interpolateLabel(this._labels.downloadStarted, this._cartName),
      variant: 'success'
    }, this);
  }
  get _showOptions() {
    const status = this._status;
    return !!status && OPTIONS_JOB_STATUSES.includes(status);
  }
  get _ariaExpanded() {
    return this._isOptionsOpen ? 'true' : 'false';
  }
  handleTriggerClick(event) {
    event.stopPropagation();
    this._isOptionsOpen = !this._isOptionsOpen;
    if (this._isOptionsOpen) {
      this._shouldFocusDeleteOption = true;
    }
  }
  renderedCallback() {
    if (this._shouldFocusDeleteOption) {
      this._shouldFocusDeleteOption = false;
      this.refs?.deleteOption?.focus();
    }
  }
  handleFocusOut(event) {
    const wrapper = this.refs?.optionsWrapper;
    const relatedTarget = event.relatedTarget;
    if (!relatedTarget || wrapper && !wrapper.contains(relatedTarget)) {
      this._isOptionsOpen = false;
    }
  }
  handleKeyDown(event) {
    if (event.key === 'Escape') {
      this._isOptionsOpen = false;
      const trigger = this.refs?.optionsTrigger;
      trigger?.focus();
    }
  }
  handleOptionSelect(event) {
    event.stopPropagation();
    this._isOptionsOpen = false;
    const jobId = this.cartExportJobData?.jobId;
    if (!jobId) {
      return;
    }
    const detail = {
      jobId,
      cartName: this._cartName
    };
    this.dispatchEvent(new CustomEvent(EXPORT_JOB_DELETE_REQUESTED_EVENT, {
      bubbles: true,
      composed: true,
      detail
    }));
  }
  get _showCancel() {
    const status = this._status;
    return !!status && IN_PROGRESS_JOB_STATUSES.includes(status);
  }
  handleCancel(event) {
    event.stopPropagation();
    const jobId = this.cartExportJobData?.jobId;
    if (!jobId) {
      return;
    }
    const detail = {
      jobId,
      cartName: this._cartName
    };
    this.dispatchEvent(new CustomEvent(EXPORT_JOB_CANCEL_REQUESTED_EVENT, {
      bubbles: true,
      composed: true,
      detail
    }));
  }
}