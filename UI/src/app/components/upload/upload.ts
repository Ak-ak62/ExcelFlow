import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExcelApiService } from '../../services/excel-api';
import { ExcelStateService } from '../../services/excel-state';
import { AuthService } from '../../services/auth';
import { ExcelFileInfo } from '../../models/excel';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './upload.html',
  styleUrl: './upload.css'
})
export class UploadComponent implements OnInit {
  myFiles: ExcelFileInfo[] = [];
  selectedFile: ExcelFileInfo | null = null;
  sheetNames: string[] = [];
  selectedSheet = '';
  uploading = false;
  loadingSheets = false;
  errorMessage = '';
  dragOver = false;
  username = '';

  constructor(
    private router: Router,
    private excelApi: ExcelApiService,
    public excelState: ExcelStateService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.username = this.authService.getUsername();
    this.loadMyFiles();

    // Restore previously selected file
    const savedFileId = this.excelState.fileId;
    const savedSheetNames = this.excelState.sheetNames;
    if (savedFileId && savedSheetNames.length) {
      this.sheetNames = savedSheetNames;
    }
  }

  loadMyFiles(): void {
    this.excelApi.getMyFiles().subscribe({
      next: (files) => {
        this.myFiles = files;
        const savedId = this.excelState.fileId;
        if (savedId) {
          this.selectedFile = files.find(f => f._id === savedId) || null;
        }
      },
      error: () => { this.errorMessage = 'Failed to load your files.'; }
    });
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.uploadFile(input.files[0]);
      input.value = '';
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
    const file = event.dataTransfer?.files[0];
    if (file) this.uploadFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = true;
  }

  onDragLeave(): void {
    this.dragOver = false;
  }

  uploadFile(file: File): void {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (!allowedTypes.includes(file.type)) {
      this.errorMessage = 'Only .xlsx and .xls files are accepted.';
      return;
    }

    this.errorMessage = '';
    this.uploading = true;
    this.sheetNames = [];
    this.selectedSheet = '';

    this.excelApi.uploadFile(file).subscribe({
      next: (res) => {
        this.uploading = false;
        this.excelState.fileId = res.fileId;
        this.excelState.fileName = res.fileName;
        this.excelState.sheetNames = res.sheetNames;
        this.sheetNames = res.sheetNames;
        this.loadMyFiles();
      },
      error: (err: any) => {
        this.uploading = false;
        this.errorMessage = err.error?.message || 'Upload failed. Please try again.';
      }
    });
  }

  selectExistingFile(file: ExcelFileInfo): void {
    this.errorMessage = '';
    this.selectedFile = file;
    this.loadingSheets = true;
    this.selectedSheet = '';

    this.excelApi.getSheets(file._id).subscribe({
      next: (res) => {
        this.loadingSheets = false;
        this.excelState.fileId = res.fileId;
        this.excelState.fileName = res.fileName;
        this.excelState.sheetNames = res.sheetNames;
        this.sheetNames = res.sheetNames;
      },
      error: () => {
        this.loadingSheets = false;
        this.errorMessage = 'Failed to load file sheets.';
      }
    });
  }

  onSheetSelect(sheetName: string): void {
    if (!sheetName) return;
    this.excelState.sheetName = sheetName;
    this.router.navigate(['/sheet-data']);
  }

  deleteFile(file: ExcelFileInfo, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Delete "${file.fileName}"? This cannot be undone.`)) return;

    this.excelApi.deleteFile(file._id).subscribe({
      next: () => {
        this.myFiles = this.myFiles.filter(f => f._id !== file._id);
        if (this.excelState.fileId === file._id) {
          this.excelState.clear();
          this.sheetNames = [];
          this.selectedFile = null;
        }
      },
      error: () => { this.errorMessage = 'Failed to delete file.'; }
    });
  }

  logOut(): void {
    this.authService.logOut();
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }
}