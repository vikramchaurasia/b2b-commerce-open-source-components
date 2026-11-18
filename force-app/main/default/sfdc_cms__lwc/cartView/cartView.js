import { LightningElement, api, wire } from 'lwc';
import { NavigationContext, navigate } from 'lightning/navigation';
import BasePath from '@salesforce/community/basePath';
import LABELS from './labels';
import { SORT_OPTIONS } from 'site/cartHeader';
import { isDesignMode } from 'experience/clientApi';
import { SessionContextAdapter, CartConfigurationContextAdapter } from 'commerce/contextApi';
import { isCartOwner, shouldShowAsyncOperationBanner } from 'site/commonUtils';
import { getCollaborationStatusView, getCollaboratorCount } from 'site/cartDetailsCardUtils';
import { CartStatusAdapter, cartReload } from 'commerce/checkoutCartApi';
import ImportCartModal from 'site/cartImportModal';
import { launchImportErrorReport } from 'site/cartImportErrorReportLauncher';
import { createCartSortUpdateAction, createCartStatusUpdateAction, dispatchAction } from 'commerce/actionApi';
import { MyAccountProfileAdapter } from 'commerce/myAccountApi';
import { defaultSortOrder } from 'site/commonConfig';
export default class CartView extends LightningElement {
  static renderMode = 'light';
  _labels = LABELS;
  get _emptyCartImageUrl() {
    return `${BasePath}/assets/images/empty-cart.svg`;
  }
  sortOrder;
  @api
  displayStates;
  @api
  items;
  @api
  showSortOptions = false;
  @api
  messages;
  @api
  cartDetails;
  @api
  sharedWithOthersLabel;
  @api
  sharedWithOneOtherLabel;
  @api
  sharedByLabel;
  @api
  sharedByWithAccessLabel;
  _currentUserId;
  _isLoggedIn = false;
  @wire(NavigationContext)
  navContext;
  @wire(SessionContextAdapter)
  handleSessionContext({
    data
  }) {
    this._currentUserId = data?.userId;
    this._isLoggedIn = data?.isLoggedIn === true;
  }
  @wire(CartConfigurationContextAdapter)
  cartConfiguration;
  get _isShareCartEnabled() {
    return Boolean(this.cartConfiguration?.data?.shareCart?.isEnabled);
  }
  get _isSharedCart() {
    return getCollaboratorCount(this.normalisedCartDetails) > 0;
  }
  get _showCollaborationStatus() {
    return isDesignMode || this._collaborationStatus.isShareCartEnabled && this._isSharedCart;
  }
  _currentUserProfile;
  @wire(MyAccountProfileAdapter)
  handleProfile({
    data
  }) {
    this._currentUserProfile = data ?? undefined;
  }
  get _currentUserName() {
    const name = [this._currentUserProfile?.firstName, this._currentUserProfile?.lastName].filter(Boolean).join(' ').trim();
    return name || undefined;
  }
  get _currentUserEmail() {
    return this._currentUserProfile?.email ?? undefined;
  }
  get _collaborationStatus() {
    return getCollaborationStatusView(this.normalisedCartDetails, {
      currentUserId: this._currentUserId,
      isLoggedIn: this._isLoggedIn
    }, {
      sharedWithOthersLabel: this.sharedWithOthersLabel,
      sharedWithOneOtherLabel: this.sharedWithOneOtherLabel,
      sharedByLabel: this.sharedByLabel,
      sharedByWithAccessLabel: this.sharedByWithAccessLabel,
      viewAccessLabel: this._labels.viewAccessLabel,
      editAccessLabel: this._labels.editAccessLabel,
      checkoutAccessLabel: this._labels.checkoutAccessLabel
    }, {
      useSharedByForOwner: true,
      currentUserName: this._currentUserName,
      currentUserEmail: this._currentUserEmail,
      shareCartEnabled: this._isShareCartEnabled
    });
  }
  get _hasSharedBySegments() {
    return Boolean(this._collaborationStatus.sharedByTextSegments);
  }
  _errors;
  @api
  get errors() {
    return this._errors;
  }
  set errors(value) {
    this._errors = value;
  }
  get parsedErrors() {
    if (Array.isArray(this._errors)) {
      return this._errors;
    }
    if (typeof this._errors === 'string') {
      try {
        const parsed = JSON.parse(this._errors);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }
  @wire(CartStatusAdapter)
  cartStatus;
  sortChanged = false;
  get normalisedCartDetails() {
    if (!this.cartDetails) {
      return undefined;
    }
    if (typeof this.cartDetails === 'string') {
      try {
        return JSON.parse(this.cartDetails);
      } catch {
        return undefined;
      }
    }
    return this.cartDetails;
  }
  get _showDefaultPill() {
    if (isDesignMode) {
      return this.normalisedCartDetails?.isSecondary !== true;
    }
    const ownerId = this.normalisedCartDetails?.ownerId;
    if (ownerId && !isCartOwner(this._currentUserId, ownerId)) {
      return false;
    }
    return this.normalisedCartDetails?.isSecondary === false;
  }
  get hasDescription() {
    const desc = this.normalisedCartDetails?.description;
    return desc !== null && desc !== undefined;
  }
  get isCartPresent() {
    return !!this.normalisedCartDetails?.cartId;
  }
  get isCartProcessing() {
    const hasError = this.parsedErrors.length > 0;
    const isItemsLoading = this.items === undefined && !hasError;
    return !!this.cartStatus?.data?.isProcessing || !!this.cartStatus?.loading || isItemsLoading;
  }
  get forceEmptyState() {
    return !!this.displayStates?.includes('empty');
  }
  get forceItemsState() {
    return !!this.displayStates?.includes('items');
  }
  get showEmptyState() {
    return this.isCartPresent && (this.forceEmptyState || Array.isArray(this.items) && !this.items.length);
  }
  get isCartStatusSettled() {
    return !this.cartStatus?.data?.isProcessing && !this.cartStatus?.loading;
  }
  get showNoCartState() {
    return !this.isCartPresent && this.isCartStatusSettled;
  }
  get _showDivider() {
    return !shouldShowAsyncOperationBanner(this.normalisedCartDetails);
  }
  get showItemState() {
    return this.forceItemsState || !!this.items?.length;
  }
  get showSpinner() {
    return this.isCartProcessing && !this.forceEmptyState && !this.forceItemsState;
  }
  get message() {
    return this.messages && this.messages.length > 0 ? this.messages[0] : undefined;
  }
  get messageSeverity() {
    return this.message?.severity?.toLocaleLowerCase();
  }
  get _isSortDisabled() {
    return Boolean(this.cartStatus?.data?.isAsyncOperationInProgress);
  }
  get sortOptions() {
    return SORT_OPTIONS;
  }
  get selectedSortOrder() {
    return this.sortOrder ?? defaultSortOrder;
  }
  handleSortChange(event) {
    this.sortChanged = true;
    const detail = event.detail;
    const sortValue = typeof detail === 'string' ? detail : detail.value;
    if (!sortValue) {
      console.error('Sort change event missing value');
      return;
    }
    this.sortOrder = sortValue;
    dispatchAction(this, createCartSortUpdateAction(this.sortOrder));
  }
  handleCartUpdateStatus(event) {
    dispatchAction(this, createCartStatusUpdateAction(event.detail));
  }
  handleCartUpdated = () => {
    cartReload();
  };
  connectedCallback() {
    if (!import.meta.env.SSR) {
      document.addEventListener('cartcollaboratorremoved', this.handleCartUpdated);
    }
    this.addEventListener('cartoperationviewerrors', this._handleViewErrors);
  }
  disconnectedCallback() {
    if (!import.meta.env.SSR) {
      document.removeEventListener('cartcollaboratorremoved', this.handleCartUpdated);
    }
    this.removeEventListener('cartoperationviewerrors', this._handleViewErrors);
  }
  handleImportStarted() {
    cartReload();
  }
  handleCartDetailsChange() {
    cartReload();
  }
  handleCartDeleted() {
    if (this.navContext) {
      navigate(this.navContext, {
        type: 'comm__namedPage',
        attributes: {
          name: 'Cart_List'
        }
      });
    }
  }
  handleReimport(event) {
    event.stopPropagation();
    const cartId = event.detail?.cartId;
    if (!cartId) {
      return;
    }
    this._openReimportModal(cartId, event.detail?.modalLabels).catch(err => {
      console.error('CartView: re-import modal failed', err);
    });
  }
  async _openReimportModal(cartId, modalLabels) {
    const result = await ImportCartModal.open({
      size: 'small',
      cartId,
      ...modalLabels
    });
    if (result && result !== 'cancelled') {
      cartReload();
    }
  }
  _handleViewErrors = evt => {
    evt.stopPropagation();
    launchImportErrorReport(evt.detail, 'CartView');
  };
  renderedCallback() {
    if (this.showSortOptions) {
      const sortOptionElement = this.refs?.sortMenu;
      if (this.sortChanged && sortOptionElement) {
        sortOptionElement.focus?.();
        this.sortChanged = false;
      }
    }
  }
}