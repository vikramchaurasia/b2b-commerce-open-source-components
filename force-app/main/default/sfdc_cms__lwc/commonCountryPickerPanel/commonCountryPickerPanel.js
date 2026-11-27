import { LightningElement, api } from 'lwc';
import { generatePaddingClass, generateStyleProperties, generateTextFormatStyles, generateThemeTextSizeClass, generateThemeTextSizeProperty } from 'experience/styling';
import { closeButtonText } from './labels';
const DEFAULT_HEADING_TAG = 'h2';
const DEFAULT_HEADING_TEXT_STYLE = 'heading-large';
function parseJson(value) {
  if (!value) {
    return undefined;
  }
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}
export default class CommonCountryPickerPanel extends LightningElement {
  static renderMode = 'light';
  labels = {
    closeButtonText
  };
  @api
  columns;
  get _columnsCssValue() {
    return this.columns ? this.generateCssGridColumnValue(this.columns) : '';
  }
  @api
  locales;
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
  get headingDisplayInfo() {
    return parseJson(this.headingTextDisplayInfo) ?? {};
  }
  get headingTag() {
    return this.headingDisplayInfo.headingTag || DEFAULT_HEADING_TAG;
  }
  get isH1() {
    return this.headingTag === 'h1';
  }
  get isH2() {
    return this.headingTag === 'h2';
  }
  get isH3() {
    return this.headingTag === 'h3';
  }
  get isH4() {
    return this.headingTag === 'h4';
  }
  get isH5() {
    return this.headingTag === 'h5';
  }
  get isH6() {
    return this.headingTag === 'h6';
  }
  get headingClasses() {
    const textStyle = this.headingDisplayInfo.textStyle || DEFAULT_HEADING_TEXT_STYLE;
    return ['heading-text', generateThemeTextSizeClass(textStyle), this.headingPaddingVertical ? generatePaddingClass(this.headingPaddingVertical, 'vertical') : ''].filter(generatedClass => generatedClass).join(' ');
  }
  get headingStyles() {
    const textStyle = this.headingDisplayInfo.textStyle || DEFAULT_HEADING_TEXT_STYLE;
    const themeProperty = generateThemeTextSizeProperty(textStyle);
    const {
      weight,
      style,
      decoration
    } = generateTextFormatStyles(parseJson(this.headingTextDecoration));
    return generateStyleProperties([{
      name: 'color',
      value: this.headingTextColor || `var(${themeProperty}-color)`
    }, {
      name: 'text-align',
      value: this.headingTextAlignment || `var(${themeProperty}-text-align)`
    }, {
      name: 'font-weight',
      value: weight || `var(${themeProperty}-font-weight)`
    }, {
      name: 'font-style',
      value: style || `var(${themeProperty}-font-style)`
    }, {
      name: 'text-decoration',
      value: decoration || `var(${themeProperty}-text-decoration)`
    }]);
  }
  get gridStyles() {
    const styleProps = {
      '--com-c-country-picker-grid-columns': this._columnsCssValue
    };
    return generateStyleProperties(styleProps);
  }
  generateCssGridColumnValue(numColumns) {
    return new Array(numColumns).fill('1fr').join(' ');
  }
  handleClose(e) {
    e.stopPropagation();
    this.closePanel();
  }
  handleKeyDown(e) {
    if (e.code === 'Escape') {
      this.closePanel();
    }
  }
  closePanel() {
    this.dispatchEvent(new CustomEvent('closecountrypicker'));
  }
}