import { Injectable, signal } from '@angular/core';

const TOKEN_KEY = 'weblive2026.accessToken';

@Injectable({ providedIn: 'root' })
export class AuthTokenService {
  private readonly tokenState = signal<string | null>(this.readToken());
  readonly token = this.tokenState.asReadonly();

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this.tokenState.set(token);
  }

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.tokenState.set(null);
  }

  getToken(): string | null {
    return this.tokenState();
  }

  private readToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }
}
