'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useUserStore } from '@/stores/userStore'
import { useRoomStore } from '@/stores/roomStore'

export default function Home() {
  const router = useRouter()
  const [roomCode, setRoomCode] = useState('')
  const [nickname, setNickname] = useState('')
  const { createGuestUser, isLoading } = useUserStore()
  const { createRoom, joinRoom } = useRoomStore()

  const handleCreateRoom = async () => {
    if (!nickname.trim()) {
      alert('닉네임을 입력해주세요')
      return
    }
    // Always create new guest user with the nickname
    await createGuestUser(nickname.trim())
    await createRoom('avalon')
  }

  const handleJoinRoom = async () => {
    if (!nickname.trim()) {
      alert('닉네임을 입력해주세요')
      return
    }
    if (!roomCode.trim()) return
    // Always create new guest user with the nickname
    await createGuestUser(nickname.trim())
    await joinRoom(roomCode.toUpperCase())
    router.push(`/room/${roomCode.toUpperCase()}`)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
          보드게임 플랫폼
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-12">
          친구들과 함께하는 실시간 보드게임
        </p>

        <div className="flex flex-col gap-4 max-w-sm mx-auto">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임을 입력하세요"
            maxLength={20}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 text-center"
          />

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreateRoom}
            disabled={isLoading || !nickname.trim()}
            className="w-full px-6 py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? '로딩 중...' : '방 만들기'}
          </motion.button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-gray-900 text-gray-500">
                또는
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="방 코드 입력"
              maxLength={6}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 uppercase text-center"
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleJoinRoom}
              disabled={isLoading || roomCode.length < 6 || !nickname.trim()}
              className="px-6 py-3 bg-secondary-600 hover:bg-secondary-700 text-white font-semibold rounded-xl shadow-lg transition-colors disabled:opacity-50"
            >
              입장
            </motion.button>
          </div>
        </div>

        {nickname && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 text-sm text-gray-500"
          >
            <span className="font-semibold">{nickname}</span>(으)로 플레이
          </motion.p>
        )}
      </motion.div>
    </main>
  )
}
