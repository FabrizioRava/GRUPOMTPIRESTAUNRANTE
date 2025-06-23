import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { noAuthGuard } from '../../guards/no-auth.guard';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [noAuthGuard] 
  },
  {
    path: 'register',
    component: RegisterComponent,
    canActivate: [noAuthGuard] 
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' } 
];