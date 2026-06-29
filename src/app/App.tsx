import { useState } from 'react'
import { ThemeProvider } from './theme'
import { ThemeToggle } from './ThemeToggle'
import { useProgress } from '../lib/progress'
import { TreeView } from '../views/TreeView'
import { SkillTreeView } from '../views/SkillTreeView'
import { AtlasView } from '../views/AtlasView'
import './App.css'

type ViewId = 'tree' | 'skill' | 'atlas'

const VIEWS: { id: ViewId; label: string; hint: string }[] = [
  { id: 'tree', label: '生命之树', hint: '整体有哪些' },
  { id: 'skill', label: '修炼路线', hint: '什么时候学什么' },
  { id: 'atlas', label: '真身谱', hint: '俯瞰真身 / 化形' },
]

export function App() {
  const [view, setView] = useState<ViewId>('tree')
  const progress = useProgress()

  return (
    <ThemeProvider>
      <div className="app">
        <header className="app__bar">
          <div className="app__brand">
            <span className="app__seed">一年级数学</span>
            <span className="app__sub mono">好奇 · 探索 · 惊喜</span>
          </div>

          <nav className="app__nav" aria-label="视图切换">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                className={'tab' + (view === v.id ? ' tab--on' : '')}
                onClick={() => setView(v.id)}
                aria-current={view === v.id}
              >
                <span className="tab__label">{v.label}</span>
                <span className="tab__hint mono">{v.hint}</span>
              </button>
            ))}
          </nav>

          <ThemeToggle />
        </header>

        <main className="app__stage">
          {view === 'tree' && <TreeView />}
          {view === 'skill' && <SkillTreeView progress={progress} />}
          {view === 'atlas' && <AtlasView />}
        </main>
      </div>
    </ThemeProvider>
  )
}
