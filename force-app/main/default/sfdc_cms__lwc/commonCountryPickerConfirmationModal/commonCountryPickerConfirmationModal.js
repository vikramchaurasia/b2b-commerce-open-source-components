import LightningModal from 'lightning/modal';
import { api } from 'lwc';
import { continueChangeCountryText, cancelChangeCountryText, continueChangeCountryAriaLabel, cancelChangeCountryTextAriaLabel, modalHeadingLabel, confirmationModalText1, confirmationModalText2 } from './labels';
const CONFIRM_SELECTION_EVENT = 'confirmselection';
const CANCEL_SELECTION_EVENT = 'cancelselection';
export default class CommonCountryPickerConfirmationModal extends LightningModal {
  @api
  localeDisplayLabel;
  labels = {
    continueChangeCountryText: continueChangeCountryText,
    cancelChangeCountryText: cancelChangeCountryText,
    continueChangeCountryAriaLabel: continueChangeCountryAriaLabel,
    cancelChangeCountryTextAriaLabel: cancelChangeCountryTextAriaLabel,
    modalHeadingLabel: modalHeadingLabel
  };
  get formattedConfirmationText() {
    return confirmationModalText1.replace('{0}', this.localeDisplayLabel ?? '');
  }
  get cartDeletionText() {
    return confirmationModalText2;
  }
  changeCountry() {
    if (!import.meta.env.SSR) {
      const changeCountryEvent = new CustomEvent(CONFIRM_SELECTION_EVENT, {
        bubbles: true
      });
      this.dispatchEvent(changeCountryEvent);
      this.close(CONFIRM_SELECTION_EVENT);
    }
  }
  closeModal() {
    if (!import.meta.env.SSR) {
      const cancelSelectionEvent = new CustomEvent(CANCEL_SELECTION_EVENT, {
        bubbles: true
      });
      this.dispatchEvent(cancelSelectionEvent);
      this.close(CANCEL_SELECTION_EVENT);
    }
  }
}