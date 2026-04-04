import React from 'react';
import { cn } from '../../utils/cn';

interface Column<T> {
  header: string;
  accessorKey: keyof T | string;
  cell?: (item: T) => React.ReactNode;
}

interface TableViewProps<T> {
  data: T[];
  columns: Column<T>[];
  emptyMessage?: string;
  isLoading?: boolean;
  onRowClick?: (item: T) => void;
}

function TableView<T>({
  data,
  columns,
  emptyMessage = 'No data available',
  isLoading = false,
  onRowClick,
}: TableViewProps<T>) {
  const accessor = (item: T, key: string) => {
    const keys = key.split('.');
    let value: any = item;
    
    for (const k of keys) {
      if (value === null || value === undefined) return null;
      value = value[k as keyof typeof value];
    }
    
    return value;
  };

  if (isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-primary-600 rounded-full animate-spin"></div>
          <p className="text-gray-500">Loading data...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full min-h-[150px] flex items-center justify-center border border-gray-200 rounded-md bg-gray-50">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item, rowIndex) => (
            <tr
              key={rowIndex}
              className={cn("transition-colors", onRowClick && "hover:bg-gray-50 cursor-pointer")}
              onClick={() => onRowClick && onRowClick(item)}
            >
              {columns.map((column, colIndex) => (
                <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {column.cell 
                    ? column.cell(item) 
                    : accessor(item, column.accessorKey as string)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TableView;