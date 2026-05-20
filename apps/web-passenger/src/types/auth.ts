export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'PASSENGER' | 'DRIVER';
}

export interface AuthState {
  accessToken: string;
  user: AuthUser;
}
