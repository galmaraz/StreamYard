import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../core/api.config';
import { User, UserRole } from '../core/models';

export type CreateUserPayload = {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  isActive?: boolean;
};

export type UpdateUserPayload = Partial<CreateUserPayload>;

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private readonly http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${API_BASE_URL}/users`);
  }

  createUser(payload: CreateUserPayload): Observable<User> {
    return this.http.post<User>(`${API_BASE_URL}/users`, payload);
  }

  updateUser(id: string, payload: UpdateUserPayload): Observable<User> {
    return this.http.patch<User>(`${API_BASE_URL}/users/${id}`, payload);
  }

  deactivateUser(id: string): Observable<User> {
    return this.http.patch<User>(`${API_BASE_URL}/users/${id}/deactivate`, {});
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/users/${id}`);
  }
}
