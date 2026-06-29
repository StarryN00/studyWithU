import { useMemo, useState } from 'react'
import type { Node, VeinId } from '../data/types'
import { NODES } from '../data/curriculum'
import { VEIN_ORDER, veinColor, veinName } from '../data/veins'
import { DetailPanel } from '../components/DetailPanel'
import './views.css'

// 生命之树 —— 表达「归属」:脉 → 知识点 → 题型,左→右逐枝生长。
// 回答「整体有哪些」。点节点展开/收起,子节点平滑长出。

type Kind = 'root' | 'vein' | 'node' | 'form'

interface TItem {
  id: string
  kind: Kind
  label: string
  color: string
  depth: number
  children: TItem[]
  /** 关联的数据节点(node 自身;form 指向其母知识点)→ 悬停读出真身 */
  dataNode?: Node
}

const COL_W = 210
const ROW_H = 34
const PAD_X = 70
const PAD_Y = 44
const GOLD = '#d9b65a'
const CINNABAR = '#e07a55'

function buildTree(): TItem {
  const veins: TItem[] = VEIN_ORDER.map((vid: VeinId) => {
    const nodes = NODES.filter((n) => n.vein === vid).sort((a, b) => a.tier - b.tier)
    return {
      id: `v:${vid}`,
      kind: 'vein',
      label: veinName(vid),
      color: veinColor(vid),
      depth: 1,
      children: nodes.map((n) => ({
        id: n.id,
        kind: 'node' as Kind,
        label: n.name,
        color: veinColor(vid),
        depth: 2,
        dataNode: n,
        children: n.forms.map((f, i) => ({
          id: `${n.id}:f${i}`,
          kind: 'form' as Kind,
          label: f,
          color: CINNABAR,
          depth: 3,
          dataNode: n,
          children: [],
        })),
      })),
    }
  })
  return {
    id: 'root',
    kind: 'root',
    label: '一年级数学',
    color: GOLD,
    depth: 0,
    children: veins,
  }
}

interface Placed {
  item: TItem
  x: number
  y: number
}

function layout(root: TItem, expanded: Set<string>) {
  const placed: Placed[] = []
  let row = 0
  function visit(item: TItem): number {
    const x = PAD_X + item.depth * COL_W
    const kids = expanded.has(item.id) ? item.children : []
    let y: number
    if (kids.length === 0) {
      y = PAD_Y + row * ROW_H
      row += 1
    } else {
      const ys = kids.map(visit)
      y = (ys[0] + ys[ys.length - 1]) / 2 // 经典 dendrogram:首尾子节点的中点
    }
    placed.push({ item, x, y })
    return y
  }
  visit(root)
  const height = PAD_Y * 2 + Math.max(1, row) * ROW_H
  const width = PAD_X + 3 * COL_W + 240
  return { placed, width, height }
}

function radius(kind: Kind): number {
  return kind === 'root' ? 7 : kind === 'vein' ? 6 : kind === 'node' ? 5 : 3.5
}

export function TreeView() {
  const tree = useMemo(buildTree, [])
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set<string>(['root', ...VEIN_ORDER.map((v) => `v:${v}`)]),
  )
  const [hover, setHover] = useState<Node | null>(null)

  const { placed, width, height } = useMemo(
    () => layout(tree, expanded),
    [tree, expanded],
  )
  const posById = useMemo(() => {
    const m = new Map<string, Placed>()
    for (const p of placed) m.set(p.item.id, p)
    return m
  }, [placed])

  function toggle(item: TItem) {
    if (item.children.length === 0) return
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(item.id) ? next.delete(item.id) : next.add(item.id)
      return next
    })
  }

  // 连线:每个可见 item → 其可见子节点
  const links: { id: string; d: string; color: string }[] = []
  for (const { item, x, y } of placed) {
    if (!expanded.has(item.id)) continue
    for (const child of item.children) {
      const cp = posById.get(child.id)
      if (!cp) continue
      const midx = (x + cp.x) / 2
      links.push({
        id: `${item.id}>${child.id}`,
        d: `M ${x} ${y} C ${midx} ${y}, ${midx} ${cp.y}, ${cp.x} ${cp.y}`,
        color: child.color,
      })
    }
  }

  return (
    <div className="view">
      <div className="view__canvas">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <g>
            {links.map((l) => (
              <path
                key={l.id}
                className="glink"
                d={l.d}
                stroke={l.color}
                strokeOpacity={0.5}
                strokeWidth={1.4}
              />
            ))}
          </g>
          <g>
            {placed.map(({ item, x, y }) => {
              const isLeaf = item.kind === 'form'
              const canExpand = item.children.length > 0
              const open = expanded.has(item.id)
              return (
                <g
                  key={item.id}
                  className="gnode"
                  style={{ transform: `translate(${x}px, ${y}px)` }}
                  onClick={() => toggle(item)}
                  onMouseEnter={() => item.dataNode && setHover(item.dataNode)}
                >
                  <circle
                    r={radius(item.kind)}
                    fill={canExpand && !open ? 'var(--night)' : item.color}
                    stroke={item.color}
                    strokeWidth={1.6}
                  />
                  <text
                    className={isLeaf ? 'node-label node-label--leaf' : 'node-label'}
                    x={radius(item.kind) + 7}
                  >
                    {item.label}
                    {canExpand && !open ? ` ·${item.children.length}` : ''}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>
      </div>

      <DetailPanel
        node={hover}
        placeholder="点脉、点知识点 —— 向右长出枝与题型花苞。悬停读出真身。"
      />
      <div className="view__hint mono">空心圈 = 可展开 · 点一下让它生长</div>
    </div>
  )
}
