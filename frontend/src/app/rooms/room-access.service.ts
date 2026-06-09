import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RoomAccessService {
  private readonly keyPrefix = 'weblive2026.roomAccess.';

  setAccessCode(slug: string, accessCode: string): void {
    sessionStorage.setItem(this.storageKey(slug), accessCode.trim());
  }

  getAccessCode(slug: string): string | undefined {
    return sessionStorage.getItem(this.storageKey(slug)) ?? undefined;
  }

  clearAccessCode(slug: string): void {
    sessionStorage.removeItem(this.storageKey(slug));
  }

  private storageKey(slug: string): string {
    return `${this.keyPrefix}${slug}`;
  }
}
