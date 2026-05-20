import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { AuthResponse, LoginInput, RegisterInput } from '@rocket/contracts';

async function registerUser(data: RegisterInput): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/register', data);
  return res.data;
}

async function loginUser(data: LoginInput): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/login', data);
  return res.data;
}

export function useRegisterMutation() {
  return useMutation({ mutationFn: registerUser });
}

export function useLoginMutation() {
  return useMutation({ mutationFn: loginUser });
}
