export const IN_PROGRESS_JOB_STATUSES = ['Initiated', 'InProgress'];
export const STATUS_THEME_MAP = {
  Completed: 'success',
  InProgress: 'warning',
  Initiated: 'warning',
  Failed: 'error',
  Cancelled: 'error'
};
export const DOWNLOADABLE_JOB_STATUSES = ['Completed'];
export const OPTIONS_JOB_STATUSES = ['Completed', 'Failed', 'Cancelled'];
export const EXPORT_JOB_DELETE_REQUESTED_EVENT = 'cartexportjobdeleterequested';
export const EXPORT_JOB_CANCEL_REQUESTED_EVENT = 'cartexportjobcancelrequested';
export const EXPORT_JOB_DELETED_EVENT = 'cartexportjobdeleted';
export const EXPORT_JOB_CANCELLED_EVENT = 'cartexportjobcancelled';
export const CART_EXPORT_JOB_MUTATION_STARTED_EVENT = 'cartexportjobmutationstarted';
export const CART_EXPORT_JOB_MUTATION_COMPLETED_EVENT = 'cartexportjobmutationcompleted';
export function extractApiError(error) {
  const e = error;
  const first = Array.isArray(e?.errors) ? e.errors.find(x => x?.message) ?? e.errors[0] : undefined;
  return {
    errorCode: first?.type ?? e?.errorCode ?? e?.body?.errorCode,
    message: first?.message ?? e?.body?.message
  };
}
export function interpolateLabel(label, value) {
  return label.split('{0}').join(value);
}