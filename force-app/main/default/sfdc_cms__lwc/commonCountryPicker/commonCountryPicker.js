import { LightningElement, api, wire } from 'lwc';
import { NavigationContext, generateUrl } from 'lightning/navigation';
import { CartAdapter, cartDelete } from 'commerce/checkoutCartApi';
import { generateLocales, getCountryLabel, getLanguageLabel } from './generateLocalesUtil';
import activeLanguages from '@salesforce/site/activeLanguages';
import currentSiteLanguage from '@salesforce/i18n/lang';
import basePath from '@salesforce/community/basePath';
import { changeLocale } from './utils';
export function mapLocaleToSalesforce(sfccLocale) {
  if (!sfccLocale.includes('-')) {
    return sfccLocale;
  }
  const SALESFORCE_LANG_MAP = {
    'en-US': 'en_US',
    'en-GB': 'en_GB',
    'en-CA': 'en',
    'fr-FR': 'fr',
    'fr-CA': 'fr_CA',
    'es-MX': 'es',
    'pt-BR': 'pt_BR',
    'de-DE': 'de',
    'it-IT': 'it',
    'ja-JP': 'ja',
    'ko-KR': 'ko',
    'nl-NL': 'nl_NL',
    'no-NO': 'no',
    'pl-PL': 'pl',
    'pt-PT': 'pt_PT',
    'sv-SE': 'sv',
    'da-DK': 'da',
    'fi-FI': 'fi',
    'zh-CN': 'zh_CN',
    'zh-TW': 'zh_TW'
  };
  return SALESFORCE_LANG_MAP[sfccLocale] || 'en_US';
}
export default class CommonCountryPicker extends LightningElement {
  static renderMode = 'light';
  @api
  sort;
  @api
  languageDisplayType;
  @api
  countryTextColor;
  @api
  countryHoverTextColor;
  @api
  countryTextAlignment;
  @api
  backgroundColor;
  @api
  pickerButtonAlignment;
  @api
  pickerButtonStyle;
  @api
  pickerButtonSize;
  @api
  pickerButtonLabelText;
  @api
  headingLabelText;
  @api
  headingTextDisplayInfo;
  @api
  headingTextAlignment;
  @api
  headingTextDecoration;
  @api
  headingPaddingVertical;
  @api
  headingTextColor;
  @api
  showGlobeIcon = false;
  @api
  markets = [];
  @api
  languages;
  @api
  countries;
  @wire(NavigationContext)
  navContext;
  @wire(CartAdapter)
  cart;
  connectedCallback() {
    this.setupEmbeddedMessagingLocale();
  }
  setupEmbeddedMessagingLocale() {
    if (typeof window !== 'undefined') {
      if (window.embeddedservice_bootstrap?.prechatAPI) {
        this.setEmbeddedMessagingLocale();
      }
      window.addEventListener('onEmbeddedMessagingReady', () => {
        this.setEmbeddedMessagingLocale();
      });
    }
  }
  setEmbeddedMessagingLocale() {
    const sfccLocale = currentSiteLanguage;
    const salesforceLocale = mapLocaleToSalesforce(sfccLocale);
    if (window.embeddedservice_bootstrap?.prechatAPI) {
      try {
        window.embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields({
          Locale: salesforceLocale
        });
      } catch (error) {
        console.error('[CommonCountryPicker] Error setting embedded messaging locale:', error);
      }
    }
  }
  get locales() {
    return generateLocales(this?.markets ?? [], this.languages, this.languageDisplayType, this.countries);
  }
  get totalProductCount() {
    const totalProductCount = parseInt(this.cart?.data?.cartSummary?.totalProductCount ?? '0', 10);
    return Number.isNaN(totalProductCount) ? 0 : totalProductCount;
  }
  get pickerButtonLanguage() {
    const [languageCode, countryCode] = this._currentLanguageSplit();
    return getLanguageLabel(languageCode, this.languageDisplayType, this.languages, countryCode);
  }
  get pickerButtonCountry() {
    const [languageCode, countryCode] = this._currentLanguageSplit();
    return getCountryLabel(countryCode, this.countries, languageCode);
  }
  _currentLanguageSplit() {
    return currentSiteLanguage.indexOf('_') > -1 ? currentSiteLanguage.split('_') : currentSiteLanguage.split('-');
  }
  async handleLocaleChange(e) {
    try {
      await cartDelete();
    } catch (error) {
      console.warn(error);
    }
    let response = '';
    if (this.navContext) {
      const pageReference = {
        type: 'comm__namedPage',
        attributes: {
          name: 'Home'
        }
      };
      response = await generateUrl(this.navContext, pageReference);
    }
    const currentSiteLanguageIsDefault = Boolean(activeLanguages.find(lang => lang.code === currentSiteLanguage)?.default);
    let effectiveBasePath = basePath;
    if (!effectiveBasePath.endsWith(`/${currentSiteLanguage}`) && !currentSiteLanguageIsDefault) {
      effectiveBasePath += `/${currentSiteLanguage}`;
    }
    changeLocale(response, effectiveBasePath, currentSiteLanguage, e.detail);
  }
}