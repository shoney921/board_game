'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useRoomStore } from '@/stores/roomStore'
import { useUserStore } from '@/stores/userStore'
import { useSocketStore } from '@/stores/socketStore'
import { api } from '@/lib/api'
import { getSocket } from '@/lib/socket'

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  const { user, _hasHydrated } = useUserStore()
  const { room, players, leaveRoom } = useRoomStore()
  const { connect, disconnect, isConnected } = useSocketStore()

  useEffect(() => {
    console.log('RoomPage useEffect:', { _hasHydrated, user, code, room })

    // Wait for hydration before checking user
    if (!_hasHydrated) {
      console.log('Waiting for hydration...')
      return
    }

    if (!user) {
      console.log('No user, redirecting to home')
      router.push('/')
      return
    }

    // Fetch room info first
    console.log('Fetching room info for code:', code)
    api.getRoomByCode(code).then((fetchedRoom) => {
      console.log('Room fetched:', fetchedRoom)
      useRoomStore.getState().setRoom({
        ...fetchedRoom,
        code: fetchedRoom.code,
        name: fetchedRoom.name,
        hostId: (fetchedRoom as any).host_id,
        gameType: (fetchedRoom as any).game_type,
        maxPlayers: (fetchedRoom as any).max_players,
        minPlayers: (fetchedRoom as any).min_players,
      })

      // Add self to players initially
      useRoomStore.getState().setPlayers([{
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        isReady: false,
        isHost: (fetchedRoom as any).host_id === user.id,
      }])

      // Get socket and set up connection handler
      const socket = getSocket()

      const joinRoomWhenConnected = () => {
        console.log('Socket connected, joining room:', code)
        socket.emit('join_room', {
          room_id: code,
          user_id: user.id,
          username: user.username,
          display_name: user.displayName,
        })
      }

      // Set up listener BEFORE connecting to avoid race condition
      if (socket.connected) {
        // Already connected, join immediately
        joinRoomWhenConnected()
      } else {
        // Add listener first, then connect
        socket.once('connect', joinRoomWhenConnected)
        connect()
      }
    }).catch((err) => {
      console.error('Failed to fetch room:', err)
      router.push('/')
    })

    return () => {
      // Clean up: remove listener and disconnect
      const socket = getSocket()
      socket.off('connect')
      leaveRoom()
      disconnect()
    }
  }, [_hasHydrated, user, code])

  if (!_hasHydrated || !room) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">방 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold">{room.name}</h1>
            <p className="text-gray-500">
              방 코드: <span className="font-mono font-bold text-primary-600">{room.code}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-500">
              {isConnected ? '연결됨' : '연결 끊김'}
            </span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
            >
              <h2 className="text-xl font-semibold mb-4">
                참가자 ({players.length}/{room.maxPlayers})
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {players.map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-xl border-2 ${
                      player.isReady
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white font-bold">
                        {player.displayName[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold">{player.displayName}</p>
                        <p className="text-xs text-gray-500">
                          {player.isHost ? '방장' : player.isReady ? '준비 완료' : '대기 중'}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          <div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
            >
              <h2 className="text-xl font-semibold mb-4">게임 설정</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">게임 종류</span>
                  <span className="font-semibold">{room.gameType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">최소 인원</span>
                  <span className="font-semibold">{room.minPlayers}명</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">최대 인원</span>
                  <span className="font-semibold">{room.maxPlayers}명</span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors"
                >
                  준비 완료
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push('/')}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  방 나가기
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  )
}
