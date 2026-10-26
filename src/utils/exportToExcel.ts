import * as XLSX from 'xlsx';

export interface ExcelColumn<T> {
  header: string;
  key?: keyof T;
  formatter?: (item: T, index: number) => string | number;
  width?: number;
}

export function exportTableToExcel<T>(
  data: T[],
  columns: ExcelColumn<T>[],
  fileName: string,
  sheetName: string = 'گزارش'
) {
  try {
    // 1. Build header row
    const headers = columns.map((col) => col.header);

    // 2. Build data rows
    const rows = data.map((item, idx) => {
      return columns.map((col) => {
        if (col.formatter) {
          return col.formatter(item, idx);
        }
        if (col.key && item[col.key] !== undefined && item[col.key] !== null) {
          return item[col.key] as any;
        }
        return '';
      });
    });

    const aoa = [headers, ...rows];

    // 3. Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Set column widths
    ws['!cols'] = columns.map((col) => ({
      wch: col.width || Math.max(col.header.length * 2, 14),
    }));

    // Enable Right-to-Left (RTL) for Persian text
    if (!ws['!views']) {
      ws['!views'] = [];
    }
    ws['!views'].push({ RTL: true });

    // 4. Create workbook and append sheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

    // 5. Trigger download
    const cleanFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
    XLSX.writeFile(wb, cleanFileName);
  } catch (error) {
    console.error('Failed to export to Excel:', error);
  }
}
