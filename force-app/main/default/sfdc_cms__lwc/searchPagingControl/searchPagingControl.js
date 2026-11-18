import { LightningElement, api } from 'lwc';
import { generatePagesForRange, generateSlidingWindowPages } from './searchPagingControlHelper';
import { EVENT, PAGING_RANGE_SYMBOL } from './constants';
const MORE_PAGES_AVAILABLE = 'morepagesavailable';
const AVERAGING_THRESHOLD = 1000;
import { previous, next } from './labels';
function isNumber(value, min) {
  return typeof value === 'number' && !Number.isNaN(value) && value > min;
}
export default class SearchPagingControl extends LightningElement {
  static renderMode = 'light';
  _hasNextPage;
  _hasPageAfterNext;
  _isFetchingMorePagesData = false;
  @api
  currentPageNumber;
  @api
  pageSize;
  @api
  totalItemCount;
  @api
  maximumPagesDisplayed;
  @api
  paginationType;
  @api
  disabled = false;
  connectedCallback() {
    if (!import.meta.env.SSR) {
      window.addEventListener(MORE_PAGES_AVAILABLE, this.handleMorePagesAvailable);
    }
  }
  disconnectedCallback() {
    if (!import.meta.env.SSR) {
      window.removeEventListener(MORE_PAGES_AVAILABLE, this.handleMorePagesAvailable);
    }
  }
  handleMorePagesAvailable = event => {
    this._isFetchingMorePagesData = false;
    this.hasNextPage = event?.detail?.hasNextPage;
    this.hasPageAfterNext = event?.detail?.hasPageAfterNext;
  };
  label = {
    previous,
    next
  };
  set hasNextPage(val) {
    this._hasNextPage = val;
  }
  get hasNextPage() {
    return this._hasNextPage;
  }
  set hasPageAfterNext(val) {
    this._hasPageAfterNext = val;
  }
  get hasPageAfterNext() {
    return this._hasPageAfterNext;
  }
  get normalizedPageNumber() {
    return isNumber(this.currentPageNumber, 1) ? this.currentPageNumber : 1;
  }
  get normalizedPageSize() {
    return isNumber(this.pageSize, 1) ? this.pageSize : 1;
  }
  get normalizedItemCount() {
    return isNumber(this.totalItemCount, 0) ? this.totalItemCount : 0;
  }
  get disablePaginationPrevious() {
    return this.disabled || this.normalizedPageNumber === 1;
  }
  get disablePaginationNext() {
    return this.disabled || this.normalizedPageNumber >= this.calculatedTotalPages || this.willTriggerMorePagesEvent && this._isFetchingMorePagesData;
  }
  get disablePageNumberButtons() {
    return this.disabled || this.willTriggerMorePagesEvent && this._isFetchingMorePagesData;
  }
  get totalPages() {
    return Math.ceil(this.normalizedItemCount / this.normalizedPageSize);
  }
  get calculatedTotalPages() {
    let totalPages = this.totalPages;
    if (this.hasNextPage !== undefined) {
      if (this.hasNextPage && this.hasPageAfterNext) {
        totalPages = this.normalizedPageNumber + 2;
      } else if (this.hasNextPage) {
        totalPages = this.normalizedPageNumber + 1;
      } else {
        totalPages = this.normalizedPageNumber;
      }
    }
    return totalPages;
  }
  get pageNumbers() {
    if (this.showSlidingWindowPagination) {
      return generateSlidingWindowPages(this.normalizedPageNumber, this.calculatedTotalPages);
    }
    const max = isNumber(this.maximumPagesDisplayed, 0) ? this.maximumPagesDisplayed : 5;
    return generatePagesForRange(this.normalizedPageNumber, this.totalPages, max);
  }
  get rangeSymbol() {
    return PAGING_RANGE_SYMBOL;
  }
  get showSlidingWindowPagination() {
    return this.paginationType === 'slidingWindow';
  }
  get willTriggerMorePagesEvent() {
    const calculatedThreshold = Math.ceil(AVERAGING_THRESHOLD + AVERAGING_THRESHOLD * ((AVERAGING_THRESHOLD - AVERAGING_THRESHOLD * 0.85) / (AVERAGING_THRESHOLD * 0.85)));
    if (!this.normalizedItemCount || this.normalizedItemCount < calculatedThreshold) {
      return false;
    }
    const adjustedProductCount = Math.floor(this.normalizedItemCount * 0.85 / AVERAGING_THRESHOLD) * AVERAGING_THRESHOLD;
    const adjustedTotalPages = Math.ceil(adjustedProductCount / this.normalizedPageSize);
    return this.normalizedPageNumber >= adjustedTotalPages;
  }
  resetPageAvailabilityData() {
    this.hasNextPage = undefined;
    this.hasPageAfterNext = undefined;
  }
  handlePaginationPrevious() {
    if (this.willTriggerMorePagesEvent) {
      this.hasPageAfterNext = this.hasNextPage;
      this.hasNextPage = true;
    } else {
      this.resetPageAvailabilityData();
    }
    this.dispatchEvent(new CustomEvent(EVENT.PAGE_CHANGE_PREVIOUS_EVT));
  }
  handlePaginationNext() {
    if (this.willTriggerMorePagesEvent) {
      this._isFetchingMorePagesData = true;
      this.hasNextPage = this.hasPageAfterNext;
      this.hasPageAfterNext = undefined;
    }
    this.dispatchEvent(new CustomEvent(EVENT.PAGE_CHANGE_NEXT_EVT));
  }
  handlePaginationPage(event) {
    const newPage = parseInt(event.target.value, 10);
    if (newPage > this.normalizedPageNumber && this.willTriggerMorePagesEvent) {
      this._isFetchingMorePagesData = true;
    }
    this.resetPageAvailabilityData();
    this.dispatchEvent(new CustomEvent(EVENT.PAGE_CHANGE_GOTOPAGE_EVT, {
      detail: {
        pageNumber: newPage
      }
    }));
  }
}