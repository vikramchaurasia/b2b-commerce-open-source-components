export const BANNER_DISPLAY_DURATION_MS = 60_000;
export const IMPORT_CART_BANNER_DISPLAY_DURATION_MS = 48 * 60 * 60 * 1000;
export const IMPORT_CART_SUCCESS_BANNER_DISPLAY_DURATION_MS = 5 * 60 * 1000;
export const OPERATION_CONFIG = {
  ClearCart: {
    inProgress: {
      iconState: 'in-progress',
      labelKey: 'clearingCartLabel',
      cancelLabelKey: 'cancelOperationLabel',
      actions: ['cancel'],
      ariaLabelKey: 'clearingCartAriaLabel'
    },
    success: {
      iconState: 'success',
      labelKey: 'cartClearedLabel',
      actions: [],
      requireEmpty: true,
      ariaLabelKey: 'cartClearedAriaLabel'
    },
    failed: {
      iconState: 'failed',
      labelKey: 'cartClearedFailedLabel',
      actions: [],
      ariaLabelKey: 'cartClearedFailedAriaLabel'
    }
  },
  ImportCart: {
    inProgress: {
      iconState: 'in-progress',
      labelKey: 'importInProgressLabel',
      cancelLabelKey: 'importCancelLabel',
      actions: ['cancel']
    },
    success: {
      iconState: 'success',
      labelKey: 'importSuccessLabel',
      actions: [],
      displayDurationMs: IMPORT_CART_SUCCESS_BANNER_DISPLAY_DURATION_MS
    },
    failed: {
      iconState: 'failed',
      labelKey: 'importFailedLabel',
      viewErrorsLabelKey: 'importViewErrorsLabel',
      reimportLabelKey: 'importReimportLabel',
      actions: ['viewErrors', 'reimport'],
      displayDurationMs: IMPORT_CART_BANNER_DISPLAY_DURATION_MS
    }
  }
};