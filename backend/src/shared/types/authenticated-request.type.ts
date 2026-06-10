import { Request } from 'express';

export type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email: string;
    displayName: string;
    role: string;
  };
};
