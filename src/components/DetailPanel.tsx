import type { ReactNode } from 'react'
import type { Node } from '../data/types'
import { veinName } from '../data/veins'

// 左下角「读出真身」面板:悬停/选中某节点时展开它的深层结构。
// 三个视图共用。footer 留给视图特有信息(如技能树的前置/还缺什么)。

export function DetailPanel({
  node,
  footer,
  placeholder = '把鼠标移到节点上 —— 读出它的真身。',
}: {
  node: Node | null
  footer?: ReactNode
  placeholder?: string
}) {
  if (!node) {
    return (
      <aside className="detail detail--empty">
        <p className="dim">{placeholder}</p>
      </aside>
    )
  }
  return (
    <aside className="detail">
      <div className="detail__head">
        <h3 className="detail__name">{node.name}</h3>
        <span className="detail__tags mono">
          {veinName(node.vein)} · {node.vol}册
        </span>
      </div>

      <p className="detail__truth">{node.truth}</p>

      {node.forms.length > 0 && (
        <div className="detail__forms">
          {node.forms.map((f) => (
            <span key={f} className="form-chip">
              {f}
            </span>
          ))}
        </div>
      )}

      {node.from && (
        <p className="detail__from mono">
          <span className="dim">缘起 ·</span> {node.from}
        </p>
      )}

      {node.note && <p className="detail__note dim">编者视角:{node.note}</p>}

      {footer}
    </aside>
  )
}
