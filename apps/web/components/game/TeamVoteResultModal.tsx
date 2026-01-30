'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AvalonPlayer } from '@/stores/gameStore'

interface TeamVoteResultModalProps {
  isOpen: boolean
  approved: boolean
  votes: Record<number, boolean>
  players: AvalonPlayer[]
  approveCount: number
  rejectCount: number
  onClose: () => void
}

export function TeamVoteResultModal({
  isOpen,
  approved,
  votes,
  players,
  approveCount,
  rejectCount,
  onClose,
}: TeamVoteResultModalProps) {
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Show details after a brief delay
      const timer = setTimeout(() => setShowDetails(true), 500)
      // Auto close after showing for a while
      const closeTimer = setTimeout(() => onClose(), 5000)
      return () => {
        clearTimeout(timer)
        clearTimeout(closeTimer)
      }
    } else {
      setShowDetails(false)
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className={`
              w-full max-w-md rounded-2xl p-6 shadow-2xl
              ${approved
                ? 'bg-gradient-to-br from-green-500 to-green-700'
                : 'bg-gradient-to-br from-red-500 to-red-700'
              }
              text-white
            `}
          >
            {/* Result */}
            <div className="text-center mb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="text-5xl mb-3"
              >
                {approved ? 'O' : 'X'}
              </motion.div>
              <h2 className="text-2xl font-bold">
                {approved ? '팀 승인!' : '팀 부결!'}
              </h2>
              <p className={`text-lg ${approved ? 'text-green-200' : 'text-red-200'}`}>
                찬성 {approveCount} / 반대 {rejectCount}
              </p>
            </div>

            {/* Individual votes */}
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 mt-4"
                >
                  {players.map((player, index) => {
                    const vote = votes[player.userId]
                    return (
                      <motion.div
                        key={player.userId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`flex justify-between items-center p-2 rounded-lg ${
                          vote ? 'bg-green-600/50' : 'bg-red-600/50'
                        }`}
                      >
                        <span className="font-medium">{player.displayName}</span>
                        <span className="font-bold">{vote ? 'O' : 'X'}</span>
                      </motion.div>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
