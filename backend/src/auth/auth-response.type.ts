import { UserResponse } from '../users/user-response.type';

export type AuthResponse = {
  accessToken: string;
  user: UserResponse;
};
