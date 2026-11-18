import { LightningElement, api } from 'lwc';
import BasePath from '@salesforce/community/basePath';
import DEFAULT_LABELS from './labels';
import { FILE_SELECT_EVENT, REMOVE_FILE_EVENT, CANCEL_UPLOAD_EVENT, REUPLOAD_EVENT, MAPPING_CHANGE_EVENT } from './constants';
export { FILE_SELECT_EVENT, REMOVE_FILE_EVENT, CANCEL_UPLOAD_EVENT, REUPLOAD_EVENT, MAPPING_CHANGE_EVENT } from './constants';
export default class CartImportForm extends LightningElement {
  static renderMode = 'light';
  @api
  labels;
  @api
  variant = 'importCart';
  @api
  fieldDefs = [];
  @api
  selections = {};
  @api
  headerOptions = [];
  @api
  selectedFileName = '';
  @api
  fileError = '';
  @api
  isFileUploading = false;
  @api
  showMappings = false;
  @api
  fileCardStatusText = '';
  @api
  uploadProgressLabel = '';
  @api
  uploadProgressPercent = '';
  @api
  uploadProgressValue = 0;
  _isDragOver = false;
  get _labels() {
    return {
      ...DEFAULT_LABELS,
      ...(this.labels ?? {})
    };
  }
  get _gsheetIconUrl() {
    return `${BasePath}/assets/icons/gsheet.svg#gsheet`;
  }
  get _trashIconUrl() {
    return `${BasePath}/assets/icons/trash.svg#trash`;
  }
  get _closeIconUrl() {
    return `${BasePath}/assets/icons/close-circle.svg#close-circle`;
  }
  get _uploadLabelClass() {
    const classes = ['upload-label', 'slds-m-bottom_small'];
    if (this.variant === 'createCart') {
      classes.push('upload-label_embedded');
    }
    return classes.join(' ');
  }
  get _showErrorFileCard() {
    return !!this.fileError && this.selectedFileName !== '' && !this.isFileUploading;
  }
  get _fileContainerClass() {
    const classes = ['file-upload-container'];
    const hasNamedFile = this.selectedFileName !== '' && !this.fileError;
    if (hasNamedFile) {
      classes.push('has-file');
    } else if (this._showErrorFileCard) {
      classes.push('has-error-card');
    } else if (this.fileError) {
      classes.push('has-error');
    }
    if (this._isDragOver) {
      classes.push('drag-over');
    }
    return classes.join(' ');
  }
  get _mappingRows() {
    return this.fieldDefs.map((field, index) => {
      const previous = this.fieldDefs[index - 1];
      return {
        key: field.fieldName,
        fieldName: field.fieldName,
        label: field.label,
        isRequired: field.isRequired,
        value: this.selections?.[field.fieldName] ?? '',
        showDivider: !field.isRequired && previous?.isRequired === true
      };
    });
  }
  handleUploadClick() {
    this.refs?.fileInput?.click();
  }
  handleUploadKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleUploadClick();
    }
  }
  handleFileChange(event) {
    const files = event.target?.files;
    if (files && files.length > 0) {
      this._emitFileSelect(files[0]);
    }
    const fileInput = this.refs?.fileInput;
    if (fileInput) {
      fileInput.value = '';
    }
  }
  handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    this._isDragOver = true;
  }
  handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    this._isDragOver = false;
  }
  handleFileDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    this._isDragOver = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this._emitFileSelect(files[0]);
    }
  }
  handleRemoveFile() {
    this.dispatchEvent(new CustomEvent(REMOVE_FILE_EVENT));
  }
  handleCancelUpload() {
    this.dispatchEvent(new CustomEvent(CANCEL_UPLOAD_EVENT));
  }
  handleReupload() {
    this.dispatchEvent(new CustomEvent(REUPLOAD_EVENT));
    this.handleUploadClick();
  }
  handleMappingChange(event) {
    const fieldName = event.target?.dataset?.fieldName;
    if (!fieldName) {
      return;
    }
    const value = event.detail?.value ?? '';
    this.dispatchEvent(new CustomEvent(MAPPING_CHANGE_EVENT, {
      detail: {
        fieldName,
        value
      }
    }));
  }
  _emitFileSelect(file) {
    this.dispatchEvent(new CustomEvent(FILE_SELECT_EVENT, {
      detail: {
        file
      }
    }));
  }
}