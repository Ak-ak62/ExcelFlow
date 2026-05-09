import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ExcelStateService {
  get fileId(): string {
    return localStorage.getItem('excelFileId') || '';
  }
  set fileId(val: string) {
    localStorage.setItem('excelFileId', val);
  }

  get fileName(): string {
    return localStorage.getItem('excelFileName') || '';
  }
  set fileName(val: string) {
    localStorage.setItem('excelFileName', val);
  }

  get sheetName(): string {
    return localStorage.getItem('excelSheetName') || '';
  }
  set sheetName(val: string) {
    localStorage.setItem('excelSheetName', val);
  }

  get sheetNames(): string[] {
    const stored = localStorage.getItem('excelSheetNames');
    return stored ? JSON.parse(stored) : [];
  }
  set sheetNames(val: string[]) {
    localStorage.setItem('excelSheetNames', JSON.stringify(val));
  }

  clear(): void {
    localStorage.removeItem('excelFileId');
    localStorage.removeItem('excelFileName');
    localStorage.removeItem('excelSheetName');
    localStorage.removeItem('excelSheetNames');
  }
}