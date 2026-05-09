export interface ExcelFileInfo {
  _id: string;
  fileName: string;
  uploadedAt: string;
}

export interface SheetData {
  sheetName: string;
  headers: string[];
  rows: any[];
}