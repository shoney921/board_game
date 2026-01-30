'use client'

import { motion } from 'framer-motion'

interface MissionTrackProps {
  missionResults: (string | null)[]
  currentRound: number
  teamSizes?: number[]
}

// Default team sizes for different player counts
const TEAM_SIZES: Record<number, number[]> = {
  5: [2, 3, 2, 3, 3],
  6: [2, 3, 4, 3, 4],
  7: [2, 3, 3, 4, 4],
  8: [3, 4, 4, 5, 5],
  9: [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
}

export function MissionTrack({ missionResults, currentRound, teamSizes }: MissionTrackProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 text-center">
        원정 현황
      </h3>
      <div className="flex justify-center gap-2">
        {missionResults.map((result, index) => {
          const round = index + 1
          const isCurrent = round === currentRound
          const teamSize = teamSizes?.[index]

          return (
            <motion.div
              key={index}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`
                relative w-14 h-14 rounded-full flex flex-col items-center justify-center
                font-bold text-lg transition-all
                ${result === 'success' ? 'bg-blue-500 text-white' : ''}
                ${result === 'fail' ? 'bg-red-500 text-white' : ''}
                ${!result && isCurrent ? 'bg-yellow-100 dark:bg-yellow-900 border-4 border-yellow-500 text-yellow-700 dark:text-yellow-300' : ''}
                ${!result && !isCurrent ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400' : ''}
              `}
            >
              {result === 'success' && (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {result === 'fail' && (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
              {!result && round}

              {/* Team size indicator */}
              {teamSize && (
                <span className="absolute -bottom-1 text-xs bg-gray-700 text-white px-1.5 rounded-full">
                  {teamSize}
                </span>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Score summary */}
      <div className="flex justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500" />
          <span className="text-gray-600 dark:text-gray-400">
            성공: {missionResults.filter(r => r === 'success').length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500" />
          <span className="text-gray-600 dark:text-gray-400">
            실패: {missionResults.filter(r => r === 'fail').length}
          </span>
        </div>
      </div>
    </div>
  )
}
