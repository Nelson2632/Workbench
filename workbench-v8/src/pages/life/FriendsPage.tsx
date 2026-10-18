// ============================================================
// V9 LIFE — 好友页：好友 CRUD + 生日（MM-DD）自动生成 Event
// 展示下次生日日期与即将到来的生日（纯函数投影）
// ============================================================

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useFriendStore } from '@/stores/friendStore'
import { nextBirthday, isBirthdayToday } from '@/domain/life/birthday'
import type { Friend } from '@/types'
import styles from './life.module.css'

const BIRTHDAY_RE = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/

export default function FriendsPage() {
  const friends = useFriendStore((s) => s.friends)
  const loading = useFriendStore((s) => s.loading)
  const loadFriends = useFriendStore((s) => s.loadFriends)
  const addFriend = useFriendStore((s) => s.addFriend)
  const updateFriend = useFriendStore((s) => s.updateFriend)
  const deleteFriend = useFriendStore((s) => s.deleteFriend)

  const [name, setName] = useState('')
  const [alias, setAlias] = useState('')
  const [birthday, setBirthday] = useState('')
  const [relationship, setRelationship] = useState('朋友')
  const [contact, setContact] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  // 详情/编辑（RF-10：单击进入详情）
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editAlias, setEditAlias] = useState('')
  const [editBirthday, setEditBirthday] = useState('')
  const [editRelationship, setEditRelationship] = useState('')
  const [editContact, setEditContact] = useState('')
  const [editNote, setEditNote] = useState('')

  const today = new Date()

  useEffect(() => {
    void loadFriends()
  }, [loadFriends])

  const handleAdd = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!name.trim()) {
        setError('姓名不能为空')
        return
      }
      const bd = birthday.trim()
      if (bd && !BIRTHDAY_RE.test(bd)) {
        setError('生日格式应为 MM-DD，例如 03-15')
        return
      }
      setError('')
      await addFriend({
        name: name.trim(),
        alias: alias.trim() || null,
        birthday: bd || null,
        relationship: relationship.trim() || '朋友',
        contact: contact.trim(),
        note: note.trim(),
      })
      setName('')
      setAlias('')
      setBirthday('')
      setContact('')
      setNote('')
    },
    [addFriend, alias, birthday, contact, name, note, relationship],
  )

  const startEdit = useCallback((f: Friend) => {
    setEditingId(f.id)
    setEditName(f.name)
    setEditAlias(f.alias ?? '')
    setEditBirthday(f.birthday ?? '')
    setEditRelationship(f.relationship)
    setEditContact(f.contact)
    setEditNote(f.note)
    setError('')
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setError('')
  }, [])

  const saveEdit = useCallback(
    async (f: Friend) => {
      if (!editName.trim()) {
        setError('姓名不能为空')
        return
      }
      const bd = editBirthday.trim()
      if (bd && !BIRTHDAY_RE.test(bd)) {
        setError('生日格式应为 MM-DD，例如 03-15')
        return
      }
      setError('')
      await updateFriend(f.id, {
        name: editName.trim(),
        alias: editAlias.trim() || null,
        birthday: bd || null,
        relationship: editRelationship.trim() || '朋友',
        contact: editContact.trim(),
        note: editNote.trim(),
      })
      cancelEdit()
    },
    [cancelEdit, editAlias, editBirthday, editContact, editName, editNote, editRelationship, updateFriend],
  )

  const groups = useMemo(() => {
    const map = new Map<string, typeof friends>()
    for (const f of friends) {
      const list = map.get(f.relationship) ?? []
      list.push(f)
      map.set(f.relationship, list)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh'))
  }, [friends])

  const upcoming = useMemo(() => {
    return friends
      .filter((f) => f.birthday)
      .map((f) => ({ f, date: nextBirthday(f.birthday!, today) }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6)
  }, [friends])

  return (
    <div className={styles.root} style={{ padding: 0 }}>
      <form className={styles.card} onSubmit={handleAdd}>
        <h2 className={styles.cardTitle}>添加好友</h2>
        <div className={styles.formRow}>
          <input
            className={styles.input}
            style={{ maxWidth: 180 }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="姓名 *"
            aria-label="好友姓名"
          />
          <input
            className={styles.input}
            style={{ maxWidth: 180 }}
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="昵称（可选）"
            aria-label="昵称"
          />
          <input
            className={styles.input}
            style={{ maxWidth: 160 }}
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            placeholder="生日 MM-DD"
            aria-label="生日"
          />
          <input
            className={styles.input}
            style={{ maxWidth: 140 }}
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            placeholder="关系"
            aria-label="关系"
          />
        </div>
        <div className={styles.formRow}>
          <input
            className={styles.input}
            style={{ maxWidth: 260 }}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="联系方式（可选）"
            aria-label="联系方式"
          />
          <input
            className={styles.input}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="备注（可选）"
            aria-label="备注"
          />
          <button type="submit" className={styles.button}>
            添加
          </button>
        </div>
        <p className={styles.subtitle}>填写生日后会自动在日历生成「{name || '姓名'} 生日」事件。</p>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </form>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>即将到来的生日</h2>
        {upcoming.length === 0 && <p className={styles.empty}>还没有填写生日的好友</p>}
        <div className={styles.list}>
          {upcoming.map(({ f, date }) => (
            <div key={f.id} className={styles.item}>
              <div className={styles.itemHeader}>
                <p className={styles.itemTitle}>
                  {f.name}
                  {f.alias ? `（${f.alias}）` : ''}
                </p>
                <span className={styles.itemMeta}>
                  <span className={styles.chip}>🎂 {f.birthday}</span>
                  <span className={styles.chip}>下次：{date}</span>
                  {isBirthdayToday(f.birthday, today) && <span className={styles.chip}>就是今天！</span>}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.list} aria-label="好友列表">
        <h2 className={styles.cardTitle}>好友（{friends.length}）</h2>
        {loading && <p className={styles.empty}>加载中…</p>}
        {!loading && friends.length === 0 && <p className={styles.empty}>还没有好友，先添加一位吧</p>}
        {groups.map(([rel, list]) => (
          <div key={rel} className={styles.card}>
            <h3 className={styles.cardTitle}>{rel}（{list.length}）</h3>
            {list.map((f) => (
              <div key={f.id} className={styles.item}>
                <div className={styles.itemHeader}>
                  <p className={styles.itemTitle}>
                    {f.name}
                    {f.alias ? `（${f.alias}）` : ''}
                  </p>
                  <span className={styles.itemMeta}>
                    {f.birthday && <span className={styles.chip}>🎂 {f.birthday}</span>}
                    {f.contact && <span className={styles.chip}>{f.contact}</span>}
                    {f.note && <span className={styles.chip}>{f.note}</span>}
                  </span>
                </div>

                {editingId === f.id && (
                  <div className={styles.formRow} style={{ flexWrap: 'wrap' }}>
                    <input
                      className={styles.input}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="姓名"
                      aria-label="编辑好友姓名"
                    />
                    <input
                      className={styles.input}
                      value={editAlias}
                      onChange={(e) => setEditAlias(e.target.value)}
                      placeholder="昵称"
                      aria-label="编辑昵称"
                    />
                    <input
                      className={styles.input}
                      value={editBirthday}
                      onChange={(e) => setEditBirthday(e.target.value)}
                      placeholder="生日 MM-DD"
                      aria-label="编辑生日"
                    />
                    <input
                      className={styles.input}
                      value={editRelationship}
                      onChange={(e) => setEditRelationship(e.target.value)}
                      placeholder="关系"
                      aria-label="编辑关系"
                    />
                    <input
                      className={styles.input}
                      value={editContact}
                      onChange={(e) => setEditContact(e.target.value)}
                      placeholder="联系方式"
                      aria-label="编辑联系方式"
                    />
                    <input
                      className={styles.input}
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      placeholder="备注"
                      aria-label="编辑备注"
                    />
                    <button type="button" className={styles.button} onClick={() => void saveEdit(f)}>
                      保存
                    </button>
                    <button type="button" className={styles.buttonGhost} onClick={cancelEdit}>
                      取消
                    </button>
                    {error && (
                      <p className={styles.error} role="alert">
                        {error}
                      </p>
                    )}
                  </div>
                )}

                <div className={styles.itemActions}>
                  <button
                    type="button"
                    className={styles.buttonGhost}
                    onClick={() => startEdit(f)}
                    aria-label={`查看好友 ${f.name} 详情`}
                  >
                    详情
                  </button>
                  <button
                    type="button"
                    className={styles.buttonDanger}
                    onClick={() => {
                      if (window.confirm(`删除好友「${f.name}」？其生日事件也会被删除。`)) {
                        void deleteFriend(f.id)
                      }
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </section>
    </div>
  )
}
