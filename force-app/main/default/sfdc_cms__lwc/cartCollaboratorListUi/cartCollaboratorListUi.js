import { LightningElement, api, wire } from 'lwc';
import { CartConfigurationContextAdapter, SessionContextAdapter } from 'commerce/contextApi';
import { isDesignMode } from 'experience/clientApi';
import LABELS from './labels';
import { SALESFORCE_ID_15_LENGTH, ACCESS_LEVEL_VIEW, ACCESS_LEVEL_EDIT, ACCESS_LEVEL_CHECKOUT } from './constants';
function toId15(id) {
  return id.substring(0, SALESFORCE_ID_15_LENGTH);
}
const ACCESS_LEVEL_LABELS = {
  [ACCESS_LEVEL_VIEW]: LABELS.canView,
  [ACCESS_LEVEL_EDIT]: LABELS.canEdit,
  [ACCESS_LEVEL_CHECKOUT]: LABELS.canCheckout
};
export default class CartCollaboratorListUi extends LightningElement {
  static renderMode = 'light';
  @api
  get cartData() {
    return this._cartData;
  }
  set cartData(value) {
    this._cartData = this.normaliseCartData(value);
    this.processCollaborators();
  }
  _cartData;
  @api
  sharedWithOthersFullLabel;
  @api
  sharedWithOneOtherLabel;
  @api
  collaboratorsCountLabel;
  @api
  variant = 'bare';
  @api
  buttonStyle;
  normaliseCartData(value) {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return undefined;
      }
    }
    return value;
  }
  _currentUserId;
  _isLoggedIn = false;
  _collaborators = [];
  _isLoaded = false;
  _isOwnerViewing = false;
  _labels = LABELS;
  @wire(SessionContextAdapter)
  handleSessionContext({
    data
  }) {
    const prevUserId = this._currentUserId;
    this._currentUserId = data?.userId;
    this._isLoggedIn = data?.isLoggedIn === true;
    if (this._currentUserId && this._currentUserId !== prevUserId) {
      this.processCollaborators();
    }
  }
  @wire(CartConfigurationContextAdapter)
  cartConfiguration;
  get isShareCartEnabled() {
    return this._isLoggedIn && Boolean(this.cartConfiguration?.data?.shareCart?.isEnabled);
  }
  get showCollaboratorList() {
    return isDesignMode || this.isShareCartEnabled;
  }
  get hasCollaborators() {
    return this._isLoaded && this._collaborators.length > 0;
  }
  get collaboratorLinkLabel() {
    const count = this._collaborators.length;
    if (this._isOwnerViewing && count === 1) {
      return this.sharedWithOneOtherLabel || LABELS.sharedWithOneOtherLabel;
    }
    const template = this._isOwnerViewing ? this.sharedWithOthersFullLabel || LABELS.sharedWithOthersFullLabel : this.collaboratorsCountLabel || LABELS.collaboratorsCountLabel;
    return template.replace('{0}', String(count));
  }
  get collaborators() {
    return this._collaborators;
  }
  get collaboratorAnnouncement() {
    return this.collaborators.map(({
      ariaLabel
    }) => ariaLabel).filter(Boolean).join('; ');
  }
  processCollaborators() {
    const rawCollaborators = this.cartData?.collaborators;
    if (!rawCollaborators || rawCollaborators.length === 0) {
      this._collaborators = [];
      this._isOwnerViewing = false;
      this._isLoaded = true;
      return;
    }
    this._collaborators = rawCollaborators.map(c => this.toCollaboratorDisplay(c));
    this.deriveOwnerViewing(rawCollaborators);
    this._isLoaded = true;
  }
  toCollaboratorDisplay(c) {
    const isCurrentUser = !!this._currentUserId && toId15(c.collaboratorId) === toId15(this._currentUserId);
    const email = c.collaboratorEmail ?? '';
    const accessLevelLabel = ACCESS_LEVEL_LABELS[c.accessLevel] ?? '';
    const name = isCurrentUser ? LABELS.currentUserNameLabel.replace('{0}', c.collaboratorName) : c.collaboratorName;
    return {
      id: c.collaboratorId,
      name,
      email,
      hasEmail: Boolean(email),
      isCurrentUser,
      accessLevelLabel,
      hasAccessLevel: Boolean(accessLevelLabel),
      ariaLabel: [name, email, accessLevelLabel].filter(Boolean).join(', ')
    };
  }
  deriveOwnerViewing(rawCollaborators) {
    const sharer = rawCollaborators.find(c => c.sharedById) ?? rawCollaborators[0];
    const ownerId = this.cartData?.ownerId ?? sharer?.sharedById;
    this._isOwnerViewing = !!this._currentUserId && !!ownerId && toId15(ownerId) === toId15(this._currentUserId);
  }
}