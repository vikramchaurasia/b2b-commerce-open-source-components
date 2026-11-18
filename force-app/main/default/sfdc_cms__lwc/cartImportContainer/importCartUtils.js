import LABELS from './labels';
export const ALLOWED_FILE_EXTENSIONS = ['.csv'];
export const ALLOWED_MIME_TYPES = ['text/csv', 'application/vnd.ms-excel'];
const MIN_REQUIRED_COLUMNS = 2;
export function formatFileSize(bytes) {
  if (bytes === 0) {
    return '0 Bytes';
  }
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return Math.round(bytes / Math.pow(k, i)) + ' ' + sizes[i];
}
export function validateFile(file, limits) {
  const fileName = file.name.toLowerCase();
  const hasValidExtension = ALLOWED_FILE_EXTENSIONS.some(ext => fileName.endsWith(ext));
  if (!hasValidExtension) {
    return {
      valid: false,
      error: LABELS.fileInvalidTypeError,
      fileName: '',
      fileSize: ''
    };
  }
  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: LABELS.fileInvalidTypeError,
      fileName: '',
      fileSize: ''
    };
  }
  if (limits?.maxFileSize !== undefined && file.size > limits.maxFileSize) {
    const sizeLabel = limits.maxFileSizeLabel || formatFileSize(limits.maxFileSize);
    const error = LABELS.fileMaxSizeError.replace('{0}', sizeLabel);
    return {
      valid: false,
      error,
      fileName: '',
      fileSize: ''
    };
  }
  return {
    valid: true,
    error: '',
    fileName: file.name,
    fileSize: formatFileSize(file.size)
  };
}
function splitCsvLines(text) {
  const lines = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '""';
        i++;
      } else {
        inQuotes = !inQuotes;
        current += ch;
      }
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') {
        i++;
      }
      lines.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.length > 0) {
    lines.push(current);
  }
  return {
    lines,
    unterminatedQuote: inQuotes
  };
}
function parseCsvRow(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}
export function parseCsvContent(content) {
  const {
    lines,
    unterminatedQuote
  } = splitCsvLines(content);
  if (lines.length === 0) {
    return {
      headers: [],
      rows: [],
      unterminatedQuote
    };
  }
  const headers = parseCsvRow(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed !== '') {
      rows.push(parseCsvRow(lines[i]));
    }
  }
  return {
    headers,
    rows,
    unterminatedQuote
  };
}
const NUL_CHAR = '\u0000';
function isBinaryContent(content) {
  return content.includes(NUL_CHAR);
}
export function validateCsvContent(content, limits) {
  if (isBinaryContent(content)) {
    return {
      valid: false,
      error: LABELS.fileInvalidTypeError,
      rowCount: 0,
      headers: []
    };
  }
  const {
    headers,
    rows,
    unterminatedQuote
  } = parseCsvContent(content);
  if (unterminatedQuote) {
    return {
      valid: false,
      error: LABELS.fileMalformedCsvError,
      rowCount: 0,
      headers
    };
  }
  if (headers.length === 0 || rows.length === 0) {
    return {
      valid: false,
      error: LABELS.fileEmptyError,
      rowCount: 0,
      headers: []
    };
  }
  const namedColumnCount = headers.filter(header => header !== '').length;
  if (namedColumnCount < MIN_REQUIRED_COLUMNS) {
    return {
      valid: false,
      error: LABELS.fileMalformedCsvError,
      rowCount: 0,
      headers
    };
  }
  const normalizedHeaders = headers.map(header => header.toLowerCase().trim());
  const seen = new Set();
  for (const header of normalizedHeaders) {
    if (header === '') {
      continue;
    }
    if (seen.has(header)) {
      return {
        valid: false,
        error: LABELS.fileDuplicateColumnsError,
        rowCount: rows.length,
        headers
      };
    }
    seen.add(header);
  }
  if (rows.some(row => row.length !== headers.length)) {
    return {
      valid: false,
      error: LABELS.fileMalformedCsvError,
      rowCount: rows.length,
      headers
    };
  }
  if (limits?.maxRows !== undefined && rows.length > limits.maxRows) {
    const error = LABELS.fileMaxRowsError.replace('{0}', limits.maxRows.toString());
    return {
      valid: false,
      error,
      rowCount: rows.length,
      headers
    };
  }
  return {
    valid: true,
    error: '',
    rowCount: rows.length,
    headers
  };
}
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsText(file);
  });
}
export function buildColumnMappingsForFields(fieldDefs, selections) {
  const mappings = [];
  for (const field of fieldDefs) {
    const columnHeader = selections[field.fieldName];
    if (columnHeader) {
      mappings.push({
        fieldName: field.fieldName,
        columnHeader
      });
    }
  }
  return mappings;
}
export function areRequiredMappingsFilled(fieldDefs, selections) {
  return fieldDefs.every(field => !field.isRequired || !!selections[field.fieldName]);
}