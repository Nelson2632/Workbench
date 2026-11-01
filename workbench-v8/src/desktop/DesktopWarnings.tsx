import { useEffect, useState } from 'react'
import { isDesktop } from './index'

export default function DesktopWarnings() {
  const [warnings, setWarnings] = useState<string[]>([])
  useEffect(() => {
    if (!isDesktop()) return
    let active = true
    void import('@tauri-apps/api/core').then(({ invoke }) => invoke<string[]>('desktop_shortcut_warnings')).then(value => { if (active) setWarnings(value) }).catch(error => console.warn('[Workbench] shortcut status unavailable', error))
    return () => { active = false }
  }, [])
  if (!warnings.length) return null
  return <p role="status">快捷键 {warnings.join('、')} 未能注册，可能被其他程序占用。可使用系统托盘菜单；关闭冲突程序后重启 Workbench 可重试。</p>
}
