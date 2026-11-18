export function stripLocaleFromDownloadUrl(url, basePath, currentSiteLanguage) {
  if (url === undefined) {
    return url;
  }
  const localeSuffix = currentSiteLanguage ? `/${currentSiteLanguage}` : '';
  if (!localeSuffix || !basePath.endsWith(localeSuffix) || !url.startsWith(basePath)) {
    return url;
  }
  const sitePrefix = basePath.slice(0, -localeSuffix.length);
  return sitePrefix + url.substring(basePath.length);
}