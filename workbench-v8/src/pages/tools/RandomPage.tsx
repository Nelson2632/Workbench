import { isActiveTask } from '@/domain/planning/taskLifecycle'
import { useState, useCallback, useMemo } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import { useStudyStore } from '@/stores/studyStore'
import { useTaskStore } from '@/stores/taskStore'
import type { Topic, Task } from '@/types'
import styles from './RandomPage.module.css'

type TabType = 'selector' | 'number' | 'knowledge' | 'task' | 'coin'

const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: 'selector', label: '随机选择', icon: '🎯' },
  { key: 'number', label: '随机数字', icon: '🔢' },
  { key: 'knowledge', label: '随机知识点', icon: '📚' },
  { key: 'task', label: '随机任务', icon: '✅' },
  { key: 'coin', label: '抛硬币', icon: '🪙' },
]

const MASTERY_LABELS: Record<string, string> = {
  notStarted: '未开始',
  learning: '学习中',
  mastered: '已掌握',
  weak: '薄弱',
}

const PRIORITY_LABELS: Record<string, string> = {
  P0: 'P0 · 紧急',
  P1: 'P1 · 重要',
  P2: 'P2 · 普通',
}

export default function RandomPage() {
  const [activeTab, setActiveTab] = useState<TabType>('selector')

  // Selector state
  const [options, setOptions] = useState('')
  const [selectorResult, setSelectorResult] = useState<string | null>(null)
  const [selectorHistory, setSelectorHistory] = useState<string[]>([])
  const [selectorAnimating, setSelectorAnimating] = useState(false)

  // Number state
  const [min, setMin] = useState(1)
  const [max, setMax] = useState(100)
  const [numberResult, setNumberResult] = useState<number | null>(null)

  // Knowledge state
  const [knowledgeResult, setKnowledgeResult] = useState<Topic | null>(null)
  const [knowledgeSubject, setKnowledgeSubject] = useState('')
  const [knowledgeChapter, setKnowledgeChapter] = useState('')

  // Task state
  const [taskResult, setTaskResult] = useState<Task | null>(null)

  // Coin state
  const [coinResult, setCoinResult] = useState<string | null>(null)
  const [coinFlipping, setCoinFlipping] = useState(false)
  const [coinStats, setCoinStats] = useState({ heads: 0, tails: 0 })

  const { subjects } = useStudyStore()
  const { tasks } = useTaskStore()

  const allTopics = useMemo(() => {
    const result: { topic: Topic; subjectName: string; chapterName: string }[] = []
    for (const sub of subjects) {
      for (const ch of sub.chapters) {
        for (const t of ch.topics) {
          result.push({ topic: t, subjectName: sub.name, chapterName: ch.name })
        }
      }
    }
    return result
  }, [subjects])

  const undoneTasks = useMemo(() => tasks.filter((t) => !t.done && isActiveTask(t)), [tasks])

  const handleRandomSelect = useCallback(() => {
    const lines = options
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
    if (lines.length === 0) return

    setSelectorAnimating(true)
    let count = 0
    const maxCycles = 15
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * lines.length)
      setSelectorResult(lines[randomIdx])
      count++
      if (count >= maxCycles) {
        clearInterval(interval)
        setSelectorAnimating(false)
        const final = lines[Math.floor(Math.random() * lines.length)]
        setSelectorResult(final)
        setSelectorHistory((prev) => [final, ...prev].slice(0, 20))
      }
    }, 80)
  }, [options])

  const handleRandomNumber = useCallback(() => {
    const mn = Math.min(min, max)
    const mx = Math.max(min, max)
    const result = Math.floor(Math.random() * (mx - mn + 1)) + mn
    setNumberResult(result)
  }, [min, max])

  const handleRandomKnowledge = useCallback(() => {
    if (allTopics.length === 0) return
    const idx = Math.floor(Math.random() * allTopics.length)
    const picked = allTopics[idx]
    setKnowledgeResult(picked.topic)
    setKnowledgeSubject(picked.subjectName)
    setKnowledgeChapter(picked.chapterName)
  }, [allTopics])

  const handleRandomTask = useCallback(() => {
    if (undoneTasks.length === 0) return
    const idx = Math.floor(Math.random() * undoneTasks.length)
    setTaskResult(undoneTasks[idx])
  }, [undoneTasks])

  const handleCoinFlip = useCallback(() => {
    setCoinFlipping(true)
    setCoinResult(null)
    setTimeout(() => {
      const isHeads = Math.random() > 0.5
      const result = isHeads ? '正面' : '反面'
      setCoinResult(result)
      setCoinFlipping(false)
      setCoinStats((prev) =>
        isHeads
          ? { ...prev, heads: prev.heads + 1 }
          : { ...prev, tails: prev.tails + 1 },
      )
    }, 800)
  }, [])

  const renderTabContent = () => {
    switch (activeTab) {
      case 'selector':
        return (
          <div className={styles.tabContent}>
            <Card className={styles.selectorCard}>
              <h3 className={styles.cardTitle}>随机选择器</h3>
              <p className={styles.cardDesc}>每行输入一个选项，点击按钮随机抽取</p>
              <textarea
                className={styles.optionsTextarea}
                value={options}
                onChange={(e) => setOptions(e.target.value)}
                placeholder={"选项1\n选项2\n选项3\n..."}
                rows={6}
              />
              <Button onClick={handleRandomSelect} disabled={selectorAnimating || !options.trim()}>
                {selectorAnimating ? '抽取中...' : '随机选择'}
              </Button>
              {selectorResult && (
                <div className={`${styles.resultBox} ${selectorAnimating ? styles.resultBoxAnimating : ''}`}>
                  <span className={styles.resultLabel}>结果：</span>
                  <span className={styles.resultValue}>{selectorResult}</span>
                </div>
              )}
            </Card>
            {selectorHistory.length > 0 && (
              <Card className={styles.historyCard}>
                <h3 className={styles.cardTitle}>历史记录</h3>
                <div className={styles.historyList}>
                  {selectorHistory.map((item, i) => (
                    <span key={i} className={styles.historyItem}>
                      {item}
                    </span>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )

      case 'number':
        return (
          <div className={styles.tabContent}>
            <Card className={styles.numberCard}>
              <h3 className={styles.cardTitle}>随机数字生成器</h3>
              <div className={styles.numberInputs}>
                <div className={styles.numberField}>
                  <label className={styles.numberLabel}>最小值</label>
                  <input
                    type="number"
                    className={styles.numberInput}
                    value={min}
                    onChange={(e) => setMin(Number(e.target.value))}
                  />
                </div>
                <span className={styles.numberSeparator}>—</span>
                <div className={styles.numberField}>
                  <label className={styles.numberLabel}>最大值</label>
                  <input
                    type="number"
                    className={styles.numberInput}
                    value={max}
                    onChange={(e) => setMax(Number(e.target.value))}
                  />
                </div>
              </div>
              <Button onClick={handleRandomNumber}>生成</Button>
              {numberResult !== null && (
                <div className={styles.resultBox}>
                  <span className={styles.resultLabel}>结果：</span>
                  <span className={styles.numberResultValue}>{numberResult}</span>
                </div>
              )}
            </Card>
          </div>
        )

      case 'knowledge':
        return (
          <div className={styles.tabContent}>
            <Card className={styles.knowledgeCard}>
              <h3 className={styles.cardTitle}>随机知识点</h3>
              <p className={styles.cardDesc}>
                从知识库中随机抽取一个知识点进行复习
                {allTopics.length === 0 && '（知识库为空，请先在知识库中添加知识点）'}
              </p>
              <Button onClick={handleRandomKnowledge} disabled={allTopics.length === 0}>
                随机抽取
              </Button>
              {knowledgeResult && (
                <div className={styles.knowledgeResult}>
                  <div className={styles.knowledgeField}>
                    <span className={styles.knowledgeFieldLabel}>学科</span>
                    <span className={styles.knowledgeFieldValue}>{knowledgeSubject}</span>
                  </div>
                  <div className={styles.knowledgeField}>
                    <span className={styles.knowledgeFieldLabel}>章节</span>
                    <span className={styles.knowledgeFieldValue}>{knowledgeChapter}</span>
                  </div>
                  <div className={styles.knowledgeField}>
                    <span className={styles.knowledgeFieldLabel}>知识点</span>
                    <span className={styles.knowledgeFieldValue}>{knowledgeResult.name}</span>
                  </div>
                  <div className={styles.knowledgeField}>
                    <span className={styles.knowledgeFieldLabel}>掌握度</span>
                    <span className={`${styles.masteryBadge} ${styles[`mastery${knowledgeResult.mastery}`]}`}>
                      {MASTERY_LABELS[knowledgeResult.mastery] || knowledgeResult.mastery}
                    </span>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )

      case 'task':
        return (
          <div className={styles.tabContent}>
            <Card className={styles.taskCard}>
              <h3 className={styles.cardTitle}>随机任务</h3>
              <p className={styles.cardDesc}>
                从未完成任务中随机抽取一个
                {undoneTasks.length === 0 && '（没有未完成的任务）'}
              </p>
              <Button onClick={handleRandomTask} disabled={undoneTasks.length === 0}>
                随机任务
              </Button>
              {taskResult && (
                <div className={styles.taskResult}>
                  <div className={styles.taskResultTitle}>{taskResult.title}</div>
                  <div className={styles.taskResultMeta}>
                    <span className={`${styles.priorityBadge} ${styles[`priority${taskResult.priority}`]}`}>
                      {PRIORITY_LABELS[taskResult.priority]}
                    </span>
                    {taskResult.dueDate && (
                      <span className={styles.taskDueDate}>{taskResult.dueDate}</span>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </div>
        )

      case 'coin':
        return (
          <div className={styles.tabContent}>
            <Card className={styles.coinCard}>
              <h3 className={styles.cardTitle}>抛硬币</h3>
              <div
                className={`${styles.coin} ${coinFlipping ? styles.coinFlipping : ''} ${coinResult ? styles.coinResult : ''}`}
                onClick={!coinFlipping ? handleCoinFlip : undefined}
              >
                <div className={styles.coinInner}>
                  <div className={styles.coinFront}>🪙</div>
                  <div className={styles.coinBack}>🪙</div>
                </div>
              </div>
              {coinResult && !coinFlipping && (
                <div className={styles.coinResultText}>
                  {coinResult === '正面' ? '🟢 正面' : '🔴 反面'}
                </div>
              )}
              <div className={styles.coinStats}>
                <div className={styles.coinStatItem}>
                  <span className={styles.coinStatLabel}>正面</span>
                  <span className={styles.coinStatValue}>{coinStats.heads}</span>
                </div>
                <div className={styles.coinStatItem}>
                  <span className={styles.coinStatLabel}>反面</span>
                  <span className={styles.coinStatValue}>{coinStats.tails}</span>
                </div>
              </div>
            </Card>
          </div>
        )
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="随机工具"
        description="随机选择器、抽签等小工具"
      />

      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {renderTabContent()}
    </div>
  )
}