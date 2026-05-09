import { Routes } from '@angular/router';
import { LoginComponent } from './components/auth/login/login';
import { SignupComponent } from './components/auth/signup/signup';
import { UploadComponent } from './components/upload/upload';
import { SheetDataComponent } from './components/sheet-data/sheet-data';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'upload', component: UploadComponent, canActivate: [authGuard] },
  { path: 'sheet-data', component: SheetDataComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];