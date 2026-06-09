import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../core/api.config';
import { Participant } from '../core/models';

@Injectable({ providedIn: 'root' })
export class ParticipantsApiService {
  constructor(private readonly http: HttpClient) {}

  getActiveParticipants(slug: string): Observable<Participant[]> {
    return this.http.get<Participant[]>(
      `${API_BASE_URL}/rooms/${slug}/participants`,
    );
  }
}
