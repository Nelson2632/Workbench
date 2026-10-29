import { noteLocalMetric } from '@/domain/system/localMetrics'
import { useRef, useState } from 'react'
import { uid } from '@/utils/helpers'

/** An intent survives failure/retry. Draft edits create a new intent. */
export function useReliableCapture(save: (text: string, commandId: string) => Promise<unknown>) {
  const [value, setValue] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const draft = useRef('')
  const busy = useRef(false)
  const intent = useRef<{ text: string; id: string } | null>(null)
  const edit = (text: string) => { draft.current = text; setValue(text); setError('') }
  const submit = async () => {
    const text = draft.current.trim()
    if (!text || busy.current) return false
    if (intent.current?.text !== text) intent.current = { text, id: 'cmd_' + uid() }
    busy.current = true
    setPending(true)
    setError('')
    try {
      await save(text, intent.current.id)
      noteLocalMetric('captureSaved')
      if (draft.current.trim() === text) edit('')
      intent.current = null
      return true
    } catch {
      setError('保存结果未确认，文字已保留。请重试。')
      return false
    } finally {
      busy.current = false
      setPending(false)
    }
  }
  return { value, setValue: edit, pending, error, submit }
}
