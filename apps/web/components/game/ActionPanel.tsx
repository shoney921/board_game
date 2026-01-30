'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AvalonPhase, AvalonPlayer, AvalonTeam } from '@/stores/gameStore'

interface ActionPanelProps {
  phase: AvalonPhase
  players: AvalonPlayer[]
  myTeam: AvalonTeam | null
  currentLeaderId: number | null
  myUserId: number
  teamSizeRequired: number
  proposedTeam: number[]
  canAct: boolean
  availableActions: string[]
  teamVotesCount: number
  missionVotesCount: number
  onProposeTeam: (members: number[]) => void
  onVoteTeam: (approve: boolean) => void
  onVoteMission: (success: boolean) => void
  onAssassinate: (targetId: number) => void
}

export function ActionPanel({
  phase,
  players,
  myTeam,
  currentLeaderId,
  myUserId,
  teamSizeRequired,
  proposedTeam,
  canAct,
  availableActions,
  teamVotesCount,
  missionVotesCount,
  onProposeTeam,
  onVoteTeam,
  onVoteMission,
  onAssassinate,
}: ActionPanelProps) {
  const [selectedMembers, setSelectedMembers] = useState<number[]>([])
  const [assassinationTarget, setAssassinationTarget] = useState<number | null>(null)

  // Use Number() to ensure correct comparison (handles string vs number)
  // Also handle null case for currentLeaderId
  const isLeader = currentLeaderId !== null && Number(myUserId) === Number(currentLeaderId)

  // Debug logging
  console.log('ActionPanel Debug:', {
    myUserId,
    myUserIdType: typeof myUserId,
    currentLeaderId,
    currentLeaderIdType: typeof currentLeaderId,
    isLeader,
    phase,
    teamSizeRequired,
    playersCount: players.length,
  })

  // Calculate team size from player count if not provided
  const TEAM_SIZES: Record<number, number[]> = {
    5: [2, 3, 2, 3, 3],
    6: [2, 3, 4, 3, 4],
    7: [2, 3, 3, 4, 4],
    8: [3, 4, 4, 5, 5],
    9: [3, 4, 4, 5, 5],
    10: [3, 4, 4, 5, 5],
  }
  const currentRound = 1 // Will be passed as prop if needed
  const computedTeamSize = teamSizeRequired > 0
    ? teamSizeRequired
    : (TEAM_SIZES[players.length]?.[0] || 2)

  // Allow actions based on phase and role
  // canPropose: leader can propose team during team_selection phase
  const canPropose = isLeader && phase === 'team_selection'
  // canVoteTeam: can vote if in team_vote phase and hasn't voted yet (check availableActions or myTeamVote is null)
  const hasVotedTeam = availableActions.length > 0 ? !availableActions.includes('vote_team') : false
  const canVoteTeam = phase === 'team_vote' && !hasVotedTeam
  // canVoteMission: team member can vote during mission phase
  const hasVotedMission = availableActions.length > 0 ? !availableActions.includes('vote_mission') : false
  const canVoteMission = phase === 'mission' && proposedTeam.includes(myUserId) && !hasVotedMission
  // canFail: evil team can choose to fail
  const canFail = myTeam === 'evil'
  // canAssassinate: assassin during assassination phase
  const canAssassinate = phase === 'assassination' && availableActions.includes('assassinate')

  const toggleMember = (userId: number) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== userId))
    } else if (selectedMembers.length < computedTeamSize) {
      setSelectedMembers([...selectedMembers, userId])
    }
  }

  const handlePropose = () => {
    console.log('[handlePropose] Called:', { selectedMembers, computedTeamSize })
    if (selectedMembers.length === computedTeamSize) {
      console.log('[handlePropose] Calling onProposeTeam with:', selectedMembers)
      onProposeTeam(selectedMembers)
      setSelectedMembers([])
    } else {
      console.log('[handlePropose] Not enough members selected')
    }
  }

  const handleAssassinate = () => {
    if (assassinationTarget) {
      onAssassinate(assassinationTarget)
      setAssassinationTarget(null)
    }
  }

  const goodPlayers = players.filter(p => p.team !== 'evil')

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
      <AnimatePresence mode="wait">
        {/* Team Selection Phase - Leader selects team */}
        {phase === 'team_selection' && (
          <motion.div
            key="team_selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h3 className="text-lg font-bold text-center mb-4">
              {isLeader ? '원정대 선택' : '원정대장이 팀을 선택 중...'}
            </h3>

            {isLeader && (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
                  {computedTeamSize}명을 선택하세요 ({selectedMembers.length}/{computedTeamSize})
                </p>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  {players.map(player => (
                    <motion.button
                      key={player.userId}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleMember(player.userId)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        selectedMembers.includes(player.userId)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className="font-medium">{player.displayName}</span>
                      {player.userId === myUserId && (
                        <span className="text-xs text-gray-500 ml-1">(나)</span>
                      )}
                    </motion.button>
                  ))}
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePropose}
                  disabled={selectedMembers.length !== computedTeamSize}
                  className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                    selectedMembers.length === computedTeamSize
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  원정대 제안
                </motion.button>
              </>
            )}

            {!isLeader && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  원정대장이 팀을 구성하고 있습니다...
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Team Vote Phase */}
        {phase === 'team_vote' && (
          <motion.div
            key="team_vote"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h3 className="text-lg font-bold text-center mb-4">원정대 투표</h3>

            {/* Show proposed team */}
            <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">제안된 원정대:</p>
              <div className="flex flex-wrap gap-2">
                {proposedTeam.map(userId => {
                  const player = players.find(p => p.userId === userId)
                  return player ? (
                    <span
                      key={userId}
                      className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-full text-sm font-medium"
                    >
                      {player.displayName}
                    </span>
                  ) : null
                })}
              </div>
            </div>

            {canVoteTeam ? (
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onVoteTeam(true)}
                  className="py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg"
                >
                  찬성
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onVoteTeam(false)}
                  className="py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg"
                >
                  반대
                </motion.button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 dark:text-gray-400">
                  투표 중... ({teamVotesCount}/{players.length})
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Mission Phase */}
        {phase === 'mission' && (
          <motion.div
            key="mission"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h3 className="text-lg font-bold text-center mb-4">원정 진행</h3>

            {canVoteMission ? (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
                  원정 결과를 선택하세요
                </p>
                <div className={`grid ${canFail ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onVoteMission(true)}
                    className="py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg"
                  >
                    성공
                  </motion.button>
                  {canFail && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onVoteMission(false)}
                      className="py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg"
                    >
                      실패
                    </motion.button>
                  )}
                </div>
                {!canFail && (
                  <p className="text-xs text-center mt-2 text-gray-500">
                    선의 세력은 성공만 선택할 수 있습니다
                  </p>
                )}
              </>
            ) : proposedTeam.includes(myUserId) ? (
              <div className="text-center py-4">
                <p className="text-gray-500 dark:text-gray-400">
                  투표 완료! 다른 원정대원을 기다리는 중...
                </p>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 dark:text-gray-400">
                  원정대가 임무를 수행 중... ({missionVotesCount}/{proposedTeam.length})
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Assassination Phase */}
        {phase === 'assassination' && (
          <motion.div
            key="assassination"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h3 className="text-lg font-bold text-center mb-4 text-red-600">암살 단계</h3>

            {canAssassinate ? (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
                  멀린을 지목하세요. 맞추면 악의 세력이 역전승!
                </p>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  {players
                    .filter(p => p.team !== 'evil')
                    .map(player => (
                      <motion.button
                        key={player.userId}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setAssassinationTarget(player.userId)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          assassinationTarget === player.userId
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {player.displayName}
                      </motion.button>
                    ))}
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAssassinate}
                  disabled={!assassinationTarget}
                  className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                    assassinationTarget
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  암살 실행
                </motion.button>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🗡️</div>
                <p className="text-gray-500 dark:text-gray-400">
                  암살자가 멀린을 찾고 있습니다...
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Game Over */}
        {phase === 'game_over' && (
          <motion.div
            key="game_over"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center py-4"
          >
            <h3 className="text-lg font-bold">게임 종료</h3>
            <p className="text-gray-500 dark:text-gray-400">결과를 확인하세요</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
