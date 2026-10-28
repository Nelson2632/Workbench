import { useEffect } from 'react'
import { useTaskStore } from '@/stores/taskStore'

function FeedbackRow({ commandId, title }: { commandId: string; title: string }) {
  const dismiss = useTaskStore((s) => s.dismissFeedback)
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = setTimeout(() => dismiss(commandId), reduced ? 2000 : 900)
    return () => clearTimeout(timer)
  }, [commandId, dismiss])
  return <div data-testid="completion-feedback" data-command-id={commandId} data-v9-done="true" data-v9-done-glow="true" style={{ position: 'relative' }}><span data-v9-done-title>已完成：{title}</span></div>
}

export default function CompletionFeedback() {
  const feedback = useTaskStore((s) => s.feedback)
  const completions = useTaskStore((s) => s.completions)
  const retry = useTaskStore((s) => s.setDone)
  return <div aria-live="polite" aria-atomic="false">
    {feedback.map((f) => <FeedbackRow key={f.commandId} {...f} />)}
    {Object.values(completions).filter((c) => c.phase !== 'projected').map((c) => <div key={c.commandId} role={c.phase === 'failed-persist' ? 'alert' : 'status'}>
      {c.phase === 'persisting' ? '正在保存' : c.phase === 'committed' ? '已保存，正在同步回顾' : c.phase === 'sync-pending' ? '已保存，回顾同步待重试' : '未能保存，任务尚未改变'}：{c.title}
      {(c.phase === 'failed-persist' || c.phase === 'sync-pending') && <button onClick={() => void retry(c)}>重试{c.phase === 'sync-pending' ? '同步' : '保存'}</button>}
    </div>)}
  </div>
}
