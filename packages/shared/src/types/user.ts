export interface User {
  id: number
  username: string
  displayName: string
  email?: string
  avatarUrl?: string
  isGuest: boolean
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

export interface UserInRoom {
  id: number
  username: string
  displayName: string
  avatarUrl?: string
  isReady: boolean
  isHost: boolean
}

export interface CreateUserDTO {
  username: string
  displayName: string
  email?: string
  password?: string
  isGuest?: boolean
}

export interface UpdateUserDTO {
  displayName?: string
  avatarUrl?: string
}
