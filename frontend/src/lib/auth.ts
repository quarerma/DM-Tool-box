const AUTH_TOKEN_KEY = 'auth_token'

export function isAuthenticated(): boolean {
  return Boolean(localStorage.getItem(AUTH_TOKEN_KEY))
}
