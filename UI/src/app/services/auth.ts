import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/users';

  constructor(private http: HttpClient, private router: Router) {}

  signup(data: { username: string; email: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/signup`, data);
  }

  verifyOtp(data: { email: string; otp: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-otp`, data).pipe(
      tap((res: any) => {
        const expiresAt = Date.now() + 60 * 60 * 1000;
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', res.user.username);
        localStorage.setItem('expiresAt', expiresAt.toString());
      })
    );
  }

  resendOtp(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/resend-otp`, { email });
  }

  login(data: { username: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, data).pipe(
      tap((res: any) => {
        const expiresAt = Date.now() + 60 * 60 * 1000;
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', res.user.username);
        localStorage.setItem('expiresAt', expiresAt.toString());
      })
    );
  }

  checkUsername(username: string): Observable<{ exists: boolean }> {
    return this.http.get<{ exists: boolean }>(`${this.apiUrl}/check-username/${username}`);
  }

  checkEmail(email: string): Observable<{ exists: boolean }> {
    return this.http.get<{ exists: boolean }>(`${this.apiUrl}/check-email/${encodeURIComponent(email)}`);
  }

  isLoggedIn(): boolean {
    const token = localStorage.getItem('token');
    const expiresAt = localStorage.getItem('expiresAt');
    if (!token || !expiresAt) {
      this.logOut();
      return false;
    }
    if (Date.now() >= Number(expiresAt)) {
      this.logOut();
      return false;
    }
    return true;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUsername(): string {
    return localStorage.getItem('user') || '';
  }

  logOut(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('expiresAt');
    localStorage.removeItem('excelFileId');
    localStorage.removeItem('excelFileName');
    localStorage.removeItem('excelSheetName');
    localStorage.removeItem('excelSheetNames');
    this.router.navigate(['/']);
  }
}