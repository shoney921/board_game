'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { AvalonPlayer, AvalonTeam } from '@/stores/gameStore'

interface GameResultModalProps {
  isOpen: boolean
  winnerTeam: AvalonTeam | null
  players: AvalonPlayer[]
  reason: string
  assassinationTarget?: number
  onClose: () => void
  onPlayAgain: () => void
}

const ROLE_NAMES: Record<string, string> = {
  merlin: '멀린',
  percival: '퍼시벌',
  loyal_servant: '충성스러운 하인',
  mordred: '모드레드',
  morgana: '모르가나',
  assassin: '암살자',
  oberon: '오베론',
  minion: '하수인',
}

const REASON_TEXT: Record<string, string> = {
  three_successful_missions: '원정 3회 성공',
  three_failed_missions: '원정 3회 실패',
  five_rejections: '팀 투표 5회 연속 부결',
  merlin_assassinated: '멀린 암살 성공',
  merlin_survived: '멀린 암살 실패',
}

export function GameResultModal({
  isOpen,
  winnerTeam,
  players,
  reason,
  assassinationTarget,
  onClose,
  onPlayAgain,
}: GameResultModalProps) {
  const isGoodWin = winnerTeam === 'good'
  const assassinatedPlayer = assassinationTarget
    ? players.find(p => p.userId === assassinationTarget)
    : null

  const goodPlayers = players.filter(p => p.team === 'good')
  const evilPlayers = players.filter(p => p.team === 'evil')

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className={`
              w-full max-w-lg rounded-2xl p-6 shadow-2xl
              ${isGoodWin
                ? 'bg-gradient-to-br from-blue-500 to-blue-700'
                : 'bg-gradient-to-br from-red-500 to-red-700'
              }
              text-white
            `}
          >
            {/* Winner announcement */}
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="text-6xl mb-4"
              >
                {isGoodWin ? '⚔️' : '💀'}
              </motion.div>
              <h2 className="text-3xl font-bold mb-2">
                {isGoodWin ? '선의 세력 승리!' : '악의 세력 승리!'}
              </h2>
              <p className={`text-lg ${isGoodWin ? 'text-blue-200' : 'text-red-200'}`}>
                {REASON_TEXT[reason] || reason}
              </p>

              {assassinatedPlayer && (
                <p className={`mt-2 text-sm ${isGoodWin ? 'text-blue-200' : 'text-red-200'}`}>
                  암살 대상: {assassinatedPlayer.displayName} ({ROLE_NAMES[assassinatedPlayer.role || '']})
                </p>
              )}
            </div>

            {/* All players revealed */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Good team */}
              <div className={`p-4 rounded-xl ${isGoodWin ? 'bg-white/20' : 'bg-white/10'}`}>
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <span>⚔️</span> 선의 세력
                </h3>
                <div className="space-y-2">
                  {goodPlayers.map(player => (
                    <div key={player.userId} className="flex justify-between items-center">
                      <span className="font-medium">{player.displayName}</span>
                      <span className={`text-sm ${isGoodWin ? 'text-blue-200' : 'text-red-200'}`}>
                        {ROLE_NAMES[player.role || ''] || player.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Evil team */}
              <div className={`p-4 rounded-xl ${!isGoodWin ? 'bg-white/20' : 'bg-white/10'}`}>
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <span>💀</span> 악의 세력
                </h3>
                <div className="space-y-2">
                  {evilPlayers.map(player => (
                    <div key={player.userId} className="flex justify-between items-center">
                      <span className="font-medium">{player.displayName}</span>
                      <span className={`text-sm ${!isGoodWin ? 'text-red-200' : 'text-blue-200'}`}>
                        {ROLE_NAMES[player.role || ''] || player.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onPlayAgain}
                className="flex-1 py-3 bg-white text-gray-800 font-semibold rounded-xl"
              >
                다시 하기
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="flex-1 py-3 bg-white/20 font-semibold rounded-xl"
              >
                로비로
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
