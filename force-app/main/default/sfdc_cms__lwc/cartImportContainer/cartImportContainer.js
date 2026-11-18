import { LightningElement, api, track, wire } from 'lwc';
import LOCALE from '@salesforce/i18n/locale';
import LABELS from './labels';
import { AppContextAdapter } from 'commerce/contextApi';
import { validateFile, validateCsvContent, readFileAsText, formatFileSize, areRequiredMappingsFilled, buildColumnMappingsForFields } from './importCartUtils';
import { extractServerErrorMessage } from 'site/commonUtils';
import { fetchMapperConfig, extractLimits, deriveFieldDefs, MAPPER_CONFIG_SECTION, startImportJob, uploadContentVersion, deleteContentDocument } from 'commerce/cartImportApi';
import { READINESS_CHANGE_EVENT, MAPPINGS_VISIBLE_CHANGE_EVENT, UPLOADING_CHANGE_EVENT } from './constants';
export { READINESS_CHANGE_EVENT, MAPPINGS_VISIBLE_CHANGE_EVENT, UPLOADING_CHANGE_EVENT } from './constants';
export { MAPPER_CONFIG_SECTION } from 'commerce/cartImportApi';
const BUYER_SAFE_UPLOAD_ERROR_CODES = new Set(['FILE_SIZE_LIMIT_EXCEEDED']);
export default class CartImportContainer extends LightningElement {
  static renderMode = 'light';
  @api
  cartId;
  @api
  importSection = MAPPER_CONFIG_SECTION.EXISTING_CART;
  @api
  formLabels;
  @api
  variant = 'importCart';
  _labels = LABELS;
  _selectedFile = null;
  @track
  _selectedFileName = '';
  @track
  _fileSize = '';
  @track
  _fileError = '';
  @track
  _isFileUploading = false;
  @track
  _selections = {};
  @track
  _csvHeaders = [];
  @track
  _fieldDefs = [];
  @track
  _uploadProgress = 0;
  @track
  _uploadFailed = false;
  @track
  _contentVersionId = null;
  _contentDocumentId = null;
  _uploadController = null;
  _importStarted = false;
  _isSubmitting = false;
  _submitErrorMessage = undefined;
  _processToken = 0;
  _importLimits;
  _mapperConfig = null;
  _configFetched = false;
  _configPromise;
  _lastReadiness = false;
  _lastMappingsVisible = false;
  _lastUploading = false;
  _webstoreId = '';
  @wire(AppContextAdapter)
  appContextHandler(entry) {
    const webstoreId = entry?.data?.webstoreId;
    if (!webstoreId) {
      return;
    }
    this._webstoreId = webstoreId;
    if (!this._configFetched) {
      this._configFetched = true;
      this._configPromise = this._fetchConfig(webstoreId);
    }
  }
  async _fetchConfig(webstoreId) {
    try {
      this._mapperConfig = await fetchMapperConfig(webstoreId);
      this._importLimits = extractLimits(this._mapperConfig);
      this._fieldDefs = deriveFieldDefs(this._mapperConfig, this.importSection);
    } catch {
      // Config unavailable -> limits stay undefined -> the size and row-count
      // checks are skipped (no client-side fallback by design). The file
      // type, empty, and malformed checks still run, and the server enforces
      // the size/row limits during import.
    }
    this._emitReadinessIfChanged();
  }
  get _selectedFileNameForView() {
    return this._selectedFileName;
  }
  get _fileCardStatusText() {
    return this._uploadFailed ? this._labels.uploadFailedLabel : this._fileSize;
  }
  get _uploadProgressLabel() {
    return this._labels.uploadingFileText;
  }
  get _uploadProgressPercent() {
    try {
      return new Intl.NumberFormat(LOCALE, {
        style: 'percent'
      }).format(this._uploadProgress / 100);
    } catch {
      return `${this._uploadProgress}%`;
    }
  }
  get _showMappings() {
    return this._contentVersionId !== null && !this._fileError && this._fieldDefs.length > 0;
  }
  get _headerOptions() {
    return this._csvHeaders.filter(Boolean).map(header => ({
      label: header,
      value: header
    }));
  }
  @api
  get isReadyToImport() {
    return !!this._selectedFileName && !this._isFileUploading && !this._fileError && !!this._contentVersionId && !this._uploadFailed && this._fieldDefs.length > 0 && areRequiredMappingsFilled(this._fieldDefs, this._selections);
  }
  _handleFileSelect(event) {
    const file = event.detail?.file;
    if (file) {
      this.processFile(file);
    }
  }
  async processFile(file) {
    const token = ++this._processToken;
    this.cleanupExistingUpload();
    this._fileError = '';
    this._selections = {};
    this._selectedFileName = file.name;
    this._fileSize = formatFileSize(file.size);
    this._isFileUploading = true;
    this._emitReadinessIfChanged();
    if (this._configPromise) {
      await this._configPromise;
    }
    if (token !== this._processToken) {
      return;
    }
    const result = validateFile(file, this._importLimits);
    if (!result.valid) {
      this._rejectFile(file, result.error);
      return;
    }
    try {
      const content = await readFileAsText(file);
      if (token !== this._processToken) {
        return;
      }
      const csvResult = validateCsvContent(content, this._importLimits);
      if (!csvResult.valid) {
        this._rejectFile(file, csvResult.error);
        return;
      }
      this._selectedFile = file;
      this._selectedFileName = result.fileName;
      this._fileSize = result.fileSize;
      this._csvHeaders = csvResult.headers;
      this.startUpload(file);
    } catch {
      if (token !== this._processToken) {
        return;
      }
      this._fileError = this._labels.fileUploadFailedError;
      this._selectedFile = null;
      this._selectedFileName = '';
      this._fileSize = '';
      this._isFileUploading = false;
      this._emitReadinessIfChanged();
    }
  }
  startUpload(file) {
    this._isFileUploading = true;
    this._uploadProgress = 0;
    this._uploadFailed = false;
    this._contentVersionId = null;
    this._contentDocumentId = null;
    this._emitReadinessIfChanged();
    const controller = uploadContentVersion(file, {
      onProgress: percent => {
        if (this._uploadController === controller) {
          this._uploadProgress = Math.min(percent, 99);
        }
      }
    });
    this._uploadController = controller;
    controller.promise.then(uploadResult => {
      if (this._uploadController !== controller) {
        return;
      }
      this._uploadController = null;
      this._isFileUploading = false;
      this._uploadProgress = 100;
      this._contentVersionId = uploadResult.contentVersionId;
      this._contentDocumentId = uploadResult.contentDocumentId;
      this._emitReadinessIfChanged();
    }).catch(error => {
      if (this._uploadController !== controller) {
        return;
      }
      this._uploadController = null;
      this._isFileUploading = false;
      if (error.name === 'AbortError') {
        return;
      }
      const buyerMessage = this._extractBuyerUploadErrorMessage(error);
      if (buyerMessage) {
        this._rejectFile(file, buyerMessage);
      } else {
        this._uploadFailed = true;
        this._emitReadinessIfChanged();
      }
      console.error('[cartImportContainer] ContentVersion upload failed:', error);
    });
  }
  _extractBuyerUploadErrorMessage(error) {
    const uploadError = error;
    const status = uploadError.status;
    if (typeof status !== 'number' || status < 400 || status >= 500) {
      return undefined;
    }
    if (!uploadError.errorCode || !BUYER_SAFE_UPLOAD_ERROR_CODES.has(uploadError.errorCode)) {
      return undefined;
    }
    const message = uploadError.message?.trim();
    return message || undefined;
  }
  cleanupExistingUpload() {
    if (this._uploadController) {
      this._uploadController.abort();
      this._uploadController = null;
    }
    if (this._contentDocumentId) {
      deleteContentDocument(this._contentDocumentId).catch(() => {
        // deleteContentDocument is already best-effort and logs internally; nothing to do.
      });
    }
    this._contentVersionId = null;
    this._contentDocumentId = null;
    this._uploadProgress = 0;
    this._uploadFailed = false;
    this._isFileUploading = false;
  }
  _rejectFile(file, error) {
    this._fileError = error;
    this._selectedFile = null;
    this._selectedFileName = file.name;
    this._fileSize = formatFileSize(file.size);
    this._isFileUploading = false;
    this._emitReadinessIfChanged();
  }
  _handleRemoveFile() {
    this._resetFileState();
  }
  _handleCancelUpload() {
    this._resetFileState();
  }
  _handleReupload() {
    this._resetFileState();
  }
  _resetFileState() {
    this._processToken++;
    this.cleanupExistingUpload();
    this._selectedFile = null;
    this._selectedFileName = '';
    this._fileError = '';
    this._fileSize = '';
    this._selections = {};
    this._csvHeaders = [];
    this._emitReadinessIfChanged();
  }
  _handleMappingChange(event) {
    const detail = event.detail;
    const fieldName = detail?.fieldName;
    if (!fieldName) {
      return;
    }
    this._selections = {
      ...this._selections,
      [fieldName]: detail?.value ?? ''
    };
    this._emitReadinessIfChanged();
  }
  _emitReadinessIfChanged() {
    const mappingsVisible = this._showMappings;
    if (mappingsVisible !== this._lastMappingsVisible) {
      this._lastMappingsVisible = mappingsVisible;
      this.dispatchEvent(new CustomEvent(MAPPINGS_VISIBLE_CHANGE_EVENT, {
        detail: {
          mappingsVisible
        }
      }));
    }
    const isUploading = this._isFileUploading;
    if (isUploading !== this._lastUploading) {
      this._lastUploading = isUploading;
      this.dispatchEvent(new CustomEvent(UPLOADING_CHANGE_EVENT, {
        detail: {
          isUploading
        }
      }));
    }
    const isReady = this.isReadyToImport;
    if (isReady === this._lastReadiness) {
      return;
    }
    this._lastReadiness = isReady;
    this.dispatchEvent(new CustomEvent(READINESS_CHANGE_EVENT, {
      detail: {
        isReady
      }
    }));
  }
  @api
  async startImport() {
    this._submitErrorMessage = undefined;
    const contentVersionId = this._contentVersionId;
    if (!this.isReadyToImport || !this.cartId || !this._webstoreId || !contentVersionId) {
      return null;
    }
    this._isSubmitting = true;
    try {
      const job = await startImportJob({
        webstoreId: this._webstoreId,
        cartId: this.cartId,
        contentVersionId,
        mappings: buildColumnMappingsForFields(this._fieldDefs, this._selections)
      });
      this._importStarted = true;
      return job;
    } catch (error) {
      console.error('[cartImportContainer] Import job submission failed:', error);
      this._submitErrorMessage = extractServerErrorMessage(error);
      return null;
    } finally {
      this._isSubmitting = false;
    }
  }
  @api
  get submitErrorMessage() {
    return this._submitErrorMessage;
  }
  @api
  resolveSubmitErrorLabel(fallbackLabel) {
    return this._submitErrorMessage ?? fallbackLabel;
  }
  @api
  cleanup() {
    if (!this._importStarted && !this._isSubmitting) {
      this.cleanupExistingUpload();
    }
  }
  disconnectedCallback() {
    if (!this._importStarted && !this._isSubmitting) {
      this.cleanupExistingUpload();
    }
  }
}