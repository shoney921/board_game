import { create } from 'zustand'
import { getSocket } from '@/lib/socket'

// ============================================
// LocalStorage helpers for reconnection support
// ============================================

const GAME_SESSION_KEY = 'avalon_game_session'

interface GameSession {
  gameId: number
  roomId: string
  myRole: string | null
  myTeam: string | null
  knownInfo: any[]
}

function saveGameSession(session: GameSession): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(GAME_SESSION_KEY, JSON.stringify(session))
  }
}

function loadGameSession(): GameSession | null {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(GAME_SESSION_KEY)
    if (data) {
      try {
        return JSON.parse(data)
      } catch {
        return null
      }
    }
  }
  return null
}

function clearGameSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(GAME_SESSION_KEY)
  }
}

// ============================================
// Types
// ============================================

export type AvalonPhase =
  | 'night'
  | 'team_selection'
  | 'team_vote'
  | 'mission'
  | 'assassination'
  | 'game_over'

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

export interface AvalonPlayer {
  userId: number
  username: string
  displayName: string
  role?: AvalonRole
  team?: AvalonTeam
}

export interface KnownInfo {
  userId: number
  displayName: string
  info: 'evil' | 'evil_teammate' | 'merlin_or_morgana'
}

export interface MissionHistory {
  round: number
  teamSize: number
  leaderId: number
  team: number[]
  teamVotes: Record<number, boolean>
  missionVotes?: boolean[]
  result?: 'success' | 'fail'
}

export interface AvalonGameState {
  gameId: number | null
  roomId: string | null
  phase: AvalonPhase
  currentRound: number
  currentLeaderId: number | null
  voteTrack: number
  missionResults: (string | null)[]
  successCount: number
  failCount: number
  teamSizeRequired: number

  // Players
  players: AvalonPlayer[]
  proposedTeam: number[]

  // My info
  myRole: AvalonRole | null
  myTeam: AvalonTeam | null
  knownInfo: KnownInfo[]

  // Voting
  teamVotesCount: number
  missionVotesCount: number
  myTeamVote: boolean | null
  myMissionVote: boolean | null
  lastTeamVoteResult: {
    approved: boolean
    votes: Record<number, boolean>
    approveCount: number
    rejectCount: number
  } | null

  // Actions
  canAct: boolean
  availableActions: string[]

  // Game result
  winnerTeam: AvalonTeam | null
  gameResult: {
    players: AvalonPlayer[]
    reason: string
    assassinationTarget?: number
  } | null

  // Last mission result for modal display
  lastMissionResult: {
    result: 'success' | 'fail'
    failCount: number
    missionVotes: boolean[]
    round: number
  } | null

  // History
  missionHistory: MissionHistory[]
}

interface GameStore {
  // State
  game: AvalonGameState
  isLoading: boolean
  error: string | null
  isInGame: boolean

  // Actions
  setGameStarted: (gameId: number, roomId: string, gameState: any) => void
  setRoleAssigned: (role: AvalonRole, team: AvalonTeam, knownInfo: KnownInfo[]) => void
  updateGameState: (state: any) => void
  setTeamProposed: (leaderId: number, proposedTeam: number[]) => void
  setTeamVoteUpdate: (votesCount: number) => void
  setTeamVoteResult: (result: any) => void
  setMissionVoteUpdate: (votesCount: number) => void
  setMissionResult: (result: any) => void
  setAssassinationResult: (result: any) => void
  setGameEnded: (result: any) => void

  // Player actions
  proposeTeam: (teamMembers: number[]) => void
  voteTeam: (approve: boolean) => void
  voteMission: (success: boolean) => void
  assassinate: (targetId: number) => void
  requestGameState: () => void

  // Reconnection
  tryRestoreFromLocalStorage: (roomId: string) => boolean
  rejoinGame: (roomId: string) => void

  // Utility
  resetGame: () => void
  setError: (error: string | null) => void
  clearLastTeamVoteResult: () => void
  clearLastMissionResult: () => void
}

const initialGameState: AvalonGameState = {
  gameId: null,
  roomId: null,
  phase: 'night',
  currentRound: 1,
  currentLeaderId: null,
  voteTrack: 0,
  missionResults: [null, null, null, null, null],
  successCount: 0,
  failCount: 0,
  teamSizeRequired: 0,
  players: [],
  proposedTeam: [],
  myRole: null,
  myTeam: null,
  knownInfo: [],
  teamVotesCount: 0,
  missionVotesCount: 0,
  myTeamVote: null,
  myMissionVote: null,
  lastTeamVoteResult: null,
  canAct: false,
  availableActions: [],
  winnerTeam: null,
  gameResult: null,
  lastMissionResult: null,
  missionHistory: [],
}

export const useGameStore = create<GameStore>((set, get) => ({
  game: { ...initialGameState },
  isLoading: false,
  error: null,
  isInGame: false,

  setGameStarted: (gameId, roomId, gameState) => {
    set({
      isInGame: true,
      game: {
        ...initialGameState,
        gameId,
        roomId,
        phase: gameState.phase || 'team_selection',
        currentRound: gameState.current_round || 1,
        currentLeaderId: gameState.current_leader_id,
        voteTrack: gameState.vote_track || 0,
        missionResults: gameState.mission_results || [null, null, null, null, null],
        successCount: gameState.success_count || 0,
        failCount: gameState.fail_count || 0,
        teamSizeRequired: gameState.team_size_required || 0,
        players: (gameState.players || []).map((p: any) => ({
          userId: p.user_id,
          username: p.username,
          displayName: p.display_name,
        })),
        proposedTeam: gameState.proposed_team || [],
      },
    })

    // Save to localStorage for reconnection
    saveGameSession({
      gameId,
      roomId,
      myRole: null,
      myTeam: null,
      knownInfo: [],
    })
  },

  setRoleAssigned: (role, team, knownInfo) => {
    set((state) => ({
      game: {
        ...state.game,
        myRole: role,
        myTeam: team,
        knownInfo,
      },
    }))

    // Update localStorage with role info
    const { game } = get()
    if (game.gameId && game.roomId) {
      saveGameSession({
        gameId: game.gameId,
        roomId: game.roomId,
        myRole: role,
        myTeam: team,
        knownInfo,
      })
    }
  },

  updateGameState: (serverState) => {
    set((state) => ({
      game: {
        ...state.game,
        // Update gameId/roomId if provided (for reconnection)
        gameId: serverState.game_id ?? state.game.gameId,
        roomId: serverState.room_id ?? state.game.roomId,
        phase: serverState.phase || state.game.phase,
        currentRound: serverState.current_round ?? state.game.currentRound,
        currentLeaderId: serverState.current_leader_id ?? state.game.currentLeaderId,
        voteTrack: serverState.vote_track ?? state.game.voteTrack,
        missionResults: serverState.mission_results || state.game.missionResults,
        successCount: serverState.success_count ?? state.game.successCount,
        failCount: serverState.fail_count ?? state.game.failCount,
        teamSizeRequired: serverState.team_size_required ?? state.game.teamSizeRequired,
        proposedTeam: serverState.proposed_team || state.game.proposedTeam,
        teamVotesCount: serverState.team_votes_count ?? state.game.teamVotesCount,
        missionVotesCount: serverState.mission_votes_count ?? state.game.missionVotesCount,
        canAct: serverState.can_act ?? state.game.canAct,
        availableActions: serverState.available_actions || state.game.availableActions,
        myTeamVote: serverState.my_team_vote ?? state.game.myTeamVote,
        myMissionVote: serverState.my_mission_vote ?? state.game.myMissionVote,
        // Update role/team info if provided (for reconnection)
        myRole: serverState.my_role ?? state.game.myRole,
        myTeam: serverState.my_team ?? state.game.myTeam,
        knownInfo: serverState.known_info
          ? serverState.known_info.map((info: any) => ({
              userId: info.user_id,
              displayName: info.display_name,
              info: info.info,
            }))
          : state.game.knownInfo,
        // Update players if provided (for reconnection)
        players: serverState.players
          ? serverState.players.map((p: any) => ({
              userId: p.user_id,
              username: p.username,
              displayName: p.display_name,
            }))
          : state.game.players,
        missionHistory: (serverState.mission_history || state.game.missionHistory).map((m: any) => ({
          round: m.round,
          teamSize: m.team_size,
          leaderId: m.leader_id,
          team: m.team,
          teamVotes: m.team_votes,
          missionVotes: m.mission_votes,
          result: m.result,
        })),
      },
      // Mark as in game if we received state
      isInGame: true,
    }))
  },

  setTeamProposed: (leaderId, proposedTeam) => {
    set((state) => ({
      game: {
        ...state.game,
        proposedTeam,
        phase: 'team_vote',
        teamVotesCount: 0,
        myTeamVote: null,
        lastTeamVoteResult: null,
      },
    }))
  },

  setTeamVoteUpdate: (votesCount) => {
    set((state) => ({
      game: {
        ...state.game,
        teamVotesCount: votesCount,
      },
    }))
  },

  setTeamVoteResult: (result) => {
    set((state) => ({
      game: {
        ...state.game,
        lastTeamVoteResult: {
          approved: result.team_approved,
          votes: result.votes,
          approveCount: result.approve_count,
          rejectCount: result.reject_count,
        },
        voteTrack: result.vote_track ?? state.game.voteTrack,
        phase: result.phase,
        currentLeaderId: result.new_leader_id ?? state.game.currentLeaderId,
        proposedTeam: result.team_approved ? state.game.proposedTeam : [],
        myTeamVote: null,
        missionVotesCount: 0,
        myMissionVote: null,
      },
    }))
  },

  setMissionVoteUpdate: (votesCount) => {
    set((state) => ({
      game: {
        ...state.game,
        missionVotesCount: votesCount,
      },
    }))
  },

  setMissionResult: (result) => {
    console.log('[setMissionResult] Received:', result)
    const newMissionResults = [...get().game.missionResults]
    const completedRound = result.round
    const roundIndex = completedRound - 1
    if (roundIndex >= 0 && roundIndex < 5) {
      newMissionResults[roundIndex] = result.result
    }

    const newState = {
      missionResults: newMissionResults,
      successCount: result.success_total,
      failCount: result.fail_total,
      currentRound: result.next_round ?? get().game.currentRound,
      currentLeaderId: result.new_leader_id ?? get().game.currentLeaderId,
      phase: result.phase,
      proposedTeam: [],
      teamVotesCount: 0,
      missionVotesCount: 0,
      myTeamVote: null,
      myMissionVote: null,
      lastTeamVoteResult: null,
      lastMissionResult: {
        result: result.result as 'success' | 'fail',
        failCount: result.fail_count,
        missionVotes: result.mission_votes_shuffled || [],
        round: completedRound,
      },
    }
    console.log('[setMissionResult] New state:', newState)

    set((state) => ({
      game: {
        ...state.game,
        ...newState,
      },
    }))
  },

  setAssassinationResult: (result) => {
    set((state) => ({
      game: {
        ...state.game,
        winnerTeam: result.winner_team as AvalonTeam,
        phase: 'game_over',
      },
    }))
  },

  setGameEnded: (result) => {
    set((state) => ({
      game: {
        ...state.game,
        phase: 'game_over',
        winnerTeam: result.winner_team as AvalonTeam,
        gameResult: {
          players: (result.players || []).map((p: any) => ({
            userId: p.user_id,
            username: p.username,
            displayName: p.display_name,
            role: p.role,
            team: p.team,
          })),
          reason: result.reason,
          assassinationTarget: result.assassination_target,
        },
      },
      isInGame: false,
    }))

    // Clear localStorage when game ends
    clearGameSession()
  },

  proposeTeam: (teamMembers) => {
    const { game } = get()
    console.log('[proposeTeam] Called with:', { teamMembers, gameId: game.gameId })

    if (!game.gameId) {
      console.log('[proposeTeam] ERROR: No gameId')
      return
    }

    const socket = getSocket()
    console.log('[proposeTeam] Emitting propose_team event:', {
      game_id: game.gameId,
      team_members: teamMembers,
    })
    socket.emit('propose_team', {
      game_id: game.gameId,
      team_members: teamMembers,
    })
  },

  voteTeam: (approve) => {
    const { game } = get()
    if (!game.gameId) return

    const socket = getSocket()
    socket.emit('vote_team', {
      game_id: game.gameId,
      approve,
    })

    set((state) => ({
      game: {
        ...state.game,
        myTeamVote: approve,
      },
    }))
  },

  voteMission: (success) => {
    const { game } = get()
    console.log('[voteMission] Called with success:', success, 'gameId:', game.gameId)
    if (!game.gameId) {
      console.log('[voteMission] ERROR: No gameId')
      return
    }

    const socket = getSocket()
    console.log('[voteMission] Emitting vote_mission event')
    socket.emit('vote_mission', {
      game_id: game.gameId,
      success,
    })

    set((state) => ({
      game: {
        ...state.game,
        myMissionVote: success,
      },
    }))
  },

  assassinate: (targetId) => {
    const { game } = get()
    if (!game.gameId) return

    const socket = getSocket()
    socket.emit('assassinate', {
      game_id: game.gameId,
      target_id: targetId,
    })
  },

  requestGameState: () => {
    const { game } = get()
    if (!game.gameId) return

    const socket = getSocket()
    socket.emit('get_game_state', {
      game_id: game.gameId,
    })
  },

  resetGame: () => {
    set({
      game: { ...initialGameState },
      isLoading: false,
      error: null,
      isInGame: false,
    })

    // Clear localStorage
    clearGameSession()
  },

  tryRestoreFromLocalStorage: (roomId: string) => {
    const session = loadGameSession()
    if (session && session.roomId === roomId) {
      // Restore basic game info from localStorage
      set((state) => ({
        game: {
          ...state.game,
          gameId: session.gameId,
          roomId: session.roomId,
          myRole: session.myRole as AvalonRole | null,
          myTeam: session.myTeam as AvalonTeam | null,
          knownInfo: session.knownInfo || [],
        },
        isInGame: true,
      }))
      return true
    }
    return false
  },

  rejoinGame: (roomId: string) => {
    const socket = getSocket()
    console.log('[rejoinGame] Attempting to rejoin game for room:', roomId)
    socket.emit('rejoin_game', { room_id: roomId })
  },

  setError: (error) => {
    set({ error })
  },

  clearLastTeamVoteResult: () => {
    set((state) => ({
      game: {
        ...state.game,
        lastTeamVoteResult: null,
      },
    }))
  },

  clearLastMissionResult: () => {
    set((state) => ({
      game: {
        ...state.game,
        lastMissionResult: null,
      },
    }))
  },
}))
