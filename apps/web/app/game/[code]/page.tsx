'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useUserStore } from '@/stores/userStore'
import { useRoomStore } from '@/stores/roomStore'
import { useSocketStore } from '@/stores/socketStore'
import { useGameStore } from '@/stores/gameStore'
import { api } from '@/lib/api'
import { getSocket } from '@/lib/socket'
import {
  PlayerCircle,
  RoleCard,
  MissionTrack,
  VoteTrack,
  ActionPanel,
  GameResultModal,
  TeamVoteResultModal,
  MissionResultModal,
} from '@/components/game'

const TEAM_SIZES: Record<number, number[]> = {
  5: [2, 3, 2, 3, 3],
  6: [2, 3, 4, 3, 4],
  7: [2, 3, 3, 4, 4],
  8: [3, 4, 4, 5, 5],
  9: [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
}

const PHASE_NAMES: Record<string, string> = {
  night: '밤 단계',
  team_selection: '원정대 선택',
  team_vote: '원정대 투표',
  mission: '원정 진행',
  assassination: '암살 단계',
  game_over: '게임 종료',
}

export default function GamePage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  const { user, _hasHydrated } = useUserStore()
  const { room } = useRoomStore()
  const { connect, isConnected } = useSocketStore()
  const {
    game,
    isInGame,
    proposeTeam,
    voteTeam,
    voteMission,
    assassinate,
    resetGame,
    requestGameState,
    clearLastTeamVoteResult,
    clearLastMissionResult,
  } = useGameStore()

  // Track if we've joined the room to prevent duplicate join_room calls
  const hasJoinedRoom = useRef(false)

  // Modal states
  const [showTeamVoteResult, setShowTeamVoteResult] = useState(false)
  const [showMissionResult, setShowMissionResult] = useState(false)
  const [showGameResult, setShowGameResult] = useState(false)

  // Watch for team vote results
  useEffect(() => {
    if (game.lastTeamVoteResult) {
      setShowTeamVoteResult(true)
    }
  }, [game.lastTeamVoteResult])

  // Watch for mission results
  useEffect(() => {
    if (game.lastMissionResult) {
      setShowMissionResult(true)
    }
  }, [game.lastMissionResult])

  // Watch for game end
  useEffect(() => {
    if (game.phase === 'game_over' && game.gameResult) {
      // Delay showing game result to let mission result show first
      const timer = setTimeout(() => {
        setShowGameResult(true)
      }, game.gameResult.reason.includes('mission') ? 3000 : 0)
      return () => clearTimeout(timer)
    }
  }, [game.phase, game.gameResult])

  // Setup and connection
  useEffect(() => {
    if (!_hasHydrated) return

    if (!user) {
      router.push('/')
      return
    }

    // If not in game, redirect to room
    if (!isInGame && !game.gameId) {
      // Try to fetch room and see if there's an active game
      api.getRoomByCode(code).then((fetchedRoom) => {
        useRoomStore.getState().setRoom({
          ...fetchedRoom,
          code: fetchedRoom.code,
          name: fetchedRoom.name,
          hostId: (fetchedRoom as any).host_id,
          gameType: (fetchedRoom as any).game_type,
          maxPlayers: (fetchedRoom as any).max_players,
          minPlayers: (fetchedRoom as any).min_players,
        })
      }).catch(() => {
        router.push('/')
      })
    }

    // Connect socket if needed and join room
    const socket = getSocket()

    const joinRoomIfNeeded = () => {
      if (user && !hasJoinedRoom.current) {
        hasJoinedRoom.current = true
        console.log('[GamePage] Joining room:', code, 'user:', user.id, user.displayName)
        console.log('[GamePage] Socket connected:', socket.connected, 'Socket id:', socket.id)
        socket.emit('join_room', {
          room_id: code,
          user_id: user.id,
          username: user.username,
          display_name: user.displayName,
        })
      } else if (hasJoinedRoom.current) {
        console.log('[GamePage] Already joined room, skipping')
      }
    }

    console.log('[GamePage] Setup - isConnected:', isConnected, 'socket.connected:', socket.connected)

    if (!isConnected) {
      console.log('[GamePage] Not connected, setting up connect listener')
      socket.once('connect', joinRoomIfNeeded)
      connect()
    } else if (socket.connected) {
      // Already connected, join room immediately
      console.log('[GamePage] Already connected, joining room immediately')
      joinRoomIfNeeded()
    } else {
      console.log('[GamePage] isConnected true but socket.connected false - waiting for connection')
      socket.once('connect', joinRoomIfNeeded)
    }

    // Request game state for reconnection
    if (socket.connected && game.gameId) {
      requestGameState()
    }
  }, [_hasHydrated, user, isInGame, game.gameId, code, isConnected])

  const handlePlayAgain = useCallback(() => {
    resetGame()
    router.push(`/room/${code}`)
  }, [code, resetGame, router])

  const handleBackToLobby = useCallback(() => {
    resetGame()
    router.push(`/room/${code}`)
  }, [code, resetGame, router])

  // Debug logging
  console.log('GamePage Debug:', {
    userId: user?.id,
    isInGame,
    gameId: game.gameId,
    phase: game.phase,
    currentLeaderId: game.currentLeaderId,
    teamSizeRequired: game.teamSizeRequired,
    playersCount: game.players.length,
    players: game.players.map(p => ({ userId: p.userId, displayName: p.displayName })),
  })

  // Get team sizes for current player count
  const teamSizes = TEAM_SIZES[game.players.length] || []

  // Build highlighted players for role information
  const highlightedPlayers = game.knownInfo.map(info => ({
    userId: info.userId,
    type: info.info,
  }))

  if (!_hasHydrated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!isInGame && !game.gameId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">게임 로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">아발론</h1>
            <span className={`
              px-3 py-1 rounded-full text-sm font-medium
              ${game.phase === 'game_over'
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              }
            `}>
              {PHASE_NAMES[game.phase] || game.phase}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-gray-500">라운드</span>
              <span className="font-bold ml-2">{game.currentRound}/5</span>
            </div>
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Player circle and Action panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Player Circle */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
            >
              <PlayerCircle
                players={game.players}
                currentLeaderId={game.currentLeaderId}
                proposedTeam={game.proposedTeam}
                highlightedPlayers={highlightedPlayers}
                myUserId={user.id}
                showVotes={!!game.lastTeamVoteResult}
                teamVotes={game.lastTeamVoteResult?.votes}
              />
            </motion.div>

            {/* Action Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <ActionPanel
                phase={game.phase}
                players={game.players}
                myTeam={game.myTeam}
                currentLeaderId={game.currentLeaderId}
                myUserId={user.id}
                teamSizeRequired={game.teamSizeRequired}
                proposedTeam={game.proposedTeam}
                canAct={game.canAct}
                availableActions={game.availableActions}
                teamVotesCount={game.teamVotesCount}
                missionVotesCount={game.missionVotesCount}
                onProposeTeam={proposeTeam}
                onVoteTeam={voteTeam}
                onVoteMission={voteMission}
                onAssassinate={assassinate}
              />
            </motion.div>
          </div>

          {/* Right column - Game info */}
          <div className="space-y-6">
            {/* My Role Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <RoleCard
                role={game.myRole}
                team={game.myTeam}
                knownInfo={game.knownInfo}
              />
            </motion.div>

            {/* Mission Track */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <MissionTrack
                missionResults={game.missionResults}
                currentRound={game.currentRound}
                teamSizes={teamSizes}
              />
            </motion.div>

            {/* Vote Track */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <VoteTrack voteTrack={game.voteTrack} />
            </motion.div>

            {/* Game Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg"
            >
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
                게임 정보
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">방 코드</span>
                  <span className="font-mono font-bold">{code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">참가자</span>
                  <span>{game.players.length}명</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">현재 원정대장</span>
                  <span className="font-medium">
                    {game.players.find(p => p.userId === game.currentLeaderId)?.displayName || '-'}
                  </span>
                </div>
                {game.teamSizeRequired > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">필요 원정대원</span>
                    <span>{game.teamSizeRequired}명</span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <TeamVoteResultModal
        isOpen={showTeamVoteResult}
        approved={game.lastTeamVoteResult?.approved || false}
        votes={game.lastTeamVoteResult?.votes || {}}
        players={game.players}
        approveCount={game.lastTeamVoteResult?.approveCount || 0}
        rejectCount={game.lastTeamVoteResult?.rejectCount || 0}
        onClose={() => {
          setShowTeamVoteResult(false)
          clearLastTeamVoteResult()
        }}
      />

      {game.lastMissionResult && (
        <MissionResultModal
          isOpen={showMissionResult}
          result={game.lastMissionResult.result}
          failCount={game.lastMissionResult.failCount}
          missionVotes={game.lastMissionResult.missionVotes}
          round={game.lastMissionResult.round}
          onClose={() => {
            setShowMissionResult(false)
            clearLastMissionResult()
          }}
        />
      )}

      {game.gameResult && (
        <GameResultModal
          isOpen={showGameResult}
          winnerTeam={game.winnerTeam}
          players={game.gameResult.players}
          reason={game.gameResult.reason}
          assassinationTarget={game.gameResult.assassinationTarget}
          onClose={handleBackToLobby}
          onPlayAgain={handlePlayAgain}
        />
      )}
    </main>
  )
}
