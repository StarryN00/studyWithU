import type { VeinId, Vein, Tier } from './types'

// 脉定义 —— 对应「项目说明」第 5.1 节。颜色为字面值,供 SVG 表现属性直接使用。
export const VEINS: Record<VeinId, Vein> = {
  shu: { name: '数 · 十进制', color: '#d9b65a' },
  jj: { name: '加与减', color: '#e07a55' },
  bi: { name: '比较', color: '#6fb7ad' },
  fl: { name: '分类与位置', color: '#8aa6d8' },
  tu: { name: '图形', color: '#8fbf86' },
  rmb: { name: '人民币 · 元角分', color: '#c98bb5' },
}

/** 脉的展示顺序(树形脉的排列、真身谱列序)。 */
export const VEIN_ORDER: VeinId[] = ['shu', 'jj', 'bi', 'fl', 'tu', 'rmb']

/** 境界标签,下标即 tier。技能树分层用。 */
export const TIER_LABELS = [
  '起手',
  '筑基',
  '小成',
  '登堂',
  '入室',
  '大成',
  '出师',
] as const

export function veinColor(id: VeinId): string {
  return VEINS[id].color
}

export function veinName(id: VeinId): string {
  return VEINS[id].name
}

export function tierLabel(tier: Tier): string {
  return TIER_LABELS[tier]
}
