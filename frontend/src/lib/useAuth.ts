import { useQuery, useQueryClient } from '@tanstack/react-query'

import { checkAuth } from '@/boot/axios'
import {
  clearAuth as clearFlag,
  isAuthenticated as hasFlag,
  markAuthenticated as setFlag,
} from '@/lib/auth'

export const AUTH_QUERY_KEY = ['auth', 'check'] as const

type AuthState = {
  isAuthenticated: boolean
  isResolving: boolean
  isRevalidating: boolean
}

export function useAuth(): AuthState {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      try {
        await checkAuth()
        setFlag()
        return true
      } catch {
        clearFlag()
        return false
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    initialData: hasFlag() ? true : undefined,
  })

  return {
    isAuthenticated: data === true,
    isResolving: data === undefined && isLoading,
    isRevalidating: isFetching,
  }
}

export function useAuthActions() {
  const queryClient = useQueryClient()

  return {
    markAuthenticated() {
      setFlag()
      queryClient.setQueryData(AUTH_QUERY_KEY, true)
    },
    clearAuthenticated() {
      clearFlag()
      queryClient.setQueryData(AUTH_QUERY_KEY, false)
    },
  }
}
