import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { API_BASE_URL } from '../core/api.config';
import { AuthResponse, User } from '../core/models';
import { AuthTokenService } from '../core/auth-token.service';

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = LoginPayload & {
  displayName: string;
};

type GuestPayload = {
  displayName: string;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userState = signal<User | null>(null);
  readonly user = this.userState.asReadonly();

  constructor(
    private readonly http: HttpClient,
    private readonly authTokenService: AuthTokenService,
  ) {}

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API_BASE_URL}/auth/login`, payload)
      .pipe(tap((response) => this.persistSession(response)));
  }

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API_BASE_URL}/auth/register`, payload)
      .pipe(tap((response) => this.persistSession(response)));
  }

  guestLogin(payload: GuestPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API_BASE_URL}/auth/guest`, payload)
      .pipe(tap((response) => this.persistSession(response)));
  }

  loadProfile(): Observable<User> {
    return this.http
      .get<User>(`${API_BASE_URL}/auth/me`)
      .pipe(tap((user) => this.userState.set(user)));
  }

  logout(): void {
    this.authTokenService.clearToken();
    this.userState.set(null);
  }

  private persistSession(response: AuthResponse): void {
    this.authTokenService.setToken(response.accessToken);
    this.userState.set(response.user);
  }
}
