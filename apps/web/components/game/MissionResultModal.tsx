'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface MissionResultModalProps {
  isOpen: boolean
  result: 'success' | 'fail'
  failCount: number
  missionVotes: boolean[]
  round: number
  onClose: () => void
}

export function MissionResultModal({
  isOpen,
  result,
  failCount,
  missionVotes,
  round,
  onClose,
}: MissionResultModalProps) {
  const [showCards, setShowCards] = useState(false)
  const isSuccess = result === 'success'

  useEffect(() => {
    if (isOpen) {
      // Show cards after a brief delay
      const timer = setTimeout(() => setShowCards(true), 500)
      // Auto close after showing for a while
      const closeTimer = setTimeout(() => onClose(), 5000)
      return () => {
        clearTimeout(timer)
        clearTimeout(closeTimer)
      }
    } else {
      setShowCards(false)
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
              ${isSuccess
                ? 'bg-gradient-to-br from-blue-500 to-blue-700'
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
                {isSuccess ? (
                  <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </motion.div>
              <h2 className="text-2xl font-bold">
                {round}라운드 원정 {isSuccess ? '성공!' : '실패!'}
              </h2>
              <p className={`text-lg ${isSuccess ? 'text-blue-200' : 'text-red-200'}`}>
                실패 카드 {failCount}장
              </p>
            </div>

            {/* Mission votes (shuffled) */}
            <AnimatePresence>
              {showCards && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex justify-center gap-2 mt-4 flex-wrap"
                >
                  {missionVotes.map((vote, index) => (
                    <motion.div
                      key={index}
                      initial={{ rotateY: 180, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      transition={{ delay: index * 0.2 }}
                      className={`
                        w-16 h-24 rounded-lg flex items-center justify-center
                        font-bold text-2xl shadow-lg
                        ${vote
                          ? 'bg-blue-400 text-white'
                          : 'bg-red-400 text-white'
                        }
                      `}
                    >
                      {vote ? (
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
