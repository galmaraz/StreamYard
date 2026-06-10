import { Routes } from '@angular/router';

import { AuthComponent } from './auth/auth.component';
import { BroadcastViewComponent } from './broadcast/broadcast-view.component';
import { authGuard } from './core/auth.guard';
import { ConferenceComponent } from './conference/conference.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { JoinRoomComponent } from './join/join-room.component';
import { UsersAdminComponent } from './users/users-admin.component';

export const routes: Routes = [
  {
    path: 'auth',
    component: AuthComponent,
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
  },
  {
    path: 'join/:slug',
    component: JoinRoomComponent,
  },
  {
    path: 'watch/:slug',
    component: BroadcastViewComponent,
  },
  {
    path: 'conference/:slug',
    component: ConferenceComponent,
    canActivate: [authGuard],
  },
  {
    path: 'users',
    component: UsersAdminComponent,
    canActivate: [authGuard],
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'auth',
  },
];
