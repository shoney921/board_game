export type GameStatus = 'setup' | 'in_progress' | 'finished'

export type GameType = 'avalon' | 'werewolf' | 'mafia'

export interface GamePlayer {
  userId: number
  username: string
  displayName: string
  role?: string
  team?: string
  isAlive: boolean
  metadata?: Record<string, unknown>
}

export interface GameState {
  currentRound: number
  phase: string
  players: GamePlayer[]
  publicState: Record<string, unknown>
}

export interface Game {
  id: number
  roomId: number
  gameType: GameType
  status: GameStatus
  currentRound: number
  state?: GameState
  winnerTeam?: string
  startedAt?: string
  finishedAt?: string
  createdAt: string
}

export interface CreateGameDTO {
  roomId: number
  gameType: GameType
}

// Avalon specific types
export type AvalonRole =
  | 'merlin'
  | 'percival'
  | 'loyal_servant'
  | 'mordred'
  | 'morgana'
  | 'assassin'
  | 'oberon'
  | 'minion'

export type AvalonTeam = 'good' | 'evil'

export interface AvalonPlayer extends GamePlayer {
  role: AvalonRole
  team: AvalonTeam
}

export interface AvalonMission {
  round: number
  teamSize: number
  leader: number
  team: number[]
  votes: Record<number, boolean>
  missionVotes?: Record<number, boolean>
  result?: 'success' | 'fail'
}

export interface AvalonState extends GameState {
  phase: 'team_selection' | 'team_vote' | 'mission' | 'assassination' | 'game_over'
  leader: number
  missions: AvalonMission[]
  successCount: number
  failCount: number
  currentMission: number
  proposedTeam?: number[]
}
