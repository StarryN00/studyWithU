import { useMemo, useState, type CSSProperties } from 'react'
import type { DomainId, MacroTopic } from '../data/types'
import { DOMAINS, DOMAIN_ORDER, GRADE_NAMES, domainColor } from '../data/domains'
import elementary from '../../data/math-elementary.json'
import './map.css'
import './views.css'

// 全局之树 —— 整个小学数学的宏观俯瞰(新课标四领域 × 六年级)。
// 像 Haeckel《人类的谱系》:从树基「计数」向上按年级 1→6 生长,
// 每个年级的知识点以带框标签向两侧抽枝、按领域着色;右侧括注年级。
// 一年级在树基、点亮可点开 → 钻取现有详图。

const TOPICS = elementary as unknown as MacroTopic[]

const W = 1040
const TRUNK_X = 470
const BAND_H = 210
const GRADES = 6
const TOP_PAD = 130
const BASE_PAD = 200
const H = TOP_PAD + GRADES * BAND_H + BASE_PAD // 总高
const Y_TOP = 150 // 主干顶
const Y_BOT = H - BASE_PAD + 50 // 主干基

// 主干中线(极轻 S 形摆动)与半宽(基部粗、顶部细)
function cx(y: number): number {
  return TRUNK_X + Math.sin((Y_BOT - y) / 260) * 9
}
function trunkHalf(y: number): number {
  const t = Math.min(1, Math.max(0, (y - Y_TOP) / (Y_BOT - Y_TOP)))
  return 7 + t * t * 21
}
function bandCenter(grade: number): number {
  return Y_BOT - 50 - (grade - 0.5) * BAND_H
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
// 由 id 派生稳定的伪随机扰动,让枝条有机而不抖动
function jitter(seed: string, salt: string): number {
  let h = 2166136261
  const s = seed + salt
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return ((h >>> 0) % 1000) / 1000
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}
interface PlacedTopic {
  topic: MacroTopic
  side: -1 | 1
  box: Box
  branch: string
  twig: string
  lit: boolean
}

function boxFor(name: string, cxp: number, cyp: number): Box {
  const w = name.length * 13 + 22
  return { x: cxp - w / 2, y: cyp - 13, w, h: 26 }
}

function layout() {
  const bands = []
  for (let g = 1; g <= GRADES; g++) {
    const list = TOPICS.filter((t) => t.grade === g).sort(
      (a, b) => DOMAIN_ORDER.indexOf(a.domain) - DOMAIN_ORDER.indexOf(b.domain),
    )
    const left: MacroTopic[] = []
    const right: MacroTopic[] = []
    list.forEach((t, i) => (i % 2 === 0 ? left : right).push(t))
    const center = bandCenter(g)
    const lit = g === 1

    const placed: PlacedTopic[] = []
    for (const [sideList, side] of [
      [left, -1],
      [right, 1],
    ] as [MacroTopic[], -1 | 1][]) {
      const c = sideList.length
      sideList.forEach((t, j) => {
        const frac = c === 1 ? 0.5 : j / (c - 1)
        const yLabel = center - BAND_H * 0.32 + frac * (BAND_H * 0.64)
        const dist = 150 + (j % 2) * 88 + jitter(t.id, 'd') * 44
        const cxp = TRUNK_X + side * dist
        const box = boxFor(t.name, cxp, yLabel)

        const anchorY = yLabel + 14 + jitter(t.id, 'a') * 26
        const anchorX = cx(anchorY) + side * trunkHalf(anchorY) * 0.7
        const innerX = box.x + (side < 0 ? box.w : 0) // 朝向主干一侧的框边
        const dx = innerX - anchorX
        const branch =
          `M ${anchorX.toFixed(1)} ${anchorY.toFixed(1)} ` +
          `C ${(anchorX + dx * 0.45).toFixed(1)} ${(anchorY - 8).toFixed(1)}, ` +
          `${(innerX - dx * 0.35).toFixed(1)} ${(yLabel + 4).toFixed(1)}, ` +
          `${innerX.toFixed(1)} ${yLabel.toFixed(1)}`

        // 一根小回枝,增添版画的有机感
        const mpx = anchorX + dx * 0.5
        const mpy = lerp(anchorY, yLabel, 0.5)
        const curl = 8 + jitter(t.id, 't') * 8
        const twig =
          `M ${mpx.toFixed(1)} ${mpy.toFixed(1)} ` +
          `q ${(side * curl).toFixed(1)} ${(-curl * 1.6).toFixed(1)}, ` +
          `${(side * curl * 0.4).toFixed(1)} ${(-curl * 2.4).toFixed(1)}`

        placed.push({ topic: t, side, box, branch, twig, lit })
      })
    }
    bands.push({ grade: g, center, lit, placed })
  }

  // 主干填充路径(左缘上行,右缘下行)
  const N = 26
  const leftPts: string[] = []
  const rightPts: string[] = []
  for (let i = 0; i <= N; i++) {
    const y = lerp(Y_TOP, Y_BOT, i / N)
    leftPts.push(`${(cx(y) - trunkHalf(y)).toFixed(1)},${y.toFixed(1)}`)
    rightPts.push(`${(cx(y) + trunkHalf(y)).toFixed(1)},${y.toFixed(1)}`)
  }
  const trunk = `M ${leftPts.join(' L ')} L ${rightPts.reverse().join(' L ')} Z`

  // 树根:基部向下散开
  const baseX = cx(Y_BOT)
  const roots = [-1, -0.55, 0, 0.6, 1].map((k, i) => {
    const ex = baseX + k * (90 + i * 28)
    const ey = Y_BOT + 70 + Math.abs(k) * 36
    return `M ${baseX.toFixed(1)} ${(Y_BOT - 6).toFixed(1)} Q ${(baseX + k * 30).toFixed(1)} ${(Y_BOT + 36).toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}`
  })

  // 树冠:顶端散出细枝
  const topX = cx(Y_TOP)
  const canopy = [-1, -0.5, 0, 0.5, 1].map((k) => {
    const ex = topX + k * 70
    const ey = Y_TOP - 70 - (1 - Math.abs(k)) * 26
    return `M ${topX.toFixed(1)} ${Y_TOP.toFixed(1)} Q ${(topX + k * 20).toFixed(1)} ${(Y_TOP - 40).toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}`
  })

  return { bands, trunk, roots, canopy, baseX, topX }
}

interface HoverInfo {
  name: string
  grade: number
  domain: DomainId
  lit: boolean
}

export function MapView({ onEnter }: { onEnter: () => void }) {
  const { bands, trunk, roots, canopy, baseX, topX } = useMemo(layout, [])
  const [hover, setHover] = useState<HoverInfo | null>(null)

  return (
    <div className="map view">
      <div className="map__scroll">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {/* 根 · 干 · 冠 */}
          <g>
            {roots.map((d, i) => (
              <path key={`r${i}`} className="map-root" d={d} />
            ))}
            <path className="map-trunk" d={trunk} />
            {canopy.map((d, i) => (
              <path key={`c${i}`} className="map-canopy" d={d} />
            ))}
          </g>

          {/* 起点(树基)与树梢 */}
          <g className="map-origin">
            <rect x={baseX - 86} y={Y_BOT + 96} width={172} height={30} rx={8} />
            <text x={baseX} y={Y_BOT + 111}>
              数一数 · 万物之始
            </text>
          </g>
          <g className="map-top">
            <text x={topX} y={Y_TOP - 96}>
              ↑ 通向初中数学
            </text>
          </g>

          {/* 各年级:枝 + 框 + 右侧括注 */}
          {bands.map((band) => {
            const top = band.center - BAND_H * 0.42
            const bot = band.center + BAND_H * 0.42
            const bx = W - 92
            return (
              <g key={band.grade}>
                {/* 右侧年级括注 */}
                <path
                  className="map-bracket"
                  d={`M ${bx + 10} ${top} q -10 0 -10 10 L ${bx} ${band.center - 8} q 0 8 -8 8 q 8 0 8 8 L ${bx} ${bot - 10} q 0 10 10 10`}
                />
                <text
                  className={'map-grade' + (band.lit ? ' map-grade--lit' : '')}
                  x={bx + 16}
                  y={band.center}
                >
                  {GRADE_NAMES[band.grade - 1]}
                </text>
                {band.lit && (
                  <g className="map-enter" onClick={onEnter}>
                    <text x={bx + 16} y={band.center + 22}>
                      ▶ 点开详图
                    </text>
                  </g>
                )}

                {/* 枝条 */}
                {band.placed.map((p) => (
                  <path
                    key={`b-${p.topic.id}`}
                    className={'map-branch' + (p.lit ? ' map-branch--lit' : '')}
                    d={p.branch}
                    style={p.lit ? { stroke: domainColor(p.topic.domain) } : undefined}
                  />
                ))}
                {band.placed.map((p) => (
                  <path key={`t-${p.topic.id}`} className="map-twig" d={p.twig} />
                ))}

                {/* 知识点框 */}
                {band.placed.map((p) => (
                  <g
                    key={`x-${p.topic.id}`}
                    className={'map-box' + (p.lit ? ' map-box--lit' : ' map-box--bud')}
                    style={{ ['--dc']: domainColor(p.topic.domain) } as CSSProperties}
                    onClick={p.lit ? onEnter : undefined}
                    onMouseEnter={() =>
                      setHover({
                        name: p.topic.name,
                        grade: p.topic.grade,
                        domain: p.topic.domain,
                        lit: p.lit,
                      })
                    }
                    onMouseLeave={() => setHover(null)}
                  >
                    <rect x={p.box.x} y={p.box.y} width={p.box.w} height={p.box.h} rx={6} />
                    <text x={p.box.x + p.box.w / 2} y={p.box.y + p.box.h / 2}>
                      {p.topic.name}
                    </text>
                  </g>
                ))}
              </g>
            )
          })}
        </svg>
      </div>

      {/* 领域图例 */}
      <div className="view__legend">
        {DOMAIN_ORDER.map((d) => (
          <span key={d} className="legend-item">
            <span className="legend-dot" style={{ background: DOMAINS[d].color }} />
            {DOMAINS[d].name}
          </span>
        ))}
      </div>

      <div className="view__hint mono">
        {hover
          ? `${DOMAINS[hover.domain].name} · ${GRADE_NAMES[hover.grade - 1]} — ${hover.name}${hover.lit ? ' (点开进入详图)' : ''}`
          : '小学数学 · 全局之树 —— 从树基「计数」向上生长;一年级已点亮,点开进入详图'}
      </div>
    </div>
  )
}
