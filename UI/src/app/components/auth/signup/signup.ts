import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [RouterModule, ReactiveFormsModule, CommonModule, MatIconModule],
  templateUrl: './signup.html',
  styleUrl: './signup.css'
})
export class SignupComponent {
  signupForm: FormGroup;
  otpForm: FormGroup;
  loading = false;
  submitted = false;
  otpSubmitted = false;
  showOtpStep = false;
  pendingEmail = '';
  errorMessage = '';
  successMessage = '';
  resendCooldown = 0;
  private cooldownTimer: any;
  showPassword = false;
  showConfirmPassword = false;

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {
    this.signupForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });
  }

  get f() { return this.signupForm.controls; }
  get fo() { return this.otpForm.controls; }

  passwordMatchValidator(form: AbstractControl) {
    const pw = form.get('password')?.value;
    const cpw = form.get('confirmPassword')?.value;
    if (cpw && pw !== cpw) {
      form.get('confirmPassword')?.setErrors({ mismatch: true });
    }
    return null;
  }

  checkUsername(): void {
    const control = this.signupForm.get('username');
    if (!control || control.invalid) return;
    this.authService.checkUsername(control.value).subscribe({
      next: (res) => { if (res.exists) control.setErrors({ exists: true }); },
      error: () => {}
    });
  }

  checkEmail(): void {
    const control = this.signupForm.get('email');
    if (!control || control.invalid) return;
    this.authService.checkEmail(control.value).subscribe({
      next: (res) => { if (res.exists) control.setErrors({ exists: true }); },
      error: () => {}
    });
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';
    if (this.signupForm.invalid) return;

    this.loading = true;
    const { username, email, password } = this.signupForm.value;

    this.authService.signup({ username, email, password }).subscribe({
      next: () => {
        this.loading = false;
        this.pendingEmail = email;
        this.showOtpStep = true;
        this.startResendCooldown();
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Signup failed. Please try again.';
      }
    });
  }

  onVerifyOtp(): void {
    this.otpSubmitted = true;
    this.errorMessage = '';
    if (this.otpForm.invalid) return;

    this.loading = true;
    this.authService.verifyOtp({ email: this.pendingEmail, otp: this.otpForm.value.otp }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/upload']);
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Invalid OTP. Please try again.';
      }
    });
  }

  resendOtp(): void {
    if (this.resendCooldown > 0) return;
    this.errorMessage = '';
    this.authService.resendOtp(this.pendingEmail).subscribe({
      next: () => {
        this.successMessage = 'OTP resent successfully.';
        this.startResendCooldown();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err: any) => {
        this.errorMessage = err.error?.message || 'Failed to resend OTP.';
      }
    });
  }

  private startResendCooldown(): void {
    this.resendCooldown = 60;
    clearInterval(this.cooldownTimer);
    this.cooldownTimer = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) clearInterval(this.cooldownTimer);
    }, 1000);
  }
}