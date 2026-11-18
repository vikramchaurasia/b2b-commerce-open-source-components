import { LightningElement, api, wire } from 'lwc';
import { navigate, NavigationContext } from 'lightning/navigation';
import { CartConfigurationContextAdapter, SessionContextAdapter } from 'commerce/contextApi';
import { getCarts, cartReload, toCommerceError } from 'commerce/checkoutCartApi';
import { createCartDeleteAction, createCartMakePrimaryAction, createCartClearContentAction, createCartEditAction, dispatchAction, dispatchActionAsync } from 'commerce/actionApi';
import { isDesignMode } from 'experience/clientApi';
import { generateStyleProperties } from 'experience/styling';
import { hasActiveAsyncOperation } from 'site/commonUtils';
import { shouldRestrictOwnerActions, canEditCart, isCartLocked, isLockHolder } from 'site/cartDetailsCardUtils';
import CartOptionsConfirmationModal from 'site/cartOptionsConfirmationModal';
import CreateCartModal from 'site/cartCreateModal';
import ImportCartModal from 'site/cartImportModal';
import ExportCartModal, { EXPORT_CART_DISMISSAL } from 'site/cartExportModal';
import ShareCartModal from 'site/cartShareModal';
import SaveCartAsTemplateModal from 'site/cartSaveAsTemplateModal';
import Toast from 'site/commonToast';
import LABELS from './labels';
const GUEST_REDIRECT_ACTIONS = new Set(['edit', 'delete', 'removeAsDefault', 'import', 'export', 'saveAsTemplate']);
const CART_OPTION_ICON_CLASSES = {
  EDIT: 'edit-menu-item',
  SHARE: 'share-menu-item',
  MARK_DEFAULT: 'mark-default-menu-item',
  REMOVE_DEFAULT: 'remove-default-menu-item',
  IMPORT: 'import-menu-item',
  EXPORT: 'export-menu-item',
  CLEAR: 'clear-menu-item',
  DELETE: 'delete-menu-item',
  SAVE_AS_TEMPLATE: 'save-as-template-menu-item'
};
function isShareOptionVisible(component, restrictOwnerActions, shareCartEnabled) {
  return component.showShareOptionLabel !== false && !restrictOwnerActions && (isDesignMode || shareCartEnabled);
}
function buildEditShareGroup(component, restrictOwnerActions, canEdit, shareCartEnabled) {
  const items = [];
  if (component.showEditCartOption !== false && canEdit) {
    items.push({
      label: component._editCartLabel,
      value: 'edit',
      itemClass: CART_OPTION_ICON_CLASSES.EDIT
    });
  }
  if (isShareOptionVisible(component, restrictOwnerActions, shareCartEnabled)) {
    items.push({
      label: component._shareCartLabel,
      value: 'share',
      itemClass: CART_OPTION_ICON_CLASSES.SHARE
    });
  }
  return items;
}
function buildDefaultGroup(component, restrictOwnerActions) {
  const items = [];
  if (component.showMarkAsDefaultOption !== false && component.cartData?.isSecondary && !restrictOwnerActions) {
    items.push({
      label: component._markAsDefaultLabel,
      value: 'setAsDefault',
      itemClass: CART_OPTION_ICON_CLASSES.MARK_DEFAULT
    });
  }
  if (component.showRemoveAsDefaultOption !== false && component.cartData?.isSecondary === false && !restrictOwnerActions) {
    items.push({
      label: component._removeAsDefaultLabel,
      value: 'removeAsDefault',
      itemClass: CART_OPTION_ICON_CLASSES.REMOVE_DEFAULT
    });
  }
  return items;
}
function buildImportExportGroup(component, canEdit, importEnabled, exportEnabled) {
  const items = [];
  if (importEnabled && component.showImportOption !== false && canEdit) {
    items.push({
      label: component.importOptionLabel || LABELS.importCart,
      value: 'import',
      itemClass: CART_OPTION_ICON_CLASSES.IMPORT
    });
  }
  if (exportEnabled && component.showExportOption !== false && canEdit) {
    items.push({
      label: component.exportOptionLabel || LABELS.exportCart,
      value: 'export',
      itemClass: CART_OPTION_ICON_CLASSES.EXPORT
    });
  }
  return items;
}
function buildSaveAsTemplateGroup(component) {
  if (component.showSaveAsTemplateOption !== false) {
    return [{
      label: LABELS.saveAsTemplate,
      value: 'saveAsTemplate',
      itemClass: CART_OPTION_ICON_CLASSES.SAVE_AS_TEMPLATE
    }];
  }
  return [];
}
export default class CartOptions extends LightningElement {
  static renderMode = 'light';
  static MAX_CART_NAME_DISPLAY_LENGTH = 25;
  static CART_NAME_ELLIPSIS = '...';
  @wire(NavigationContext)
  navContext;
  @wire(SessionContextAdapter)
  sessionContext;
  _cartData;
  @api
  get cartData() {
    return this._cartData;
  }
  set cartData(value) {
    if (typeof value === 'string') {
      try {
        this._cartData = JSON.parse(value);
      } catch {
        this._cartData = undefined;
      }
    } else {
      this._cartData = value;
    }
  }
  @api
  variant = 'bare';
  @api
  buttonTextColor;
  @api
  buttonTextHoverColor;
  @api
  buttonBackgroundColor;
  @api
  buttonBackgroundHoverColor;
  @api
  buttonBorderColor;
  get buttonStyle() {
    return generateStyleProperties([{
      name: '--com-c-button-color',
      value: this.buttonTextColor
    }, {
      name: '--com-c-button-color-hover',
      value: this.buttonTextHoverColor
    }, {
      name: '--com-c-button-color-background',
      value: this.buttonBackgroundColor
    }, {
      name: '--com-c-button-color-background-hover',
      value: this.buttonBackgroundHoverColor
    }, {
      name: '--com-c-button-color-border',
      value: this.buttonBorderColor
    }]);
  }
  @api
  cartNameLabel;
  @api
  cartDescriptionLabel;
  @api
  optionsDropdownLabel;
  @api
  editCartLabel;
  @api
  showEditCartOption;
  @api
  clearCartLabel;
  _showClearCartOption;
  @api
  get showClearCartOption() {
    return this._showClearCartOption;
  }
  set showClearCartOption(value) {
    this._showClearCartOption = value;
    this.notifyCartOptionsConfig();
  }
  @api
  shareCartLabel;
  @api
  showShareOptionLabel;
  @api
  shareModalTitleLabel;
  @api
  shareWithLabel;
  @api
  viewAccessLabel;
  @api
  editAccessLabel;
  @api
  checkoutAccessLabel;
  @api
  removeAccessLabel;
  @api
  saveChangesLabel;
  @api
  shareCartButtonLabel;
  @api
  buyerSearchCriteria;
  @api
  shareModalSearchFieldLabel;
  @api
  shareModalRemoveLabel;
  @api
  shareModalOwnerLabel;
  @api
  shareModalConfirmButtonLabel;
  @api
  shareModalCancelButtonLabel;
  @api
  markAsDefaultLabel;
  @api
  removeAsDefaultLabel;
  @api
  showMarkAsDefaultOption;
  @api
  showRemoveAsDefaultOption;
  @api
  deleteCartLabel;
  @api
  showImportOption;
  @api
  importOptionLabel;
  @api
  importModalTitleLabel;
  @api
  importModalSubtitleLabel;
  @api
  importUploadFileLabel;
  @api
  importDropFileLabel;
  @api
  importStartImportLabel;
  @api
  importCancelLabel;
  @api
  importMappingTitleLabel;
  @api
  showExportOption;
  @api
  exportOptionLabel;
  @api
  exportModalTitleLabel;
  @api
  exportNameLabel;
  @api
  exportAsLabel;
  @api
  mandatoryFieldsLabel;
  @api
  optionalFieldsLabel;
  @api
  exportButtonLabel;
  @api
  exportCancelLabel;
  @api
  showDeleteCartOption;
  @api
  showSaveAsTemplateOption;
  @api
  showGoBackButton;
  @api
  templateNameLabel;
  @api
  templateDescriptionLabel;
  @api
  newTemplateButtonLabel;
  @api
  saveAsTemplateCancelLabel;
  connectedCallback() {
    this.notifyCartOptionsConfig();
  }
  notifyCartOptionsConfig() {
    if (!import.meta.env.SSR) {
      this.dispatchEvent(new CustomEvent('cartoptionsconfig', {
        detail: {
          clearCartEnabled: this.showClearCartOption !== false
        },
        bubbles: true,
        composed: true
      }));
    }
  }
  notifyCartListReload() {
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('reloadCartList'));
    }
  }
  _currentUserId;
  @wire(SessionContextAdapter)
  handleSessionContext({
    data
  }) {
    this._currentUserId = data?.userId;
  }
  get _restrictOwnerActions() {
    return shouldRestrictOwnerActions(this.cartData, this._currentUserId);
  }
  get _optionsLabel() {
    return this.optionsDropdownLabel || LABELS.optionsLabel;
  }
  get _editCartLabel() {
    return this.editCartLabel || LABELS.editCart;
  }
  get _clearCartLabel() {
    return this.clearCartLabel || LABELS.clearCart;
  }
  get _shareCartLabel() {
    return this.shareCartLabel || LABELS.shareCart;
  }
  get _markAsDefaultLabel() {
    return this.markAsDefaultLabel || LABELS.setAsDefault;
  }
  get _removeAsDefaultLabel() {
    return this.removeAsDefaultLabel || LABELS.removeAsDefault;
  }
  _shareCartEnabled = false;
  _importEnabled = false;
  _exportEnabled = false;
  _collaboratorAccessLevels;
  @wire(CartConfigurationContextAdapter)
  handleCartConfiguration({
    data,
    loaded
  }) {
    if (!loaded) {
      return;
    }
    this._shareCartEnabled = Boolean(data?.shareCart?.isEnabled);
    this._importEnabled = Boolean(data?.importProductsToCart?.isEnabled);
    this._exportEnabled = Boolean(data?.exportCart?.isEnabled);
    this._collaboratorAccessLevels = data?.shareCart?.collaboratorAccess;
  }
  get _collaboratorAccess() {
    return this._collaboratorAccessLevels;
  }
  get _isLockedForViewer() {
    return isCartLocked(this.cartData) && !isLockHolder(this.cartData, this._currentUserId);
  }
  get isDisabled() {
    return hasActiveAsyncOperation(this.cartData) || this._isLockedForViewer;
  }
  get options() {
    const restrictOwnerActions = shouldRestrictOwnerActions(this.cartData, this._currentUserId);
    const canEdit = canEditCart(this.cartData, this._currentUserId);
    const shareCartEnabled = this._shareCartEnabled;
    const importEnabled = this._importEnabled;
    const exportEnabled = this._exportEnabled;
    const nonEmptyGroups = [buildEditShareGroup(this, restrictOwnerActions, canEdit, shareCartEnabled), buildDefaultGroup(this, restrictOwnerActions), buildImportExportGroup(this, canEdit, importEnabled, exportEnabled), buildSaveAsTemplateGroup(this)].filter(group => group.length > 0);
    const opts = [];
    nonEmptyGroups.forEach((group, index) => {
      opts.push(...group);
      if (index < nonEmptyGroups.length - 1) {
        opts.push({
          label: '─',
          value: `__separator_${index}__`,
          isSeparator: true
        });
      }
    });
    return opts;
  }
  get _showDelete() {
    return !shouldRestrictOwnerActions(this.cartData, this._currentUserId);
  }
  get _deleteCartLabel() {
    return this.deleteCartLabel || LABELS.deleteCart;
  }
  get _deleteMenuClass() {
    return `destructive-menu-item ${CART_OPTION_ICON_CLASSES.DELETE}`;
  }
  isOwnerOnlyAction(action) {
    return action === 'share' || action === 'delete' || action === 'setAsDefault' || action === 'removeAsDefault';
  }
  isEditLevelAction(action) {
    return action === 'edit' || action === 'import' || action === 'clear' || action === 'export';
  }
  get hasVisibleOptions() {
    return this.options.length > 0 || this.showDeleteOption && this._showDelete;
  }
  get showDeleteOption() {
    return this.showDeleteCartOption !== false;
  }
  get _isGuestUser() {
    return this.sessionContext?.data?.isLoggedIn !== true;
  }
  redirectToLogin() {
    navigate(this.navContext, {
      type: 'comm__namedPage',
      attributes: {
        name: 'Login'
      }
    });
  }
  async handleSelect(event) {
    const action = event.detail.value;
    if (this._isGuestUser && GUEST_REDIRECT_ACTIONS.has(action)) {
      this.redirectToLogin();
      return;
    }
    if (this._restrictOwnerActions && this.isOwnerOnlyAction(action)) {
      return;
    }
    if (!canEditCart(this.cartData, this._currentUserId) && this.isEditLevelAction(action)) {
      return;
    }
    try {
      switch (action) {
        case 'edit':
          await this.handleEdit();
          break;
        case 'import':
          await this.handleImport();
          break;
        case 'share':
          await this.handleShare();
          break;
        case 'export':
          await this.handleExport();
          break;
        case 'clear':
          await this.handleClear();
          break;
        case 'delete':
          await this.handleDelete();
          break;
        case 'setAsDefault':
          await this.handleSetAsDefault();
          break;
        case 'removeAsDefault':
          await this.handleRemoveAsDefault();
          break;
        case 'saveAsTemplate':
          await this.handleSaveAsTemplate();
          break;
        default:
          console.warn('[cartOptions] Unknown action:', action);
      }
    } catch {
      // Swallowed to prevent unhandled rejections from async event handlers
    }
  }
  async handleEdit() {
    try {
      const result = await CreateCartModal.open({
        size: 'small',
        mode: 'edit',
        cartId: this.cartData?.cartId,
        name: this.cartData?.name,
        cartDescription: this.cartData?.description,
        cartNameLabel: this.cartNameLabel,
        cartDescriptionLabel: this.cartDescriptionLabel
      });
      if (result === 'success') {
        this.dispatchEvent(new CustomEvent('cartupdated', {
          bubbles: true,
          composed: true
        }));
      }
    } catch {
      // Swallow modal errors to prevent unhandled rejections
    }
  }
  async handleImport() {
    try {
      const result = await ImportCartModal.open({
        size: 'small',
        cartId: this.cartData?.cartId || '',
        modalTitleLabel: this.importModalTitleLabel,
        modalSubtitleLabel: this.importModalSubtitleLabel,
        uploadFileLabel: this.importUploadFileLabel,
        dropFileLabel: this.importDropFileLabel,
        startImportLabel: this.importStartImportLabel,
        cancelLabel: this.importCancelLabel,
        mappingTitleLabel: this.importMappingTitleLabel
      });
      if (result && result !== 'cancelled') {
        const toast = {
          label: LABELS.importStartedMessage,
          variant: 'success'
        };
        Toast.show(toast, this);
        this.dispatchEvent(new CustomEvent('importstarted', {
          bubbles: true,
          composed: true,
          detail: result
        }));
        this.notifyCartListReload();
      }
    } catch {
      // Swallow modal errors to prevent unhandled rejections
    }
  }
  async handleExport() {
    try {
      const result = await ExportCartModal.open({
        size: 'small',
        cartData: this.cartData,
        modalTitleLabel: this.exportModalTitleLabel,
        exportNameLabel: this.exportNameLabel,
        exportAsLabel: this.exportAsLabel,
        mandatoryFieldsLabel: this.mandatoryFieldsLabel,
        optionalFieldsLabel: this.optionalFieldsLabel,
        exportButtonLabel: this.exportButtonLabel,
        cancelButtonLabel: this.exportCancelLabel
      });
      if (result === EXPORT_CART_DISMISSAL.success) {
        this.dispatchEvent(new CustomEvent('cartexported', {
          bubbles: true,
          composed: true,
          detail: {
            cartId: this.cartData?.cartId
          }
        }));
        this.notifyCartListReload();
      }
    } catch {
      // Swallow modal errors to prevent unhandled rejections
    }
  }
  async handleShare() {
    try {
      const result = await ShareCartModal.open({
        size: 'small',
        cartData: this.cartData,
        ...(this._collaboratorAccess ? {
          collaboratorAccess: this._collaboratorAccess
        } : {}),
        ...(this.viewAccessLabel ? {
          viewAccessLabel: this.viewAccessLabel
        } : {}),
        ...(this.editAccessLabel ? {
          editAccessLabel: this.editAccessLabel
        } : {}),
        ...(this.checkoutAccessLabel ? {
          checkoutAccessLabel: this.checkoutAccessLabel
        } : {}),
        ...(this.removeAccessLabel ? {
          removeAccessLabel: this.removeAccessLabel
        } : {}),
        ...(this.saveChangesLabel ? {
          saveChangesLabel: this.saveChangesLabel
        } : {}),
        ...(this.shareCartButtonLabel ? {
          shareCartButtonLabel: this.shareCartButtonLabel
        } : {}),
        ...(this.buyerSearchCriteria ? {
          searchCriteria: this.buyerSearchCriteria
        } : {}),
        ...(this.shareModalTitleLabel ? {
          titleText: this.shareModalTitleLabel
        } : {}),
        ...(this.shareWithLabel ? {
          shareWithLabel: this.shareWithLabel
        } : {}),
        ...(this.shareModalSearchFieldLabel ? {
          shareModalSearchFieldLabel: this.shareModalSearchFieldLabel
        } : {}),
        ...(this.shareModalRemoveLabel ? {
          shareModalRemoveLabel: this.shareModalRemoveLabel
        } : {}),
        ...(this.shareModalOwnerLabel ? {
          shareModalOwnerLabel: this.shareModalOwnerLabel
        } : {}),
        ...(this.shareModalConfirmButtonLabel ? {
          shareModalConfirmButtonLabel: this.shareModalConfirmButtonLabel
        } : {}),
        ...(this.shareModalCancelButtonLabel ? {
          shareModalCancelButtonLabel: this.shareModalCancelButtonLabel
        } : {})
      });
      if (result === 'success') {
        this.dispatchEvent(new CustomEvent('cartshared', {
          bubbles: true,
          composed: true,
          detail: {
            cartId: this.cartData?.cartId
          }
        }));
        this.notifyCartListReload();
      }
    } catch {
      // Swallow modal errors to prevent unhandled rejections
    }
  }
  async handleSaveAsTemplate() {
    if (!this.cartData?.cartId) {
      return;
    }
    try {
      await SaveCartAsTemplateModal.open({
        size: 'small',
        cartId: this.cartData.cartId,
        cartName: this.cartData.name,
        showGoBackButton: this.showGoBackButton !== false,
        templateNameLabel: this.templateNameLabel,
        templateDescriptionLabel: this.templateDescriptionLabel,
        newTemplateButtonLabel: this.newTemplateButtonLabel,
        cancelButtonLabel: this.saveAsTemplateCancelLabel
      });
    } catch (error) {
      console.error('[cartOptions] Error opening save as template modal:', error);
    }
  }
  async handleClear() {
    try {
      const result = await CartOptionsConfirmationModal.open({
        size: 'small',
        headerText: LABELS.clearCartHeaderText,
        confirmationMessage: LABELS.clearCartConfirmMessage,
        confirmButtonLabel: LABELS.clearCartConfirmButton,
        closeButtonLabel: LABELS.cancelButton,
        iconType: 'confirmDelete',
        spinnerHelpText: LABELS.clearCartSpinnerHelpText,
        confirmAction: () => this.executeClearCart()
      });
      if (result === 'confirm') {
        cartReload();
        this.dispatchEvent(new CustomEvent('cartcleared', {
          bubbles: true,
          composed: true,
          detail: {
            cartId: this.cartData?.cartId
          }
        }));
      }
    } catch {
      // Swallow modal errors to prevent unhandled rejections
    }
  }
  async executeClearCart() {
    if (!this.cartData?.cartId) {
      throw new Error('Cart ID is required for clear cart action');
    }
    try {
      const result = await dispatchActionAsync(this, createCartClearContentAction({
        cartId: this.cartData.cartId
      }));
      if (hasActiveAsyncOperation(result)) {
        return;
      }
      const cartNameForToast = this.getCartNameForSuccessToast(this.cartData?.name ?? '');
      const successMsg = cartNameForToast ? LABELS.clearCartSuccessMessage.replace('{cartName}', cartNameForToast) : LABELS.clearCartSuccessMessage.replace(' "{cartName}"', '');
      const toast = {
        label: successMsg,
        variant: 'success'
      };
      Toast.show(toast, this);
    } catch (error) {
      const {
        code,
        message
      } = toCommerceError(error);
      const label = code === 'CART_OPERATION_IN_PROGRESS' && message ? message : LABELS.clearCartErrorMessage;
      const toast = {
        label,
        variant: 'error'
      };
      Toast.show(toast, this);
    }
  }
  async handleDelete() {
    try {
      const result = await CartOptionsConfirmationModal.open({
        size: 'small',
        headerText: LABELS.deleteCartConfirmTitle,
        confirmationMessage: LABELS.deleteCartConfirmMessage,
        confirmButtonLabel: LABELS.deleteCartConfirmButton,
        closeButtonLabel: LABELS.cancelButton,
        iconType: 'confirmDelete',
        spinnerHelpText: LABELS.deleteCartSpinnerHelpText,
        confirmAction: () => this.executeDeleteAsync()
      });
      if (result === 'confirm') {
        this.dispatchEvent(new CustomEvent('cartdeleted', {
          bubbles: true,
          composed: true,
          detail: {
            cartId: this.cartData?.cartId
          }
        }));
      }
    } catch {
      // Swallow modal errors to prevent unhandled rejections
    }
  }
  executeDeleteAsync() {
    return new Promise((resolve, reject) => {
      dispatchAction(this, createCartDeleteAction({
        cartId: this.cartData?.cartId ?? ''
      }), {
        onSuccess: () => {
          const cartNameForToast = this.getCartNameForSuccessToast(this.cartData?.name ?? '');
          const successMsg = LABELS.deleteCartSuccessMessage.replace('{cartName}', cartNameForToast);
          const toast = {
            label: successMsg,
            variant: 'success'
          };
          Toast.show(toast, this);
          resolve();
        },
        onError: error => {
          const toast = {
            label: LABELS.deleteCartErrorMessage,
            variant: 'error'
          };
          Toast.show(toast, this);
          reject(error);
        }
      });
    });
  }
  async handleSetAsDefault() {
    const hasDefaultCart = await this.checkDefaultCartExists();
    if (hasDefaultCart) {
      const result = await CartOptionsConfirmationModal.open({
        size: 'small',
        headerText: LABELS.setAsDefaultTitle,
        confirmationMessage: LABELS.setAsDefaultConfirmMessage,
        confirmButtonLabel: LABELS.setAsDefaultConfirmButton,
        closeButtonLabel: LABELS.cancelButton,
        iconType: 'confirmSave',
        spinnerHelpText: LABELS.setAsDefaultSpinnerHelpText,
        confirmAction: () => this.executeSetAsDefaultAsync()
      });
      if (result === 'confirm') {
        cartReload();
        this.dispatchEvent(new CustomEvent('cartprimarychanged', {
          bubbles: true,
          composed: true
        }));
      }
    } else {
      await this.executeSetAsDefaultAsync();
      cartReload();
      this.dispatchEvent(new CustomEvent('cartprimarychanged', {
        bubbles: true,
        composed: true
      }));
    }
  }
  async checkDefaultCartExists() {
    try {
      const cartListData = await getCarts({
        pageSize: 1,
        pageNumber: 1
      });
      const firstCart = cartListData?.carts?.[0];
      return firstCart?.isSecondary === false;
    } catch {
      return false;
    }
  }
  executeSetAsDefaultAsync() {
    if (!this.cartData?.cartId) {
      return Promise.reject(new Error('Cart ID is required for set as default action'));
    }
    const cartId = this.cartData.cartId;
    return new Promise((resolve, reject) => {
      dispatchAction(this, createCartMakePrimaryAction({
        cartId
      }), {
        onSuccess: () => {
          const cartNameForToast = this.getCartNameForSuccessToast(this.cartData?.name ?? '');
          const successMsg = LABELS.setAsDefaultSuccessMessage.replace('{cartName}', cartNameForToast);
          const toast = {
            label: successMsg,
            variant: 'success'
          };
          Toast.show(toast, this);
          resolve();
        },
        onError: error => {
          const toast = {
            label: LABELS.setAsDefaultErrorMessage,
            variant: 'error'
          };
          Toast.show(toast, this);
          reject(error);
        }
      });
    });
  }
  async handleRemoveAsDefault() {
    const result = await CartOptionsConfirmationModal.open({
      size: 'small',
      headerText: LABELS.removeAsDefaultTitle,
      confirmationMessage: LABELS.removeAsDefaultConfirmMessage,
      confirmButtonLabel: LABELS.removeAsDefaultConfirmButton,
      closeButtonLabel: LABELS.cancelButton,
      iconType: 'confirmDelete',
      spinnerHelpText: LABELS.removeAsDefaultSpinnerHelpText,
      confirmAction: () => this.executeRemoveAsDefaultAsync()
    });
    if (result === 'confirm') {
      cartReload();
      this.dispatchEvent(new CustomEvent('cartprimarychanged', {
        bubbles: true,
        composed: true
      }));
    }
  }
  executeRemoveAsDefaultAsync() {
    if (!this.cartData?.cartId) {
      return Promise.reject(new Error('Cart ID is required for remove as default action'));
    }
    const cartId = this.cartData.cartId;
    return new Promise((resolve, reject) => {
      dispatchAction(this, createCartEditAction({
        cartId,
        shouldConvertToSecondary: true
      }), {
        onSuccess: () => {
          const cartNameForToast = this.getCartNameForSuccessToast(this.cartData?.name ?? '');
          const successMsg = LABELS.removeAsDefaultSuccessMessage.replace('{cartName}', cartNameForToast);
          const toast = {
            label: successMsg,
            variant: 'success'
          };
          Toast.show(toast, this);
          resolve();
        },
        onError: error => {
          const toast = {
            label: LABELS.removeAsDefaultErrorMessage,
            variant: 'error'
          };
          Toast.show(toast, this);
          reject(error);
        }
      });
    });
  }
  getCartNameForSuccessToast(cartName) {
    if (cartName.length > CartOptions.MAX_CART_NAME_DISPLAY_LENGTH) {
      const truncateLength = CartOptions.MAX_CART_NAME_DISPLAY_LENGTH - CartOptions.CART_NAME_ELLIPSIS.length;
      return cartName.slice(0, truncateLength) + CartOptions.CART_NAME_ELLIPSIS;
    }
    return cartName;
  }
}