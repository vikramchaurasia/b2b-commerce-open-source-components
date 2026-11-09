import { LightningElement, api } from 'lwc';
export default class CartAsyncStateView extends LightningElement {
  static renderMode = 'light';
  @api
  cartData;
  @api
  cancelButtonLabel;
  @api
  showImportAgainOption;
  @api
  importAgainButtonLabel;
  @api
  importModalTitleLabel;
  @api
  importModalSubtitleLabel;
  @api
  importUploadFileLabel;
  @api
  importDropFileLabel;
  @api
  importStartImportLabel;
  @api
  importCancelButtonLabel;
  @api
  importMappingTitleLabel;
  @api
  viewErrorsButtonLabel;
  @api
  mappingErrorPopupLabel;
  @api
  mappingErrorMessageLabel;
  @api
  mappingErrorCloseButtonLabel;
}