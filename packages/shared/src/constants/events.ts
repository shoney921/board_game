// Socket event names
export const SOCKET_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECTED: 'connected',
  ERROR: 'error',

  // Room events
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  USER_JOINED: 'user_joined',
  USER_LEFT: 'user_left',
  ROOM_USERS: 'room_users',

  // Chat events
  CHAT_MESSAGE: 'chat_message',

  // Ready state
  READY_TOGGLE: 'ready_toggle',
  PLAYER_READY: 'player_ready',

  // Game events
  START_GAME: 'start_game',
  GAME_STARTED: 'game_started',
  GAME_ACTION: 'game_action',
  GAME_STATE_UPDATE: 'game_state_update',
} as const

// Avalon specific actions
export const AVALON_ACTIONS = {
  SELECT_TEAM: 'select_team',
  PROPOSE_TEAM: 'propose_team',
  VOTE_TEAM: 'vote_team',
  VOTE_MISSION: 'vote_mission',
  ASSASSINATE: 'assassinate',
} as const

// API endpoints
export const API_ENDPOINTS = {
  USERS: {
    BASE: '/api/v1/users',
    GUEST: '/api/v1/users/guest',
    BY_ID: (id: number) => `/api/v1/users/${id}`,
  },
  ROOMS: {
    BASE: '/api/v1/rooms',
    BY_ID: (id: number) => `/api/v1/rooms/${id}`,
    BY_CODE: (code: string) => `/api/v1/rooms/code/${code}`,
    JOIN: '/api/v1/rooms/join',
  },
  GAMES: {
    BASE: '/api/v1/games',
    BY_ID: (id: number) => `/api/v1/games/${id}`,
    CURRENT: (roomId: number) => `/api/v1/games/room/${roomId}/current`,
  },
  HEALTH: '/health',
} as const
