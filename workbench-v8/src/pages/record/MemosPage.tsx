import { useState, useEffect, useRef, useCallback } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { useRecordStore } from '@/stores/recordStore'
import { useTaskStore } from '@/stores/taskStore'
import { useToast } from '@/components/ui/Toast'
import { formatShortcutDisplay } from '@/desktop'
import type { TaskPriority } from '@/types'
import styles from './MemosPage.module.css'

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`

  const d = new Date(dateStr)
  const nowDate = new Date()
  if (d.getFullYear() === nowDate.getFullYear()) {
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function getPreviewLines(content: string, maxLines = 2): string {
  const lines = content.split('\n')
  return lines.slice(0, maxLines).join('\n')
}

export default function MemosPage() {
  const [content, setContent] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [searchText, setSearchText] = useState('')
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('P2')
  const [convertingMemoId, setConvertingMemoId] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const navigate = useNavigate()

  const { memos, addMemo, deleteMemo, convertMemoToTask, convertMemoToMistake, convertMemoToNote, loadMemos } =
    useRecordStore()
  const { addTask } = useTaskStore()
  const { toast } = useToast()

  useEffect(() => {
    loadMemos()
  }, [loadMemos])

  const handleSave = useCallback(async () => {
    const trimmed = content.trim()
    if (!trimmed) return
    await addMemo(trimmed)
    setContent('')
    toast('备忘录已保存', 'success')
    textareaRef.current?.focus()
  }, [content, addMemo, toast])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleSave()
      }
    },
    [handleSave],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteMemo(id)
      setConfirmId(null)
      toast('已删除', 'info')
    },
    [deleteMemo, toast],
  )

  const openConvertToTask = useCallback((id: string) => {
    const memo = memos.find((m) => m.id === id)
    if (!memo) return
    setConvertingMemoId(id)
    setTaskTitle(memo.content.slice(0, 80))
    setTaskPriority('P2')
    setTaskModalOpen(true)
  }, [memos])

  const handleConvertToTask = useCallback(async () => {
    if (!convertingMemoId || !taskTitle.trim()) return
    await addTask({ title: taskTitle.trim(), priority: taskPriority })
    await convertMemoToTask(convertingMemoId)
    setTaskModalOpen(false)
    setConvertingMemoId(null)
    toast('已转为任务', 'success')
  }, [convertingMemoId, taskTitle, taskPriority, addTask, convertMemoToTask, toast])

  const handleConvertToMistake = useCallback(
    async (id: string) => {
      const memo = memos.find((m) => m.id === id)
      if (!memo) return
      await convertMemoToMistake(id)
      toast('已转为错题', 'success')
      navigate('/study/mistakes')
    },
    [memos, convertMemoToMistake, toast, navigate],
  )

  const handleConvertToNote = useCallback(
    async (id: string) => {
      const memo = memos.find((m) => m.id === id)
      if (!memo) return
      await convertMemoToNote(id)
      toast('已转为笔记', 'success')
    },
    [memos, convertMemoToNote, toast],
  )

  const sortedMemos = [...memos]
    .filter((m) => {
      if (!searchText.trim()) return true
      return m.content.toLowerCase().includes(searchText.toLowerCase())
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div className={styles.page}>
      <PageHeader title="备忘录" description="快速记录，随时整理" />

      <div className={styles.inputArea}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="突然想到什么……"
          rows={4}
        />
        <div className={styles.inputFooter}>
          <span className={styles.hint}>{formatShortcutDisplay('Ctrl+Enter')} 保存</span>
          <Button size="sm" onClick={handleSave} disabled={!content.trim()}>
            保存
          </Button>
        </div>
      </div>

      <div className={styles.searchBar}>
        <input
          className={styles.searchInput}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="搜索备忘录..."
        />
        {searchText && (
          <button className={styles.searchClear} onClick={() => setSearchText('')}>
            ×
          </button>
        )}
      </div>

      {sortedMemos.length === 0 ? (
        <EmptyState
          icon="📝"
          title={searchText ? '没有匹配的备忘录' : '还没有备忘录'}
          description={searchText ? '试试其他关键词' : '在上面写点什么吧'}
        />
      ) : (
        <div className={`${styles.memoList} anim-list-stagger`}>
          {sortedMemos.map((memo, index) => {
            const isExpanded = expandedId === memo.id
            const needsExpansion = memo.content.includes('\n') || memo.content.length > 80

            return (
              <Card key={memo.id} className={styles.memoCard} style={{ '--i': index } as CSSProperties}>
                <div
                  className={`${styles.memoContentWrap} ${needsExpansion ? styles.memoContentExpandable : ''}`}
                  onClick={() => {
                    if (needsExpansion) {
                      setExpandedId(isExpanded ? null : memo.id)
                    }
                  }}
                >
                  <p className={styles.memoContent}>
                    {isExpanded ? memo.content : getPreviewLines(memo.content)}
                  </p>
                  {needsExpansion && !isExpanded && (
                    <span className={styles.expandHint}>点击展开</span>
                  )}
                </div>
                <div className={styles.memoMeta}>
                  <span className={styles.memoTime}>{relativeTime(memo.createdAt)}</span>
                  {memo.convertedTo && (
                    <Badge variant={memo.convertedTo.type === 'task' ? 'success' : memo.convertedTo.type === 'mistake' ? 'warning' : 'info'}>
                      {memo.convertedTo.type === 'task'
                        ? '已转任务'
                        : memo.convertedTo.type === 'mistake'
                          ? '已转错题'
                          : '已转笔记'}
                    </Badge>
                  )}
                </div>
                <div className={styles.memoActions}>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!!memo.convertedTo}
                    onClick={() => openConvertToTask(memo.id)}
                  >
                    转为任务
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!!memo.convertedTo}
                    onClick={() => handleConvertToMistake(memo.id)}
                  >
                    转为错题
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!!memo.convertedTo}
                    onClick={() => handleConvertToNote(memo.id)}
                  >
                    转为笔记
                  </Button>
                  {confirmId === memo.id ? (
                    <>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(memo.id)}>
                        确认删除
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>
                        取消
                      </Button>
                    </>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setConfirmId(memo.id)}>
                      删除
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        title="转为任务"
        size="sm"
      >
        <div className={styles.taskForm}>
          <div className={styles.taskFormGroup}>
            <label className={styles.taskLabel}>任务标题</label>
            <input
              className={styles.taskInput}
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="任务标题"
            />
          </div>
          <div className={styles.taskFormGroup}>
            <label className={styles.taskLabel}>优先级</label>
            <select
              className={styles.taskInput}
              value={taskPriority}
              onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
            >
              <option value="P0">P0 - 最高</option>
              <option value="P1">P1 - 中等</option>
              <option value="P2">P2 - 低</option>
            </select>
          </div>
          <div className={styles.taskFormActions}>
            <Button variant="secondary" onClick={() => setTaskModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleConvertToTask}>创建任务</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}