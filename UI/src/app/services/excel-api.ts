import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ExcelFileInfo, SheetData } from '../models/excel';

@Injectable({ providedIn: 'root' })
export class ExcelApiService {
  private apiUrl = 'http://localhost:3000/api/excel';

  constructor(private http: HttpClient) {}

  uploadFile(file: File): Observable<{ fileId: string; fileName: string; sheetNames: string[] }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.apiUrl}/upload`, formData);
  }

  getMyFiles(): Observable<ExcelFileInfo[]> {
    return this.http.get<ExcelFileInfo[]>(`${this.apiUrl}/my-files`);
  }

  getSheets(fileId: string): Observable<{ fileId: string; fileName: string; sheetNames: string[] }> {
    return this.http.get<any>(`${this.apiUrl}/${fileId}/sheets`);
  }

  getSheetData(fileId: string, sheetName: string): Observable<SheetData> {
    return this.http.get<SheetData>(`${this.apiUrl}/${fileId}/sheet/${encodeURIComponent(sheetName)}`);
  }

  addRow(fileId: string, sheetName: string, row: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${fileId}/sheet/${encodeURIComponent(sheetName)}/row`, row);
  }

  deleteRow(fileId: string, sheetName: string, rowIndex: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${fileId}/sheet/${encodeURIComponent(sheetName)}/row/${rowIndex}`);
  }

  getNextAutoNumber(fileId: string, sheetName: string, docType: string): Observable<{ nextCode: string; prefix: string; nextNum: number }> {
    return this.http.get<any>(`${this.apiUrl}/${fileId}/sheet/${encodeURIComponent(sheetName)}/autonumber?docType=${docType}`);
  }

  deleteFile(fileId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${fileId}`);
  }
}