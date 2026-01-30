'use client'

import { motion } from 'framer-motion'
import { AvalonRole, AvalonTeam, KnownInfo } from '@/stores/gameStore'

interface RoleCardProps {
  role: AvalonRole | null
  team: AvalonTeam | null
  knownInfo: KnownInfo[]
  isRevealed?: boolean
}

const ROLE_INFO: Record<AvalonRole, { name: string; description: string; icon: string }> = {
  merlin: {
    name: '멀린',
    description: '악의 세력을 알고 있습니다 (모드레드 제외)',
    icon: '🧙',
  },
  percival: {
    name: '퍼시벌',
    description: '멀린과 모르가나를 알고 있습니다 (구분 불가)',
    icon: '🛡️',
  },
  loyal_servant: {
    name: '충성스러운 하인',
    description: '선한 편입니다',
    icon: '⚔️',
  },
  mordred: {
    name: '모드레드',
    description: '멀린에게 보이지 않습니다',
    icon: '👹',
  },
  morgana: {
    name: '모르가나',
    description: '퍼시벌에게 멀린처럼 보입니다',
    icon: '🧙‍♀️',
  },
  assassin: {
    name: '암살자',
    description: '게임 종료 시 멀린 암살 시도 가능',
    icon: '🗡️',
  },
  oberon: {
    name: '오베론',
    description: '다른 악과 서로 모릅니다',
    icon: '👻',
  },
  minion: {
    name: '모드레드의 하수인',
    description: '악의 세력입니다',
    icon: '💀',
  },
}

const KNOWN_INFO_TEXT: Record<KnownInfo['info'], string> = {
  evil: '악의 세력',
  evil_teammate: '악의 동료',
  merlin_or_morgana: '멀린 또는 모르가나',
}

export function RoleCard({ role, team, knownInfo, isRevealed = false }: RoleCardProps) {
  if (!role || !team) {
    return (
      <div className="bg-gray-200 dark:bg-gray-700 rounded-xl p-4 animate-pulse">
        <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mx-auto mb-2" />
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mx-auto" />
      </div>
    )
  }

  const roleInfo = ROLE_INFO[role]
  const isGood = team === 'good'

  return (
    <motion.div
      initial={{ rotateY: 180, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ duration: 0.6, type: 'spring' }}
      className={`rounded-xl p-4 shadow-lg ${
        isGood
          ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white'
          : 'bg-gradient-to-br from-red-500 to-red-700 text-white'
      }`}
    >
      {/* Role header */}
      <div className="text-center mb-3">
        <span className="text-4xl">{roleInfo.icon}</span>
        <h3 className="text-xl font-bold mt-2">{roleInfo.name}</h3>
        <p className={`text-sm ${isGood ? 'text-blue-200' : 'text-red-200'}`}>
          {isGood ? '선의 세력' : '악의 세력'}
        </p>
      </div>

      {/* Role description */}
      <p className={`text-sm text-center mb-3 ${isGood ? 'text-blue-100' : 'text-red-100'}`}>
        {roleInfo.description}
      </p>

      {/* Known info */}
      {knownInfo.length > 0 && (
        <div className={`mt-3 pt-3 border-t ${isGood ? 'border-blue-400' : 'border-red-400'}`}>
          <p className="text-xs font-semibold mb-2 opacity-80">알고 있는 정보:</p>
          <div className="space-y-1">
            {knownInfo.map((info) => (
              <div
                key={info.userId}
                className={`text-sm px-2 py-1 rounded ${
                  isGood ? 'bg-blue-600/50' : 'bg-red-600/50'
                }`}
              >
                <span className="font-medium">{info.displayName}</span>
                <span className="opacity-75"> - {KNOWN_INFO_TEXT[info.info]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
