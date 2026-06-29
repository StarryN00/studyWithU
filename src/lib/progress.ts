import { useCallback, useEffect, useState } from 'react'
import { dependentsOf } from '../data/curriculum'

// 进度持久化 —— 把技能树上「已点亮」的节点记在浏览器(localStorage),无需后端。
// 护栏(第 9 节):这是「镜子」,让孩子看见自己正在变成谁,不是积分/贿赂。

const STORAGE_KEY = 'studywithu.progress.math-grade1.v1'

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? new Set(arr.filter((x) => typeof x === 'string')) : new Set()
  } catch {
    return new Set()
  }
}

function save(learned: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...learned]))
  } catch {
    /* 隐私模式等写入失败时静默降级:本次会话仍可用,只是不持久 */
  }
}

export interface Progress {
  learned: Set<string>
  isLearned: (id: string) => boolean
  /** 点亮一个节点(调用方应已确认其前置满足)。 */
  learn: (id: string) => void
  /** 取消点亮,并连带回收所有(传递)依赖它的后续 —— 保持 DAG 一致。 */
  unlearnCascade: (id: string) => void
  reset: () => void
}

export function useProgress(): Progress {
  const [learned, setLearned] = useState<Set<string>>(load)

  useEffect(() => {
    save(learned)
  }, [learned])

  const isLearned = useCallback((id: string) => learned.has(id), [learned])

  const learn = useCallback((id: string) => {
    setLearned((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  const unlearnCascade = useCallback((id: string) => {
    setLearned((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      // 广度优先回收:谁依赖被取消的节点,谁也得收回。
      const queue = [id]
      while (queue.length) {
        const cur = queue.shift()!
        if (!next.has(cur)) continue
        next.delete(cur)
        for (const dep of dependentsOf(cur)) {
          if (next.has(dep)) queue.push(dep)
        }
      }
      return next
    })
  }, [])

  const reset = useCallback(() => setLearned(new Set()), [])

  return { learned, isLearned, learn, unlearnCascade, reset }
}
