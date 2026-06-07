import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../core/api.config';
import { RoomMessage } from '../core/models';

@Injectable({ providedIn: 'root' })
export class ChatService {
  constructor(private readonly http: HttpClient) {}

  getRecentMessages(slug: string): Observable<RoomMessage[]> {
    return this.http.get<RoomMessage[]>(
      `${API_BASE_URL}/rooms/${slug}/chat/messages`,
    );
  }
}
