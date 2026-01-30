import { UserInRoom } from './user'

export type RoomStatus = 'waiting' | 'in_game' | 'finished'

export interface Room {
  id: number
  code: string
  name: string
  hostId: number
  gameType: string
  maxPlayers: number
  minPlayers: number
  status: RoomStatus
  players?: UserInRoom[]
  createdAt: string
  updatedAt?: string
}

export interface CreateRoomDTO {
  name: string
  gameType: string
  maxPlayers?: number
  minPlayers?: number
}

export interface JoinRoomDTO {
  code: string
}
