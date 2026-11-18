import { LightningElement, api } from 'lwc';
import { sortByLabel, defaultSort, dateAddedNewest, dateAddedOldest, lastModifiedNewest, lastModifiedOldest } from './labels';
export { sortByLabel, defaultSort, dateAddedNewest, dateAddedOldest, lastModifiedNewest, lastModifiedOldest } from './labels';
export const CART_LIST_SORT_CHANGE_EVENT = 'cartlistsortchange';
export const DEFAULT_SORT_VALUE = 'Default';
export default class CartListSortDropdownUi extends LightningElement {
  static renderMode = 'light';
  _sortOrder;
  get sortOrder() {
    return this._sortOrder ?? this.defaultSortOrder ?? DEFAULT_SORT_VALUE;
  }
  @api
  defaultSortOrder;
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
  _showSortingDropdownOverride;
  get showSortingDropdown() {
    return this._showSortingDropdownOverride ?? true;
  }
  @api
  get showSortingDropdownOverride() {
    return this._showSortingDropdownOverride;
  }
  set showSortingDropdownOverride(value) {
    this._showSortingDropdownOverride = value;
  }
  get selectedLabel() {
    const option = this.sortingOptions.find(opt => !opt.isSeparator && opt.value === this.sortOrder);
    return option?.label || this.defaultSortLabel;
  }
  get sortingOptions() {
    return [{
      label: this.defaultSortLabel,
      value: DEFAULT_SORT_VALUE,
      checked: this.sortOrder === DEFAULT_SORT_VALUE,
      isSeparator: false
    }, {
      label: '─',
      value: '__separator_default__',
      isSeparator: true
    }, {
      label: this.dateCreatedNewestLabel,
      value: 'CreatedDateDesc',
      checked: this.sortOrder === 'CreatedDateDesc',
      isSeparator: false
    }, {
      label: this.dateCreatedOldestLabel,
      value: 'CreatedDateAsc',
      checked: this.sortOrder === 'CreatedDateAsc',
      isSeparator: false
    }, {
      label: '─',
      value: '__separator_modified__',
      isSeparator: true
    }, {
      label: this.dateModifiedNewestLabel,
      value: 'LastModifiedDateDesc',
      checked: this.sortOrder === 'LastModifiedDateDesc',
      isSeparator: false
    }, {
      label: this.dateModifiedOldestLabel,
      value: 'LastModifiedDateAsc',
      checked: this.sortOrder === 'LastModifiedDateAsc',
      isSeparator: false
    }];
  }
  handleSortChange(event) {
    event.stopPropagation();
    const newSortOrder = event.detail.value;
    this._sortOrder = newSortOrder;
    this.dispatchEvent(new CustomEvent(CART_LIST_SORT_CHANGE_EVENT, {
      detail: newSortOrder,
      bubbles: true,
      composed: true
    }));
  }
}