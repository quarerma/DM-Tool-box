const AUTH_FLAG_KEY = 'auth_token'

export function isAuthenticated(): boolean {
  return Boolean(localStorage.getItem(AUTH_FLAG_KEY))
}

export function markAuthenticated() {
  localStorage.setItem(AUTH_FLAG_KEY, '1')
}

export function clearAuth() {
  localStorage.removeItem(AUTH_FLAG_KEY)
}
