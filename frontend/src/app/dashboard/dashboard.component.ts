import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../auth/auth.service';
import { Room, User } from '../core/models';
import { RoomsService } from '../rooms/rooms.service';

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  protected user = signal<User | null>(null);
  protected rooms = signal<Room[]>([]);
  protected title = '';
  protected copiedRoomId = signal<string | null>(null);
  protected error = signal<string | null>(null);
  protected loading = signal(false);

  constructor(
    private readonly authService: AuthService,
    private readonly roomsService: RoomsService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.authService.loadProfile().subscribe({
      next: (user) => this.user.set(user),
      error: () => void this.router.navigateByUrl('/auth'),
    });
    this.loadRooms();
  }

  protected createRoom(): void {
    if (!this.title.trim()) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.roomsService.createRoom(this.title.trim()).subscribe({
      next: (room) => {
        this.title = '';
        this.rooms.set([room, ...this.rooms()]);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo crear la sala.');
        this.loading.set(false);
      },
    });
  }

  protected logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/auth');
  }

  protected inviteUrl(room: Room): string {
    return `${window.location.origin}${room.invitationPath}`;
  }

  protected watchUrl(room: Room): string {
    return `${window.location.origin}${room.watchPath}`;
  }

  protected async copyInvite(room: Room): Promise<void> {
    const inviteUrl = this.inviteUrl(room);

    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      this.copyWithFallback(inviteUrl);
    }

    this.copiedRoomId.set(room.id);
    setTimeout(() => {
      if (this.copiedRoomId() === room.id) {
        this.copiedRoomId.set(null);
      }
    }, 1800);
  }

  protected async copyWatch(room: Room): Promise<void> {
    const watchUrl = this.watchUrl(room);

    try {
      await navigator.clipboard.writeText(watchUrl);
    } catch {
      this.copyWithFallback(watchUrl);
    }

    this.copiedRoomId.set(`${room.id}:watch`);
    setTimeout(() => {
      if (this.copiedRoomId() === `${room.id}:watch`) {
        this.copiedRoomId.set(null);
      }
    }, 1800);
  }

  protected endRoom(room: Room): void {
    if (room.status === 'ended') {
      return;
    }

    this.roomsService.endRoom(room.id).subscribe({
      next: (updatedRoom) => {
        this.rooms.set(
          this.rooms().map((current) =>
            current.id === updatedRoom.id ? updatedRoom : current,
          ),
        );
      },
      error: () => this.error.set('No se pudo finalizar la sala.'),
    });
  }

  protected roomStatusLabel(room: Room): string {
    return room.status === 'active' ? 'Activa' : 'Finalizada';
  }

  protected roomDate(room: Room): string {
    return new Intl.DateTimeFormat('es-BO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(room.createdAt));
  }

  private copyWithFallback(value: string): void {
    const textArea = document.createElement('textarea');

    textArea.value = value;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }

  private loadRooms(): void {
    this.roomsService.getRooms().subscribe({
      next: (rooms) => this.rooms.set(rooms),
      error: () => this.error.set('No se pudieron cargar las salas.'),
    });
  }
}
