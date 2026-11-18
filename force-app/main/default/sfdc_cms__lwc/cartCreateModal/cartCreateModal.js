import LightningModal from 'lightning/modal';
import LABELS from './labels';
import { api, track } from 'lwc';
import { cartCreate, cartEdit, toCommerceError } from 'commerce/checkoutCartApi';
import { getCreateCartToastMsg } from './createCartErrorHandler';
import { showCreateCartToast, getDefaultCartName } from './createCartUtils';
import { MAPPER_CONFIG_SECTION } from 'site/cartImportContainer';
export const DISALLOWED_CART_FIELD_CHARACTERS = '"\'<>@!$#&%\\{[]}';
export default class CartCreateModal extends LightningModal {
  @api
  mode = 'create';
  @api
  cartId;
  static MAX_CART_NAME_LENGTH = 250;
  static MAX_CART_DESCRIPTION_LENGTH = 250;
  static DEFAULT_IS_SECONDARY = true;
  static DEFAULT_CART_TYPE = 'Cart';
  static MAX_CART_NAME_DISPLAY_LENGTH = 25;
  static CART_NAME_ELLIPSIS = '...';
  static DISMISSAL = {
    success: 'success',
    error: 'error',
    close: 'close'
  };
  static DISALLOWED_CART_FIELD_REGEXP = (() => {
    const escaped = DISALLOWED_CART_FIELD_CHARACTERS.replace(/\\/g, '\\\\').replace(/]/g, '\\]').replace(/\[/g, '\\[');
    return new RegExp(`[${escaped}]`);
  })();
  _labels = LABELS;
  @api
  cartNameLabel;
  @api
  cartDescriptionLabel;
  @api
  showImportSection = false;
  @api
  importModalSubtitleLabel;
  @api
  importUploadFileLabel;
  @api
  importDropFileLabel;
  @api
  importMappingTitleLabel;
  @api
  createWithoutImportLabel;
  @api
  finishAndCreateLabel;
  get _formLabels() {
    const overrides = {};
    if (this.importModalSubtitleLabel) {
      overrides.fileUploadLabel = this.importModalSubtitleLabel;
    }
    if (this.importUploadFileLabel) {
      overrides.uploadFileText = this.importUploadFileLabel;
    }
    if (this.importDropFileLabel) {
      overrides.dropFileText = this.importDropFileLabel;
    }
    if (this.importMappingTitleLabel) {
      overrides.cartItemIdentifiersLabel = this.importMappingTitleLabel;
    }
    return overrides;
  }
  get _headerLabel() {
    return this.mode === 'edit' ? LABELS.editCartConfirmTitle : LABELS.createNewCartHeader;
  }
  get _cartNameLabelText() {
    return this.cartNameLabel || LABELS.cartNameLabel;
  }
  get _cartDescriptionLabelText() {
    return this.cartDescriptionLabel || LABELS.cartDescription;
  }
  get _spinnerHelpText() {
    return this.mode === 'edit' ? LABELS.editCartSpinnerHelpText : LABELS.spinnerHelpText;
  }
  _name = getDefaultCartName();
  _originalName = '';
  _description = '';
  isCreateCartInProgress = false;
  get _isNotLoading() {
    return !this.isCreateCartInProgress;
  }
  _isSaveButtonDisabled = false;
  @track
  _importMappingsVisible = false;
  @track
  _isImportReady = false;
  @track
  _isImportUploading = false;
  _importStarted = false;
  connectedCallback() {
    this._originalName = this._name;
  }
  @api
  get name() {
    return this._name;
  }
  set name(value) {
    this._name = value || '';
  }
  @api
  get cartDescription() {
    return this._description;
  }
  set cartDescription(value) {
    this._description = value || '';
  }
  handleNameChange(event) {
    this._name = event?.target?.value || '';
    this._isSaveButtonDisabled = false;
  }
  handleNameBlur() {
    const input = this.queryNameInput();
    if (input) {
      const nameValue = input.value?.trim() ?? '';
      if (nameValue.length === 0) {
        input.setCustomValidity(LABELS.cartNameMandatoryErrorMessage);
        this._isSaveButtonDisabled = true;
      } else {
        input.setCustomValidity('');
        this._isSaveButtonDisabled = false;
      }
      input.reportValidity();
    }
  }
  handleDescriptionChange(event) {
    this._description = event?.target?.value || '';
    this._isSaveButtonDisabled = false;
  }
  get _isCreateMode() {
    return this.mode !== 'edit';
  }
  get _shouldRenderImportSection() {
    return this._isCreateMode && this.showImportSection;
  }
  get _newCartImportSection() {
    return MAPPER_CONFIG_SECTION.NEW_CART;
  }
  get _importController() {
    return this.refs?.importController ?? null;
  }
  get _importWrapperClass() {
    const padding = 'slds-p-left_medium slds-p-right_medium slds-p-bottom_medium';
    return this.isCreateCartInProgress ? `${padding} slds-hide` : padding;
  }
  get _secondaryButtonLabel() {
    if (this.mode === 'edit') {
      return LABELS.createCartCancelButtonLabel;
    }
    if (this._importMappingsVisible) {
      return this.createWithoutImportLabel || LABELS.createWithoutImportButton;
    }
    return LABELS.createCartCancelButtonLabel;
  }
  get _primaryButtonLabel() {
    if (this.mode === 'edit') {
      return LABELS.editCartConfirmButton;
    }
    if (this._importMappingsVisible) {
      return this.finishAndCreateLabel || LABELS.finishAndCreateButton;
    }
    return LABELS.createCartSaveButton;
  }
  get _isPrimaryDisabled() {
    return this._isSaveButtonDisabled || this._isImportUploading || this._importMappingsVisible && !this._isImportReady;
  }
  handleImportReadinessChange(event) {
    this._isImportReady = event.detail.isReady;
  }
  handleImportUploadingChange(event) {
    this._isImportUploading = event.detail.isUploading;
  }
  handleDescriptionBlur() {
    const textarea = this.template?.querySelector('lightning-textarea');
    if (textarea) {
      const {
        isDescriptionValid
      } = this.validateDescriptionField(textarea);
      this._isSaveButtonDisabled = !isDescriptionValid;
    }
  }
  handleImportMappingsVisibleChange(event) {
    this._importMappingsVisible = event.detail.mappingsVisible;
  }
  async handleSecondaryButton() {
    if (this._isCreateMode && this._importMappingsVisible) {
      const validation = this.validateNameAndDescription();
      if (validation.isValid) {
        await this.createCartAndClose(validation.nameValue, validation.descValue, false);
      }
      return;
    }
    this.handleClose();
  }
  async handleSave() {
    const {
      nameValue,
      descValue,
      isValid
    } = this.validateNameAndDescription();
    if (isValid) {
      await this.createCartAndClose(nameValue, descValue, this._isCreateMode && this._importMappingsVisible);
    }
  }
  validateNameAndDescription() {
    const input = this.queryNameInput();
    const {
      nameValue,
      isNameValid
    } = this.validateNameField(input);
    const textarea = this.template?.querySelector('lightning-textarea');
    const {
      descValue,
      isDescriptionValid
    } = this.validateDescriptionField(textarea);
    this._isSaveButtonDisabled = !isNameValid || !isDescriptionValid;
    return {
      nameValue,
      descValue,
      isValid: isNameValid && isDescriptionValid
    };
  }
  queryNameInput() {
    return this.template?.querySelector('lightning-input[data-name="name"]');
  }
  validateNameField(input) {
    let nameValue = '';
    let isNameValid = false;
    if (!input) {
      return {
        nameValue,
        isNameValid
      };
    }
    nameValue = input.value?.trim() ?? '';
    if (nameValue.length === 0) {
      input.setCustomValidity(LABELS.cartNameMandatoryErrorMessage);
    } else if (this.containsDisallowedCharacters(nameValue)) {
      input.setCustomValidity(LABELS.cartNameInvalidCharactersErrMsg);
    } else if (nameValue.length > CartCreateModal.MAX_CART_NAME_LENGTH) {
      input.setCustomValidity(this.cartNameMaxLengthErrorMsg());
    } else {
      input.setCustomValidity('');
    }
    isNameValid = input.reportValidity();
    return {
      nameValue,
      isNameValid
    };
  }
  validateDescriptionField(textarea) {
    let descValue = '';
    let isDescriptionValid = false;
    if (!textarea) {
      return {
        descValue,
        isDescriptionValid
      };
    }
    descValue = textarea.value?.trim() ?? '';
    if (this.containsDisallowedCharacters(descValue)) {
      textarea.setCustomValidity(LABELS.cartDescInvalidCharactersErrMsg);
    } else if (descValue.length > CartCreateModal.MAX_CART_DESCRIPTION_LENGTH) {
      textarea.setCustomValidity(this.cartDescriptionMaxLengthErrorMsg());
    } else {
      textarea.setCustomValidity('');
    }
    isDescriptionValid = textarea.reportValidity();
    return {
      descValue,
      isDescriptionValid
    };
  }
  async createCartAndClose(nameValue, descValue, withImport) {
    this.isCreateCartInProgress = true;
    this.disableClose = true;
    try {
      if (this.mode === 'edit') {
        if (!this.cartId) {
          throw new Error('Cart ID is required for edit mode');
        }
        await cartEdit({
          cartId: this.cartId,
          name: nameValue,
          description: descValue
        }, {
          silent: true
        });
        const cartNameForToast = this.getCartNameForSuccessToast(this._originalName);
        const successToastMsg = LABELS.editCartSuccessMessage.replace('{cartName}', cartNameForToast);
        showCreateCartToast(successToastMsg, 'success', this);
        if (typeof document !== 'undefined') {
          document.dispatchEvent(new CustomEvent('reloadCartList', {
            bubbles: true,
            composed: true
          }));
        }
        this.disableClose = false;
        this.close(CartCreateModal.DISMISSAL.success);
        return;
      }
      const cartDetails = {
        name: nameValue,
        description: descValue || undefined,
        isSecondary: CartCreateModal.DEFAULT_IS_SECONDARY,
        type: CartCreateModal.DEFAULT_CART_TYPE
      };
      const result = await cartCreate(cartDetails, {
        silent: true
      });
      const newCartId = result?.cartId;
      const controller = this._importController;
      if (withImport && controller && newCartId) {
        controller.cartId = newCartId;
        const job = await controller.startImport();
        if (job) {
          this._importStarted = true;
          this.showCreateSuccess(LABELS.createCartWithImportSuccessMessage, nameValue);
        } else {
          this.showCreateSuccess(LABELS.createCartApiSuccessMessage, nameValue);
          showCreateCartToast(controller.resolveSubmitErrorLabel(LABELS.importFailedError), 'error', this);
        }
        this.disableClose = false;
        this.reloadCartList();
        this.close(newCartId);
        return;
      }
      this.showCreateSuccess(LABELS.createCartApiSuccessMessage, nameValue);
      this._importController?.cleanup();
      this.reloadCartList();
      this.disableClose = false;
      this.close(newCartId);
    } catch (error) {
      this.disableClose = false;
      const toastMsg = this.mode === 'edit' ? this.getEditCartErrorMessage(error) : getCreateCartToastMsg(error);
      this.notifyErrorAndDismiss(toastMsg);
    } finally {
      this.isCreateCartInProgress = false;
    }
  }
  showCreateSuccess(messageTemplate, nameValue) {
    const cartNameForToast = this.getCartNameForSuccessToast(nameValue);
    const successToastMsg = messageTemplate.replace('{cartName}', cartNameForToast);
    showCreateCartToast(successToastMsg, 'success', this);
  }
  reloadCartList() {
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('reloadCartList', {
        bubbles: true,
        composed: true,
        detail: {
          switchToMyCarts: true
        }
      }));
    }
  }
  cartNameMaxLengthErrorMsg() {
    return LABELS.cartNameMaxLengthErrMsg.replace('{maxLength}', String(CartCreateModal.MAX_CART_NAME_LENGTH));
  }
  containsDisallowedCharacters(value) {
    return CartCreateModal.DISALLOWED_CART_FIELD_REGEXP.test(value);
  }
  cartDescriptionMaxLengthErrorMsg() {
    return LABELS.cartDescriptionMaxLengthErrMsg.replace('{maxLength}', String(CartCreateModal.MAX_CART_DESCRIPTION_LENGTH));
  }
  getCartNameForSuccessToast(cartName) {
    if (cartName.length > CartCreateModal.MAX_CART_NAME_DISPLAY_LENGTH) {
      const truncateLength = CartCreateModal.MAX_CART_NAME_DISPLAY_LENGTH - CartCreateModal.CART_NAME_ELLIPSIS.length;
      return cartName.slice(0, truncateLength) + CartCreateModal.CART_NAME_ELLIPSIS;
    }
    return cartName;
  }
  getEditCartErrorMessage(error) {
    const {
      code,
      message
    } = toCommerceError(error, ['INSUFFICIENT_ACCESS']);
    return code === 'INSUFFICIENT_ACCESS' && message ? message : LABELS.editCartErrorMessage;
  }
  notifyErrorAndDismiss(toastMessage) {
    showCreateCartToast(toastMessage, 'error', this);
    this.close(CartCreateModal.DISMISSAL.error);
  }
  handleClose() {
    this.close(CartCreateModal.DISMISSAL.close);
  }
  close(result) {
    if (!this._importStarted && !this.isCreateCartInProgress) {
      this._importController?.cleanup();
    }
    super.close(result);
  }
}