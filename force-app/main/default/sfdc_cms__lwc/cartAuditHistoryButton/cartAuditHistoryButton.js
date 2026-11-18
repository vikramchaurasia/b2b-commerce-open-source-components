import { LightningElement, api, wire } from 'lwc';
import { CartConfigurationContextAdapter } from 'commerce/contextApi';
import { generateStyleProperties } from 'experience/styling';
import { isDesignMode } from 'experience/clientApi';
import LABELS from './labels';
const COLLABORATION_STATUS_SHARED = 'SHARED';
export default class CartAuditHistoryButton extends LightningElement {
  static renderMode = 'light';
  @wire(CartConfigurationContextAdapter)
  _cartConfiguration;
  get _isShareCartEnabled() {
    return Boolean(this._cartConfiguration?.data?.shareCart?.isEnabled);
  }
  @api
  buttonText;
  @api
  cartDetails;
  @api
  variant;
  @api
  size;
  @api
  width;
  @api
  alignment;
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
  @api
  buttonBorderRadius;
  get buttonStyle() {
    const styles = [{
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
      name: '--com-c-button-radius-border',
      value: this.buttonBorderRadius ? this.buttonBorderRadius + 'px' : ''
    }, {
      name: '--com-c-button-color-border',
      value: this.buttonBorderColor
    }];
    return generateStyleProperties(styles);
  }
  displayPanel = false;
  get displayLabel() {
    return this.buttonText?.trim() ? this.buttonText : LABELS.defaultButtonText;
  }
  get normalisedCartDetails() {
    if (typeof this.cartDetails === 'string') {
      try {
        return JSON.parse(this.cartDetails);
      } catch {
        return undefined;
      }
    }
    return this.cartDetails;
  }
  get cartId() {
    return this.normalisedCartDetails?.cartId;
  }
  get isShared() {
    if (isDesignMode) {
      return true;
    }
    const details = this.normalisedCartDetails;
    const status = details?.collaborationStatus;
    const isStatusShared = typeof status === 'string' && status.toUpperCase() === COLLABORATION_STATUS_SHARED;
    const hasCollaborators = (details?.collaborators?.length ?? 0) > 0;
    return this._isShareCartEnabled && (isStatusShared || hasCollaborators);
  }
  handleOpen(event) {
    event.preventDefault();
    this.displayPanel = true;
  }
  handleClose() {
    this.displayPanel = false;
    Promise.resolve().then(() => {
      const trigger = this.refs?.trigger;
      trigger?.focus();
    });
  }
}