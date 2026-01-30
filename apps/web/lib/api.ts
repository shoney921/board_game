const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface RequestOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  if (body) {
    config.body = JSON.stringify(body)
  }

  const response = await fetch(`${API_URL}${endpoint}`, config)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export const api = {
  // Users
  createGuestUser: (displayName?: string) =>
    request<{ user: User; access_token: string }>('/api/v1/users/guest', {
      method: 'POST',
      body: displayName ? { display_name: displayName } : undefined,
    }),

  getUser: (id: number) =>
    request<User>(`/api/v1/users/${id}`),

  // Rooms
  createRoom: (data: CreateRoomData, hostId: number) =>
    request<Room>(`/api/v1/rooms/?host_id=${hostId}`, {
      method: 'POST',
      body: {
        name: data.name,
        game_type: data.gameType,
        max_players: data.maxPlayers,
        min_players: data.minPlayers,
      }
    }),

  getRoom: (id: number) =>
    request<Room>(`/api/v1/rooms/${id}`),

  getRoomByCode: (code: string) =>
    request<Room>(`/api/v1/rooms/code/${code}`),

  joinRoom: (code: string) =>
    request<Room>('/api/v1/rooms/join', { method: 'POST', body: { code } }),

  // Games
  createGame: (data: CreateGameData) =>
    request<Game>('/api/v1/games/', {
      method: 'POST',
      body: {
        room_id: data.roomId,
        game_type: data.gameType,
      },
    }),

  getGame: (id: number) =>
    request<Game>(`/api/v1/games/${id}`),

  getCurrentGame: (roomId: number) =>
    request<Game>(`/api/v1/games/room/${roomId}/current`),

  // Health
  healthCheck: () =>
    request<{ status: string }>('/health'),
}

// Types
export interface User {
  id: number
  username: string
  displayName: string
  email?: string
  avatarUrl?: string
  isGuest: boolean
  isActive: boolean
  createdAt: string
}

export interface Room {
  id: number
  code: string
  name: string
  hostId: number
  gameType: string
  maxPlayers: number
  minPlayers: number
  status: string
  createdAt: string
  players?: PlayerInRoom[]
}

export interface PlayerInRoom {
  id: number
  username: string
  displayName: string
  avatarUrl?: string
  isReady: boolean
  isHost: boolean
}

export interface Game {
  id: number
  roomId: number
  gameType: string
  status: string
  currentRound: number
  winnerTeam?: string
  startedAt?: string
  finishedAt?: string
  createdAt: string
}

export interface CreateRoomData {
  name: string
  gameType: string
  maxPlayers?: number
  minPlayers?: number
}

export interface CreateGameData {
  roomId: number
  gameType: string
}
