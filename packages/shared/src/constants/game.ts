// Avalon game constants
export const AVALON_ROLES = {
  GOOD: ['merlin', 'percival', 'loyal_servant'] as const,
  EVIL: ['mordred', 'morgana', 'assassin', 'oberon', 'minion'] as const,
}

export const AVALON_TEAM_SIZES: Record<number, number[]> = {
  5: [2, 3, 2, 3, 3],
  6: [2, 3, 4, 3, 4],
  7: [2, 3, 3, 4, 4],
  8: [3, 4, 4, 5, 5],
  9: [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
}

export const AVALON_EVIL_COUNT: Record<number, number> = {
  5: 2,
  6: 2,
  7: 3,
  8: 3,
  9: 3,
  10: 4,
}

export const AVALON_FAIL_REQUIREMENT: Record<number, number[]> = {
  // Mission rounds where 2 fails are required (7+ players, 4th mission)
  7: [0, 0, 0, 2, 0],
  8: [0, 0, 0, 2, 0],
  9: [0, 0, 0, 2, 0],
  10: [0, 0, 0, 2, 0],
}

export const AVALON_ROLES_CONFIG: Record<
  number,
  { good: string[]; evil: string[] }
> = {
  5: {
    good: ['merlin', 'percival', 'loyal_servant'],
    evil: ['morgana', 'assassin'],
  },
  6: {
    good: ['merlin', 'percival', 'loyal_servant', 'loyal_servant'],
    evil: ['morgana', 'assassin'],
  },
  7: {
    good: ['merlin', 'percival', 'loyal_servant', 'loyal_servant'],
    evil: ['morgana', 'assassin', 'oberon'],
  },
  8: {
    good: ['merlin', 'percival', 'loyal_servant', 'loyal_servant', 'loyal_servant'],
    evil: ['morgana', 'assassin', 'minion'],
  },
  9: {
    good: ['merlin', 'percival', 'loyal_servant', 'loyal_servant', 'loyal_servant', 'loyal_servant'],
    evil: ['morgana', 'assassin', 'mordred'],
  },
  10: {
    good: ['merlin', 'percival', 'loyal_servant', 'loyal_servant', 'loyal_servant', 'loyal_servant'],
    evil: ['morgana', 'assassin', 'mordred', 'oberon'],
  },
}

// Game phases
export const GAME_PHASES = {
  AVALON: {
    TEAM_SELECTION: 'team_selection',
    TEAM_VOTE: 'team_vote',
    MISSION: 'mission',
    ASSASSINATION: 'assassination',
    GAME_OVER: 'game_over',
  },
} as const

// Timing constants (in milliseconds)
export const GAME_TIMINGS = {
  VOTE_TIMEOUT: 60000, // 1 minute
  MISSION_TIMEOUT: 30000, // 30 seconds
  ASSASSINATION_TIMEOUT: 120000, // 2 minutes
  TEAM_SELECTION_TIMEOUT: 90000, // 1.5 minutes
}
