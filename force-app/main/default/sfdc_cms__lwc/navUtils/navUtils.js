import { navigate } from 'lightning/navigation';
export function getRecordIdFromPageRef(pageRef) {
  return pageRef?.state?.recordId;
}
export function navigateToNamedPage(navContext, pageName, currentPageReference) {
  const recordId = getRecordIdFromPageRef(currentPageReference);
  navigate(navContext, {
    type: 'comm__namedPage',
    attributes: {
      name: pageName
    },
    state: recordId ? {
      recordId
    } : undefined
  });
}