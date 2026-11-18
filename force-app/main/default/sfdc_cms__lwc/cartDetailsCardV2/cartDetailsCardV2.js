import { LightningElement, api, wire } from 'lwc';
import { isDesignMode } from 'experience/clientApi';
import { generateUrl, navigate, NavigationContext } from 'lightning/navigation';
import { CartConfigurationContextAdapter, SessionContextAdapter } from 'commerce/contextApi';
import { getCartName, getCartDescription, hasItemsLine, hasPrice, getItemsDisplayText, getCurrencyCode, parseGrandTotalAmount, hasDescription, shouldRestrictOwnerActions, isCartLocked, isLockHolder, getCollaborationStatusView } from 'site/cartDetailsCardUtils';
import { isCartOwner } from 'site/commonUtils';
function buildCartDetailPageRef(cartId) {
  return {
    type: 'comm__namedPage',
    attributes: {
      name: 'Current_Cart'
    },
    state: {
      recordId: cartId
    }
  };
}

/**
 * @slot cartLock - Slot for the cart-lock banner
 * @slot requestQuote - Slot for the per-card Request Quote button
 * @slot cartOptions - Slot for the cart options menu
 * @slot defaultPill - Slot for the "Default" cart tag shown on the primary cart. The parent gates the slot
 * @slot cartAsyncStateView - Slot for the cart async state
 */
export default class CartDetailsCardV2 extends LightningElement {
  static renderMode = 'light';
  _navContext;
  _cartDetailUrl;
  @wire(NavigationContext)
  wiredNavigationContext(context) {
    this._navContext = context;
    this._refreshCartDetailUrl();
  }
  @api
  get cartSummaryData() {
    return this._cartSummaryData;
  }
  set cartSummaryData(value) {
    this._cartSummaryData = value;
    this._refreshCartDetailUrl();
  }
  _cartSummaryData;
  @api
  showSecondaryCartItemCount;
  @api
  secondaryCartCountType;
  @api
  itemsLabel;
  @api
  showImageGrid;
  @api
  personalLabel;
  @api
  sharedWithOthersLabel;
  @api
  sharedWithOneOtherLabel;
  @api
  sharedByLabel;
  _currentUserId;
  _isLoggedIn = false;
  @wire(SessionContextAdapter)
  handleSessionContext({
    data
  }) {
    this._currentUserId = data?.userId;
    this._isLoggedIn = data?.isLoggedIn === true;
  }
  _shareCartFeatureEnabled = false;
  @wire(CartConfigurationContextAdapter)
  handleCartConfiguration({
    data,
    loaded
  }) {
    if (!loaded) {
      return;
    }
    this._shareCartFeatureEnabled = Boolean(data?.shareCart?.isEnabled);
  }
  get _showCollaborationStatus() {
    return isDesignMode || this._collaborationStatus.isShareCartEnabled;
  }
  get _cartName() {
    return getCartName(this.cartSummaryData);
  }
  get _showImageGrid() {
    return this.showImageGrid !== false;
  }
  get _cartMainClasses() {
    const classes = ['cart-main'];
    if (this._showImageGrid) {
      classes.push('has-preview');
    }
    return classes.join(' ');
  }
  get _cartPreview() {
    return this.cartSummaryData?.cartPreview;
  }
  get _showItemCount() {
    return this.showSecondaryCartItemCount !== false && hasItemsLine(this.cartSummaryData, this.secondaryCartCountType);
  }
  get _showDefaultPill() {
    if (isDesignMode) {
      return this.cartSummaryData?.isSecondary !== true;
    }
    const ownerId = this.cartSummaryData?.ownerId;
    if (ownerId && !isCartOwner(this._currentUserId, ownerId)) {
      return false;
    }
    return this.cartSummaryData?.isSecondary === false;
  }
  get _showCartLock() {
    if (isDesignMode) {
      return isCartLocked(this.cartSummaryData);
    }
    return shouldRestrictOwnerActions(this.cartSummaryData, this._currentUserId) || isCartLocked(this.cartSummaryData) && !isLockHolder(this.cartSummaryData, this._currentUserId);
  }
  get _showPrice() {
    return hasPrice(this.cartSummaryData);
  }
  get _itemsLabel() {
    return getItemsDisplayText(this.cartSummaryData, this.secondaryCartCountType, this.itemsLabel);
  }
  get _collaborationStatus() {
    return getCollaborationStatusView(this.cartSummaryData, {
      currentUserId: this._currentUserId,
      isLoggedIn: this._isLoggedIn
    }, {
      personalLabel: this.personalLabel,
      sharedWithOthersLabel: this.sharedWithOthersLabel,
      sharedWithOneOtherLabel: this.sharedWithOneOtherLabel,
      sharedByLabel: this.sharedByLabel
    }, {
      shareCartEnabled: this._shareCartFeatureEnabled
    });
  }
  get _currencyCode() {
    return getCurrencyCode(this.cartSummaryData);
  }
  get _priceValue() {
    return parseGrandTotalAmount(this.cartSummaryData);
  }
  get _showDescription() {
    return hasDescription(this.cartSummaryData);
  }
  get _cartDescription() {
    return getCartDescription(this.cartSummaryData);
  }
  get _cartDetailUrlOrFallback() {
    return this._cartDetailUrl ?? '';
  }
  get _cartLinkAriaLabel() {
    return this._cartName;
  }
  _refreshCartDetailUrl() {
    const cartId = this._cartSummaryData?.cartId;
    if (!this._navContext || !cartId) {
      this._cartDetailUrl = undefined;
      return;
    }
    this._cartDetailUrl = generateUrl(this._navContext, buildCartDetailPageRef(cartId));
  }
  handleCardLinkClick(event) {
    const target = event.target;
    if (target?.closest('lightning-button-menu') || target?.closest('site-cart-options')) {
      return;
    }
    this._doNavigate(event);
  }
  handleAsyncViewClick(event) {
    this._doNavigate(event);
  }
  _doNavigate(event) {
    if (isDesignMode) {
      event.preventDefault();
      return;
    }
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    const cartId = this._cartSummaryData?.cartId;
    if (!this._navContext || !cartId) {
      return;
    }
    event.preventDefault();
    navigate(this._navContext, buildCartDetailPageRef(cartId));
  }
}