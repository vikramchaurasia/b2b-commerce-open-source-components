import { LightningElement, api } from 'lwc';
export default class CommonPillBuilder extends LightningElement {
  static renderMode = 'light';
  @api
  labelText;
  @api
  textColor;
  @api
  backgroundColor;
  @api
  borderColor;
  @api
  borderRadius;
  get _style() {
    const styles = [];
    if (this.textColor) {
      styles.push(`--com-c-pill-text-color: ${this.textColor}`);
    }
    if (this.backgroundColor) {
      styles.push(`--com-c-pill-background-color: ${this.backgroundColor}`);
    }
    if (this.borderColor) {
      styles.push(`--com-c-pill-border-color: ${this.borderColor}`);
    }
    if (this.borderRadius != null) {
      styles.push(`--com-c-pill-border-radius: ${this.borderRadius}px`);
    }
    return styles.join('; ');
  }
}