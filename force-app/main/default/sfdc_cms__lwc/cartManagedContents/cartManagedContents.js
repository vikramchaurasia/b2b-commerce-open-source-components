import { LightningElement, api } from 'lwc';
export default class CartManagedContents extends LightningElement {
  static renderMode = 'light';
  @api
  message;
  @api
  showSortOptions = false;
  @api
  showFooter = false;
  @api
  sortOrder;
  @api
  hasActiveAsyncOperation = false;
  get messageSeverity() {
    return this.message?.severity?.toLocaleLowerCase();
  }
}