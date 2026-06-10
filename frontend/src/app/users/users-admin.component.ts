import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../auth/auth.service';
import { User, UserRole } from '../core/models';
import { CreateUserPayload, UsersService } from './users.service';

type UserForm = {
  id: string | null;
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
};

const emptyForm = (): UserForm => ({
  id: null,
  email: '',
  password: '',
  displayName: '',
  role: 'host',
  isActive: true,
});

@Component({
  selector: 'app-users-admin',
  imports: [FormsModule, RouterLink],
  templateUrl: './users-admin.component.html',
  styleUrl: './users-admin.component.scss',
})
export class UsersAdminComponent implements OnInit {
  protected users = signal<User[]>([]);
  protected currentUser = signal<User | null>(null);
  protected form: UserForm = emptyForm();
  protected loading = signal(false);
  protected error = signal<string | null>(null);
  protected editing = computed(() => Boolean(this.form.id));
  protected activeUsers = computed(
    () => this.users().filter((user) => user.isActive).length,
  );
  protected inactiveUsers = computed(() => this.users().length - this.activeUsers());
  protected roles: UserRole[] = ['admin', 'host', 'viewer'];

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly usersService: UsersService,
  ) {}

  ngOnInit(): void {
    this.authService.loadProfile().subscribe({
      next: (user) => {
        this.currentUser.set(user);

        if (user.role !== 'admin') {
          void this.router.navigateByUrl('/dashboard');
          return;
        }

        this.loadUsers();
      },
      error: () => void this.router.navigateByUrl('/auth'),
    });
  }

  protected submit(): void {
    if (!this.form.email || !this.form.displayName || (!this.editing() && !this.form.password)) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const request = this.form.id
      ? this.usersService.updateUser(this.form.id, {
          email: this.form.email,
          password: this.form.password || undefined,
          displayName: this.form.displayName,
          role: this.form.role,
          isActive: this.form.isActive,
        })
      : this.usersService.createUser(this.toCreatePayload());

    request.subscribe({
      next: (user) => {
        this.upsertUser(user);
        this.resetForm();
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo guardar el usuario.');
        this.loading.set(false);
      },
    });
  }

  protected editUser(user: User): void {
    this.form = {
      id: user.id,
      email: user.email,
      password: '',
      displayName: user.displayName,
      role: user.role,
      isActive: user.isActive,
    };
  }

  protected deactivateUser(user: User): void {
    if (this.currentUser()?.id === user.id) {
      this.error.set('No puedes desactivar tu propio usuario desde esta pantalla.');
      return;
    }

    this.usersService.deactivateUser(user.id).subscribe({
      next: (updatedUser) => this.upsertUser(updatedUser),
      error: () => this.error.set('No se pudo desactivar el usuario.'),
    });
  }

  protected activateUser(user: User): void {
    this.usersService.updateUser(user.id, { isActive: true }).subscribe({
      next: (updatedUser) => this.upsertUser(updatedUser),
      error: () => this.error.set('No se pudo activar el usuario.'),
    });
  }

  protected deleteUser(user: User): void {
    if (this.currentUser()?.id === user.id) {
      this.error.set('No puedes eliminar tu propio usuario desde esta pantalla.');
      return;
    }

    const confirmed = window.confirm(
      `Eliminar definitivamente a ${user.displayName}? Esta accion no se puede deshacer.`,
    );

    if (!confirmed) {
      return;
    }

    this.usersService.deleteUser(user.id).subscribe({
      next: () => {
        this.users.set(this.users().filter((current) => current.id !== user.id));

        if (this.form.id === user.id) {
          this.resetForm();
        }
      },
      error: () => this.error.set('No se pudo eliminar el usuario.'),
    });
  }

  protected roleLabel(role: UserRole): string {
    const labels: Record<UserRole, string> = {
      admin: 'Admin',
      host: 'Host',
      guest: 'Invitado',
      viewer: 'Viewer',
    };

    return labels[role];
  }

  protected userDate(user: User): string {
    return new Intl.DateTimeFormat('es-BO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(user.createdAt));
  }

  protected resetForm(): void {
    this.form = emptyForm();
    this.error.set(null);
  }

  private loadUsers(): void {
    this.usersService.getUsers().subscribe({
      next: (users) => this.users.set(users),
      error: () => this.error.set('No se pudieron cargar usuarios.'),
    });
  }

  private toCreatePayload(): CreateUserPayload {
    return {
      email: this.form.email,
      password: this.form.password,
      displayName: this.form.displayName,
      role: this.form.role,
      isActive: this.form.isActive,
    };
  }

  private upsertUser(user: User): void {
    const users = this.users();

    if (users.some(({ id }) => id === user.id)) {
      this.users.set(users.map((current) => (current.id === user.id ? user : current)));
      return;
    }

    this.users.set([user, ...users]);
  }
}
