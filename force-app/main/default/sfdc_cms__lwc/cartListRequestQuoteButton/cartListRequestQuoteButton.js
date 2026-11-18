import { LightningElement, api, wire } from 'lwc';
import { isDesignMode } from 'experience/clientApi';
import Toast from 'site/commonToast';
import { navigate, NavigationContext } from 'lightning/navigation';
import QuoteRequestModal from 'site/quoteRequestModal';
import { createQuoteFromCart } from 'commerce/quoteApi';
import { toCommerceErrors } from 'commerce/checkoutCartApi';
import { generateStyleProperties } from 'experience/styling';
import { bundleRequestError, quoteRequestError, subscriptionRequestError } from './labels';
import { hasActiveAsyncOperation, isCartOwner } from 'site/commonUtils';
import { SessionContextAdapter } from 'commerce/contextApi';
import { isCartLocked, isLockHolder } from './utils';
export default class CartListRequestQuoteButton extends LightningElement {
  static renderMode = 'light';
  @api
  cartSummaryData;
  get isCartProcessing() {
    return this.cartSummaryData?.status === 'Processing' || this.cartSummaryData?.asyncOperationStatus === 'Processing';
  }
  get isLockedForViewer() {
    return isCartLocked(this.cartSummaryData) && !isLockHolder(this.cartSummaryData, this.sessionContext?.data?.userId);
  }
  get isDisabled() {
    return hasActiveAsyncOperation(this.cartSummaryData) || this.isCartProcessing || this.isLockedForViewer;
  }
  @api
  buttonText;
  @api
  variant;
  @api
  size;
  @api
  width;
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
  @api
  showTitle = false;
  @api
  titleText;
  @api
  showQuoteRequiredByDate = false;
  @api
  quoteRequiredByDateLabel;
  @api
  isRequiredQuoteRequiredByDate = false;
  @api
  showDescription = false;
  @api
  descriptionLabel;
  @api
  isRequiredDescription = false;
  @api
  showInfotext = false;
  @api
  infoText;
  @api
  additionalFields;
  @api
  cancelButtonLabel;
  @api
  sendRequestButtonLabel;
  @api
  sendRequestButtonSize;
  @api
  cancelButtonSize;
  @wire(NavigationContext)
  navContext;
  @wire(SessionContextAdapter)
  sessionContext;
  get showButton() {
    if (isDesignMode) {
      return this.hasProductsInCart() && !this.hasQuoteLineItems();
    }
    return this.hasProductsInCart() && !this.hasQuoteLineItems() && this.isCurrentUserCartOwner();
  }
  hasQuoteLineItems() {
    return Number(this.cartSummaryData?.quoteLineItemCount) > 0;
  }
  hasProductsInCart() {
    return Number(this.cartSummaryData?.totalProductCount) > 0;
  }
  isCurrentUserCartOwner() {
    return isCartOwner(this.sessionContext?.data?.userId, this.cartSummaryData?.ownerId);
  }
  get cartId() {
    return this.cartSummaryData?.cartId;
  }
  get additionalFieldsArray() {
    if (!this.additionalFields) {
      return [];
    }
    let raw;
    try {
      raw = JSON.parse(this.additionalFields);
    } catch {
      return [];
    }
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.filter(field => Boolean(field?.name)).map(field => ({
      name: field.name,
      label: field.label,
      required: false,
      value: ''
    }));
  }
  get modalConfiguration() {
    return {
      showTitle: this.showTitle,
      titleText: this.titleText,
      showQuoteRequiredByDate: this.showQuoteRequiredByDate,
      isRequiredQuoteRequiredByDate: this.isRequiredQuoteRequiredByDate,
      quoteRequiredByDateLabel: this.quoteRequiredByDateLabel,
      showDescription: this.showDescription,
      isRequiredDescription: this.isRequiredDescription,
      descriptionLabel: this.descriptionLabel,
      showInfotext: this.showInfotext,
      infoText: this.infoText,
      sendRequestButtonLabel: this.sendRequestButtonLabel,
      sendRequestButtonSize: this.sendRequestButtonSize,
      cancelButtonLabel: this.cancelButtonLabel,
      cancelButtonSize: this.cancelButtonSize,
      additionalFields: this.additionalFieldsArray
    };
  }
  async handleRequestQuote(event) {
    event.stopPropagation();
    await QuoteRequestModal.open({
      size: 'small',
      onsubmit: e => {
        this.handleSubmitQuoteRequest(e.detail);
      },
      ...this.modalConfiguration
    });
  }
  async handleSubmitQuoteRequest(data) {
    if (!this.cartId) {
      data.close?.();
      return;
    }
    const additionalFieldsMap = data.additionalFields?.reduce((acc, field) => {
      acc[field.name] = field.value;
      return acc;
    }, {}) ?? {};
    const requiredBy = (data.requiredByDate ?? '').trim();
    if (requiredBy.length > 0) {
      additionalFieldsMap.ExpirationDate = requiredBy;
    }
    try {
      const quoteResponse = await createQuoteFromCart({
        activeCartOrId: this.cartId,
        input: {
          comments: data.description,
          additionalFields: additionalFieldsMap
        }
      });
      if (quoteResponse.errors?.length) {
        this.handleQuoteResponseError(quoteResponse.errors);
      } else if (quoteResponse.quoteId) {
        this.handleQuoteResponseSuccess(quoteResponse);
      }
    } catch (error) {
      this.handleQuoteResponseError(this.extractCommerceErrors(error));
    } finally {
      data.close?.();
    }
  }
  handleQuoteResponseSuccess(quoteResponse) {
    if (this.navContext) {
      navigate(this.navContext, {
        type: 'comm__namedPage',
        attributes: {
          name: 'Quote'
        },
        state: {
          quoteId: quoteResponse.quoteId
        }
      });
    }
  }
  handleQuoteResponseError(errors) {
    if (!errors || errors.length === 0) {
      return;
    }
    Toast.show({
      label: this.getErrorLabel(errors),
      variant: 'error'
    }, this);
  }
  getErrorLabel(errors) {
    const hasCode = code => errors.some(error => error.code === code);
    if (hasCode('SUBSCRIPTION_PRODUCTS_NOT_SUPPORTED')) {
      return subscriptionRequestError;
    }
    if (hasCode('BUNDLES_NOT_SUPPORTED')) {
      return bundleRequestError;
    }
    const insufficientAccessError = errors.find(error => error.code === 'INSUFFICIENT_ACCESS');
    if (insufficientAccessError?.message) {
      return insufficientAccessError.message;
    }
    return quoteRequestError;
  }
  extractCommerceErrors(error) {
    const errorPayload = error?.error;
    if (errorPayload && typeof errorPayload === 'object') {
      const errors = errorPayload.errors;
      if (Array.isArray(errors) && errors.length > 0) {
        return errors;
      }
    }
    if (typeof errorPayload === 'string') {
      try {
        const parsed = JSON.parse(errorPayload);
        if (Array.isArray(parsed?.errors) && parsed.errors.length > 0) {
          return parsed.errors;
        }
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(entry => ({
            code: entry?.errorCode ?? entry?.code,
            message: entry?.message
          }));
        }
      } catch {
        // Not valid JSON, fall through to toCommerceErrors
      }
    }
    return toCommerceErrors(error);
  }
}