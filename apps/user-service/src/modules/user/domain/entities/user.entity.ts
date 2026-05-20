export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  passwordHash: string;
  createdAt: Date;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
}
