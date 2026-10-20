import React, { useState } from 'react';
import { X, UploadCloud, CheckCircle, AlertCircle, FileText, ArrowRight, Download } from 'lucide-react';
import { parseBooksCSV, ParsedBookRow } from '../../utils/csv.ts';
import { addBook } from '../../db/database.ts';
import { formatKES } from '../../utils/formatters.ts';

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
  const [csvText, setCsvText] = useState<string>('');
  const [parsedData, setParsedData] = useState<{
    rows: ParsedBookRow[];
    totalRows: number;
    validCount: number;
    errorCount: number;
  } | null>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<string>('');

  const handleDownloadTemplate = () => {
    const templateContent = `Title,Author,Publisher,Category,SellingPrice,PurchasePrice,Quantity,ReorderLevel,ISBN,Barcode,Edition
"Example Book Title","Author Name","Publisher Name","KCSE Set Books",650,450,20,5,"978-9966000000","","1st Edition"
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
      setCsvText(text);
      const parsed = parseBooksCSV(text);
      setParsedData(parsed);
    };
    reader.readAsText(file);
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
      alert(`Successfully imported ${imported} books into the SQLite database!`);
      onClose();
    } catch (err: any) {
      alert(`Import error at row: ${err.message}. ${imported} rows were committed.`);
      await onSuccess();
    } finally {
      setIsImporting(false);
      setImportProgress('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">Import Books from CSV File</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* File picker and sample button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50">
            <div>
              <p className="font-bold text-sm text-slate-800">Choose CSV File to Upload</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Expected columns: Title, Author, Publisher, Category, SellingPrice, PurchasePrice, Quantity, ReorderLevel, ISBN
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-semibold text-xs transition-colors flex items-center gap-1.5 tactile-btn"
              >
                <Download className="w-3.5 h-3.5 text-neutral-500" />
                <span>Download Template (.csv)</span>
              </button>
              <label className="cursor-pointer px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>Select .csv File</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Validation Summary Badge */}
          {parsedData && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
              <span className="text-slate-700">Total Rows Detected: {parsedData.totalRows}</span>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                {parsedData.validCount} Valid & Ready
              </span>
              {parsedData.errorCount > 0 && (
                <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {parsedData.errorCount} Errors / Invalid
                </span>
              )}
            </div>
          )}

          {/* Parsed Rows Preview Table */}
          {parsedData && (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Row</th>
                      <th className="py-2.5 px-3">Title</th>
                      <th className="py-2.5 px-3">Author</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">Cost</th>
                      <th className="py-2.5 px-3 text-right">Price</th>
                      <th className="py-2.5 px-3 text-center">Stock</th>
                      <th className="py-2.5 px-3">Validation Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {parsedData.rows.map((row) => (
                      <tr
                        key={row.rowNumber}
                        className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50'}
                      >
                        <td className="py-2 px-3 text-slate-400">{row.rowNumber}</td>
                        <td className="py-2 px-3 font-medium font-sans text-slate-900 truncate max-w-[160px]">
                          {row.title || '<Empty Title>'}
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-600 truncate max-w-[120px]">
                          {row.author}
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-500">{row.category}</td>
                        <td className="py-2 px-3 text-right">{formatKES(row.purchase_price)}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          {formatKES(row.selling_price)}
                        </td>
                        <td className="py-2 px-3 text-center">{row.quantity}</td>
                        <td className="py-2 px-3 font-sans">
                          {row.isValid ? (
                            <span className="text-emerald-700 flex items-center gap-1 font-semibold">
                              <CheckCircle className="w-3.5 h-3.5" /> OK
                            </span>
                          ) : (
                            <span className="text-rose-600 font-medium">
                              {row.errors.join(', ')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Import Button */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            {importProgress ? (
              <span className="text-emerald-700 animate-pulse">{importProgress}</span>
            ) : parsedData ? (
              `Will insert ${parsedData.validCount} valid books into SQLite.`
            ) : (
              'Upload or paste a CSV file to preview.'
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isImporting || !parsedData || parsedData.validCount === 0}
              onClick={handleImportValidRows}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 text-white text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Import Valid Books ({parsedData?.validCount || 0})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
