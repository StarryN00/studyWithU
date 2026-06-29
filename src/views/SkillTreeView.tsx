import { useMemo, useState, type CSSProperties } from 'react'
import type { Node, Tier } from '../data/types'
import { NODES, getNode } from '../data/curriculum'
import { TIER_LABELS } from '../data/veins'
import { DetailPanel } from '../components/DetailPanel'
import type { Progress } from '../lib/progress'
import './views.css'
import './skilltree.css'

// 修炼路线 —— 表达「前置依赖」(DAG)。列 = 境界,连线 = req(按来源脉着色)。
// 回答「什么时候该学什么」。状态机:done / open / locked;点亮解锁,取消连带回收。

const COL_W = 188
const ROW_H = 70
const PAD_X = 96
const PAD_TOP = 84
const PAD_BOTTOM = 48
const NODE_H = 40

function nodeWidth(n: Node): number {
  return Math.max(118, n.name.length * 15 + 26)
}

type Status = 'done' | 'open' | 'locked'

interface Placed {
  node: Node
  x: number
  y: number
  w: number
}

function layout(): { placed: Map<string, Placed>; width: number; height: number } {
  const byTier = new Map<Tier, Node[]>()
  for (const n of NODES) {
    const list = byTier.get(n.tier) ?? []
    list.push(n)
    byTier.set(n.tier, list)
  }
  // 列内按脉稳定排序,布局更可读
  for (const list of byTier.values()) {
    list.sort((a, b) => a.vein.localeCompare(b.vein) || a.id.localeCompare(b.id))
  }
  const maxCount = Math.max(...[...byTier.values()].map((l) => l.length), 1)
  const height = PAD_TOP + maxCount * ROW_H + PAD_BOTTOM
  const placed = new Map<string, Placed>()

  for (let t = 0; t < TIER_LABELS.length; t++) {
    const list = byTier.get(t as Tier) ?? []
    const startY = PAD_TOP + ((maxCount - list.length) * ROW_H) / 2
    list.forEach((n, i) => {
      placed.set(n.id, {
        node: n,
        x: PAD_X + t * COL_W,
        y: startY + i * ROW_H + ROW_H / 2,
        w: nodeWidth(n),
      })
    })
  }
  const width = PAD_X * 2 + (TIER_LABELS.length - 1) * COL_W + 140
  return { placed, width, height }
}

export function SkillTreeView({ progress }: { progress: Progress }) {
  const { placed, width, height } = useMemo(layout, [])
  const { learned, isLearned, learn, unlearnCascade, reset } = progress
  const [hover, setHover] = useState<Node | null>(null)

  function statusOf(n: Node): Status {
    if (isLearned(n.id)) return 'done'
    return n.req.every((r) => isLearned(r)) ? 'open' : 'locked'
  }

  function onClick(n: Node) {
    const s = statusOf(n)
    if (s === 'open') learn(n.id)
    else if (s === 'done') unlearnCascade(n.id)
    setHover(n) // locked:把它读到面板,显示还缺什么
  }

  const edges = useMemo(() => {
    const out: { id: string; d: string; vein: string }[] = []
    for (const { node, x, y, w } of placed.values()) {
      for (const r of node.req) {
        const p = placed.get(r)
        if (!p) continue
        const x1 = p.x + p.w / 2
        const x2 = x - w / 2
        const midx = (x1 + x2) / 2
        out.push({
          id: `${r}>${node.id}`,
          d: `M ${x1} ${p.y} C ${midx} ${p.y}, ${midx} ${y}, ${x2} ${y}`,
          vein: p.node.vein, // 按来源脉着色
        })
      }
    }
    return out
  }, [placed])

  // 详情面板 footer:列出前置,标出还缺哪些
  let footer = null
  if (hover) {
    const reqs = hover.req.map((r) => ({ id: r, node: getNode(r), done: isLearned(r) }))
    const missing = reqs.filter((r) => !r.done)
    footer = (
      <div className="detail__req">
        <div className="detail__req-title">
          前置 · {statusOf(hover) === 'done' ? '已学会' : statusOf(hover) === 'open' ? '可学' : '锁定'}
        </div>
        {reqs.length === 0 ? (
          <div className="dim">无前置 —— 起手式,直接可学。</div>
        ) : (
          <div>
            {reqs.map((r) => (
              <span key={r.id} className={r.done ? '' : 'detail__missing'}>
                {r.done ? '✓ ' : '✗ '}
                {r.node?.name ?? r.id}
                {'　'}
              </span>
            ))}
          </div>
        )}
        {missing.length > 0 && (
          <div className="detail__missing">还缺:{missing.map((m) => m.node?.name).join('、')}</div>
        )}
      </div>
    )
  }

  return (
    <div className="view">
      <div className="view__canvas">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <defs>
            <marker
              id="sk-arrow"
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L8,4 L0,8 z" fill="context-stroke" />
            </marker>
          </defs>

          <g>
            {TIER_LABELS.map((label, t) => (
              <text key={label} className="sk-col-label" x={PAD_X + t * COL_W} y={44}>
                {t}·{label}
              </text>
            ))}
          </g>

          <g>
            {edges.map((e) => (
              <path
                key={e.id}
                className="sk-edge"
                d={e.d}
                style={{ stroke: `var(--vein-${e.vein})` } as CSSProperties}
                strokeOpacity={0.45}
                markerEnd="url(#sk-arrow)"
              />
            ))}
          </g>

          <g>
            {[...placed.values()].map(({ node, x, y, w }) => {
              const s = statusOf(node)
              return (
                <g
                  key={node.id}
                  className={`sk-node sk-node--${s}`}
                  style={
                    {
                      transform: `translate(${x}px, ${y}px)`,
                      ['--vc']: `var(--vein-${node.vein})`,
                    } as CSSProperties
                  }
                  onClick={() => onClick(node)}
                  onMouseEnter={() => setHover(node)}
                >
                  <rect
                    x={-w / 2}
                    y={-NODE_H / 2}
                    width={w}
                    height={NODE_H}
                    rx={9}
                    strokeWidth={1.8}
                  />
                  <text>{node.name}</text>
                </g>
              )
            })}
          </g>
        </svg>
      </div>

      <DetailPanel node={hover} footer={footer} placeholder="点亮无前置的「起手」节点,前置全亮的后续会自动解锁。" />

      <button className="sk-reset mono" onClick={reset} title="清空进度,重新修炼">
        重练 · 已点亮 {learned.size}/{NODES.length}
      </button>
      <div className="view__hint mono">点可学 = 学会 · 点已学 = 连带收回后续 · 锁定 = 看还缺什么</div>
    </div>
  )
}
