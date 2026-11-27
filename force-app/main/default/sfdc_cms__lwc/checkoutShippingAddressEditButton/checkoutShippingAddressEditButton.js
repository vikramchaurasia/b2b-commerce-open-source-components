import { LightningElement, api, wire } from 'lwc';
import { NavigationContext, CurrentPageReference } from 'lightning/navigation';
import { AppContextAdapter } from 'commerce/contextApi';
import { navigateToNamedPage } from 'site/navUtils';

/**
 * @slot edit
 */
export default class CheckoutShippingAddressEditButton extends LightningElement {
  static renderMode = 'light';
  _splitShipEnabled = false;
  @api
  checkoutDetails;
  @wire(NavigationContext)
  navContext;
  @wire(CurrentPageReference)
  _currentPageReference;
  @wire(AppContextAdapter)
  appContextHandler(response) {
    if (!response.loading) {
      this._splitShipEnabled = !!response?.data?.splitShipmentEnabled;
    }
  }
  handleEdit(event) {
    if (this._splitShipEnabled && Number(this.checkoutDetails?.deliveryGroups?.items.length) > 1) {
      event.stopPropagation();
      if (this.navContext) {
        navigateToNamedPage(this.navContext, 'Split_Shipment', this._currentPageReference);
      }
    }
  }
}