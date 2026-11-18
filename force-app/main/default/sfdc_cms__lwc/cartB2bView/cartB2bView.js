import { LightningElement, api } from 'lwc';
import { isDesignMode } from 'experience/clientApi';
const DESIGN_DISPLAY_MODES = ['empty', 'items'];

/**
 * @slot emptyHeaderLabel
 * @slot emptyBody
 * @slot emptyStateBreadcrumb
 * @slot itemsBreadcrumb
 * @slot itemsHeaderLabel
 * @slot itemsHeaderCount
 * @slot itemsDescription
 * @slot emptyStateDescription
 * @slot promotionDiscountsApproaching
 * @slot itemsBody
 * @slot cartOptions
 * @slot defaultPill
 * @slot newCartButton
 * @slot itemsCartOptions
 * @slot itemsDefaultPill
 * @slot itemsNewCartButton
 * @slot cartAsyncStateView
 * @slot cartAsyncStateViewItems
 * @slot cartCollaboratorList
 * @slot itemsCartCollaboratorList
 */
export default class CartB2bView extends LightningElement {
  static renderMode = 'light';
  @api
  displayStates;
  @api
  items;
  @api
  messages;
  @api
  cartDetails;
  @api
  errors;
  @api
  showSortOptions = false;
  @api
  sharedByLabel;
  @api
  sharedByWithAccessLabel;
  get _displayStates() {
    return isDesignMode ? DESIGN_DISPLAY_MODES : this.displayStates;
  }
}