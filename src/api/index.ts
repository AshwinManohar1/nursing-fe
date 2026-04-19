import client from './client'
import type { LoginResponse, LoginRequest } from './types'

export async function login(employee_id: string, password: string): Promise<LoginResponse> {
  const { data } = await client.post<LoginResponse>('/api/v1/auth/login', {
    employee_id,
    password,
  } satisfies LoginRequest)
  return data
}

export async function logout(): Promise<void> {
  await client.post('/api/v1/auth/logout')
}

export { default as client } from './client'
