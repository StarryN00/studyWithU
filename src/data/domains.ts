import type { DomainId } from './types'

// 新课标四大内容领域 —— 宏观「全局之树」的四类枝。
// 颜色复用既有脉色谱系,与一年级详图视觉连贯。
export const DOMAINS: Record<DomainId, { name: string; color: string }> = {
  A: { name: '数与代数', color: '#d9b65a' },
  G: { name: '图形与几何', color: '#8fbf86' },
  S: { name: '统计与概率', color: '#6fb7ad' },
  P: { name: '综合与实践', color: '#c98bb5' },
}

export const DOMAIN_ORDER: DomainId[] = ['A', 'G', 'S', 'P']

/** 年级名,下标 = grade-1。 */
export const GRADE_NAMES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']

export function domainColor(id: DomainId): string {
  return DOMAINS[id].color
}
