import { useTheme } from './theme'

// 暗色 ↔ 儿童模式切换。仅换皮肤,数据不变。
export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const isChild = theme === 'child'
  return (
    <button
      className="theme-toggle mono"
      onClick={toggle}
      title={isChild ? '切到暗色(家长视角)' : '切到儿童模式(亮色大字)'}
      aria-label="切换主题"
    >
      {isChild ? '☾ 暗色' : '☀ 儿童'}
    </button>
  )
}
