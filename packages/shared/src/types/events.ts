// Client to Server Events
export interface ClientToServerEvents {
  join_room: (data: JoinRoomEvent) => void
  leave_room: (data: LeaveRoomEvent) => void
  chat_message: (data: ChatMessageEvent) => void
  ready_toggle: (data: ReadyToggleEvent) => void
  start_game: (data: StartGameEvent) => void
  game_action: (data: GameActionEvent) => void
}

// Server to Client Events
export interface ServerToClientEvents {
  connected: (data: ConnectedEvent) => void
  error: (data: ErrorEvent) => void
  user_joined: (data: UserJoinedEvent) => void
  user_left: (data: UserLeftEvent) => void
  room_users: (data: RoomUsersEvent) => void
  chat_message: (data: ChatMessageReceivedEvent) => void
  player_ready: (data: PlayerReadyEvent) => void
  game_started: (data: GameStartedEvent) => void
  game_action: (data: GameActionReceivedEvent) => void
  game_state_update: (data: GameStateUpdateEvent) => void
}

// Event payloads
export interface JoinRoomEvent {
  room_id: string
  user_id: number
  username: string
  display_name: string
}

export interface LeaveRoomEvent {
  room_id: string
  user_id: number
  username: string
}

export interface ChatMessageEvent {
  room_id: string
  message: string
}

export interface ReadyToggleEvent {
  room_id: string
  user_id: number
  is_ready: boolean
}

export interface StartGameEvent {
  room_id: string
  game_type: string
}

export interface GameActionEvent {
  room_id: string
  action: string
  payload: Record<string, unknown>
}

// Server response events
export interface ConnectedEvent {
  sid: string
}

export interface ErrorEvent {
  message: string
}

export interface UserJoinedEvent {
  user_id: number
  username: string
  display_name: string
}

export interface UserLeftEvent {
  user_id: number
  username: string
}

export interface RoomUsersEvent {
  users: Record<string, string>
}

export interface ChatMessageReceivedEvent {
  user_id: number
  username: string
  display_name: string
  message: string
  timestamp?: string
}

export interface PlayerReadyEvent {
  user_id: number
  is_ready: boolean
}

export interface GameStartedEvent {
  room_id: string
  game_type: string
}

export interface GameActionReceivedEvent {
  user_id: number
  action: string
  payload: Record<string, unknown>
}

export interface GameStateUpdateEvent {
  game_id: number
  state: Record<string, unknown>
}
