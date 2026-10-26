import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  accessor?: (row: T) => any;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  render?: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string | number;
  zebra?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  maxHeight?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  zebra = false,
  emptyMessage = 'No records found',
  emptyIcon,
  maxHeight,
  className = '',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: Column<T>) => {
    if (!column.sortable) return;
    if (sortKey === column.key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey(null);
        setSortDirection('asc');
      }
    } else {
      setSortKey(column.key);
      setSortDirection('asc');
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return data;

    return [...data].sort((a, b) => {
      const valA = col.accessor ? col.accessor(a) : (a as any)[col.key];
      const valB = col.accessor ? col.accessor(b) : (b as any)[col.key];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      let comparison = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else {
        comparison = String(valA).localeCompare(String(valB));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortKey, sortDirection, columns]);

  return (
    <div
      className={`w-full overflow-x-auto border border-neutral-200 rounded-xl bg-white shadow-xs ${className}`}
      style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
    >
      <table className="w-full text-left border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-neutral-50/95 backdrop-blur-xs border-b border-neutral-200 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
          <tr>
            {columns.map((col) => {
              const alignClass =
                col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
              const isSorted = sortKey === col.key;

              return (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={`px-4 py-3 ${alignClass} whitespace-nowrap`}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col)}
                      className="inline-flex items-center gap-1.5 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-900 rounded select-none font-semibold"
                    >
                      <span>{col.header}</span>
                      {isSorted ? (
                        sortDirection === 'asc' ? (
                          <ChevronUp className="w-3.5 h-3.5 text-neutral-900" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-neutral-900" />
                        )
                      ) : (
                        <ChevronsUpDown className="w-3.5 h-3.5 text-neutral-400" />
                      )}
                    </button>
                  ) : (
                    <span>{col.header}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-neutral-400 text-xs">
                {emptyIcon && <div className="mb-2 flex justify-center text-neutral-300">{emptyIcon}</div>}
                <span>{emptyMessage}</span>
              </td>
            </tr>
          ) : (
            sortedData.map((row, idx) => (
              <tr
                key={keyExtractor(row, idx)}
                className={`transition-colors hover:bg-neutral-50/80 ${
                  zebra && idx % 2 === 1 ? 'bg-neutral-50/40' : 'bg-white'
                }`}
              >
                {columns.map((col) => {
                  const alignClass =
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
                  const cellContent = col.render
                    ? col.render(row)
                    : col.accessor
                    ? col.accessor(row)
                    : (row as any)[col.key];

                  return (
                    <td key={col.key} className={`px-4 py-3 text-neutral-800 ${alignClass}`}>
                      {cellContent}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
