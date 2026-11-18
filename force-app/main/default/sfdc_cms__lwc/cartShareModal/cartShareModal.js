import LightningModal from 'lightning/modal';
import LABELS from './labels';
import { api, wire } from 'lwc';
import Toast from 'site/commonToast';
import { cartCollaboratorAdd, cartCollaboratorDelete, cartCollaboratorUpdate, cartReload, getCarts } from 'commerce/checkoutCartApi';
import { searchBuyers } from 'commerce/buyerApi';
import { SessionContextAdapter } from 'commerce/contextApi';
import { isDesignMode } from 'experience/clientApi';
import BasePath from '@salesforce/community/basePath';
import { MIN_SEARCH_CHARS, SEARCH_DEBOUNCE_MS, BLUR_DISMISS_MS, ACCESS_LEVEL_VIEW, ACCESS_LEVEL_EDIT, ACCESS_LEVEL_VALUES, DEFAULT_ACCESS_LEVEL, SHARE_ELIGIBLE_USER_TYPE, ACCESS_LEVEL_CHECKOUT, SALESFORCE_ID_15_LENGTH, SHARE_INPUT_ID, SHARE_LISTBOX_ID, SUGGESTION_OPTION_ID_PREFIX, NO_ACTIVE_INDEX, EMPTY_DROPDOWN_GAP_PX, COLLABORATOR_LIMIT_ERROR_CODE, COLLABORATOR_LIMIT_NUMBER_REGEX } from './constants';
import { MOCK_COLLABORATORS, MOCK_SEARCH_RESULTS } from './mockData';
const VALID_BUYER_SEARCH_CRITERIA = new Set(['All', 'Name', 'FirstName', 'LastName', 'Email']);
function toId15(id) {
  return id.substring(0, SALESFORCE_ID_15_LENGTH);
}
export default class CartShareModal extends LightningModal {
  @api
  cartData;
  @api
  searchCriteria;
  @api
  shareModalTitle;
  @api
  permissionLevelLabel;
  @api
  viewAccessLabel;
  @api
  editAccessLabel;
  @api
  checkoutAccessLabel;
  @api
  removeAccessLabel;
  @api
  collaboratorAccess;
  @api
  saveChangesLabel;
  @api
  shareCartButtonLabel;
  @api
  titleText;
  @api
  shareWithLabel;
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
  _currentUserId;
  _currentUserName;
  _currentUserEmail;
  @wire(SessionContextAdapter)
  handleSessionContext({
    data
  }) {
    this._currentUserId = data?.userId;
    this._currentUserName = data?.userName ?? data?.profile?.userName;
    this._currentUserEmail = data?.profile?.email;
    const wasPreview = this._isPreview;
    this._isPreview = data?.isPreview ?? false;
    if (this._isPreview && !wasPreview) {
      this.showBuilderCollaborators();
    }
  }
  _isPreview = false;
  get _isInBuilderMode() {
    return isDesignMode || this._isPreview;
  }
  _labels = LABELS;
  static DISMISSAL = {
    success: 'success',
    error: 'error',
    close: 'close'
  };
  static MAX_CART_NAME_DISPLAY_LENGTH = 25;
  static CART_NAME_ELLIPSIS = '...';
  _modalScreen = 'manage';
  _pendingRecipients = [];
  _fetchState = 'loading';
  _isAddInProgress = false;
  _isUpdateInProgress = false;
  _originalAccessLevels = new Map();
  _existingCollaborators = [];
  _removeInProgressCollaboratorIds = new Set();
  _searchQuery = '';
  _shareErrorMessage;
  _showSuggestions = false;
  _isSearching = false;
  _fetchedUsers = [];
  _searchTimeout;
  _blurTimeout;
  _searchRequestToken = 0;
  _activeIndex = NO_ACTIVE_INDEX;
  _wasShowingEmptySuggestions = false;
  _wasShowingSearchingState = false;
  _wasShowingUserSuggestions = false;
  _openDropdownUserId;
  _positionedDropdownUserId;
  _wasProcessing = false;
  _focusRestoreUserId;
  get _inputId() {
    return SHARE_INPUT_ID;
  }
  get _listboxId() {
    return SHARE_LISTBOX_ID;
  }
  get _activeDescendantId() {
    return this._activeIndex === NO_ACTIVE_INDEX ? undefined : `${SUGGESTION_OPTION_ID_PREFIX}${this._activeIndex}`;
  }
  get _ariaControls() {
    return this.showUserSuggestions ? SHARE_LISTBOX_ID : undefined;
  }
  connectedCallback() {
    this.refreshCollaboratorsFromApi();
    if (!import.meta.env.SSR) {
      window.addEventListener('resize', this._handleWindowResize);
    }
  }
  disconnectedCallback() {
    if (this._searchTimeout) {
      clearTimeout(this._searchTimeout);
      this._searchTimeout = undefined;
    }
    if (this._blurTimeout) {
      clearTimeout(this._blurTimeout);
      this._blurTimeout = undefined;
    }
    if (!import.meta.env.SSR) {
      window.removeEventListener('resize', this._handleWindowResize);
    }
  }
  notifyCollaboratorsChanged(type, cartId) {
    if (!import.meta.env.SSR) {
      document.dispatchEvent(new CustomEvent(type, {
        bubbles: true,
        composed: true,
        detail: {
          cartId
        }
      }));
    }
  }
  renderedCallback() {
    if (this.showEmptySuggestions && !this._wasShowingEmptySuggestions || this.showSearchingState && !this._wasShowingSearchingState || this.showUserSuggestions && !this._wasShowingUserSuggestions) {
      this.positionOverlayDropdown();
    }
    this._wasShowingEmptySuggestions = this.showEmptySuggestions;
    this._wasShowingSearchingState = this.showSearchingState;
    this._wasShowingUserSuggestions = this.showUserSuggestions;
    if (this._openDropdownUserId && this._openDropdownUserId !== this._positionedDropdownUserId) {
      this.positionAccessDropdown();
    }
    this._positionedDropdownUserId = this._openDropdownUserId;
    this.manageProcessingFocus();
  }
  manageProcessingFocus() {
    const isProcessing = this._isProcessing;
    if (isProcessing && !this._wasProcessing) {
      this.refs?.processingStatus?.focus();
    } else if (!isProcessing && this._wasProcessing) {
      this.restoreFocusAfterProcessing();
    }
    this._wasProcessing = isProcessing;
  }
  restoreFocusAfterProcessing() {
    const restoreUserId = this._focusRestoreUserId;
    this._focusRestoreUserId = undefined;
    const trigger = restoreUserId ? this.template?.querySelector(`.access-dropdown-trigger[data-user-id="${restoreUserId}"]`) : null;
    const target = trigger ?? this.refs?.searchInput;
    target?.focus();
  }
  get _showsOverlayDropdown() {
    return this.showUserSuggestions || this.showEmptySuggestions || this.showSearchingState;
  }
  _handleWindowResize = () => {
    if (this._showsOverlayDropdown) {
      this.positionOverlayDropdown();
    }
    if (this._openDropdownUserId) {
      this.positionAccessDropdown();
    }
  };
  positionOverlayDropdown() {
    const input = this.refs?.searchInput;
    const dropdown = this.refs?.userSuggestionsDropdown ?? this.refs?.emptySuggestionsDropdown ?? this.refs?.searchingDropdown;
    this.positionFixedBelowAnchor(dropdown, input, {
      align: 'left',
      gapPx: EMPTY_DROPDOWN_GAP_PX,
      matchAnchorWidth: true
    });
  }
  positionFixedBelowAnchor(el, anchor, options) {
    el.style.top = '0px';
    el.style.left = '0px';
    const containingBlockOrigin = el.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    el.style.top = `${anchorRect.bottom - containingBlockOrigin.top + (options.gapPx ?? 0)}px`;
    el.style.left = options.align === 'right' ? `${anchorRect.right - containingBlockOrigin.left - el.offsetWidth}px` : `${anchorRect.left - containingBlockOrigin.left}px`;
    if (options.matchAnchorWidth) {
      el.style.width = `${anchorRect.width}px`;
    }
  }
  positionAccessDropdown() {
    const menu = this.template?.querySelector('.access-dropdown-menu');
    const trigger = this.template?.querySelector(`.access-dropdown-trigger[data-user-id="${this._openDropdownUserId}"]`);
    if (!menu || !trigger) {
      return;
    }
    this.positionFixedBelowAnchor(menu, trigger, {
      align: 'right'
    });
  }
  loadCollaborators() {
    if (this._isInBuilderMode) {
      this._existingCollaborators = [...MOCK_COLLABORATORS];
      this._originalAccessLevels = new Map(MOCK_COLLABORATORS.map(c => [c.id, c.accessLevel]));
      return;
    }
    const rawCollaborators = this.cartData?.collaborators;
    this.applyCollaboratorData(rawCollaborators);
  }
  applyCollaboratorData(rawCollaborators) {
    if (rawCollaborators && rawCollaborators.length > 0) {
      this._existingCollaborators = rawCollaborators.map(c => ({
        id: c.collaboratorId,
        name: c.collaboratorName,
        email: c.collaboratorEmail,
        accessLevel: c.accessLevel,
        isExisting: true
      }));
      this._originalAccessLevels = new Map(rawCollaborators.map(c => [c.collaboratorId, c.accessLevel ?? '']));
    } else {
      this._existingCollaborators = [];
      this._originalAccessLevels = new Map();
    }
  }
  async refreshCollaboratorsFromApi() {
    if (this._isInBuilderMode) {
      this.showBuilderCollaborators();
      return;
    }
    if (!this.cartData?.cartId) {
      this._fetchState = 'error';
      return;
    }
    this._fetchState = 'loading';
    try {
      const result = await getCarts({
        includeCollaborators: true
      });
      if (this._isInBuilderMode) {
        this.showBuilderCollaborators();
        return;
      }
      const freshCart = result?.carts?.find(cart => cart.cartId === this.cartData?.cartId);
      if (freshCart && Array.isArray(freshCart.collaborators)) {
        this.applyCollaboratorData(freshCart.collaborators);
      } else {
        this.loadCollaborators();
      }
      this._fetchState = 'ready';
    } catch {
      if (this._isInBuilderMode) {
        this.showBuilderCollaborators();
      } else {
        this._fetchState = 'error';
      }
    }
  }
  showBuilderCollaborators() {
    this.loadCollaborators();
    this._fetchState = 'ready';
  }
  get _headerLabel() {
    const cartName = this.cartData?.name || '';
    if (this._isAddConfirmScreen) {
      return this.titleText ? `${this.titleText}?` : LABELS.shareCartConfirmHeader.replace('{0}', cartName);
    }
    return this.titleText || LABELS.shareCartHeader.replace('{0}', cartName);
  }
  get _goBackLabel() {
    return LABELS.goBackLabel;
  }
  get _doneButtonLabel() {
    return this.saveChangesLabel || LABELS.doneButton;
  }
  get _shareCartButtonLabel() {
    return this.shareCartButtonLabel || LABELS.shareCartButton;
  }
  get _isManageScreen() {
    return this._fetchState === 'ready' && this._modalScreen === 'manage';
  }
  get _isAddConfirmScreen() {
    return this._fetchState === 'ready' && this._modalScreen === 'add-confirm';
  }
  get _showManageFooter() {
    return this._isManageScreen && !this._isProcessing;
  }
  get _showAddConfirmFooter() {
    return this._isAddConfirmScreen && !this._isProcessing;
  }
  get selectedAccessLevel() {
    return DEFAULT_ACCESS_LEVEL;
  }
  get availableAccessLevels() {
    const labelsByLevel = this.accessLevelDisplayByLevel();
    const configured = this.collaboratorAccess ?? [];
    return configured.filter(value => value in labelsByLevel).map(value => ({
      value,
      ...labelsByLevel[value]
    }));
  }
  accessLevelsForExisting(currentLevel) {
    const allowed = new Set([...this.availableAccessLevels.map(level => level.value), currentLevel]);
    const display = this.accessLevelDisplayByLevel();
    return ACCESS_LEVEL_VALUES.filter(value => allowed.has(value)).map(value => ({
      value,
      ...display[value]
    }));
  }
  accessLevelDisplayByLevel() {
    return {
      [ACCESS_LEVEL_VIEW]: {
        label: this.viewAccessLabel || LABELS.canView,
        description: LABELS.viewAccessDescription
      },
      [ACCESS_LEVEL_EDIT]: {
        label: this.editAccessLabel || LABELS.canEdit,
        description: LABELS.editAccessDescription
      },
      [ACCESS_LEVEL_CHECKOUT]: {
        label: this.checkoutAccessLabel || LABELS.canCheckout,
        description: LABELS.checkoutAccessDescription
      }
    };
  }
  get _removeActionLabel() {
    return this.removeAccessLabel || LABELS.removeLabel;
  }
  get _shareWithLabel() {
    return (this.shareWithLabel || LABELS.shareWithLabel).replace('{cartName}', this.cartData?.name || '');
  }
  get _noSuggestionsAvailableLabel() {
    return LABELS.noSuggestionsAvailable.replace('{expression}', this._searchQuery);
  }
  get _hasShareError() {
    return !!this._shareErrorMessage;
  }
  get _shareError() {
    return this._shareErrorMessage ?? '';
  }
  get _shareErrorBannerClass() {
    return this._hasShareError ? 'share-error-banner' : 'share-error-banner--empty';
  }
  get _hasSearchValue() {
    return this._searchQuery.length > 0;
  }
  get searchLabelClass() {
    return this._hasSearchValue ? 'search-floating-label search-floating-label--active' : 'search-floating-label';
  }
  get searchInputWrapperClass() {
    return this._hasSearchValue ? 'search-input-wrapper search-input-wrapper--has-value' : 'search-input-wrapper';
  }
  get _placeholderText() {
    return this._hasSearchValue ? '' : this.shareModalSearchFieldLabel || LABELS.shareWithPlaceholder;
  }
  get _searchFieldLabel() {
    return this.shareModalSearchFieldLabel || LABELS.shareWithPlaceholder;
  }
  get _removeLabel() {
    return this.shareModalRemoveLabel || LABELS.removeLabel;
  }
  get _ownerLabel() {
    return this.shareModalOwnerLabel || LABELS.ownerLabel;
  }
  get _confirmButtonLabel() {
    return this.shareModalConfirmButtonLabel || LABELS.shareCartButton;
  }
  get _cancelButtonLabel() {
    return this.shareModalCancelButtonLabel || LABELS.cancelButton;
  }
  get ownerRow() {
    const name = this._currentUserName ?? '';
    return {
      id: this._currentUserId ?? 'owner',
      name: name ? LABELS.currentUserNameLabel.replace('{0}', name) : LABELS.currentUserAnonymousLabel,
      email: this._currentUserEmail,
      isOwner: true
    };
  }
  get displayedRecipients() {
    return this._existingCollaborators.map(user => {
      const currentLevel = user.accessLevel ?? this.selectedAccessLevel;
      const levels = this.accessLevelsForExisting(currentLevel);
      const levelOption = levels.find(l => l.value === currentLevel);
      const levelLabel = levelOption?.label ?? '';
      return {
        ...user,
        accessLevelLabel: levelLabel,
        isDropdownOpen: this._openDropdownUserId === user.id,
        accessAriaLabel: `${levelLabel} ${user.name || user.email || ''}`,
        accessOptions: levels.map(l => ({
          value: l.value,
          label: l.label,
          checkmark: l.value === currentLevel ? '✓' : '',
          isSelected: l.value === currentLevel ? 'true' : 'false'
        })),
        removable: true,
        removeAriaLabel: `${this._removeLabel} ${user.name}`
      };
    });
  }
  get _confirmRecipientDisplay() {
    const levels = this.availableAccessLevels;
    return this._pendingRecipients.map(user => {
      const currentLevel = user.accessLevel;
      const levelOption = levels.find(l => l.value === currentLevel);
      const fallbackLabel = levelOption?.label ?? levels[0]?.label ?? '';
      const accessAriaLabel = `${levelOption?.label ?? ''} ${user.name || user.email || ''}`;
      return {
        ...user,
        accessLevelLabel: fallbackLabel,
        isDropdownOpen: this._openDropdownUserId === user.id,
        accessAriaLabel,
        accessOptions: levels.map(l => ({
          value: l.value,
          label: l.label,
          checkmark: l.value === currentLevel ? '✓' : '',
          isSelected: l.value === currentLevel ? 'true' : 'false'
        })),
        removable: true,
        removeAriaLabel: `${LABELS.removeLabel} ${user.name}`
      };
    });
  }
  get _isShareCartButtonDisabled() {
    return this._isAddInProgress || this._pendingRecipients.length === 0;
  }
  get _isProcessing() {
    return this._isAddInProgress || this._isUpdateInProgress || this._removeInProgressCollaboratorIds.size > 0;
  }
  get _processingLabel() {
    return this._removeInProgressCollaboratorIds.size > 0 ? LABELS.removingLabel : LABELS.spinnerHelpText;
  }
  get _processingSpinnerAltText() {
    return this._processingLabel;
  }
  get _isFetchLoading() {
    return this._fetchState === 'loading';
  }
  get _isFetchError() {
    return this._fetchState === 'error';
  }
  get _isDoneButtonDisabled() {
    return !this._existingCollaborators.some(c => {
      const original = this._originalAccessLevels.get(c.id);
      return original && c.accessLevel && original !== c.accessLevel;
    });
  }
  get filteredUsers() {
    return this._fetchedUsers.filter(user => !this.isUserSelected(user.id) && !this.isOwnerUser(user.id));
  }
  get _suggestionOptions() {
    return this.filteredUsers.map((user, index) => ({
      ...user,
      optionId: `${SUGGESTION_OPTION_ID_PREFIX}${index}`,
      isActive: index === this._activeIndex
    }));
  }
  get showSearchingState() {
    return this._showSuggestions && this._isSearching;
  }
  get showUserSuggestions() {
    return this._showSuggestions && !this._isSearching && this.filteredUsers.length > 0;
  }
  get showEmptySuggestions() {
    return this._showSuggestions && !this._isSearching && this.filteredUsers.length === 0;
  }
  get showUserSuggestionsOrEmpty() {
    return this.showUserSuggestions || this.showEmptySuggestions || this.showSearchingState;
  }
  get _emptySvg() {
    return `${BasePath}/assets/images/empty-search.svg`;
  }
  isUserSelected(userId) {
    const id15 = toId15(userId);
    if (this._pendingRecipients.some(r => toId15(r.id) === id15)) {
      return true;
    }
    return this._existingCollaborators.some(user => toId15(user.id) === id15);
  }
  isOwnerUser(userId) {
    return !!this._currentUserId && toId15(userId) === toId15(this._currentUserId);
  }
  handleSearchChange(event) {
    const target = event.target;
    this._searchQuery = target.value || '';
    this._activeIndex = NO_ACTIVE_INDEX;
    if (this._searchTimeout) {
      clearTimeout(this._searchTimeout);
    }
    const query = this._searchQuery.trim();
    if (query.length < MIN_SEARCH_CHARS) {
      this._showSuggestions = false;
      this._isSearching = false;
      this._fetchedUsers = [];
      return;
    }
    this._showSuggestions = true;
    this._isSearching = true;
    this._searchTimeout = setTimeout(() => {
      this.fetchBuyers(query, this.cartData?.accountId, this.cartData?.webstoreId, this.cartData?.cartId);
    }, SEARCH_DEBOUNCE_MS);
  }
  handleSearchFocus() {
    if (this._isInBuilderMode) {
      this._fetchedUsers = [...MOCK_SEARCH_RESULTS];
      this._isSearching = false;
      this._showSuggestions = true;
      return;
    }
    if (this._searchQuery.trim().length >= MIN_SEARCH_CHARS) {
      this._showSuggestions = true;
    }
  }
  handleSearchBlur() {
    this._blurTimeout = setTimeout(() => {
      this._showSuggestions = false;
    }, BLUR_DISMISS_MS);
  }
  async fetchBuyers(query, accountId, webStoreId, cartId) {
    if (this._isInBuilderMode) {
      const lowerQuery = query.toLowerCase();
      this._fetchedUsers = MOCK_SEARCH_RESULTS.filter(user => [user.name, user.email].some(value => value?.toLowerCase().includes(lowerQuery)));
      this._isSearching = false;
      return;
    }
    if (!accountId || !webStoreId) {
      this._fetchedUsers = [];
      this._isSearching = false;
      return;
    }
    const requestToken = ++this._searchRequestToken;
    const isStale = () => requestToken !== this._searchRequestToken;
    this._isSearching = true;
    try {
      const options = {
        cartId,
        excludeCollaborators: true,
        userType: SHARE_ELIGIBLE_USER_TYPE
      };
      if (this.searchCriteria && VALID_BUYER_SEARCH_CRITERIA.has(this.searchCriteria)) {
        options.searchCriteria = this.searchCriteria;
      }
      const data = await searchBuyers(query, accountId, webStoreId, options);
      if (isStale()) {
        return;
      }
      this._fetchedUsers = (data.buyers || []).map(buyer => ({
        id: buyer.id,
        name: buyer.name,
        email: buyer.email
      }));
    } catch (error) {
      if (isStale()) {
        return;
      }
      this._fetchedUsers = [];
    } finally {
      if (!isStale()) {
        this._isSearching = false;
      }
    }
  }
  handleUserSelect(event) {
    const target = event.currentTarget;
    this.selectUser(target.dataset.userId);
  }
  handleSuggestionHover(event) {
    const userId = event.currentTarget.dataset.userId;
    this._activeIndex = this.filteredUsers.findIndex(user => user.id === userId);
  }
  selectUser(userId) {
    if (!userId) {
      return;
    }
    const user = this._fetchedUsers.find(u => u.id === userId);
    if (user && !this.isUserSelected(userId)) {
      this._pendingRecipients = [...this._pendingRecipients, {
        ...user,
        isExisting: false,
        accessLevel: this.selectedAccessLevel
      }];
      this._modalScreen = 'add-confirm';
      this._searchQuery = '';
      this._showSuggestions = false;
      this._fetchedUsers = [];
      this._activeIndex = NO_ACTIVE_INDEX;
      this._shareErrorMessage = undefined;
    }
  }
  handleSearchKeydown(event) {
    const options = this.filteredUsers;
    if (!this.showUserSuggestions) {
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this._activeIndex = (this._activeIndex + 1) % options.length;
        break;
      case 'ArrowUp':
        event.preventDefault();
        this._activeIndex = this._activeIndex === NO_ACTIVE_INDEX ? options.length - 1 : (this._activeIndex - 1 + options.length) % options.length;
        break;
      case 'Enter':
        if (this._activeIndex !== NO_ACTIVE_INDEX && options[this._activeIndex]) {
          event.preventDefault();
          this.selectUser(options[this._activeIndex].id);
        }
        break;
      case 'Escape':
        this._showSuggestions = false;
        this._activeIndex = NO_ACTIVE_INDEX;
        break;
      default:
        break;
    }
  }
  handleToggleAccessDropdown(event) {
    const userId = event.currentTarget.dataset.userId;
    if (!userId) {
      return;
    }
    this._openDropdownUserId = this._openDropdownUserId === userId ? undefined : userId;
  }
  handleDropdownFocusOut(event) {
    const container = event.currentTarget;
    const newTarget = event.relatedTarget;
    if (newTarget && container.contains(newTarget)) {
      return;
    }
    this._openDropdownUserId = undefined;
  }
  handleMenuMousedown(event) {
    event.preventDefault();
  }
  handleDropdownKeydown(event) {
    if (!this._openDropdownUserId) {
      return;
    }
    const container = event.currentTarget;
    if (event.key === 'Escape') {
      event.stopPropagation();
      this._openDropdownUserId = undefined;
      container.querySelector('.access-dropdown-trigger')?.focus();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (event.target.closest('[role="menuitemradio"], [role="menuitem"]')) {
        return;
      }
      event.preventDefault();
      const items = container.querySelectorAll('[role="menuitemradio"], [role="menuitem"]');
      if (items.length) {
        (event.key === 'ArrowDown' ? items[0] : items[items.length - 1])?.focus();
      }
    }
  }
  handleMenuItemKeydown(event) {
    const item = event.currentTarget;
    const menu = item.parentElement;
    const items = Array.from(menu.querySelectorAll('[role="menuitemradio"], [role="menuitem"]'));
    const index = items.indexOf(item);
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        items[(index + 1) % items.length]?.focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        items[(index - 1 + items.length) % items.length]?.focus();
        break;
      case 'Home':
        event.preventDefault();
        items[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        items[items.length - 1]?.focus();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        item.click();
        break;
      case 'Escape':
        event.preventDefault();
        this._openDropdownUserId = undefined;
        menu.closest('.access-dropdown-container')?.querySelector('.access-dropdown-trigger')?.focus();
        break;
      default:
        break;
    }
  }
  async handleAccessOptionSelect(event) {
    const target = event.currentTarget;
    const userId = target.dataset.userId;
    const value = target.dataset.value;
    this._openDropdownUserId = undefined;
    if (!userId || !value) {
      return;
    }
    if (value === 'remove') {
      await this.removeRecipient(userId);
      return;
    }
    this.modifyAccessLevel(userId, value);
  }
  modifyAccessLevel(userId, newLevel) {
    if (this._modalScreen === 'add-confirm') {
      this._pendingRecipients = this._pendingRecipients.map(r => {
        return r.id === userId ? {
          ...r,
          accessLevel: newLevel
        } : r;
      });
      return;
    }
    this._existingCollaborators = this._existingCollaborators.map(c => {
      return c.id === userId ? {
        ...c,
        accessLevel: newLevel
      } : c;
    });
  }
  async removeRecipient(userId) {
    if (this._modalScreen === 'add-confirm') {
      this._pendingRecipients = this._pendingRecipients.filter(r => r.id !== userId);
      if (this._pendingRecipients.length === 0) {
        this._modalScreen = 'manage';
      }
      this._shareErrorMessage = undefined;
      return;
    }
    await this.removeExistingCollaborator(userId);
  }
  async removeExistingCollaborator(userId) {
    if (this._isInBuilderMode) {
      this._existingCollaborators = this._existingCollaborators.filter(user => user.id !== userId);
      return;
    }
    const collaboratorName = this._existingCollaborators.find(u => u.id === userId)?.name ?? '';
    this._focusRestoreUserId = userId;
    this._removeInProgressCollaboratorIds = new Set(this._removeInProgressCollaboratorIds).add(userId);
    try {
      await cartCollaboratorDelete(userId, this.cartData?.cartId);
      this._existingCollaborators = this._existingCollaborators.filter(user => user.id !== userId);
      this._shareErrorMessage = undefined;
      this.notifyCollaboratorsChanged('cartcollaboratorremoved', this.cartData?.cartId);
    } catch (error) {
      this.showToast(LABELS.removeCollaboratorErrorMessage.replace('{collaboratorName}', collaboratorName), 'error');
    } finally {
      const remainingIds = new Set(this._removeInProgressCollaboratorIds);
      remainingIds.delete(userId);
      this._removeInProgressCollaboratorIds = remainingIds;
    }
  }
  async handleShareCart() {
    if (this._pendingRecipients.length === 0) {
      return;
    }
    const recipients = this._pendingRecipients;
    const cartName = this.getCartNameForSuccessToast(this.cartData?.name || '');
    if (this._isInBuilderMode) {
      if (recipients.length === 1) {
        this.showToast(LABELS.shareCartSuccessWithName.replace('{cartName}', cartName).replace('{collaboratorName}', recipients[0].name || ''), 'success');
      } else {
        this.showToast(LABELS.shareCartSuccessWithCount.replace('{0}', cartName).replace('{1}', String(recipients.length)), 'success');
      }
      this.close(CartShareModal.DISMISSAL.success);
      return;
    }
    this._shareErrorMessage = undefined;
    this._isAddInProgress = true;
    const cartId = this.cartData?.cartId;
    const collaboratorInputs = recipients.map(r => {
      const level = r.accessLevel;
      return {
        collaboratorId: r.id,
        accessLevel: level
      };
    });
    try {
      await cartCollaboratorAdd(collaboratorInputs, cartId, {
        silent: true
      });
      this.notifyCollaboratorsChanged('cartcollaboratoradded', cartId);
      if (recipients.length === 1) {
        this.showToast(LABELS.shareCartSuccessWithName.replace('{cartName}', cartName).replace('{collaboratorName}', recipients[0].name || ''), 'success');
      } else {
        this.showToast(LABELS.shareCartSuccessWithCount.replace('{0}', cartName).replace('{1}', String(recipients.length)), 'success');
      }
      this.close(CartShareModal.DISMISSAL.success);
      cartReload().catch(() => {
        // Intentionally ignored: reload is a convenience cache-flush.
      });
    } catch (error) {
      this._shareErrorMessage = this.resolveShareErrorMessage(error);
    } finally {
      this._isAddInProgress = false;
    }
  }
  resolveShareErrorMessage(error) {
    const unwrapped = error?.error ?? error;
    const serverError = unwrapped?.errors?.find(e => !!e.message);
    if (!serverError) {
      return LABELS.shareCartErrorMessage;
    }
    if (serverError.type === COLLABORATOR_LIMIT_ERROR_CODE) {
      const limit = serverError.message.match(COLLABORATOR_LIMIT_NUMBER_REGEX)?.[1];
      if (limit) {
        return LABELS.collaboratorLimitError.replace('{0}', limit);
      }
    }
    return serverError.message;
  }
  async handleDone() {
    const modified = this._existingCollaborators.filter(c => {
      const original = this._originalAccessLevels.get(c.id);
      return original && c.accessLevel && original !== c.accessLevel;
    });
    if (modified.length === 0 || this._isInBuilderMode) {
      this.close(CartShareModal.DISMISSAL.close);
      return;
    }
    this._isUpdateInProgress = true;
    try {
      await cartCollaboratorUpdate(modified.map(c => ({
        collaboratorId: c.id,
        accessLevel: c.accessLevel
      })), this.cartData?.cartId);
      this.notifyCollaboratorsChanged('cartcollaboratorupdated', this.cartData?.cartId);
      this.showToast(LABELS.permissionUpdatedForUser, 'success');
      this.close(CartShareModal.DISMISSAL.close);
    } catch {
      this.showToast(LABELS.updatePermissionErrorMessage, 'error');
      this.close(CartShareModal.DISMISSAL.error);
    } finally {
      this._isUpdateInProgress = false;
    }
  }
  handleBack() {
    this._pendingRecipients = [];
    this._modalScreen = 'manage';
    this._shareErrorMessage = undefined;
  }
  getCartNameForSuccessToast(cartName) {
    if (cartName.length > CartShareModal.MAX_CART_NAME_DISPLAY_LENGTH) {
      const truncateLength = CartShareModal.MAX_CART_NAME_DISPLAY_LENGTH - CartShareModal.CART_NAME_ELLIPSIS.length;
      return cartName.slice(0, truncateLength) + CartShareModal.CART_NAME_ELLIPSIS;
    }
    return cartName;
  }
  showToast(label, variant) {
    const toast = {
      label,
      variant
    };
    Toast.show(toast, this);
  }
  handleClose() {
    this.close(CartShareModal.DISMISSAL.close);
  }
  handleDismissShareError() {
    this._shareErrorMessage = undefined;
  }
}