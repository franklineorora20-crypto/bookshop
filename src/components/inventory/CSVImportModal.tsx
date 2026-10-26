import React, { useState } from 'react';
import { X, UploadCloud, CheckCircle, AlertCircle, FileText, Download } from 'lucide-react';
import { parseBooksCSV, ParsedBookRow } from '../../utils/csv.ts';
import { addBook } from '../../db/database.ts';
import { Button } from '../common/Button.tsx';
import { toast } from 'sonner';

interface CSVImportModalProps {
  onClose: () => void;
  onSuccess: () => Promise<void>;
  userId: number;
  userName: string;
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({
  onClose,
  onSuccess,
  userId,
  userName,
}) => {
  const [parsedData, setParsedData] = useState<{
    rows: ParsedBookRow[];
    totalRows: number;
    validCount: number;
    errorCount: number;
  } | null>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<string>('');
  const [importSummary, setImportSummary] = useState<string | null>(null);

  const handleDownloadTemplate = () => {
    const templateContent = `Title,Author,Publisher,Category,SellingPrice,PurchasePrice,Quantity,ReorderLevel,ISBN,Barcode,Edition
"Example Book Title","Author Name","Publisher Name","KCSE Set Books",650,450,20,5,"978-9966000000","","1st Edition"
"Primary English Grade 4","Kenya Literature Bureau","KLB","CBC Grade 4",320,220,50,10,"978-9966111111","","2nd Edition"
`;
    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'KitabuPOS_Inventory_Template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseBooksCSV(text);
      setParsedData(parsed);
      setImportSummary(null);
    };
    reader.readAsText(file);
  };

  const handleDownloadErrorsCSV = () => {
    if (!parsedData) return;
    const errorRows = parsedData.rows.filter((r) => !r.isValid);
    if (errorRows.length === 0) return;

    let csv = 'RowNumber,Title,Author,Category,Price,Quantity,Errors\n';
    for (const r of errorRows) {
      csv += `${r.rowNumber},"${(r.title || '').replace(/"/g, '""')}","${(r.author || '').replace(/"/g, '""')}","${(r.category || '').replace(/"/g, '""')}",${r.selling_price},${r.quantity},"${(r.errors || []).join('; ').replace(/"/g, '""')}"\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'KitabuPOS_Import_Errors.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Downloaded error report CSV');
  };

  const handleImportValidRows = async () => {
    if (!parsedData || parsedData.validCount === 0) return;

    setIsImporting(true);
    let imported = 0;
    const validRows = parsedData.rows.filter((r) => r.isValid);

    try {
      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        setImportProgress(`Importing row ${i + 1} of ${validRows.length}: "${row.title}"...`);

        await addBook(
          {
            title: row.title,
            isbn: row.isbn,
            barcode: row.barcode,
            author: row.author,
            publisher: row.publisher,
            category: row.category,
            edition: row.edition,
            purchase_price: row.purchase_price,
            selling_price: row.selling_price,
            quantity: row.quantity,
            reorder_level: row.reorder_level,
          },
          userId,
          userName
        );
        imported++;
      }

      await onSuccess();
      toast.success(`Successfully imported ${imported} titles into SQLite database!`);
      setImportSummary(`Successfully imported ${imported} books into local inventory.`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      toast.error(`Import stopped: ${err.message}. ${imported} rows were saved.`);
      setImportSummary(`Import interrupted: ${err.message} (${imported} records committed).`);
      await onSuccess();
    } finally {
      setIsImporting(false);
      setImportProgress('');
    }
  };

  const mappedColumns = [
    { source: 'Title', target: 'Book Title (Required)', status: 'Mapped' },
    { source: 'Author', target: 'Author (Required)', status: 'Mapped' },
    { source: 'SellingPrice', target: 'Selling Price KES (Required)', status: 'Mapped' },
    { source: 'Quantity', target: 'Stock Quantity (Required)', status: 'Mapped' },
    { source: 'Category', target: 'Category / Department', status: 'Mapped' },
    { source: 'PurchasePrice', target: 'Unit Purchase Cost (COGS)', status: 'Mapped' },
    { source: 'ISBN / Barcode', target: 'EAN-13 / Scanner Code', status: 'Mapped' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-neutral-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <UploadCloud className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">Import Books from CSV Spreadsheet</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-md text-neutral-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs sm:text-sm">
          {/* File picker & template banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50">
            <div>
              <p className="font-bold text-sm text-neutral-900">Select CSV Inventory File</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Exported from Excel or KitabuPOS inventory template (.csv).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Template (.csv)
              </Button>
              <label className="cursor-pointer">
                <span className="inline-flex items-center justify-center font-bold px-4 py-2 min-h-[44px] rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs tactile-btn shadow-xs">
                  Choose CSV File
                </span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Column Mapping Preview */}
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-700">
              Expected Column Mapping
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {mappedColumns.map((col) => (
                <div key={col.source} className="p-2 rounded-lg bg-white border border-neutral-200">
                  <span className="font-mono font-bold text-neutral-900 block">{col.source}</span>
                  <span className="text-[11px] text-neutral-500">{col.target}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Import Summary / Status */}
          {importSummary && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{importSummary}</span>
            </div>
          )}

          {/* Parsed Results Breakdown */}
          {parsedData && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                  <span className="text-xs text-neutral-500">Total Rows</span>
                  <p className="text-xl font-bold font-mono text-neutral-900">{parsedData.totalRows}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-xs text-emerald-700 font-semibold">Valid to Import</span>
                  <p className="text-xl font-bold font-mono text-emerald-700">{parsedData.validCount}</p>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="text-xs text-rose-700 font-semibold">Row Errors</span>
                  <p className="text-xl font-bold font-mono text-rose-700">{parsedData.errorCount}</p>
                </div>
              </div>

              {/* If errors, provide downloadable error report */}
              {parsedData.errorCount > 0 && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="text-xs font-medium text-rose-900">
                      {parsedData.errorCount} row(s) contain invalid price, empty title, or formatting issues.
                    </span>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDownloadErrorsCSV}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                  >
                    Download Error Rows (.csv)
                  </Button>
                </div>
              )}

              {/* Preview Rows Table */}
              <div className="border border-neutral-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-100 text-neutral-700 font-bold sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Title</th>
                      <th className="px-3 py-2">Author</th>
                      <th className="px-3 py-2 text-right">Price</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {parsedData.rows.slice(0, 50).map((r) => (
                      <tr key={r.rowNumber} className={r.isValid ? 'hover:bg-neutral-50' : 'bg-rose-50/50'}>
                        <td className="px-3 py-2 font-mono text-neutral-500">{r.rowNumber}</td>
                        <td className="px-3 py-2">
                          {r.isValid ? (
                            <span className="text-emerald-700 font-bold">Valid</span>
                          ) : (
                            <span className="text-rose-600 font-bold" title={(r.errors || []).join(', ')}>
                              Error: {r.errors?.[0]}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-semibold text-neutral-900">{r.title || '—'}</td>
                        <td className="px-3 py-2 text-neutral-600">{r.author || '—'}</td>
                        <td className="px-3 py-2 text-right font-mono">{r.selling_price}</td>
                        <td className="px-3 py-2 text-right font-mono">{r.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {isImporting && (
            <div className="p-3 bg-neutral-100 rounded-lg text-xs font-mono text-neutral-800 animate-pulse">
              {importProgress}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
          <Button variant="outline" size="md" onClick={onClose} disabled={isImporting}>
            Cancel
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleImportValidRows}
            disabled={!parsedData || parsedData.validCount === 0 || isImporting}
            loading={isImporting}
          >
            Import {parsedData ? `${parsedData.validCount} Valid Books` : 'Books'}
          </Button>
        </div>
      </div>
    </div>
  );
};
