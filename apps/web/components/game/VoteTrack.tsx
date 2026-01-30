'use client'

import { motion } from 'framer-motion'

interface VoteTrackProps {
  voteTrack: number
}

export function VoteTrack({ voteTrack }: VoteTrackProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 text-center">
        투표 트랙
      </h3>
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((num) => {
          const isActive = num <= voteTrack
          const isCritical = num === 5

          return (
            <motion.div
              key={num}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: num * 0.05 }}
              className={`
                w-10 h-10 rounded-full flex items-center justify-center
                font-bold transition-all
                ${isActive && !isCritical ? 'bg-yellow-500 text-white' : ''}
                ${isActive && isCritical ? 'bg-red-600 text-white animate-pulse' : ''}
                ${!isActive ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400' : ''}
              `}
            >
              {num}
            </motion.div>
          )
        })}
      </div>
      <p className="text-xs text-center mt-2 text-gray-500 dark:text-gray-400">
        {voteTrack === 0 && '팀 투표 부결 시 트랙이 증가합니다'}
        {voteTrack > 0 && voteTrack < 5 && `연속 ${voteTrack}번 부결됨`}
        {voteTrack === 5 && '5번 부결 시 악의 세력 승리!'}
      </p>
    </div>
  )
}
