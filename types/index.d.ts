export type CrewStatus = 'pending' | 'running' | 'waiting' | 'idle' | 'completed' | 'failed' | 'killed'

export type CrewTokens = { input: number; output: number; cacheRead: number; cacheWrite: number }

// One agent of the session, kept after the engine forgets it: the history.
export type CrewMember = {
  id: string
  name: string
  type: string
  status: CrewStatus
  parentId?: string
  startedAt: number
  endedAt?: number
  model?: string
  effort?: string
  tokens: CrewTokens
  // Prompt size of its last request, in tokens.
  context: number
  // Estimated from list prices, in USD.
  cost: number
  prompt?: string
  answer?: string
}

// A subscription's usage window as the last API response reported it.
export type CrewLimit = { kind: string; percentUsed: number; resetsAt?: string }

export type CrewMain = {
  model?: string
  effort?: string
  context?: number
  window?: number
  // The session's whole cost as /cost totals it, subagents included.
  usd?: number
  startedAt?: number
  // five_hour (the current session) and seven_day (the week); empty off a subscription.
  limits?: CrewLimit[]
  // When that reading was taken, by this session or another.
  limitsAt?: number
}

declare module 'claude-code' {
  interface PluginState {
    'agent-crew': { agents: CrewMember[]; isMainBusy: boolean; main: CrewMain; expanded: string; now: number }
  }
}
