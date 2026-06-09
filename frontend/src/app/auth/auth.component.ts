import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from './auth.service';

@Component({
  selector: 'app-auth',
  imports: [FormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss',
})
export class AuthComponent {
  protected mode = signal<'login' | 'register'>('login');
  protected loading = signal(false);
  protected error = signal<string | null>(null);
  protected form = {
    email: '',
    password: '',
    displayName: '',
  };

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  protected submit(): void {
    this.loading.set(true);
    this.error.set(null);

    const request =
      this.mode() === 'login'
        ? this.authService.login({
            email: this.form.email,
            password: this.form.password,
          })
        : this.authService.register({
            email: this.form.email,
            password: this.form.password,
            displayName: this.form.displayName,
          });

    request.subscribe({
      next: () => void this.router.navigateByUrl('/dashboard'),
      error: () => {
        this.error.set('No se pudo autenticar. Revisa tus datos.');
        this.loading.set(false);
      },
    });
  }

  protected switchMode(mode: 'login' | 'register'): void {
    this.mode.set(mode);
    this.error.set(null);
  }
}
