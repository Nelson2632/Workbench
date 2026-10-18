import { useState, useEffect, useCallback, useMemo } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import Card from '@/components/ui/Card'
import { useRecordStore } from '@/stores/recordStore'
import { useToast } from '@/components/ui/Toast'
import type { Note } from '@/types'
import styles from './NotesPage.module.css'

const emptyForm = {
  title: '',
  body: '',
  notebook: '默认',
  tags: '',
  url: '',
  favorite: false,
}

export default function NotesPage() {
  const { notes, loading, loadNotes, addNote, updateNote, deleteNote } = useRecordStore()
  const { toast } = useToast()

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  // Filters
  const [activeNotebook, setActiveNotebook] = useState<string | null>(null)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [showFavorites, setShowFavorites] = useState(false)
  const [newNotebook, setNewNotebook] = useState('')
  const [showNewNotebook, setShowNewNotebook] = useState(false)

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  // Notebooks
  const notebooks = useMemo(() => {
    const set = new Set<string>()
    notes.forEach((n) => set.add(n.notebook || '默认'))
    return Array.from(set).sort()
  }, [notes])

  // All tags
  const allTags = useMemo(() => {
    const map: Record<string, number> = {}
    notes.forEach((n) => {
      n.tags.forEach((t) => {
        map[t] = (map[t] || 0) + 1
      })
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [notes])

  // Filtered notes
  const filteredNotes = useMemo(() => {
    let result = notes
    if (activeNotebook) {
      result = result.filter((n) => (n.notebook || '默认') === activeNotebook)
    }
    if (activeTag) {
      result = result.filter((n) => n.tags.includes(activeTag))
    }
    if (showFavorites) {
      result = result.filter((n) => n.favorite)
    }
    return result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [notes, activeNotebook, activeTag, showFavorites])

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) || null,
    [notes, selectedNoteId],
  )

  const handleSelectNote = useCallback((note: Note) => {
    setSelectedNoteId(note.id)
    setIsEditing(false)
  }, [])

  const handleNewNote = useCallback(() => {
    setSelectedNoteId(null)
    setIsEditing(true)
    setForm(emptyForm)
  }, [])

  const handleEditNote = useCallback(() => {
    if (!selectedNote) return
    setForm({
      title: selectedNote.title,
      body: selectedNote.body,
      notebook: selectedNote.notebook || '默认',
      tags: selectedNote.tags.join(', '),
      url: selectedNote.url,
      favorite: selectedNote.favorite,
    })
    setIsEditing(true)
  }, [selectedNote])

  const handleBack = useCallback(() => {
    setSelectedNoteId(null)
    setIsEditing(false)
  }, [])

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) {
      toast('请输入笔记标题', 'warning')
      return
    }
    setSaving(true)
    try {
      const data = {
        title: form.title.trim(),
        body: form.body,
        notebook: form.notebook || '默认',
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        url: form.url.trim(),
        favorite: form.favorite,
      }
      if (selectedNoteId && selectedNote) {
        await updateNote(selectedNoteId, data)
        toast('笔记已更新', 'success')
      } else {
        await addNote(data)
        toast('笔记已创建', 'success')
      }
      setIsEditing(false)
      if (!selectedNoteId) {
        setSelectedNoteId(null)
      }
    } catch {
      toast('保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }, [form, selectedNoteId, selectedNote, addNote, updateNote, toast])

  const handleDelete = useCallback(async () => {
    if (!selectedNoteId || !confirm('确定删除此笔记？')) return
    await deleteNote(selectedNoteId)
    toast('笔记已删除', 'success')
    setSelectedNoteId(null)
    setIsEditing(false)
  }, [selectedNoteId, deleteNote, toast])

  const handleToggleFavorite = useCallback(async (note: Note) => {
    await updateNote(note.id, { favorite: !note.favorite })
  }, [updateNote])

  const handleAddNotebook = useCallback(() => {
    if (!newNotebook.trim()) return
    setActiveNotebook(newNotebook.trim())
    setNewNotebook('')
    setShowNewNotebook(false)
  }, [newNotebook])

  const clearFilters = useCallback(() => {
    setActiveNotebook(null)
    setActiveTag(null)
    setShowFavorites(false)
  }, [])

  const hasActiveFilter = activeNotebook || activeTag || showFavorites

  return (
    <div className={styles.page}>
      <PageHeader
        title="笔记"
        description="Markdown 笔记管理与标签分类"
        actions={
          <Button onClick={handleNewNote}>新建笔记</Button>
        }
      />

      <div className={styles.layout}>
        {/* Left Panel */}
        <div className={styles.leftPanel}>
          {/* Notebooks */}
          <div className={styles.panelSection}>
            <div className={styles.panelSectionHeader}>
              <h3 className={styles.panelTitle}>笔记本</h3>
              <button
                className={styles.addFolderBtn}
                onClick={() => setShowNewNotebook(!showNewNotebook)}
                title="新建笔记本"
              >
                +
              </button>
            </div>
            {showNewNotebook && (
              <div className={styles.newNotebookRow}>
                <input
                  className={styles.newNotebookInput}
                  value={newNotebook}
                  onChange={(e) => setNewNotebook(e.target.value)}
                  placeholder="笔记本名称"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNotebook()}
                />
                <button className={styles.confirmBtn} onClick={handleAddNotebook}>
                  ✓
                </button>
              </div>
            )}
            <div className={styles.notebookList}>
              <button
                className={`${styles.notebookItem} ${!activeNotebook && !showFavorites ? styles.notebookItemActive : ''}`}
                onClick={() => { setActiveNotebook(null); setShowFavorites(false) }}
              >
                📁 全部笔记
                <span className={styles.notebookCount}>{notes.length}</span>
              </button>
              {notebooks.map((nb) => (
                <button
                  key={nb}
                  className={`${styles.notebookItem} ${activeNotebook === nb ? styles.notebookItemActive : ''}`}
                  onClick={() => { setActiveNotebook(nb); setShowFavorites(false) }}
                >
                  📁 {nb}
                  <span className={styles.notebookCount}>
                    {notes.filter((n) => (n.notebook || '默认') === nb).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className={styles.panelSection}>
            <h3 className={styles.panelTitle}>标签</h3>
            {allTags.length === 0 ? (
              <p className={styles.panelEmpty}>暂无标签</p>
            ) : (
              <div className={styles.tagList}>
                {allTags.map(([tag, count]) => (
                  <button
                    key={tag}
                    className={`${styles.tagItem} ${activeTag === tag ? styles.tagItemActive : ''}`}
                    onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  >
                    {tag}
                    <span className={styles.tagCount}>{count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Favorites */}
          <div className={styles.panelSection}>
            <button
              className={`${styles.favoriteFilter} ${showFavorites ? styles.favoriteFilterActive : ''}`}
              onClick={() => { setShowFavorites(!showFavorites); setActiveNotebook(null); setActiveTag(null) }}
            >
              ⭐ 收藏
              <span className={styles.notebookCount}>
                {notes.filter((n) => n.favorite).length}
              </span>
            </button>
          </div>

          {hasActiveFilter && (
            <button className={styles.clearFilterBtn} onClick={clearFilters}>
              清除筛选
            </button>
          )}
        </div>

        {/* Right Panel */}
        <div className={styles.rightPanel}>
          {isEditing ? (
            /* Editor View */
            <Card className={styles.editorCard}>
              <div className={styles.editorHeader}>
                <h3 className={styles.editorTitle}>
                  {selectedNoteId ? '编辑笔记' : '新建笔记'}
                </h3>
                <div className={styles.editorActions}>
                  <Button variant="ghost" onClick={handleBack}>
                    返回
                  </Button>
                  {selectedNoteId && (
                    <Button variant="danger" onClick={handleDelete}>
                      删除
                    </Button>
                  )}
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? '保存中...' : '保存'}
                  </Button>
                </div>
              </div>

              <div className={styles.editorForm}>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="笔记标题"
                  className={styles.editorTitleInput}
                />

                <textarea
                  className={styles.editorBody}
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="开始写笔记...（支持 Markdown）"
                  rows={14}
                />

                <div className={styles.editorMeta}>
                  <div className={styles.editorField}>
                    <label className={styles.editorLabel}>笔记本</label>
                    <select
                      className={styles.editorSelect}
                      value={form.notebook}
                      onChange={(e) => setForm((f) => ({ ...f, notebook: e.target.value }))}
                    >
                      {notebooks.map((nb) => (
                        <option key={nb} value={nb}>{nb}</option>
                      ))}
                      <option value="默认">默认</option>
                    </select>
                  </div>

                  <div className={styles.editorField}>
                    <label className={styles.editorLabel}>标签（逗号分隔）</label>
                    <Input
                      value={form.tags}
                      onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                      placeholder="例如：学习, 技术"
                    />
                  </div>

                  <div className={styles.editorField}>
                    <label className={styles.editorLabel}>URL</label>
                    <Input
                      value={form.url}
                      onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                      placeholder="相关链接..."
                    />
                  </div>

                  <div className={styles.editorField}>
                    <label className={styles.editorLabel}>收藏</label>
                    <button
                      className={`${styles.favoriteToggle} ${form.favorite ? styles.favoriteToggleActive : ''}`}
                      onClick={() => setForm((f) => ({ ...f, favorite: !f.favorite }))}
                    >
                      {form.favorite ? '⭐ 已收藏' : '☆ 收藏'}
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ) : selectedNote ? (
            /* Note Detail View */
            <Card className={styles.detailCard}>
              <div className={styles.detailHeader}>
                <h2 className={styles.detailTitle}>{selectedNote.title}</h2>
                <div className={styles.detailActions}>
                  <button
                    className={styles.favoriteBtn}
                    onClick={() => handleToggleFavorite(selectedNote)}
                    title={selectedNote.favorite ? '取消收藏' : '收藏'}
                  >
                    {selectedNote.favorite ? '⭐' : '☆'}
                  </button>
                  <Button variant="secondary" size="sm" onClick={handleEditNote}>
                    编辑
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleBack}>
                    返回
                  </Button>
                </div>
              </div>
              <div className={styles.detailMeta}>
                <span className={styles.detailNotebook}>
                  📁 {selectedNote.notebook || '默认'}
                </span>
                <span className={styles.detailDate}>
                  {selectedNote.updatedAt.slice(0, 10)}
                </span>
                {selectedNote.url && (
                  <a className={styles.detailUrl} href={selectedNote.url} target="_blank" rel="noopener noreferrer">
                    🔗 链接
                  </a>
                )}
              </div>
              {selectedNote.tags.length > 0 && (
                <div className={styles.detailTags}>
                  {selectedNote.tags.map((tag) => (
                    <span key={tag} className={styles.detailTag}>{tag}</span>
                  ))}
                </div>
              )}
              <div className={styles.detailBody}>
                {selectedNote.body || '(空内容)'}
              </div>
            </Card>
          ) : (
            /* Note List */
            <div>
              {loading ? (
                <EmptyState icon="⏳" title="加载中..." />
              ) : filteredNotes.length === 0 ? (
                <EmptyState
                  icon="📝"
                  title={hasActiveFilter ? '没有匹配的笔记' : '还没有笔记'}
                  description={hasActiveFilter ? '尝试清除筛选' : '点击「新建笔记」开始记录'}
                  action={
                    hasActiveFilter ? (
                      <Button variant="secondary" onClick={clearFilters}>清除筛选</Button>
                    ) : (
                      <Button onClick={handleNewNote}>新建笔记</Button>
                    )
                  }
                />
              ) : (
                <div className={styles.noteList}>
                  {filteredNotes.map((note) => (
                    <div
                      key={note.id}
                      className={styles.noteItem}
                      onClick={() => handleSelectNote(note)}
                    >
                      <div className={styles.noteItemTop}>
                        <h3 className={styles.noteItemTitle}>{note.title || '(无标题)'}</h3>
                        <button
                          className={styles.noteFavorite}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleFavorite(note)
                          }}
                          title={note.favorite ? '取消收藏' : '收藏'}
                        >
                          {note.favorite ? '⭐' : '☆'}
                        </button>
                      </div>
                      <p className={styles.noteItemPreview}>
                        {note.body ? note.body.slice(0, 100) : '(空内容)'}
                      </p>
                      <div className={styles.noteItemMeta}>
                        <span className={styles.noteItemNotebook}>
                          📁 {note.notebook || '默认'}
                        </span>
                        {note.tags.length > 0 && (
                          <span className={styles.noteItemTags}>
                            {note.tags.join(', ')}
                          </span>
                        )}
                        <span className={styles.noteItemDate}>
                          {note.updatedAt.slice(0, 10)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}