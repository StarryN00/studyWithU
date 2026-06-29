import { useState } from 'react'
import { nodesByVein } from '../data/curriculum'
import { veinColor, veinName, tierLabel } from '../data/veins'
import './atlas.css'

// 真身谱 —— 按脉俯瞰每个知识点的「真身」;点开看它穿了哪些「化形」(题型)外衣。
// 静态、可俯瞰,服务「先懂原理 → 再看它能变成哪些样子」(护栏第 5 条)。

export function AtlasView() {
  const groups = nodesByVein()
  const [open, setOpen] = useState<string | null>(null)

  function toggle(id: string) {
    setOpen((cur) => (cur === id ? null : id))
  }

  return (
    <div className="atlas">
      <p className="atlas__intro">
        每个知识点都有一个<b>真身</b>(深层结构),出题永远围绕它、只是换<i>化形</i>(题型外衣)。
        看懂真身,没见过的新题也认得出它是谁。<br />
        点开一张卡片 —— 看它能变成哪些样子。
      </p>

      <div className="atlas__grid">
        {groups.map(({ vein, nodes }) => (
          <section className="atlas-col" key={vein}>
            <div className="atlas-col__head">
              <span className="atlas-col__bar" style={{ background: veinColor(vein) }} />
              <span className="atlas-col__name" style={{ color: veinColor(vein) }}>
                {veinName(vein)}
              </span>
              <span className="atlas-col__count">{nodes.length}</span>
            </div>

            {[...nodes]
              .sort((a, b) => a.tier - b.tier)
              .map((n) => {
                const isOpen = open === n.id
                return (
                  <article
                    key={n.id}
                    className="atlas-card"
                    onClick={() => toggle(n.id)}
                    style={isOpen ? { borderColor: veinColor(vein) } : undefined}
                  >
                    <div className="atlas-card__top">
                      <span className="atlas-card__tier">
                        {n.tier}·{tierLabel(n.tier)} · {n.vol}
                      </span>
                      <span className="atlas-card__name">{n.name}</span>
                    </div>
                    <p className="atlas-card__truth">{n.truth}</p>

                    {isOpen && (
                      <>
                        <div className="atlas-card__forms">
                          <span className="atlas-card__forms-label">化形 · 常见题型</span>
                          {n.forms.map((f) => (
                            <span key={f} className="form-chip">
                              {f}
                            </span>
                          ))}
                        </div>
                        {n.note && <p className="atlas-card__note">编者视角:{n.note}</p>}
                      </>
                    )}
                  </article>
                )
              })}
          </section>
        ))}
      </div>
    </div>
  )
}
