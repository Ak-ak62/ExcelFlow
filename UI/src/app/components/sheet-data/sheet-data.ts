import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ExcelApiService } from '../../services/excel-api';
import { ExcelStateService } from '../../services/excel-state';
import { AuthService } from '../../services/auth';

interface RowWithMeta {
  _rowIndex: number;
  isExpired: boolean;
  showCounter: boolean;
  daysLeft: number | null;
  [key: string]: any;
}

@Component({
  selector: 'app-sheet-data',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './sheet-data.html',
  styleUrl: './sheet-data.css'
})
export class SheetDataComponent implements OnInit {
  headers: string[] = [];
  data: RowWithMeta[] = [];
  filteredData: RowWithMeta[] = [];
  searchText = '';
  sheetName = '';
  fileName = '';

  showAddForm = false;
  addForm!: FormGroup;
  addSubmitted = false;
  addLoading = false;
  addError = '';

  loading = true;
  errorMessage = '';

  // Auto-number feature
  isAutoNumberSheet = false;
  autoNumberDocTypeKey = '';
  autoNumberHint = '';

  // Date column keys detected
  startDateKey: string | null = null;
  endDateKey: string | null = null;

  internalKeys = ['_rowIndex', 'isExpired', 'showCounter', 'daysLeft'];

  constructor(
    private router: Router,
    private excelApi: ExcelApiService,
    private excelState: ExcelStateService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    const fileId = this.excelState.fileId;
    const sheetName = this.excelState.sheetName;

    if (!fileId || !sheetName) {
      this.router.navigate(['/upload']);
      return;
    }

    this.sheetName = sheetName;
    this.fileName = this.excelState.fileName;
    this.loadSheetData();
  }

  loadSheetData(): void {
    this.loading = true;
    this.errorMessage = '';

    this.excelApi.getSheetData(this.excelState.fileId, this.sheetName).subscribe({
      next: (res) => {
        this.loading = false;
        this.headers = res.headers;
        this.detectDateColumns(res.headers);
        this.detectAutoNumberSheet(res.headers);
        this.data = res.rows.map((row, i) => this.buildRowMeta(row, i));
        this.filteredData = [...this.data];
        this.processExpiry();
        this.buildAddForm();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Failed to load sheet data. Please go back and try again.';
      }
    });
  }

  private buildRowMeta(row: any, index: number): RowWithMeta {
    return { ...row, _rowIndex: index, isExpired: false, showCounter: false, daysLeft: null };
  }

  private detectDateColumns(headers: string[]): void {
    const norm = (v: string) => v.toLowerCase().replace(/\s/g, '');
    headers.forEach(h => {
      const k = norm(h);
      if (!this.startDateKey && k.includes('start')) this.startDateKey = h;
      if (!this.endDateKey && (k.includes('end') || k.includes('expir'))) this.endDateKey = h;
    });
  }

  private detectAutoNumberSheet(headers: string[]): void {
    const dtKey = headers.find(h => h.toLowerCase().replace(/\s/g, '') === 'documenttype');
    if (dtKey) {
      this.isAutoNumberSheet = true;
      this.autoNumberDocTypeKey = dtKey;
    }
  }

  private parseDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date && !isNaN(value.getTime())) return value;
    const str = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
      const [d, m, y] = str.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    if (str.includes('/')) {
      const parts = str.split('/').map(Number);
      if (parts.length === 3) {
        const y = parts[2] < 100 ? 2000 + parts[2] : parts[2];
        return new Date(y, parts[0] - 1, parts[1]);
      }
    }
    const fallback = new Date(str);
    return isNaN(fallback.getTime()) ? null : fallback;
  }

  formatDate(value: any): string {
    const d = this.parseDate(value);
    if (!d) return value ?? '';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  isDateKey(key: string): boolean {
    return key === this.startDateKey || key === this.endDateKey;
  }

  private processExpiry(): void {
    if (!this.endDateKey) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    this.filteredData.forEach(row => {
      const endVal = row[this.endDateKey!];
      const endDate = this.parseDate(endVal);
      if (!endDate) return;
      endDate.setHours(0, 0, 0, 0);

      const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / 86400000);
      row.isExpired = diffDays < 0;
      row.showCounter = !row.isExpired && diffDays <= 30 && diffDays >= 0;
      row.daysLeft = row.showCounter ? diffDays : null;
    });
  }

  onSearch(): void {
    const text = this.searchText.toLowerCase().trim();
    if (!text) {
      this.filteredData = [...this.data];
    } else {
      this.filteredData = this.data.filter(row =>
        this.headers.some(h => String(row[h] ?? '').toLowerCase().includes(text))
      );
    }
    this.processExpiry();
  }

  buildAddForm(): void {
    const group: any = {};
    this.headers.forEach(h => {
      group[h] = ['', Validators.required];
    });
    this.addForm = this.fb.group(group);
  }

  openAddForm(): void {
    this.showAddForm = true;
    this.addSubmitted = false;
    this.addError = '';
    this.buildAddForm();
    this.autoNumberHint = '';
  }

  onDocTypeChange(value: string): void {
    if (!this.isAutoNumberSheet || !value) return;
    const upper = value.toUpperCase();
    if (upper === 'SOW' || upper === 'CR') {
      this.excelApi.getNextAutoNumber(this.excelState.fileId, this.sheetName, upper).subscribe({
        next: (res) => {
          this.autoNumberHint = `Next available: ${res.nextCode}`;
        },
        error: () => { this.autoNumberHint = ''; }
      });
    } else {
      this.autoNumberHint = '';
    }
  }

  onSubmitAdd(): void {
    this.addSubmitted = true;
    this.addError = '';
    if (this.addForm.invalid) return;

    this.addLoading = true;
    const newRow = { ...this.addForm.value };

    this.excelApi.addRow(this.excelState.fileId, this.sheetName, newRow).subscribe({
      next: (res) => {
        this.addLoading = false;
        const rowWithMeta = this.buildRowMeta(res.row, this.data.length);
        this.data.push(rowWithMeta);
        this.filteredData = [...this.data];
        this.processExpiry();
        this.showAddForm = false;
        this.addForm.reset();
        this.addSubmitted = false;
      },
      error: (err: any) => {
        this.addLoading = false;
        this.addError = err.error?.message || 'Failed to add row.';
      }
    });
  }

  deleteRow(row: RowWithMeta): void {
    if (!confirm('Delete this record? This cannot be undone.')) return;

    this.excelApi.deleteRow(this.excelState.fileId, this.sheetName, row._rowIndex).subscribe({
      next: () => {
        // Remove from data and reindex
        const idx = this.data.findIndex(r => r._rowIndex === row._rowIndex);
        if (idx !== -1) this.data.splice(idx, 1);
        // Reindex remaining rows
        this.data.forEach((r, i) => r._rowIndex = i);
        this.filteredData = this.filteredData.filter(r => r._rowIndex !== row._rowIndex);
        this.onSearch();
      },
      error: () => { alert('Failed to delete row. Please try again.'); }
    });
  }

  displayableHeaders(): string[] {
    return this.headers;
  }

  goBack(): void {
    this.router.navigate(['/upload']);
  }

  logOut(): void {
    this.authService.logOut();
  }
}