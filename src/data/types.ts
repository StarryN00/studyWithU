// 课程数据的类型定义 —— 单一真相源的「契约」。
// 字段语义见 /data/curriculum.schema.md 与「项目说明」第 5.1 节。

export type VeinId = 'shu' | 'jj' | 'bi' | 'fl' | 'tu' | 'rmb'

export interface Vein {
  /** 脉名,如「数 · 十进制」 */
  name: string
  /** 脉色(字面色值;SVG 表现属性里不要用 CSS 变量) */
  color: string
}

/** 境界层级 0..6,对应 TIER_LABELS 的下标。 */
export type Tier = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type Volume = '上' | '下'

/** 一个知识点。 */
export interface Node {
  /** 唯一标识(前置引用靠它) */
  id: string
  /** 知识点名 */
  name: string
  /** 所属脉 */
  vein: VeinId
  /** 境界层级(技能树分层) */
  tier: Tier
  /** 上/下册 */
  vol: Volume
  /** 真身:一句话点出深层结构 */
  truth: string
  /** 化形:常见题型 */
  forms: string[]
  /** 前置知识点 id —— 可跨脉,构成 DAG */
  req: string[]
  /** 缘起/叙事(它从哪长出来),可选 */
  from?: string
  /** 编者视角(为什么这么教),可选 */
  note?: string
}

/** 一门学科的完整数据集。 */
export type Curriculum = Node[]

// —— 宏观地图(整个小学数学的全局之树)——
// 新课标四领域 × 六年级。这是「数学这片大陆」的内部全图(家长/建站者俯瞰)。

/** 新课标四大内容领域。 */
export type DomainId = 'A' | 'G' | 'S' | 'P'

/** 宏观地图上的一个主题(某年级 × 某领域的内容簇)。 */
export interface MacroTopic {
  id: string
  /** 学段年级 1..6 */
  grade: number
  domain: DomainId
  name: string
  /** 标记可钻取到的详图数据集,如 "grade1" → 现有一年级详图 */
  detail?: string
}
