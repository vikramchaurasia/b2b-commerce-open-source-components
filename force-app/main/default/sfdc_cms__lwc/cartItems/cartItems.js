import { LightningElement, api, track, wire } from 'lwc';
import { navigate, NavigationContext, CurrentPageReference } from 'lightning/navigation';
import currency from '@salesforce/i18n/currency';
import { cartReload, CartContentsAdapter } from 'commerce/checkoutCartApi';
import ProductConfigureFlowModal from 'site/productConfigureFlowModal';
import { AppContextAdapter, SessionContextAdapter } from 'commerce/contextApi';
import { asNonEmptyString, isCartLocked, isLockHolder, getCurrentUserAccessLevel, isChildCartItemsData } from './cartItemsUtils';
import { hasActiveAsyncOperation as summaryHasActiveAsyncOperation } from 'site/commonUtils';
import { convertCartItemToOrderItem, defaultSkuLabel, defaultQuantityLabel } from './transformer';
import { Labels } from './labels';
import { createCartItemDeleteAction, createCartItemsLoadAction, createCartItemsLoadPageAction, createCartItemUpdateAction, dispatchAction, dispatchActionAsync, createChildCartItemsLoadAction } from 'commerce/actionApi';
import { generateStyleProperties, generateTextFontSize } from 'experience/styling';
import ProductBundleDetailsModal from 'site/productBundleDetailsModal';

/**
 * @slot showMore
 */
export default class CartItems extends LightningElement {
  static renderMode = 'light';
  @wire(AppContextAdapter)
  appContext;
  @wire(SessionContextAdapter)
  sessionContext;
  _currentPageReference;
  @wire(CurrentPageReference)
  wireCurrentPageReference(pageRef) {
    if (pageRef) {
      this._currentPageReference = pageRef;
    }
  }
  get effectiveCartId() {
    const cartIdFromRecordId = asNonEmptyString(this._currentPageReference?.state?.recordId);
    return cartIdFromRecordId ?? 'current';
  }
  @wire(CartContentsAdapter, {
    cartId: '$effectiveCartId'
  })
  cartContentsEntry;
  get cartSummary() {
    return this.cartContentsEntry?.data?.cartSummary;
  }
  get lockedForViewer() {
    return isCartLocked(this.cartSummary) && !isLockHolder(this.cartSummary, this.sessionContext?.data?.userId);
  }
  get _isViewOnlyCollaborator() {
    return getCurrentUserAccessLevel(this.cartSummary, this.sessionContext?.data?.userId) === 'View';
  }
  get _effectiveShowRemoveItem() {
    return this.showRemoveItem && !this._isViewOnlyCollaborator;
  }
  get _effectiveDisableQuantitySelector() {
    return this._isViewOnlyCollaborator;
  }
  get hasActiveAsyncOperation() {
    return summaryHasActiveAsyncOperation(this.cartSummary);
  }
  @api
  items;
  @api
  pagination;
  @api
  hasNextPageItems = false;
  @api
  isSecondary = false;
  @api
  displayShowMoreItems = false;
  @api
  displayPagination = false;
  @api
  currencyIsoCode;
  get _currencyIsoCode() {
    return this.currencyIsoCode || currency;
  }
  get _showModifyItem() {
    return this.showModifyItem && !this.isSecondary;
  }
  @api
  showRemoveItem = false;
  @api
  showModifyItem = false;
  @api
  showProductImage = false;
  @api
  showProductVariants = false;
  @api
  showPricePerUnit = false;
  @api
  pricePerUnitFontColor;
  @api
  productDescriptionFontColor;
  @api
  pricePerUnitFontSize;
  @api
  showTotalPrices = false;
  @api
  showOriginalPrice = false;
  @api
  originalPriceFontColor;
  @api
  originalPriceFontSize;
  @api
  showActualPrice = false;
  @api
  actualPriceFontColor;
  @api
  actualPriceFontSize;
  @api
  hideQuantitySelector = false;
  @api
  quantitySelectorLabel;
  @api
  showQuantitySelectorLabel = false;
  @api
  showCountInName = false;
  @api
  removeProductLinks = false;
  @api
  showPromotions = false;
  @api
  promotionsAppliedSavingsButtonText;
  @api
  promotionsAppliedSavingsButtonFontColor;
  @api
  promotionsAppliedSavingsButtonFontSize;
  @api
  promotionsAppliedSavingsButtonTextHoverColor;
  @api
  promotionsAppliedSavingsButtonBackgroundColor;
  @api
  promotionsAppliedSavingsButtonBackgroundHoverColor;
  @api
  promotionsAppliedSavingsButtonBorderColor;
  @api
  promotionsAppliedSavingsButtonBorderRadius;
  @api
  showSku = false;
  @api
  skuLabel;
  @api
  minimumValueGuideText;
  @api
  maximumValueGuideText;
  @api
  incrementValueGuideText;
  @api
  productFieldMapping;
  @api
  productDetailsPillFontColor;
  @api
  productDetailsPillFontSize;
  @api
  productDetailsPillBackgroundColor;
  @api
  productDetailsPillBorderColor;
  @api
  productDetailsPillBorderRadius;
  _paginationType;
  @api
  set paginationType(value) {
    this._paginationType = value;
  }
  get paginationType() {
    return this._paginationType;
  }
  @api
  imageAspectRatio;
  @api
  imageSize;
  @api
  showSeeConfiguration = false;
  @api
  get disableModifyButton() {
    return !this.configuratorFlowApiName;
  }
  @api
  viewBundleLabel;
  @api
  quantityLabel;
  @api
  modalSkuLabel;
  get paginationTypeValue() {
    if (!this.paginationType) {
      if (this.displayPagination) {
        return 'pages';
      } else if (this.displayShowMoreItems) {
        return this.hasNextPageItems ? 'showMore' : undefined;
      }
      return 'scroll';
    }
    if ((this.paginationType === 'scroll' || this.paginationType === 'showMore') && !this.hasNextPageItems) {
      return undefined;
    }
    return this.paginationType;
  }
  get productFieldMappingValue() {
    return this.productFieldMapping ? JSON.parse(this.productFieldMapping) : [];
  }
  get cartItemsStyles() {
    const styles = [{
      name: '--com-c-cart-item-unit-price-font-color',
      value: this.pricePerUnitFontColor
    }, {
      name: '--com-c-cart-item-product-description-font-color',
      value: this.productDescriptionFontColor
    }, {
      name: '--com-c-cart-item-unit-price-font-size',
      value: generateTextFontSize(this.pricePerUnitFontSize)
    }, {
      name: '--com-c-cart-item-original-price-font-color',
      value: this.originalPriceFontColor
    }, {
      name: '--com-c-cart-item-original-price-font-size',
      value: generateTextFontSize(this.originalPriceFontSize)
    }, {
      name: '--com-c-cart-item-actual-price-font-color',
      value: this.actualPriceFontColor
    }, {
      name: '--com-c-cart-item-actual-price-font-size',
      value: generateTextFontSize(this.actualPriceFontSize)
    }, {
      name: '--com-c-cart-item-applied-savings-button-text-color',
      value: this.promotionsAppliedSavingsButtonFontColor
    }, {
      name: '--com-c-cart-item-applied-savings-button-font-size',
      value: generateTextFontSize(this.promotionsAppliedSavingsButtonFontSize)
    }, {
      name: '--com-c-cart-item-applied-savings-button-background-color',
      value: this.promotionsAppliedSavingsButtonBackgroundColor
    }, {
      name: '--com-c-cart-item-applied-savings-button-border-radius',
      value: this.promotionsAppliedSavingsButtonBorderRadius ? this.promotionsAppliedSavingsButtonBorderRadius + 'px' : ''
    }, {
      name: '--com-c-cart-item-applied-savings-button-border-color',
      value: this.promotionsAppliedSavingsButtonBorderColor
    }, {
      name: '--com-c-cart-item-product-details-pill-text-color',
      value: this.productDetailsPillFontColor
    }, {
      name: '--com-c-cart-item-product-details-pill-font-size',
      value: generateTextFontSize(this.productDetailsPillFontSize)
    }, {
      name: '--com-c-cart-item-product-details-pill-background-color',
      value: this.productDetailsPillBackgroundColor
    }, {
      name: '--com-c-cart-item-product-details-pill-border-radius',
      value: this.productDetailsPillBorderRadius ? this.productDetailsPillBorderRadius + 'px' : ''
    }, {
      name: '--com-c-cart-item-product-details-pill-border-color',
      value: this.productDetailsPillBorderColor
    }, {
      name: '--com-c-cart-item-image-aspect-ratio',
      value: this.imageAspectRatio && parseFloat(this.imageAspectRatio) || 1
    }, {
      name: '--com-c-cart-item-image-object-fit',
      value: this.imageSize || 'contain'
    }];
    return generateStyleProperties(styles);
  }
  handleCartShowMore() {
    dispatchAction(this, createCartItemsLoadAction());
  }
  handleCartGoToPage(event) {
    dispatchAction(this, createCartItemsLoadPageAction(event.detail.pageNumber, event.detail.pageSize));
  }
  handleDeleteCartItem(event) {
    dispatchAction(this, createCartItemDeleteAction(event.detail));
  }
  handleUpdateCartItem(event) {
    const {
      cartItemId,
      quantity,
      onUpdateFailed
    } = event.detail;
    dispatchAction(this, createCartItemUpdateAction(cartItemId, quantity), {
      onError: onUpdateFailed
    });
  }
  @wire(NavigationContext)
  navContext;
  handleProductNavigation(event) {
    navigate(this.navContext, {
      type: 'standard__recordPage',
      attributes: {
        objectApiName: 'Product2',
        recordId: event.detail.productId,
        actionName: 'view',
        ...(event.detail.urlName && {
          urlName: event.detail.urlName
        })
      }
    });
  }
  handleModifyButtonAction(event) {
    this.childCartItems = {};
    const {
      itemData
    } = event.detail;
    ProductConfigureFlowModal.open({
      label: Labels.productConfigureFlowModalTitle,
      flowApiName: this.configuratorFlowApiName,
      configureContext: {
        cartId: itemData?.cartId,
        cartItemId: itemData?.id,
        cartItemProductId: itemData?.ProductDetails.productId
      }
    }).then(result => {
      if (result === 'save') {
        cartReload();
      }
    });
  }
  get configuratorFlowApiName() {
    return this.appContext?.data?.productConfig?.configuratorFlowApiName || '';
  }
  childCartItems = {};
  @track
  modalTitle;
  @track
  isLoadingConfiguration = false;
  async handleSeeConfiguration(event) {
    const {
      cartItemId
    } = event.detail;
    const itemData = this.items?.find(item => item.id === cartItemId);
    try {
      this.isLoadingConfiguration = true;
      const shouldLoadChildItems = (itemData?.childProductCount || 0) > 0;
      const childCartItems = shouldLoadChildItems ? await this.getChildCartItemsForItem(cartItemId) : undefined;
      this.modalTitle = Labels.productBundleDetailsTitle;
      const modalLabels = {
        skuLabel: this.modalSkuLabel || defaultSkuLabel,
        quantityLabel: this.quantityLabel || defaultQuantityLabel
      };
      const orderItem = convertCartItemToOrderItem(itemData, childCartItems, this._currencyIsoCode, modalLabels);
      this.isLoadingConfiguration = false;
      ProductBundleDetailsModal.open({
        headerTitle: this.modalTitle,
        currencyIsoCode: this._currencyIsoCode,
        orderItem: orderItem,
        navContext: this.navContext,
        label: this.modalTitle,
        customCssStyles: this.cartItemsStyles
      });
    } finally {
      this.isLoadingConfiguration = false;
    }
  }
  async getChildCartItemsForItem(cartItemId) {
    if (this.hasChildCartItems(cartItemId)) {
      return this.childCartItems?.[cartItemId];
    }
    const data = await dispatchActionAsync(this, createChildCartItemsLoadAction({
      cartItemId: cartItemId
    }));
    if (!isChildCartItemsData(data)) {
      return {};
    }
    if (data.childCartItems.length > 0) {
      this.childCartItems[cartItemId] = data;
    }
    return data;
  }
  hasChildCartItems(cartItemId) {
    const childItems = this.childCartItems[cartItemId];
    return Boolean(childItems && childItems.childCartItems && childItems.childCartItems.length > 0);
  }
  get viewBundleButtonLabel() {
    return this.viewBundleLabel || Labels.seeConfigButtonText;
  }
}