import { useState } from 'react'
import { ThemeProvider } from './theme'
import { ThemeToggle } from './ThemeToggle'
import { useProgress } from '../lib/progress'
import { MapView } from '../views/MapView'
import { TreeView } from '../views/TreeView'
import { SkillTreeView } from '../views/SkillTreeView'
import { AtlasView } from '../views/AtlasView'
import './App.css'

type ViewId = 'map' | 'tree' | 'skill' | 'atlas'

const DETAIL_VIEWS: { id: ViewId; label: string; hint: string }[] = [
  { id: 'tree', label: '生命之树', hint: '整体有哪些' },
  { id: 'skill', label: '修炼路线', hint: '什么时候学什么' },
  { id: 'atlas', label: '真身谱', hint: '俯瞰真身 / 化形' },
]

export function App() {
  const [view, setView] = useState<ViewId>('map')
  const progress = useProgress()

  return (
    <ThemeProvider>
      <div className="app">
        <header className="app__bar">
          <div className="app__brand">
            <span className="app__seed">小学数学 · 知识地图</span>
            <span className="app__sub mono">好奇 · 探索 · 惊喜</span>
          </div>

          <nav className="app__nav" aria-label="视图切换">
            <button
              className={'tab tab--map' + (view === 'map' ? ' tab--on' : '')}
              onClick={() => setView('map')}
              aria-current={view === 'map'}
            >
              <span className="tab__label">全局之树</span>
              <span className="tab__hint mono">整片大陆</span>
            </button>

            <span className="app__group mono">一年级</span>
            {DETAIL_VIEWS.map((v) => (
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
          {view === 'map' && <MapView onEnter={() => setView('tree')} />}
          {view === 'tree' && <TreeView />}
          {view === 'skill' && <SkillTreeView progress={progress} />}
          {view === 'atlas' && <AtlasView />}
        </main>
      </div>
    </ThemeProvider>
  )
}
