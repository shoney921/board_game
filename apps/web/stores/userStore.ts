import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, User } from '@/lib/api'

interface UserState {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
  _hasHydrated: boolean

  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  setHasHydrated: (state: boolean) => void
  createGuestUser: (displayName?: string) => Promise<void>
  updateDisplayName: (displayName: string) => void
  logout: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,
      _hasHydrated: false,

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      createGuestUser: async (displayName?: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.createGuestUser(displayName)
          set({
            user: {
              id: response.user.id,
              username: response.user.username,
              displayName: displayName || response.user.display_name,
              isGuest: response.user.is_guest,
              isActive: response.user.is_active,
              createdAt: response.user.created_at,
            } as User,
            token: response.access_token,
            isLoading: false,
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '게스트 유저 생성 실패',
            isLoading: false,
          })
        }
      },

      updateDisplayName: (displayName: string) => {
        set((state) => ({
          user: state.user ? { ...state.user, displayName } : null,
        }))
      },

      logout: () => {
        set({ user: null, token: null })
      },
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
