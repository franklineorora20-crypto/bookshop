export interface ParsedBookRow {
  rowNumber: number;
  title: string;
  isbn?: string;
  barcode?: string;
  author: string;
  publisher: string;
  category: string;
  edition?: string;
  purchase_price: number;
  selling_price: number;
  quantity: number;
  reorder_level: number;
  isValid: boolean;
  errors: string[];
}

export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === ',' || char === ';') && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseBooksCSV(csvContent: string): {
  rows: ParsedBookRow[];
  totalRows: number;
  validCount: number;
  errorCount: number;
} {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { rows: [], totalRows: 0, validCount: 0, errorCount: 0 };
  }

  const rawHeaders = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, ''));
  const headerMap: { [key: string]: number } = {};
  rawHeaders.forEach((h, index) => {
    headerMap[h] = index;
  });

  const getCol = (cols: string[], possibleNames: string[]): string => {
    for (const name of possibleNames) {
      if (headerMap[name] !== undefined) {
        return cols[headerMap[name]] || '';
      }
    }
    return '';
  };

  const parsedRows: ParsedBookRow[] = [];
  let validCount = 0;
  let errorCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const rowErrors: string[] = [];

    const title = getCol(cols, ['title', 'booktitle', 'name', 'itemname']);
    const isbn = getCol(cols, ['isbn', 'isbn13', 'isbn10', 'code']);
    const barcode = getCol(cols, ['barcode', 'bar_code']);
    const author = getCol(cols, ['author', 'writer']) || 'Unknown Author';
    const publisher = getCol(cols, ['publisher', 'pub']) || 'General';
    const category = getCol(cols, ['category', 'genre', 'subject', 'class']) || 'General';
    const edition = getCol(cols, ['edition', 'ed']);
    const purchasePriceStr = getCol(cols, ['purchaseprice', 'buyingprice', 'cost', 'unitcost']);
    const sellingPriceStr = getCol(cols, ['sellingprice', 'price', 'retailprice', 'unitprice']);
    const quantityStr = getCol(cols, ['quantity', 'qty', 'stock', 'stocklevel']);
    const reorderLevelStr = getCol(cols, ['reorderlevel', 'reorder', 'minstock', 'alertlevel']);

    if (!title) {
      rowErrors.push('Book title is required');
    }

    const cleanNumberStr = (str: string) => {
      const trimmed = str.trim();
      const isNegative = trimmed.startsWith('-');
      const numOnly = trimmed.replace(/[^0-9.]/g, '');
      if (!numOnly) return NaN;
      const val = parseFloat(numOnly);
      return isNegative ? -val : val;
    };

    const sellingPrice = cleanNumberStr(sellingPriceStr);
    if (isNaN(sellingPrice) || sellingPrice <= 0) {
      rowErrors.push('Selling price must be a positive number');
    }

    const purchasePrice = purchasePriceStr ? cleanNumberStr(purchasePriceStr) : 0;
    if (isNaN(purchasePrice) || purchasePrice < 0) {
      rowErrors.push('Purchase price cannot be negative');
    }

    const quantity = quantityStr ? parseInt(quantityStr.replace(/[^0-9-]/g, ''), 10) : 0;
    if (isNaN(quantity) || quantity < 0) {
      rowErrors.push('Quantity cannot be negative');
    }

    const reorderLevel = reorderLevelStr ? parseInt(reorderLevelStr.replace(/[^0-9]/g, ''), 10) : 5;

    const isValid = rowErrors.length === 0;
    if (isValid) validCount++;
    else errorCount++;

    parsedRows.push({
      rowNumber: i + 1,
      title,
      isbn: isbn || undefined,
      barcode: barcode || undefined,
      author,
      publisher,
      category,
      edition: edition || undefined,
      purchase_price: isNaN(purchasePrice) ? 0 : purchasePrice,
      selling_price: isNaN(sellingPrice) ? 0 : sellingPrice,
      quantity: isNaN(quantity) ? 0 : quantity,
      reorder_level: isNaN(reorderLevel) ? 5 : reorderLevel,
      isValid,
      errors: rowErrors,
    });
  }

  return {
    rows: parsedRows,
    totalRows: parsedRows.length,
    validCount,
    errorCount,
  };
}

export function exportToCSV(filename: string, headers: string[], rows: (string | number | undefined | null)[][]): void {
  const csvRows: string[] = [];
  csvRows.push(headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','));

  for (const row of rows) {
    const formatted = row.map((val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    });
    csvRows.push(formatted.join(','));
  }

  const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
