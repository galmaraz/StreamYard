import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthTokenService } from './auth-token.service';

export const authGuard: CanActivateFn = () => {
  const token = inject(AuthTokenService).getToken();

  if (token) {
    return true;
  }

  return inject(Router).createUrlTree(['/auth']);
};
