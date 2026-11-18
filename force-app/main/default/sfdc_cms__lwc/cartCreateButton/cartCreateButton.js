import { LightningElement, api, wire } from 'lwc';
import CreateCartModal from 'site/cartCreateModal';
import { CurrentPageReference, navigate, NavigationContext } from 'lightning/navigation';
import { CartConfigurationContextAdapter, SessionContextAdapter } from 'commerce/contextApi';
import { generateStyleProperties } from 'experience/styling';
import BasePath from '@salesforce/community/basePath';
import LABELS from './labels';
const CURRENT_CART_PAGE_NAME = 'Current_Cart';
export default class CartCreateButton extends LightningElement {
  static renderMode = 'light';
  _labels = LABELS;
  _sessionContext;
  _isLoggedIn = false;
  _isImportProductsToCartEnabled = false;
  @api
  newCartButtonLabel;
  @api
  cartNameLabel;
  @api
  cartDescriptionLabel;
  @api
  navigateToNewCart;
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
  importCreateWithoutImportLabel;
  @api
  importFinishAndCreateLabel;
  @api
  variant;
  @api
  size;
  @api
  width;
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
  get _variant() {
    return this.variant || 'secondary';
  }
  get _width() {
    return this.width || 'stretch';
  }
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
  get _newCartButtonLabelText() {
    return this.newCartButtonLabel || LABELS.newCartButton;
  }
  get _addIconUrl() {
    return `${BasePath}/assets/icons/add.svg#add`;
  }
  @wire(NavigationContext)
  navContext;
  @wire(CurrentPageReference)
  currentPageRef;
  get _isOnCartDetailPage() {
    return this.currentPageRef?.attributes?.name === CURRENT_CART_PAGE_NAME;
  }
  @wire(SessionContextAdapter)
  sessionHandler(response) {
    if (!response.loading) {
      this._sessionContext = response.data;
      this._isLoggedIn = this._sessionContext?.isLoggedIn || false;
    }
  }
  @wire(CartConfigurationContextAdapter)
  cartConfigurationHandler({
    data,
    loaded
  }) {
    if (loaded) {
      this._isImportProductsToCartEnabled = Boolean(data?.importProductsToCart?.isEnabled);
    }
  }
  static MODAL_DISMISSAL_VALUES = new Set(['error', 'close']);
  async handleOpenCreateCart(event) {
    if (!this._isLoggedIn) {
      event.preventDefault();
      event.stopPropagation();
      this.navigateToLogin();
    } else {
      const result = await CreateCartModal.open({
        size: 'small',
        cartNameLabel: this.cartNameLabel,
        cartDescriptionLabel: this.cartDescriptionLabel,
        showImportSection: this.showImportSection && this._isImportProductsToCartEnabled,
        importModalSubtitleLabel: this.importModalSubtitleLabel,
        importUploadFileLabel: this.importUploadFileLabel,
        importDropFileLabel: this.importDropFileLabel,
        importMappingTitleLabel: this.importMappingTitleLabel,
        createWithoutImportLabel: this.importCreateWithoutImportLabel,
        finishAndCreateLabel: this.importFinishAndCreateLabel
      });
      if ((this.navigateToNewCart || this._isOnCartDetailPage) && result && !CartCreateButton.MODAL_DISMISSAL_VALUES.has(result)) {
        this.navigateToCartDetail(result);
      }
    }
  }
  navigateToCartDetail(cartId) {
    this.navContext && navigate(this.navContext, {
      type: 'comm__namedPage',
      attributes: {
        name: CURRENT_CART_PAGE_NAME
      },
      state: {
        recordId: cartId
      }
    });
  }
  navigateToLogin() {
    this.navContext && navigate(this.navContext, {
      type: 'comm__namedPage',
      attributes: {
        name: 'Login'
      }
    });
  }
}