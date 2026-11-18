import { LightningElement, api } from 'lwc';
import { isDesignMode } from 'experience/clientApi';
import { sortByLabel, defaultSort, dateAddedNewest, dateAddedOldest, lastModifiedNewest, lastModifiedOldest } from 'site/cartListSortDropdownUi';
export default class CartListSortDropdown extends LightningElement {
  static renderMode = 'light';
  @api
  label = sortByLabel;
  @api
  defaultSortLabel = defaultSort;
  @api
  dateCreatedNewestLabel = dateAddedNewest;
  @api
  dateCreatedOldestLabel = dateAddedOldest;
  @api
  dateModifiedNewestLabel = lastModifiedNewest;
  @api
  dateModifiedOldestLabel = lastModifiedOldest;
  @api
  defaultSortOrder;
  get showSortingDropdownOverride() {
    return isDesignMode ? true : undefined;
  }
}