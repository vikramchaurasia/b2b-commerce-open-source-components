import { LightningElement, api } from 'lwc';
import { generateStyleProperties } from 'experience/styling';
export default class CartCollaboratorList extends LightningElement {
  static renderMode = 'light';
  @api
  cartDetails;
  @api
  sharedWithOthersFullLabel;
  @api
  sharedWithOneOtherLabel;
  @api
  collaboratorsCountLabel;
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
  get _normalisedCartDetails() {
    if (typeof this.cartDetails === 'string') {
      try {
        return JSON.parse(this.cartDetails);
      } catch {
        return undefined;
      }
    }
    return this.cartDetails;
  }
}