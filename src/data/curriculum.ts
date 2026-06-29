import type { Curriculum, Node, Tier, VeinId } from './types'
import { VEIN_ORDER } from './veins'
import mathGrade1 from '../../data/math-grade1.json'

// 加载并校验数据源,派生出各视图需要的索引结构。
// 换一门学科 = 换一份同构 JSON,这里的派生逻辑全部复用。

// JSON 推断为宽类型(string/number),这里收窄到 Curriculum;
// 运行期由 validateCurriculum 兜底校验。
export const NODES: Curriculum = mathGrade1 as unknown as Curriculum

/** id → node 的查表。 */
export const NODE_BY_ID: Map<string, Node> = new Map(
  NODES.map((n) => [n.id, n]),
)

export function getNode(id: string): Node | undefined {
  return NODE_BY_ID.get(id)
}

/**
 * 反向依赖:被某节点作为前置的所有后续节点。
 * id → 直接依赖它的节点 id 列表。技能树「取消已学连带回收」要用。
 */
export const DEPENDENTS: Map<string, string[]> = (() => {
  const m = new Map<string, string[]>()
  for (const n of NODES) {
    for (const r of n.req) {
      const list = m.get(r) ?? []
      list.push(n.id)
      m.set(r, list)
    }
  }
  return m
})()

export function dependentsOf(id: string): string[] {
  return DEPENDENTS.get(id) ?? []
}

/** 按脉分组并保持 VEIN_ORDER 顺序 —— 生命之树 / 真身谱用。 */
export function nodesByVein(): { vein: VeinId; nodes: Node[] }[] {
  return VEIN_ORDER.map((vein) => ({
    vein,
    nodes: NODES.filter((n) => n.vein === vein),
  })).filter((g) => g.nodes.length > 0)
}

/** 按境界分组 —— 技能树分层用。 */
export function nodesByTier(): Map<Tier, Node[]> {
  const m = new Map<Tier, Node[]>()
  for (const n of NODES) {
    const list = m.get(n.tier) ?? []
    list.push(n)
    m.set(n.tier, list)
  }
  return m
}

/**
 * 开发期一致性自检:前置 id 必须存在、不能自引用。
 * 仅在 dev 下抛警告,避免数据录入笔误悄悄通过。
 */
export function validateCurriculum(nodes: Curriculum = NODES): string[] {
  const ids = new Set(nodes.map((n) => n.id))
  const errors: string[] = []
  for (const n of nodes) {
    for (const r of n.req) {
      if (r === n.id) errors.push(`${n.id} 自引用 req`)
      if (!ids.has(r)) errors.push(`${n.id} 的前置 ${r} 不存在`)
    }
  }
  return errors
}

if (import.meta.env.DEV) {
  const errs = validateCurriculum()
  if (errs.length) console.warn('[curriculum] 数据校验:', errs)
}
