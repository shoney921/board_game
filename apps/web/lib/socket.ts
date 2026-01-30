import { io, Socket } from 'socket.io-client'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8000'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    })
  }
  return socket
}

export function connectSocket(auth?: Record<string, unknown>): Socket {
  const s = getSocket()
  if (auth) {
    s.auth = auth
  }
  if (!s.connected) {
    s.connect()
  }
  return s
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect()
  }
}

// Socket event types
export interface JoinRoomData {
  roomId: string
  userId: number
  username: string
  displayName: string
}

export interface LeaveRoomData {
  roomId: string
  userId: number
  username: string
}

export interface ChatMessageData {
  roomId: string
  message: string
}

export interface GameActionData {
  roomId: string
  action: string
  payload: Record<string, unknown>
}

export interface ReadyToggleData {
  roomId: string
  userId: number
  isReady: boolean
}

export interface StartGameData {
  roomId: string
  gameType: string
}

// Incoming events
export interface UserJoinedEvent {
  userId: number
  username: string
  displayName: string
}

export interface UserLeftEvent {
  userId: number
  username: string
}

export interface ChatMessageEvent {
  userId: number
  username: string
  displayName: string
  message: string
}

export interface GameActionEvent {
  userId: number
  action: string
  payload: Record<string, unknown>
}

export interface PlayerReadyEvent {
  userId: number
  isReady: boolean
}

export interface GameStartedEvent {
  roomId: string
  gameType: string
}
