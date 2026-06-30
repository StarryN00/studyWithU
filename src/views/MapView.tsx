import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { DomainId, MacroTopic } from '../data/types'
import { DOMAINS, DOMAIN_ORDER, GRADE_NAMES, domainColor } from '../data/domains'
import elementary from '../../data/math-elementary.json'
import treeImageUrl from '../assets/map/haeckel-style-tree-fine-engraving.png'
import './map.css'
import './views.css'

// 全局之树 —— 整个小学数学的宏观俯瞰(新课标四领域 × 六年级)。
// 像 Haeckel《人类的谱系》:从树基「计数」向上按年级 1→6 生长,
// 每个年级的知识点以带框标签向两侧抽枝、按领域着色;右侧括注年级。
// 一年级在树基、点亮可点开 → 钻取现有详图。

const TOPICS = elementary as unknown as MacroTopic[]

const W = 1120
const TRUNK_X = 470
const BAND_H = 210
const GRADES = 6
const TOP_PAD = 190
const BASE_PAD = 230
const H = TOP_PAD + GRADES * BAND_H + BASE_PAD // 总高
const Y_TOP = TOP_PAD + 8 // 主干顶
const Y_BOT = H - BASE_PAD + 54 // 主干基

// 主干中线(极轻 S 形摆动)与半宽(基部粗、顶部细)
function cx(y: number): number {
  return TRUNK_X + Math.sin((Y_BOT - y) / 260) * 9
}
function bandCenter(grade: number): number {
  return Y_BOT - 50 - (grade - 0.5) * BAND_H
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
  lit: boolean
  order: number
}

function boxFor(name: string, cxp: number, cyp: number): Box {
  const w = name.length * 15 + 34
  return { x: cxp - w / 2, y: cyp - 16, w, h: 32 }
}

function layout() {
  const bands = []
  let branchOrder = 0
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
        const dist = 160 + (j % 2) * 96 + jitter(t.id, 'd') * 48
        const cxp = TRUNK_X + side * dist
        const box = boxFor(t.name, cxp, yLabel)

        placed.push({ topic: t, side, box, lit, order: branchOrder++ })
      })
    }
    bands.push({ grade: g, center, lit, placed })
  }
  return { bands, baseX: cx(Y_BOT), topX: cx(Y_TOP) }
}

interface HoverInfo {
  name: string
  grade: number
  domain: DomainId
  lit: boolean
}

export function MapView({ onEnter }: { onEnter: () => void }) {
  const { bands, baseX, topX } = useMemo(layout, [])
  const [hover, setHover] = useState<HoverInfo | null>(null)
  const [selectedGrade, setSelectedGrade] = useState(1)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller) return
    scroller.scrollLeft = Math.max(0, (scroller.scrollWidth - scroller.clientWidth) / 2)
  }, [])

  return (
    <div className="map view">
      <div className="map__scroll" ref={scrollRef}>
        <div className="map-plate" style={{ width: W, height: H }}>
          <img className="map-layer map-layer--tree" src={treeImageUrl} alt="" aria-hidden="true" />

          <div className="map-plate-head">
            <span className="map-plate-kicker map-plate-kicker--left">MATHEMATICA ELEMENTARIA</span>
            <span className="map-plate-kicker map-plate-kicker--right">PLATE I</span>
            <h2>小学数学 · 知识之树</h2>
            <p>好奇 · 探索 · 惊喜</p>
          </div>

          <div className="map-origin" style={{ left: baseX - 92, top: Y_BOT + 102 }}>
            数一数 · 万物之始
          </div>
          <div className="map-top" style={{ left: topX + 94, top: Y_TOP - 10 }}>
            ↑ 通向初中数学
          </div>

          {/* 各年级:枝 + 框 + 右侧括注 */}
          {bands.map((band) => {
            const bx = W - 118
            const gradeSelected = band.grade === selectedGrade
            return (
              <div key={band.grade} className="map-grade-band">
                <button
                  className={
                    'map-grade' +
                    (band.lit ? ' map-grade--lit' : '') +
                    (gradeSelected ? ' map-grade--selected' : '')
                  }
                  style={{ ['--gi']: band.grade - 1, left: bx + 16, top: band.center - 10 } as CSSProperties}
                  type="button"
                  aria-pressed={gradeSelected}
                  onClick={() => setSelectedGrade(band.grade)}
                >
                  {GRADE_NAMES[band.grade - 1]}
                </button>
                {band.lit && (
                  <button
                    className="map-enter"
                    style={{ ['--gi']: band.grade - 1, left: bx + 16, top: band.center + 12 } as CSSProperties}
                    onClick={onEnter}
                  >
                    点开详图
                  </button>
                )}

                {/* 知识点框 */}
                {band.placed.map((p) => (
                  <button
                    key={`x-${p.topic.id}`}
                    className={
                      'map-box' +
                      (p.lit ? ' map-box--lit' : ' map-box--bud') +
                      (p.topic.grade === selectedGrade ? ' map-box--selected' : ' map-box--dim')
                    }
                    style={
                      {
                        ['--dc']: domainColor(p.topic.domain),
                        '--i': p.order,
                        left: p.box.x,
                        top: p.box.y,
                        width: p.box.w,
                        height: p.box.h,
                      } as CSSProperties
                    }
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
                    type="button"
                    aria-disabled={!p.lit}
                  >
                    <span className={'map-domain-pin' + (p.side < 0 ? ' map-domain-pin--right' : '')} />
                    <span>{p.topic.name}</span>
                  </button>
                ))}
              </div>
            )
          })}

          <div className="map-side-taxonomy map-side-taxonomy--a" style={{ left: W - 50, top: Y_TOP + 40 }}>
            小学数学
          </div>
          <div className="map-side-taxonomy map-side-taxonomy--b" style={{ left: W - 50, top: Y_TOP + BAND_H * 2.2 }}>
            四大领域
          </div>
          <div className="map-side-taxonomy map-side-taxonomy--c" style={{ left: W - 50, top: Y_TOP + BAND_H * 4.25 }}>
            六年脉络
          </div>
        </div>
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
