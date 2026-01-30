'use client'

import { motion } from 'framer-motion'
import { AvalonPlayer } from '@/stores/gameStore'

interface PlayerCircleProps {
  players: AvalonPlayer[]
  currentLeaderId: number | null
  proposedTeam: number[]
  selectedPlayers?: number[]
  onPlayerClick?: (userId: number) => void
  selectable?: boolean
  teamVotes?: Record<number, boolean>
  showVotes?: boolean
  highlightedPlayers?: { userId: number; type: 'evil' | 'evil_teammate' | 'merlin_or_morgana' }[]
  myUserId?: number
}

export function PlayerCircle({
  players,
  currentLeaderId,
  proposedTeam,
  selectedPlayers = [],
  onPlayerClick,
  selectable = false,
  teamVotes,
  showVotes = false,
  highlightedPlayers = [],
  myUserId,
}: PlayerCircleProps) {
  const getHighlightColor = (userId: number) => {
    const highlight = highlightedPlayers.find(h => h.userId === userId)
    if (!highlight) return null
    switch (highlight.type) {
      case 'evil':
      case 'evil_teammate':
        return 'ring-red-500'
      case 'merlin_or_morgana':
        return 'ring-purple-500'
      default:
        return null
    }
  }

  return (
    <div className="relative w-full aspect-square max-w-md mx-auto">
      {players.map((player, index) => {
        const angle = (index / players.length) * 2 * Math.PI - Math.PI / 2
        const radius = 40 // percentage
        const x = 50 + radius * Math.cos(angle)
        const y = 50 + radius * Math.sin(angle)

        const isLeader = player.userId === currentLeaderId
        const isOnTeam = proposedTeam.includes(player.userId)
        const isSelected = selectedPlayers.includes(player.userId)
        const highlightColor = getHighlightColor(player.userId)
        const isMe = player.userId === myUserId
        const vote = teamVotes?.[player.userId]

        return (
          <motion.div
            key={player.userId}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${x}%`,
              top: `${y}%`,
            }}
          >
            <motion.button
              whileHover={selectable ? { scale: 1.1 } : {}}
              whileTap={selectable ? { scale: 0.95 } : {}}
              onClick={() => selectable && onPlayerClick?.(player.userId)}
              disabled={!selectable}
              className={`
                relative w-16 h-16 rounded-full flex flex-col items-center justify-center
                transition-all duration-200
                ${isSelected ? 'ring-4 ring-blue-500 bg-blue-100 dark:bg-blue-900' : ''}
                ${isOnTeam && !isSelected ? 'ring-4 ring-yellow-500 bg-yellow-50 dark:bg-yellow-900/30' : ''}
                ${!isSelected && !isOnTeam ? 'bg-gray-100 dark:bg-gray-700' : ''}
                ${highlightColor ? `ring-4 ${highlightColor}` : ''}
                ${selectable ? 'cursor-pointer hover:shadow-lg' : 'cursor-default'}
                ${isMe ? 'border-2 border-primary-500' : ''}
              `}
            >
              {/* Leader crown */}
              {isLeader && (
                <div className="absolute -top-3 text-xl">
                  <span role="img" aria-label="leader">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3.293 3.293 3.293-3.293a1 1 0 111.414 1.414L11.414 10l3.293 3.293a1 1 0 01-1.414 1.414L10 11.414l-3.293 3.293a1 1 0 01-1.414-1.414L8.586 10 5.293 6.707a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"/>
                    </svg>
                  </span>
                </div>
              )}

              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white font-bold text-lg">
                {player.displayName[0].toUpperCase()}
              </div>

              {/* Vote indicator (only show when voting is done) */}
              {showVotes && vote !== undefined && (
                <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${
                  vote ? 'bg-green-500' : 'bg-red-500'
                } text-white text-xs font-bold`}>
                  {vote ? 'O' : 'X'}
                </div>
              )}
            </motion.button>

            {/* Player name */}
            <p className={`text-center text-xs mt-1 font-medium truncate max-w-16 ${
              isMe ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'
            }`}>
              {player.displayName}
              {isMe && ' (나)'}
            </p>
          </motion.div>
        )
      })}

      {/* Center - Round info */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
        <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 shadow-lg backdrop-blur-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">참가자</p>
          <p className="text-2xl font-bold text-primary-600">{players.length}명</p>
        </div>
      </div>
    </div>
  )
}
