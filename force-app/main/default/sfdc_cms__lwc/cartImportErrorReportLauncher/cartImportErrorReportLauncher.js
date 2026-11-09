import CartImportErrorReport from 'site/cartImportErrorReportModal';
export function launchImportErrorReport(detail, logContext) {
  const {
    cartId,
    jobId,
    webstoreId,
    modalLabels
  } = detail ?? {};
  if (!cartId || !jobId || !webstoreId) {
    console.error(`${logContext}: cannot open error report — missing cartId/jobId/webstoreId ` + '(the app context wire may not have resolved yet)');
    return;
  }
  CartImportErrorReport.open({
    size: 'small',
    jobId,
    webstoreId,
    ...modalLabels
  }).catch(err => {
    console.error(`${logContext}: error-report modal failed`, err);
  });
}