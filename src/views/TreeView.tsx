import { useEffect, useMemo, useRef, useState } from 'react'
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

/** 逐帧插值后的位置与透明度。 */
interface AnimPos {
  x: number
  y: number
  opacity: number
}

export function TreeView() {
  const tree = useMemo(buildTree, [])
  // 默认只展开到「脉」这一层:显示根 + 六条脉,知识点收起,用户自行点开。
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set<string>(['root']))
  const [hover, setHover] = useState<Node | null>(null)

  // —— 由树派生的静态索引 ——
  const itemById = useMemo(() => {
    const m = new Map<string, TItem>()
    const walk = (it: TItem) => {
      m.set(it.id, it)
      it.children.forEach(walk)
    }
    walk(tree)
    return m
  }, [tree])
  const parentOf = useMemo(() => {
    const m = new Map<string, string>()
    const walk = (it: TItem) =>
      it.children.forEach((c) => {
        m.set(c.id, it.id)
        walk(c)
      })
    walk(tree)
    return m
  }, [tree])
  const allEdges = useMemo(() => {
    const out: { id: string; parent: string; child: string; color: string }[] = []
    const walk = (it: TItem) =>
      it.children.forEach((c) => {
        out.push({ id: `${it.id}>${c.id}`, parent: it.id, child: c.id, color: c.color })
        walk(c)
      })
    walk(tree)
    return out
  }, [tree])
  const expandableIds = useMemo(
    () => [...itemById.values()].filter((it) => it.children.length).map((it) => it.id),
    [itemById],
  )
  const allExpanded = expandableIds.every((id) => expanded.has(id))
  function toggleAll() {
    setExpanded(allExpanded ? new Set(['root']) : new Set(expandableIds))
  }
  function toggle(item: TItem) {
    if (item.children.length === 0) return
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(item.id) ? next.delete(item.id) : next.add(item.id)
      return next
    })
  }

  // —— 目标布局(仅含当前可见节点)——
  const { targetPos, width, height } = useMemo(() => {
    const { placed, width, height } = layout(tree, expanded)
    const targetPos = new Map<string, { x: number; y: number }>()
    for (const p of placed) targetPos.set(p.item.id, { x: p.x, y: p.y })
    return { targetPos, width, height }
  }, [tree, expanded])

  // —— 逐帧插值:节点与连线同源驱动,彻底消除「线先到、字滞后」——
  const posRef = useRef<Map<string, AnimPos>>(new Map())
  const rafRef = useRef<number | null>(null)
  const [frame, setFrame] = useState<Map<string, AnimPos>>(new Map())

  useEffect(() => {
    const start = posRef.current
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const D = reduce ? 0 : 480

    interface Spec {
      fx: number
      fy: number
      fo: number
      tx: number
      ty: number
      to: number
    }
    const specs = new Map<string, Spec>()

    // 进入 / 保持:新节点从母节点当前(或目标)位置抽出来 + 淡入
    targetPos.forEach((tp, id) => {
      const cur = start.get(id)
      if (cur) {
        specs.set(id, { fx: cur.x, fy: cur.y, fo: cur.opacity, tx: tp.x, ty: tp.y, to: 1 })
      } else {
        const par = parentOf.get(id)
        const from = (par && (start.get(par) ?? targetPos.get(par))) || tp
        specs.set(id, { fx: from.x, fy: from.y, fo: 0, tx: tp.x, ty: tp.y, to: 1 })
      }
    })
    // 退出:向母节点目标位置收回 + 淡出
    start.forEach((cur, id) => {
      if (targetPos.has(id)) return
      const par = parentOf.get(id)
      const to = (par && targetPos.get(par)) || cur
      specs.set(id, { fx: cur.x, fy: cur.y, fo: cur.opacity, tx: to.x, ty: to.y, to: 0 })
    })

    const finalize = () => {
      const fin = new Map<string, AnimPos>()
      targetPos.forEach((tp, id) => fin.set(id, { x: tp.x, y: tp.y, opacity: 1 }))
      posRef.current = fin
      setFrame(fin)
    }

    if (D === 0) {
      finalize()
      return
    }

    let t0: number | null = null
    const tick = (now: number) => {
      if (t0 === null) t0 = now
      const k = Math.min(1, (now - t0) / D)
      const e = 1 - Math.pow(1 - k, 3) // easeOutCubic
      const m = new Map<string, AnimPos>()
      specs.forEach((s, id) =>
        m.set(id, {
          x: s.fx + (s.tx - s.fx) * e,
          y: s.fy + (s.ty - s.fy) * e,
          opacity: s.fo + (s.to - s.fo) * e,
        }),
      )
      posRef.current = m
      setFrame(m)
      if (k < 1) rafRef.current = requestAnimationFrame(tick)
      else finalize()
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [targetPos, parentOf])

  // 连线:两端都在帧里才画(自然涵盖生长/收回中的子树),路径由同一组插值位置算出
  const links = allEdges
    .map((e) => {
      const p = frame.get(e.parent)
      const c = frame.get(e.child)
      if (!p || !c) return null
      const midx = (p.x + c.x) / 2
      return {
        id: e.id,
        d: `M ${p.x} ${p.y} C ${midx} ${p.y}, ${midx} ${c.y}, ${c.x} ${c.y}`,
        color: e.color,
        opacity: Math.min(p.opacity, c.opacity),
      }
    })
    .filter((l): l is NonNullable<typeof l> => l !== null)

  return (
    <div className="view">
      <button className="view__control mono" onClick={toggleAll}>
        {allExpanded ? '只看脉络' : '展开全部'}
      </button>
      <div className="view__canvas">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <g>
            {links.map((l) => (
              <path
                key={l.id}
                className="glink"
                d={l.d}
                stroke={l.color}
                strokeOpacity={0.5 * l.opacity}
                strokeWidth={1.4}
              />
            ))}
          </g>
          <g>
            {[...frame.entries()].map(([id, p]) => {
              const item = itemById.get(id)
              if (!item) return null
              const isLeaf = item.kind === 'form'
              const canExpand = item.children.length > 0
              const open = expanded.has(id)
              return (
                <g
                  key={id}
                  className="gnode"
                  style={{ transform: `translate(${p.x}px, ${p.y}px)`, opacity: p.opacity }}
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
