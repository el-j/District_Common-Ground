import { request } from '../client';

export interface AuthResponse {
  token: string;
  userId: string;
}

export function register(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('POST', '/api/v1/auth/register', { email, password });
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('POST', '/api/v1/auth/login', { email, password });
}
