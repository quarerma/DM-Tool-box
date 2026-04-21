import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios'
import { get as kvGet, set as kvSet } from 'idb-keyval'

export const API_URL = import.meta.env.VITE_API_URL

let currentPageName = 'Unknown Page'

type ApiResponseWithVerification = AxiosResponse<{
  requiresDeviceVerification?: boolean
}>

type RedirectAwareError = Error & {
  redirected?: boolean
}

export function setCurrentPageHeader(pageName: string) {
  currentPageName = pageName || 'Unknown Page'
}

export async function getDeviceId() {
  let deviceId = await kvGet<string>('device_id')
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    await kvSet('device_id', deviceId)
  }
  return deviceId
}

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 2_000_000,
  withCredentials: true,
})

axiosInstance.interceptors.request.use(async (config) => {
  const headers = config.headers

  headers['x-page'] = currentPageName
  headers['x-device-id'] = await getDeviceId()

  if (config.data instanceof FormData) {
    delete headers['Content-Type']
  } else if (!headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  return config
})

axiosInstance.interceptors.response.use(
  async (response) => response,
  async (error: AxiosError<{ message?: string }>) => {
    if (!error.response) return Promise.reject(error)

    const { status, data } = error.response

    if (status === 307 && typeof data?.message === 'string') {
      try {
        const parsed = JSON.parse(data.message) as { user_id?: string }
        if (parsed.user_id) {
          localStorage.setItem('pending_user_id', parsed.user_id)
          window.location.assign('/register-device')

          return Promise.resolve({
            data: { requiresDeviceVerification: true },
            status: 200,
            statusText: 'OK',
            headers: {},
            config: error.config ?? ({} as AxiosRequestConfig),
          } as ApiResponseWithVerification)
        }
      } catch {
        // Ignore parse errors and continue default rejection.
      }
    }

    return Promise.reject(error)
  },
)

export default axiosInstance

export async function login(
  email: string,
  password: string,
  turnstileToken: string | null = null,
) {
  const response = await axiosInstance.post('/auth/login', {
    email,
    password,
    turnstileToken,
  })

  if (response.data.requiresDeviceVerification) {
    const redirectError: RedirectAwareError = new Error(
      'Device verification required',
    )
    redirectError.redirected = true
    throw redirectError
  }

  return response
}

export async function get<T = unknown>(
  endpoint: string,
  options: AxiosRequestConfig = {},
) {
  return axiosInstance.get<T>(endpoint, options)
}

export async function post<T = unknown>(
  endpoint: string,
  data: unknown,
  options: AxiosRequestConfig = {},
) {
  return axiosInstance.post<T>(endpoint, data, options)
}

export async function put<T = unknown>(
  endpoint: string,
  data: unknown,
  options: AxiosRequestConfig = {},
) {
  return axiosInstance.put<T>(endpoint, data, options)
}

export async function patch<T = unknown>(
  endpoint: string,
  data: unknown,
  options: AxiosRequestConfig = {},
) {
  return axiosInstance.patch<T>(endpoint, data, options)
}

export async function axiosDelete<T = unknown>(
  endpoint: string,
  data: unknown = {},
  options: AxiosRequestConfig = {},
) {
  return axiosInstance.delete<T>(endpoint, {
    ...options,
    data,
  })
}

export async function postNoHeader<T = unknown>(
  endpoint: string,
  data: unknown,
  options: AxiosRequestConfig = {},
) {
  return axiosInstance.post<T>(endpoint, data, options)
}

export async function register(name: string, email: string, password: string) {
  return axiosInstance.post('/auth/register', { name, email, password })
}

export async function verifyDevice(userId: number, code: string) {
  return axiosInstance.post('/auth/verify-device', { user_id: userId, code })
}

export async function logout() {
  return axiosInstance.post('/auth/logout', {})
}

export async function checkAuth() {
  return axiosInstance.get('/auth/check')
}
