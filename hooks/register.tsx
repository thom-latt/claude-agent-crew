import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { CrewLimit, CrewMain, CrewMember, CrewTokens } from '../types'

const PANE = 'agent-crew'
const TITLE = 'Agents'
const agents = atom({ plugin: 'agent-crew', key: 'agents' } as const, [])
const isMainBusy = atom({ plugin: 'agent-crew', key: 'isMainBusy' } as const, false)
const mainStats = atom({ plugin: 'agent-crew', key: 'main' } as const, {})
const expanded = atom({ plugin: 'agent-crew', key: 'expanded' } as const, '')
const clockNow = atom({ plugin: 'agent-crew', key: 'now' } as const, 0)

const ORANGE = '#D97757'
const INK = '#2b1d16'

// top: the hat's highest point in the figure's units (its feet stand at 28); the band centres each figure on it.
type Outfit = { name: string; top: number; hat: string; extra: string; tty: string; color: string }

const bowTie = (c: string) =>
  `<path d="M13 20.5 L16 22 L13 23.5Z M19 20.5 L16 22 L19 23.5Z" fill="${c}"/><rect x="15.3" y="21.3" width="1.4" height="1.4" fill="${c}"/>`
const scarf = (c: string) =>
  `<rect x="8" y="20.5" width="16" height="2" fill="${c}"/><rect x="18" y="22.5" width="2.2" height="4" fill="${c}"/>`
const tie = `<path d="M15 20 h2 l-0.3 1 l0.8 3 l-1.5 1 l-1.5 -1 l0.8 -3z" fill="#2e86de"/>`
const monocle = `<circle cx="19.5" cy="18" r="2.4" fill="none" stroke="#d4af37" stroke-width="0.6"/><path d="M21.6 19.2 L23 23" stroke="#d4af37" stroke-width="0.4"/>`
const shades = `<rect x="10.5" y="16.5" width="4.5" height="3" rx="0.8" fill="#111"/><rect x="17" y="16.5" width="4.5" height="3" rx="0.8" fill="#111"/><rect x="15" y="17.3" width="2" height="0.8" fill="#111"/>`

const KING: Outfit = {
  name: 'King',
  top: 6,
  color: '#F5C542',
  tty: '  ▗▙▟▙▟▖',
  hat: `<path d="M9 14 V8 L12.5 11 L16 6 L19.5 11 L23 8 V14 Z" fill="#F5C542" stroke="#b8860b" stroke-width="0.5"/><circle cx="16" cy="11.5" r="1" fill="#e74c3c"/><circle cx="12" cy="12.5" r="0.7" fill="#3498db"/><circle cx="20" cy="12.5" r="0.7" fill="#3498db"/>`,
  extra: bowTie('#8e44ad'),
}

const WARDROBE: Outfit[] = [
  {
    name: 'Gentleman',
    top: 4,
    color: '#888888',
    tty: '  ▄███▄',
    hat: `<rect x="11" y="4" width="10" height="9" fill="#222"/><rect x="11" y="10" width="10" height="1.6" fill="#c0392b"/><rect x="8" y="12.6" width="16" height="1.6" fill="#222"/>`,
    extra: monocle,
  },
  {
    name: 'Wizard',
    top: 1,
    color: '#6c4fd6',
    tty: '    ▲',
    hat: `<path d="M8 14 L24 14 L17 1 Z" fill="#6c4fd6"/><circle cx="15" cy="9" r="1" fill="#ffd34d"/><circle cx="18.5" cy="11.5" r="0.7" fill="#ffd34d"/><circle cx="16.5" cy="5.5" r="0.6" fill="#ffd34d"/>`,
    extra: '',
  },
  {
    name: 'Cowboy',
    top: 6.5,
    color: '#a0672f',
    tty: ' ▁▄███▄▁',
    hat: `<path d="M11.5 13 L12.5 6.5 Q16 8.5 19.5 6.5 L20.5 13 Z" fill="#a0672f"/><rect x="11.8" y="11" width="8.4" height="1.2" fill="#5d3a1a"/><ellipse cx="16" cy="13.4" rx="10" ry="1.5" fill="#8b5a2b"/>`,
    extra: scarf('#c0392b'),
  },
  {
    name: 'Party',
    top: 1.4,
    color: '#ff5ea8',
    tty: '    ▲',
    hat: `<path d="M11 14 L21 14 L16 3 Z" fill="#ff5ea8"/><path d="M12.7 10.5 H19.3 M14.3 7 H17.7" stroke="#fff" stroke-width="1"/><circle cx="16" cy="3" r="1.6" fill="#ffe14d"/>`,
    extra: bowTie('#2ecc71'),
  },
  {
    name: 'Cozy',
    top: 3.5,
    color: '#2e86de',
    tty: '   ▄█▄',
    hat: `<path d="M9 14 Q9 6 16 6 Q23 6 23 14 Z" fill="#2e86de"/><rect x="8.5" y="12" width="15" height="2.2" fill="#1b5fa8"/><circle cx="16" cy="5.5" r="2" fill="#fff"/>`,
    extra: scarf('#f39c12'),
  },
  {
    name: 'Chef',
    top: 3,
    color: '#dddddd',
    tty: '  ▟███▙',
    hat: `<g fill="#fff" stroke="#bbb" stroke-width="0.5"><circle cx="12.5" cy="8" r="3"/><circle cx="16" cy="6.5" r="3.5"/><circle cx="19.5" cy="8" r="3"/><rect x="11" y="9" width="10" height="5"/></g><g fill="#fff"><circle cx="12.5" cy="8" r="2.7"/><circle cx="16" cy="6.5" r="3.2"/><circle cx="19.5" cy="8" r="2.7"/><rect x="11.3" y="9" width="9.4" height="4.7"/></g>`,
    extra: '',
  },
  {
    name: 'Scholar',
    top: 5,
    color: '#555555',
    tty: ' ▄▄███▄▄',
    hat: `<rect x="11" y="9.5" width="10" height="4.5" fill="#222"/><path d="M5 9 L16 5 L27 9 L16 13 Z" fill="#333"/><path d="M16 9 L24.5 10 V14" stroke="#f1c40f" stroke-width="0.7" fill="none"/><circle cx="24.5" cy="14.3" r="0.8" fill="#f1c40f"/>`,
    extra: tie,
  },
  {
    name: 'Viking',
    top: 3,
    color: '#9aa3ad',
    tty: ' ▚ ▄█▄ ▞',
    hat: `<path d="M9 14 Q9 7 16 7 Q23 7 23 14 Z" fill="#9aa3ad"/><rect x="8.5" y="12.5" width="15" height="1.8" fill="#6b7480"/><path d="M9.5 11 Q5 9 6 3 Q8 8 11 9 Z" fill="#f3e5c8"/><path d="M22.5 11 Q27 9 26 3 Q24 8 21 9 Z" fill="#f3e5c8"/>`,
    extra: '',
  },
  {
    name: 'Builder',
    top: 6,
    color: '#f7c600',
    tty: ' ▁▟███▙▁',
    hat: `<path d="M9.5 13 Q9.5 6 16 6 Q22.5 6 22.5 13 Z" fill="#f7c600"/><rect x="15" y="6" width="2" height="7" fill="#e0b000"/><rect x="7" y="12.5" width="18" height="1.8" fill="#f7c600"/>`,
    extra: '',
  },
  {
    name: 'DJ',
    top: 7,
    color: '#e74c3c',
    tty: ' ╭─────╮',
    hat: `<path d="M7.5 17 Q7.5 7 16 7 Q24.5 7 24.5 17" fill="none" stroke="#333" stroke-width="1.6"/><rect x="5.5" y="14" width="3.5" height="5" rx="1" fill="#e74c3c"/><rect x="23" y="14" width="3.5" height="5" rx="1" fill="#e74c3c"/>`,
    extra: shades,
  },
  {
    name: 'Artist',
    top: 8.6,
    color: '#c0392b',
    tty: '  ▄▄▄▄▄',
    hat: `<ellipse cx="15" cy="12.5" rx="8.5" ry="2.8" fill="#c0392b"/><rect x="14.5" y="8.6" width="1.2" height="1.6" fill="#c0392b"/>`,
    extra: scarf('#1abc9c'),
  },
]

// Stable per agent id: the same agent keeps its outfit across redraws and reloads.
export const outfitFor = (id: string): Outfit => {
  if (id === 'main') return KING
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return WARDROBE[Math.abs(hash) % WARDROBE.length] ?? KING
}

type Status = CrewMember['status']

const LABEL: Record<Status, { text: string; color: string }> = {
  pending: { text: '… starting', color: '#3498db' },
  running: { text: '● working', color: ORANGE },
  waiting: { text: '◐ waiting', color: '#C9A227' },
  idle: { text: '○ idle', color: '#95a5a6' },
  completed: { text: '✓ done', color: '#2ecc71' },
  failed: { text: '✗ failed', color: '#e74c3c' },
  killed: { text: '✗ stopped', color: '#e74c3c' },
}

const isActive = (s: Status) => s === 'running' || s === 'pending' || s === 'waiting'

const rect = (x: number, y: number, w: number, hh: number) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="${ORANGE}"/>`
const spin = (type: string, values: string, dur: string, more = '') =>
  `<animateTransform attributeName="transform" type="${type}" values="${values}" dur="${dur}"${more} repeatCount="indefinite"/>`
const tween = (attr: string, values: string, dur: string, more = '') =>
  `<animate attributeName="${attr}" values="${values}" dur="${dur}"${more} repeatCount="indefinite"/>`

// One hop = 0.6s: ease out going up, ease in coming down.
const HOP = ` calcMode="spline" keyTimes="0;0.5;1" keySplines="0 0 0.58 1;0.42 0 1 1"`
const STAR = 'M0 -1.6L0.4 -0.4L1.6 0L0.4 0.4L0 1.6L-0.4 0.4L-1.6 0L-0.4 -0.4Z'
const sparkle = (x: number, y: number, begin: string) =>
  `<g transform="translate(${x} ${y})"><g opacity="0">` +
  spin('translate', '0 2;0 -3', '1.2s', ` begin="${begin}"`) +
  tween('opacity', '0;1;0', '1.2s', ` begin="${begin}"`) +
  `<path d="${STAR}" fill="#ffc94d">${spin('rotate', '0;90', '1.2s', ` begin="${begin}"`)}</path></g></g>`

// The default view leaves room for the hop and the badges; the band crops tighter (see bandSvg).
export const mascotSvg = (outfit: Outfit, status: Status, viewBox = '-2 -4 36 36'): string => {
  const isWorking = status === 'running' || status === 'pending'
  // Working: legs tap and arms type in alternation, eyes blink, hat lags behind the hop.
  const legs = (a: number, b: number, begin: string) =>
    `<g>${isWorking ? spin('translate', '0 0;0 -1;0 0', '0.3s', ` begin="${begin}"`) : ''}${rect(a, 24, 2, 4)}${rect(b, 24, 2, 4)}</g>`
  const arm = (x: number, angle: number, begin: string) =>
    `<g>${isWorking ? spin('rotate', `0 ${x} 19.5;${angle} ${x} 19.5;0 ${x} 19.5`, '0.3s', ` begin="${begin}"`) : ''}${rect(angle > 0 ? x - 4 : x, 18, 4, 3)}</g>`
  const body = legs(10, 17, '0s') + legs(13, 20, '0.15s') + rect(8, 14, 16, 10) + arm(8, 35, '0s') + arm(24, -35, '0.15s')
  const eyes =
    status === 'failed' || status === 'killed'
      ? `<path d="M11 17l3 3M14 17l-3 3M18 17l3 3M21 17l-3 3" stroke="${INK}" stroke-width="1"/>`
      : isActive(status)
        ? [11.5, 18.5]
            .map(
              x =>
                `<rect x="${x}" y="16.5" width="2" height="3" fill="${INK}">` +
                (isWorking
                  ? tween('height', '3;3;0.4;3', '2.8s', ' keyTimes="0;0.92;0.96;1"') +
                    tween('y', '16.5;16.5;17.8;16.5', '2.8s', ' keyTimes="0;0.92;0.96;1"')
                  : '') +
                `</rect>`,
            )
            .join('')
        : `<rect x="11" y="18.5" width="3" height="1" fill="${INK}"/><rect x="18" y="18.5" width="3" height="1" fill="${INK}"/>`
  const hat = isWorking ? `<g>${spin('rotate', '0 16 14;-5 16 14;0 16 14;5 16 14;0 16 14', '1.2s')}${outfit.hat}</g>` : outfit.hat
  const figure = body + eyes + outfit.extra + hat
  const shadow = isWorking
    ? `<ellipse cx="16" cy="29" rx="7" ry="0.9" fill="#000" opacity="0.2">${tween('rx', '7.5;5;7.5', '0.6s', HOP)}${tween('opacity', '0.22;0.08;0.22', '0.6s', HOP)}</ellipse>`
    : ''
  // Squash on landing, stretch at the top, both pivoting on the feet.
  const animated = isWorking
    ? `<g>${spin('translate', '0 0;0 -2.5;0 0', '0.6s', HOP)}<g transform="translate(16 28)"><g>${spin('scale', '1.08 0.9;1 1;0.97 1.04;1 1;1.08 0.9', '0.6s', ' keyTimes="0;0.15;0.5;0.85;1"')}<g transform="translate(-16 -28)">${figure}</g></g></g></g>` +
      sparkle(28, 14, '0s') +
      sparkle(4, 12, '0.4s') +
      sparkle(27, 5, '0.8s')
    : status === 'waiting'
      ? `<g>${spin('rotate', '-5 16 28;5 16 28;-5 16 28', '1.6s')}${figure}</g>`
      : figure
  const zzz = (begin: string) =>
    `<text x="25" y="12" font-size="5" font-family="sans-serif" font-weight="bold" fill="#8899aa" opacity="0">z<animate attributeName="y" values="12;3" dur="2.4s" begin="${begin}" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="2.4s" begin="${begin}" repeatCount="indefinite"/></text>`
  const badge =
    status === 'idle'
      ? zzz('0s') + zzz('1.2s')
      : status === 'completed'
        ? `<circle cx="27" cy="27" r="4" fill="#2ecc71"/><path d="M25 27 l1.5 1.5 l3 -3" stroke="#fff" stroke-width="1" fill="none"/>`
        : status === 'failed' || status === 'killed'
          ? `<circle cx="27" cy="27" r="4" fill="#e74c3c"/><path d="M25.5 25.5 l3 3 M28.5 25.5 l-3 3" stroke="#fff" stroke-width="1"/>`
          : ''
  const faded = status === 'completed' || status === 'failed' || status === 'killed'

  return (
    // Margin around the 32×32 figure so the hop and the stretch never clip the hat.
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">` +
    `<title>${outfit.name} · ${LABEL[status].text}</title>` +
    `<defs><filter id="dull"><feColorMatrix type="saturate" values="0.25"/></filter></defs>` +
    shadow +
    `<g${faded ? ' opacity="0.55" filter="url(#dull)"' : ''}>${animated}</g>` +
    badge +
    `</svg>`
  )
}

// Depth-first so each subagent sits right under the agent that spawned it.
const asTree = (list: CrewMember[]) => {
  const ids = new Set(list.map(m => m.id))
  const out: { member: CrewMember; depth: number }[] = []
  const walk = (parentId: string, depth: number) => {
    for (const m of list) {
      const parent = m.parentId && ids.has(m.parentId) ? m.parentId : 'main'
      if (parent === parentId && m.id !== 'main') {
        out.push({ member: m, depth })
        walk(m.id, depth + 1)
      }
    }
  }
  walk('main', 1)

  return out
}

// The desktop lays its band out in lines of 1lh (19px, 20 when comfortable) padded to 40px, and
// tops its actions (our ⤢) on the first line: a drawing one line tall keeps the band at its
// minimum height with everything on one centre line.
const BAND_H = 20
const PILL_W = 92
const PILL_H = 18
const MAX_STRIP = 10
// The figure spans x 4-28 and y top-28 of the mascot's 32 units: a 30-unit square around its own
// centre fills the line, so a tall wizard hat and a flat beret sit on the same centre line.
const bandMascotView = (outfit: Outfit) => `1 ${(outfit.top + 28) / 2 - 15} 30 30`
const FONT = 'font-family="-apple-system,BlinkMacSystemFont,system-ui,sans-serif"'
// Centres capitals and digits on the line: half the system font's cap height (0.7em) below the middle.
const baseline = (fontSize: number) => BAND_H / 2 + fontSize * 0.35

// The subscription's usage windows: the current session's five hours and the week.
const WINDOWS = [
  { kind: 'five_hour', label: '5h', name: 'Current session (5h)' },
  { kind: 'seven_day', label: '7d', name: 'Weekly (7d)' },
] as const
const GRAY = '#8a8a8a'
// Gray until a limit gets close: amber from 75% used, red from 90%.
const limitColor = (used: number) => (used >= 90 ? '#E5484D' : used >= 75 ? '#D4A027' : GRAY)

// "now", "41m", "2h 14m", "3d 4h": the time left before a window resets.
export const fmtIn = (ms: number) => {
  const m = Math.floor(ms / 60_000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ${String(m % 60).padStart(2, '0')}m`

  return `${Math.floor(h / 24)}d ${h % 24}h`
}
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
// "16:45" today, "Mon 09:00" any other day, in local time.
export const fmtAt = (at: number, now: number) => {
  const d = new Date(at)
  const p = (n: number) => String(n).padStart(2, '0')
  const hm = `${p(d.getHours())}:${p(d.getMinutes())}`

  return new Date(now).toDateString() === d.toDateString() ? hm : `${DAYS[d.getDay()]} ${hm}`
}

// used: % of the window used (absent when there is no reading to show); text: the number drawn; tip: the tooltip line.
export type LimitRow = { label: string; used?: number; isMissing?: boolean; color: string; text: string; tip: string }

// One row per window, a missing one included so the gauge never jumps; none at all off a subscription.
export const limitRows = (limits: readonly CrewLimit[] | undefined, now: number): LimitRow[] => {
  if (!limits?.some(l => WINDOWS.some(w => w.kind === l.kind))) return []

  return WINDOWS.map(({ kind, label, name }): LimitRow => {
    const limit = limits.find(l => l.kind === kind)
    if (!limit) return { label, isMissing: true, color: GRAY, text: '—', tip: `${name}: not reported` }
    const resetsAt = limit.resetsAt ? Date.parse(limit.resetsAt) : NaN
    if (resetsAt <= now) return { label, color: GRAY, text: '—', tip: `${name}: reset at ${fmtAt(resetsAt, now)}, waiting for a new reading` }
    const used = Math.min(100, Math.max(0, limit.percentUsed))
    const reset = Number.isNaN(resetsAt) ? '' : `resets in ${fmtIn(resetsAt - now)} (${fmtAt(resetsAt, now)})`
    const tip =
      used >= 100
        ? `${name}: limit reached${reset ? ` · ${reset}` : ''}`
        : `${name}: ${used.toFixed(1)}% used · ${(100 - used).toFixed(1)}% left${reset ? `\n  ${reset}` : ''}`

    // Rounded down: 100% only once the limit is really reached.
    return { label, used, color: limitColor(used), text: `${Math.floor(used)}%`, tip }
  })
}

const LIMITS_W = 74
const LIMITS_GAP = 10
const TRACK_X = 16
// Ends 4px clear of the widest number, "100%" (29px at 10px semibold).
const TRACK_W = 25
// Two half-lines in the band's one line: the label, a 3px bar of the % used, the number; one tooltip for both.
// Says how old the reading is once it is: usage elsewhere (claude.ai, another device) only shows at the next one.
export const limitsHeading = (at: number | undefined, now: number) =>
  `Claude usage limits${at && now - at >= 5 * 60_000 ? ` · as of ${fmtAt(at, now)}` : ''}`

const limitsSvg = (rows: LimitRow[], heading: string) =>
  rows
    .map((r, i) => {
      const mid = BAND_H / 4 + (i * BAND_H) / 2
      const fill = !r.used ? 0 : Math.max(1.5, (TRACK_W * r.used) / 100)
      const text = (x: number, s: string, paint: string, more = '') =>
        `<text x="${x}" y="${mid + 3.5}" ${FONT} font-size="10" font-weight="600" fill="${paint}"${more}>${s}</text>`

      return (
        text(0, r.label, GRAY, r.isMissing ? ' opacity="0.45"' : '') +
        `<rect x="${TRACK_X}" y="${mid - 1.5}" width="${TRACK_W}" height="3" rx="1.5" fill="${GRAY}" opacity="0.28"/>` +
        (fill
          ? `<rect x="${TRACK_X}" y="${mid - 1.5}" width="${fill}" height="3" rx="1.5" fill="${r.color}">` +
            ((r.used ?? 0) >= 100 ? tween('opacity', '1;0.45;1', '2s') : '') +
            `</rect>`
          : '') +
        text(LIMITS_W, r.text, r.color, ' text-anchor="end" style="font-variant-numeric:tabular-nums"')
      )
    })
    .join('') +
  `<rect width="${LIMITS_W}" height="${BAND_H}" fill="transparent"><title>${[heading, ...rows.map(r => r.tip)].join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</title></rect>`

// The band: a progress pill (active / total, a shine sweeping while any works) and a strip of mini mascots.
export const bandSvg = (crew: CrewMember[], active: number, usd?: number, limits: LimitRow[] = [], heading = limitsHeading(undefined, 0)) => {
  const shown = crew.slice(0, MAX_STRIP)
  const more = crew.length - shown.length
  const fill = crew.length ? Math.round((PILL_W * active) / crew.length) : 0
  const pillY = (BAND_H - PILL_H) / 2
  const bar = (width: number | string, paint: string) => `<rect y="${pillY}" width="${width}" height="${PILL_H}"${paint}/>`
  const pill =
    `<defs><clipPath id="pill"><rect y="${pillY}" width="${PILL_W}" height="${PILL_H}" rx="${PILL_H / 2}"/></clipPath>` +
    `<clipPath id="fill">${bar(fill, '')}</clipPath>` +
    `<linearGradient id="shine"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>` +
    `<g clip-path="url(#pill)">${bar(PILL_W, ' fill="#4a4458"')}${bar(fill, ` fill="${ORANGE}"`)}` +
    (active ? `<g clip-path="url(#fill)"><rect y="${pillY}" width="28" height="${PILL_H}" fill="url(#shine)">${tween('x', `-28;${fill}`, '1.4s')}</rect></g>` : '') +
    `</g><text x="${PILL_W / 2}" y="${baseline(11)}" text-anchor="middle" ${FONT} font-size="11" font-weight="600" fill="#fff">Agents ${active}/${crew.length}</text>`
  const stripX = PILL_W + 6
  const strip = shown
    .map((m, i) =>
      mascotSvg(outfitFor(m.id), m.status, bandMascotView(outfitFor(m.id))).replace(
        '<svg ',
        `<svg x="${stripX + i * BAND_H}" y="0" width="${BAND_H}" height="${BAND_H}" `,
      ),
    )
    .join('')
  // The session's cost sits on the same line, right after the strip (7px a glyph is wide enough).
  const label = `${more ? `+${more}  ` : ''}${usd === undefined ? '' : `${usd < 0.01 ? '' : '≈'}${fmtCost(usd)}`}`
  const textX = stripX + shown.length * BAND_H + 4
  const width = textX + label.length * 7 + 4
  const extra = label
    ? `<text x="${textX}" y="${baseline(12)}" ${FONT} font-size="12" font-weight="500" fill="#8a8a8a" xml:space="preserve">${label.replace(/</g, '&lt;')}</text>`
    : ''

  // The limits gauge leads, in a group of its own; everything else moves right of it.
  const shift = limits.length ? LIMITS_W + LIMITS_GAP : 0

  return {
    width: shift + width,
    source:
      `<svg xmlns="http://www.w3.org/2000/svg" width="${shift + width}" height="${BAND_H}" viewBox="0 0 ${shift + width} ${BAND_H}">` +
      `${limits.length ? limitsSvg(limits, heading) : ''}<g transform="translate(${shift} 0)">${pill}${strip}${extra}</g></svg>`,
  }
}


// $/MTok list prices, from platform.claude.com/docs/en/about-claude/pricing (read 2026-10-15):
// [model id fragment, input, output, cache read]; first match wins, so the specific ids come first.
// Matches API ids and Bedrock (us.anthropic.claude-…-v1:0) and Vertex (claude-…@date) ids alike.
// ponytail: cache writes at the 5-minute 1.25× (1-hour ones bill 2×; a step's usage does not say which);
// fast mode and US-only inference (1.1×) not modelled: the session total from /cost is the exact one.
type Price = [fragment: string, input: number, output: number, cacheRead: number]
const PRICES: Price[] = [
  ['fable-5-1', 10, 50, 0.25],
  ['mythos-5-1', 10, 50, 0.25],
  ['fable', 10, 50, 1], // Fable 5
  ['mythos', 10, 50, 1], // Mythos 5
  ['opus-5-5', 4, 20, 0.2],
  ['opus-4-1', 15, 75, 1.5],
  ['opus-4-0', 15, 75, 1.5], // Opus 4, by its alias
  ['opus-4-2025', 15, 75, 1.5], // Opus 4, dated
  ['opus-4@', 15, 75, 1.5], // Opus 4 on Vertex
  ['opus', 5, 25, 0.5], // Opus 5, 4.8, 4.7, 4.6, 4.5
  ['sonnet-5-5', 2, 10, 0.1],
  ['sonnet-4', 3, 15, 0.3], // Sonnet 4.6, 4.5, 4
  ['sonnet', 2, 10, 0.2], // Sonnet 5
  ['haiku-5', 0.1, 0.5, 0.01], // Haiku 5.5, prompts up to 100K tokens
  ['3-5-haiku', 0.8, 4, 0.08],
  ['haiku', 1, 5, 0.1], // Haiku 4.5
]
// Haiku 5.5 bills a request whose prompt (input, cache reads and cache writes) is over 100K tokens higher.
const HAIKU_LONG: Price = ['haiku-5', 0.5, 2.5, 0.05]
const HAIKU_LONG_OVER = 100_000

// One request's cost; an unknown model costs nothing rather than a guess.
export const costOf = (model: string, t: CrewTokens) => {
  const isLong = model.includes(HAIKU_LONG[0]) && t.input + t.cacheRead + t.cacheWrite > HAIKU_LONG_OVER
  const price = isLong ? HAIKU_LONG : PRICES.find(([fragment]) => model.includes(fragment))
  if (!price) return 0
  const [, input, output, cacheRead] = price

  return (t.input * input + t.cacheWrite * input * 1.25 + t.cacheRead * cacheRead + t.output * output) / 1e6
}

// 1M from the 4.6 models on; the earlier ones hold 200K, unless run with the 1M beta ([1m]).
const SMALL_WINDOW = ['opus-4-5', 'opus-4-1', 'opus-4-0', 'opus-4-2025', 'opus-4@', 'sonnet-4-5', 'sonnet-4-0', 'sonnet-4-2025', 'sonnet-4@', 'haiku-4', 'claude-3']
export const windowOf = (model?: string) =>
  model && !model.includes('[1m]') && SMALL_WINDOW.some(k => model.includes(k)) ? 200_000 : 1_000_000

// One model request added to an agent: its tokens summed, the context it now holds, what it cost.
export const withStep = (m: CrewMember, model: string, effort: string | undefined, step: CrewTokens): CrewMember => ({
  ...m,
  model,
  effort,
  tokens: {
    input: m.tokens.input + step.input,
    output: m.tokens.output + step.output,
    cacheRead: m.tokens.cacheRead + step.cacheRead,
    cacheWrite: m.tokens.cacheWrite + step.cacheWrite,
  },
  context: step.input + step.cacheRead + step.cacheWrite + step.output,
  cost: m.cost + costOf(model, step),
})

export const modelLabel = (model?: string) => {
  const m = model?.match(/(fable|mythos|opus|sonnet|haiku)-(\d+)(?:-(\d{1,2})\b)?/)
  if (!m) return model ?? '—'
  const [, family = '', major = '', minor] = m

  return `${family.charAt(0).toUpperCase()}${family.slice(1)} ${major}${minor ? `.${minor}` : ''}`
}

export const fmtTokens = (n: number) => (n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : `${n}`)
// Whole dollars from $100 on, from the 99.995 toFixed would round up to "100.00".
export const fmtCost = (usd: number) => (usd < 0.01 ? '<$0.01' : usd >= 99.995 ? `$${Math.round(usd)}` : `$${usd.toFixed(2)}`)
// When an agent started, in local time (the mod's environment runs in the machine's time zone):
// "16:18" today, "26-10-14 16:40" any other day; never less than the minute.
export const fmtStart = (at: number, now: number) => {
  const d = new Date(at)
  const p = (n: number) => String(n).padStart(2, '0')
  const hm = `${p(d.getHours())}:${p(d.getMinutes())}`

  return new Date(now).toDateString() === d.toDateString() ? hm : `${p(d.getFullYear() % 100)}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${hm}`
}
// 48213 -> "48,213"
export const grouped = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
export const fmtPercent = (part: number, whole: number) => {
  const pct = whole ? (part / whole) * 100 : 0

  return part > 0 && pct < 1 ? '<1%' : `${Math.round(pct)}%`
}
export const fmtElapsed = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, '0')}s`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ${String(m % 60).padStart(2, '0')}m`

  return `${Math.floor(h / 24)}d ${String(h % 24).padStart(2, '0')}h`
}

const isEnded = (s: Status) => s === 'completed' || s === 'failed' || s === 'killed'
const ZERO: CrewTokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
const fresh = (id: string, now: number): CrewMember => ({
  id,
  name: id,
  type: 'agent',
  status: 'running',
  startedAt: now,
  tokens: ZERO,
  context: 0,
  cost: 0,
})
const upsert = (list: CrewMember[], id: string, now: number, change: (m: CrewMember) => CrewMember) =>
  list.some(m => m.id === id) ? list.map(m => (m.id === id ? change(m) : m)) : [...list, change(fresh(id, now))]

type LiveAgent = { id: string; name?: string; description: string; type: string; status: Status; parentId?: string }

// The engine's live list folded into the history: nothing is ever dropped.
export const mergeLive = (list: CrewMember[], live: readonly LiveAgent[], now: number) =>
  live.reduce(
    (acc, a) =>
      upsert(acc, a.id, now, m => ({
        ...m,
        name: a.name || a.description || a.type,
        type: a.type,
        status: a.status,
        parentId: a.parentId,
        endedAt: isEnded(a.status) ? (m.endedAt ?? now) : undefined,
      })),
    list,
  )

// The history saved for a session, read back when it is resumed: whoever was still around
// stopped with the process that ran them.
type Saved = { savedAt: number; agents: CrewMember[] }
export const restore = (saved: Saved): CrewMember[] =>
  saved.agents.map(m =>
    isEnded(m.status) ? m : { ...m, status: isActive(m.status) ? 'killed' : 'completed', endedAt: m.endedAt ?? saved.savedAt },
  )
const HISTORY = 'history:'

// The limits are the account's: every session shares its readings, and each shows the latest of all.
const LIMITS = 'limits'
export type Reading = { at: number; limits: CrewLimit[] }
// A reading from the store, when it is one and newer than what the session shows.
export const newerReading = (main: CrewMain, stored: unknown): Reading | undefined => {
  const r = stored as Reading | undefined
  const isReading = typeof r?.at === 'number' && Array.isArray(r.limits) && r.limits.length > 0

  return isReading && r.at > (main.limitsAt ?? -Infinity) ? r : undefined
}

// Live agents as a tree under the King, then the history, newest first so the oldest sit at the bottom.
export const ordered = (list: CrewMember[]) => ({
  live: asTree(list.filter(m => !isEnded(m.status))),
  past: list.filter(m => isEnded(m.status)).sort((a, b) => b.startedAt - a.startedAt),
})

// The context fill, the one real 0-100% an agent has: gray, amber from 70%, red from 90%.
export const ctxColor = (pct: number) => (pct >= 90 ? '#D0453A' : pct >= 70 ? '#D9A21B' : '#8E8E8E')
export const ctxGaugeSvg = (pct: number, title: string) => {
  const fill = pct > 0 ? Math.max(2, (36 * Math.min(100, pct)) / 100) : 0

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="19" viewBox="0 0 36 19"><title>${title}</title>` +
    `<rect y="7" width="36" height="5" rx="2" fill="#8E8E8E" opacity="0.3"/>` +
    (fill ? `<rect y="7" width="${fill}" height="5" rx="2" fill="${ctxColor(pct)}"/>` : '') +
    `</svg>`
  )
}
// The terminal's gauge: five cells.
export const ctxCells = (pct: number) => {
  const n = Math.min(5, Math.round(pct / 20))

  return '▰'.repeat(n) + '▱'.repeat(5 - n)
}

// One key per session (the transcript's id, which a resume keeps).
const save = async ($: EngineInterface, agents: CrewMember[], savedAt: number) => {
  const key = HISTORY + (await $.session.id())
  for (let tries = 0; ; tries++) {
    try {
      return await $.store.set(key, { savedAt, agents } satisfies Saved)
    } catch (err) {
      // The store holds 4 MiB in all: the oldest session's history makes room (keys keep their first-save order).
      const oldest = (await $.store.keys()).find(k => k.startsWith(HISTORY) && k !== key)
      if (!oldest || tries === 3) throw err
      await $.store.delete(oldest)
    }
  }
}

// Starts at the empty list: a session that never spawns an agent saves nothing.
let lastSaved = '[]'
let lastSavedAt = 0

// ponytail: saves at most every 5s while agents change, and at the end; a crash loses those last seconds
const persist = async ($: EngineInterface, now: number, isFinal = false) => {
  const list = await read($, agents)
  const json = JSON.stringify(list)
  if (json === lastSaved || (!isFinal && now - lastSavedAt < 5000)) return
  await save($, list, now)
  lastSaved = json
  lastSavedAt = now
}

export const register: Register = on => {
  let lastLive = ''
  let lastMain = ''
  let lastShared = 0

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'crew', description: 'Show your agents and subagents live' })

    // A resumed session gets its history back; a hot reload still holds it in $.state.
    try {
      const saved = (await $.store.get(HISTORY + (await $.session.id()))) as Saved | undefined
      if (saved && Array.isArray(saved.agents) && !(await read($, agents)).length) await update($, agents, () => restore(saved))
    } catch {
      // a session without its history still runs
    }

    // ponytail: 1s poll of $.agent.list() and $.session.usage(); no event gives every status change
    $.clock.every(1000, async () => {
      try {
        const t = await $.clock.now()
        const live = await $.agent.list()
        const liveJson = JSON.stringify(live)
        if (liveJson !== lastLive) {
          await update($, agents, list => mergeLive(list, live, t))
          lastLive = liveJson // only once written, so a failed write is retried next tick
        }

        const usage = await $.session.usage()
        const main = {
          context: usage.context.tokens,
          window: usage.context.window,
          usd: usage.cost?.usd,
          startedAt: usage.startedAt,
        }
        const mainJson = JSON.stringify(main)
        if (mainJson !== lastMain) {
          await update($, mainStats, m => ({ ...m, ...main }))
          lastMain = mainJson
        }

        // Another session's newer reading of the limits.
        if (t - lastShared >= 10_000) {
          lastShared = t
          const newer = newerReading(await read($, mainStats), await $.store.get(LIMITS))
          if (newer) await update($, mainStats, m => ({ ...m, limits: newer.limits, limitsAt: newer.at }))
        }

        // Elapsed times tick every second while someone works; the limits' reset times once a minute otherwise.
        const isBusy = (await read($, isMainBusy)) || (await read($, agents)).some(m => isActive(m.status))
        if (isBusy || t - (await read($, clockNow)) >= 60_000) {
          await update($, clockNow, () => t)
        }

        await persist($, t)
      } catch {
        // a failed tick is retried by the next one
      }
    })

    return next(e)
  })

  // Each API response reports the limits: a new reading when a window moved a whole point.
  on('session.measure', async ($, e, next) => {
    try {
      if (e.changed.includes('rateLimits') && e.rateLimits.length) {
        const reading: Reading = { at: await $.clock.now(), limits: e.rateLimits }
        await update($, mainStats, m => ({ ...m, limits: reading.limits, limitsAt: reading.at }))
        await $.store.set(LIMITS, reading)
      }
    } catch {
      // the next reading tries again
    }

    return next(e)
  })

  on('session.end', async ($, e, next) => {
    try {
      await persist($, await $.clock.now(), true)
    } catch {
      // the last tick's save stands
    }

    return next(e)
  })

  on('command.run', { command: 'crew' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })

    return { text: 'Agents pane opened.' }
  })

  on('agent.spawn', async ($, e, next) => {
    const spawned = await next(e)
    const id = spawned.deny === undefined ? spawned.agentId : undefined
    if (id) {
      try {
        const t = await $.clock.now()
        await update($, agents, list =>
          upsert(list, id, t, m => ({
            ...m,
            name: e.name || e.description || e.subagentType,
            type: e.subagentType,
            parentId: e.parentAgentId,
            status: 'running',
            startedAt: t,
            model: m.model ?? spawned.model,
            prompt: e.prompt.slice(0, 1500),
          })),
        )
      } catch {
        // the poll still lists it
      }
    }

    return spawned
  }).catch(($, e, next) => next(e))

  // Every model request, main's and each subagent's: model, effort and what it cost.
  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e)
    try {
      const effort = e.effort === undefined ? undefined : String(e.effort)
      const id = e.agentId
      const usage = result.usage
      if (!id) {
        const m = await read($, mainStats)
        if (m.model !== e.model || m.effort !== effort) await update($, mainStats, s => ({ ...s, model: e.model, effort }))
      } else if (usage) {
        const step: CrewTokens = {
          input: usage.input_tokens,
          output: usage.output_tokens,
          cacheRead: usage.cache_read_input_tokens,
          cacheWrite: usage.cache_creation_input_tokens,
        }
        const model = usage.model || e.model
        // Only agents already known: the engine's own forks (compaction, memory) carry ids of their own.
        await update($, agents, list => list.map(m => (m.id === id ? withStep(m, model, effort, step) : m)))
      }
    } catch {
      // metrics are best effort
    }

    return result
  })

  on('turn.start', async ($, e, next) => {
    await update($, isMainBusy, () => true)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    try {
      const id = e.agentId
      if (!id) {
        await update($, isMainBusy, () => false)
      } else {
        const t = await $.clock.now()
        await update($, agents, list =>
          list.map(m =>
            m.id === id
              ? { ...m, answer: e.answer.slice(0, 6000), endedAt: t, status: isActive(m.status) ? 'completed' : m.status }
              : m,
          ),
        )
      }
    } catch {
      // the poll catches up
    }

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text, Button, Markdown } = ui
    const Svg = e.surface !== 'terminal' && 'Svg' in ui ? ui.Svg : undefined
    const list = await read($, agents)
    const busy = await read($, isMainBusy)
    const main = await read($, mainStats)
    const open = await read($, expanded)
    const t = (await read($, clockNow)) || (await $.clock.now())
    const king: CrewMember = {
      ...fresh('main', main.startedAt ?? t),
      name: 'Claude',
      type: 'main',
      status: busy ? 'running' : 'idle',
      model: main.model,
      effort: main.effort,
      context: main.context ?? 0,
      // Its own share: the session's total less what the subagents spent.
      cost: Math.max(0, (main.usd ?? 0) - list.reduce((sum, m) => sum + m.cost, 0)),
    }
    const { live, past } = ordered(list)
    const active = [king, ...list].filter(m => isActive(m.status)).length
    // Every number sits in a fixed, right-aligned slot; the start column takes a date only when one is not today.
    const whenW = [king, ...list].some(m => fmtStart(m.startedAt, t).length > 5) ? 14 : 5
    const VALUE_W = 8
    // Narrow panes drop the start first, then the gauge.
    const showStart = e.props.bodyColumns >= 56
    const showGauge = e.props.bodyColumns >= 46

    const row = (m: CrewMember, depth: number) => {
      const isKing = m.id === 'main'
      const label = LABEL[m.status]
      const isLive = !isEnded(m.status)
      const window = isKing ? (main.window ?? windowOf(m.model)) : windowOf(m.model)
      const pct = window ? (m.context / window) * 100 : 0
      const isOpen = open === m.id
      const toggle = !isKing && (m.answer || m.prompt) && (
        <Button
          key={`report-${m.id}`}
          plain
          label={isOpen ? '▾ report' : '▸ report'}
          onPress={() => update($, expanded, cur => (cur === m.id ? '' : m.id))}
        />
      )
      const report = isOpen && (
        <Box paddingLeft={depth * 2 + 2} flexDirection="column">
          {m.prompt && <Markdown key={`prompt-${m.id}`} dimColor text={`**Task**\n\n${m.prompt}`} />}
          <Markdown key={`answer-${m.id}`} text={m.answer ? `**Report**\n\n${m.answer}` : '_No report yet._'} />
        </Box>
      )
      const info = (
        <Box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0}>
          <Text bold dimColor={!isActive(m.status)} wrap="truncate-end">
            {depth > 0 ? '↳ ' : ''}
            {m.name}
          </Text>
          <Text dimColor wrap="truncate-end">
            {m.type} · {modelLabel(m.model)} · {m.effort ?? '—'}
          </Text>
          <Box flexDirection="row" columnGap={1}>
            <Text color={label.color}>{label.text}</Text>
            {toggle}
          </Box>
        </Box>
      )
      // Three lines level with the info's: start and duration, cost, context (live agents only).
      const tokens = isKing
        ? ''
        : ` · in ${fmtTokens(m.tokens.input)} · out ${fmtTokens(m.tokens.output)} · cache read ${fmtTokens(m.tokens.cacheRead)} · cache write ${fmtTokens(m.tokens.cacheWrite)}`
      const ctxTitle = `context ${grouped(m.context)} / ${grouped(window)}${tokens}`
      const gauge = Svg ? (
        <Box height={1} alignItems="center">
          <Svg source={ctxGaugeSvg(pct, ctxTitle)} alt={ctxTitle} width={36} height={19} isInteractive />
        </Box>
      ) : (
        <Text color={ctxColor(pct)}>{ctxCells(pct)}</Text>
      )
      const hasGauge = isLive && showGauge
      const when = (showStart || hasGauge) && (
        <Box width={whenW} flexDirection="column" alignItems="flex-end">
          <Text dimColor>{showStart ? fmtStart(m.startedAt, t) : ' '}</Text>
          <Text> </Text>
          {hasGauge && gauge}
        </Box>
      )
      const values = (
        <Box width={VALUE_W} flexDirection="column" alignItems="flex-end">
          {/* The ticking duration is what says a live agent is alive; waiting is the state likely to need you. */}
          <Text dimColor={!isLive} color={m.status === 'waiting' ? LABEL.waiting.color : undefined}>
            {fmtElapsed((m.endedAt ?? Math.max(t, m.startedAt)) - m.startedAt)}
          </Text>
          <Text dimColor>{fmtCost(m.cost)}</Text>
          {isLive && (
            <Text dimColor={pct < 70} color={pct >= 70 ? ctxColor(pct) : undefined}>
              {m.context ? fmtPercent(m.context, window) : '—'}
            </Text>
          )}
        </Box>
      )

      return (
        <Box key={m.id} flexDirection="column">
          <Box flexDirection="row" alignItems="center" columnGap={1} paddingLeft={depth * 2}>
            {Svg && (
              <Svg source={mascotSvg(outfitFor(m.id), m.status)} alt={`${m.name}: ${label.text}`} width={44} height={44} isInteractive />
            )}
            {info}
            <Box flexDirection="row" columnGap={2} flexShrink={0} alignSelf="flex-start">
              {when}
              {values}
            </Box>
          </Box>
          {report}
        </Box>
      )
    }

    return (
      <Box flexDirection="column" gap={1}>
        {/* The total sits in the cost column's slot, as its sum. */}
        <Box flexDirection="row" justifyContent="space-between">
          <Text dimColor>
            {active} active · {list.length + 1 - active} resting
          </Text>
          <Box width={VALUE_W} flexDirection="column" alignItems="flex-end">
            <Text dimColor>≈{fmtCost(main.usd ?? 0)}</Text>
          </Box>
        </Box>
        {row(king, 0)}
        {live.map(({ member, depth }) => row(member, depth))}
        {past.length > 0 && <Text bold>History</Text>}
        {past.map(m => row(m, 0))}
      </Box>
    )
  })

  // The always-on view: one row above the prompt; ⤢ opens the full pane.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const Svg = e.surface !== 'terminal' && 'Svg' in ui ? ui.Svg : undefined
    const busy = await read($, isMainBusy)
    const main = await read($, mainStats)
    const usd = main.usd ?? 0
    // The clock ticks at least once a minute, so the reset times read from it stay current.
    const now = main.limits?.length ? (await read($, clockNow)) || (await $.clock.now()) : 0
    const limits = limitRows(main.limits, now)
    // The band shows the King and who is still around, not the history.
    const crew = [
      { ...fresh('main', 0), status: busy ? 'running' : 'idle' } as CrewMember,
      ...ordered(await read($, agents)).live.map(r => r.member),
    ]
    const active = crew.filter(m => isActive(m.status)).length
    const cost = <Text dimColor>≈{fmtCost(usd)}</Text>
    const details = <Button key="crew-details" plain label="⤢" onPress={() => $.ui.open({ id: PANE, title: TITLE })} />

    if (!Svg) {
      return (
        <Box flexDirection="row" columnGap={1}>
          {limits.length > 0 && (
            <Text>
              {limits.map((r, i) => (
                <Text key={r.label} color={r.color === GRAY ? undefined : r.color} dimColor={r.color === GRAY}>
                  {`${i ? ' ' : ''}${r.label} ${r.text}`}
                </Text>
              ))}
            </Text>
          )}
          <Text backgroundColor={ORANGE} color="#ffffff" bold>
            {` Agents ${active}/${crew.length} `}
          </Text>
          <Text>
            {crew.map(m => (
              <Text key={m.id} color={LABEL[m.status].color}>
                {LABEL[m.status].text.slice(0, 1)}
              </Text>
            ))}
          </Text>
          {cost}
          {details}
        </Box>
      )
    }

    const band = bandSvg(crew, active, usd, limits, limitsHeading(main.limitsAt, now))
    const limitsAlt = limits.map(r => `${r.label} ${r.text === '—' ? 'no reading' : `${r.text} used`}`).join(', ')

    return (
      <Box flexDirection="row" columnGap={1}>
        {/* One line tall (height is in lines): the drawing centres on it whatever the person's density. */}
        <Box height={1} alignItems="center">
          <Svg source={band.source} alt={`${limitsAlt ? `Limits ${limitsAlt}; ` : ''}${active} of ${crew.length} agents working, ≈${fmtCost(usd)} this session`} width={band.width} height={BAND_H} isInteractive />
        </Box>
        {details}
      </Box>
    )
  })
}
