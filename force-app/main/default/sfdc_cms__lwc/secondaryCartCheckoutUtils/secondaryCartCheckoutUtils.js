export function buildPaymentRedirectUrl(baseUrl, options) {
  const origin = globalThis.location?.origin;
  if (!baseUrl || !origin) {
    return '';
  }
  const url = new URL(origin + baseUrl);
  if (options.recordId) {
    url.searchParams.append('recordId', options.recordId);
    if (options.checkoutId) {
      url.searchParams.append('checkoutId', options.checkoutId);
    }
  } else if (options.cartId) {
    url.searchParams.append('cartId', options.cartId);
  }
  return url.toString();
}