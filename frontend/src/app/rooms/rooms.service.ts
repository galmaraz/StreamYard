import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../core/api.config';
import { Room } from '../core/models';

@Injectable({ providedIn: 'root' })
export class RoomsService {
  constructor(private readonly http: HttpClient) {}

  createRoom(title: string, isPrivate = false): Observable<Room> {
    return this.http.post<Room>(`${API_BASE_URL}/rooms`, { title, isPrivate });
  }

  getRooms(): Observable<Room[]> {
    return this.http.get<Room[]>(`${API_BASE_URL}/rooms`);
  }

  getRoom(slug: string): Observable<Room> {
    return this.http.get<Room>(`${API_BASE_URL}/rooms/${slug}`);
  }

  getInviteRoom(slug: string): Observable<Room> {
    return this.http.get<Room>(`${API_BASE_URL}/rooms/invite/${slug}`);
  }

  endRoom(id: string): Observable<Room> {
    return this.http.post<Room>(`${API_BASE_URL}/rooms/${id}/end`, {});
  }
}
