import LOCALE from '@salesforce/i18n/locale';
import { LABEL_PARAM_TOKEN } from './constants';
export function interpolateCountLabel(singularLabel, pluralLabel, count) {
  const category = new Intl.PluralRules(LOCALE).select(count);
  const label = category === 'one' ? singularLabel : pluralLabel;
  return label.split(LABEL_PARAM_TOKEN).join(String(count));
}