export const DXP_TEXT_SIZE = {
  EXTRA_LARGE: 'heading-xlarge',
  LARGE: 'heading-large',
  MEDIUM: 'heading-medium',
  SMALL: 'heading-small',
  EXTRA_SMALL: 'heading-xsmall',
  EXTRA_EXTRA_SMALL: 'heading-xxsmall',
  BODY: 'body-regular',
  BODY_SMALL: 'body-small'
};
const DXP_CLASS_BY_SIZE = {
  [DXP_TEXT_SIZE.BODY_SMALL]: 'dxp-text-body-small',
  [DXP_TEXT_SIZE.BODY]: 'dxp-text-body',
  xsmall: 'dxp-text-body',
  [DXP_TEXT_SIZE.EXTRA_SMALL]: 'dxp-text-heading-xsmall',
  [DXP_TEXT_SIZE.EXTRA_EXTRA_SMALL]: 'dxp-text-heading-xxsmall',
  [DXP_TEXT_SIZE.SMALL]: 'dxp-text-heading-small',
  small: 'dxp-text-heading-small',
  [DXP_TEXT_SIZE.MEDIUM]: 'dxp-text-heading-medium',
  medium: 'dxp-text-heading-medium',
  [DXP_TEXT_SIZE.LARGE]: 'dxp-text-heading-large',
  large: 'dxp-text-heading-large',
  [DXP_TEXT_SIZE.EXTRA_LARGE]: 'dxp-text-heading-xlarge',
  xlarge: 'dxp-text-heading-xlarge'
};
export function generateDxpClassForSize(size) {
  return Object.prototype.hasOwnProperty.call(DXP_CLASS_BY_SIZE, size) ? DXP_CLASS_BY_SIZE[size] : undefined;
}