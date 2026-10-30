import { useState, useEffect, useCallback, useMemo } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import Card from '@/components/ui/Card'
import { useToolStore } from '@/stores/toolStore'
import { useToast } from '@/components/ui/Toast'
import ReactEChartsCore from 'echarts-for-react/esm/core'
import * as echarts from 'echarts/core'
import { PieChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
echarts.use([PieChart, BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])
import type { Finance, FinanceType } from '@/types'
import styles from './FinancePage.module.css'

const CATEGORIES = [
  '餐饮', '交通', '购物', '住房', '娱乐',
  '医疗', '教育', '通讯', '日用', '其他',
]

const emptyForm = {
  type: 'expense' as FinanceType,
  title: '',
  amount: 0,
  category: '',
  tags: '',
  date: '',
  note: '',
}

export default function FinancePage() {
  const { finance, loading, loadFinance, addFinance, updateFinance, deleteFinance } = useToolStore()
  const { toast } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  // Month navigation
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1)

  useEffect(() => {
    loadFinance()
  }, [loadFinance])

  const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`

  const monthFinance = useMemo(
    () => finance.filter((f) => f.date.startsWith(monthKey)),
    [finance, monthKey],
  )

  const monthIncome = useMemo(
    () => monthFinance.filter((f) => f.type === 'income').reduce((sum, f) => sum + f.amount, 0),
    [monthFinance],
  )

  const monthExpense = useMemo(
    () => monthFinance.filter((f) => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0),
    [monthFinance],
  )

  const balance = monthIncome - monthExpense

  // Expense by category pie chart data
  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    monthFinance
      .filter((f) => f.type === 'expense')
      .forEach((f) => {
        const cat = f.category || '其他'
        map[cat] = (map[cat] || 0) + f.amount
      })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [monthFinance])

  // Last 6 months income vs expense bar chart
  const last6Months = useMemo(() => {
    const months: { month: string; income: number; expense: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const items = finance.filter((f) => f.date.startsWith(key))
      months.push({
        month: `${d.getMonth() + 1}月`,
        income: items.filter((f) => f.type === 'income').reduce((s, f) => s + f.amount, 0),
        expense: items.filter((f) => f.type === 'expense').reduce((s, f) => s + f.amount, 0),
      })
    }
    return months
  }, [finance, currentYear, currentMonth])

  const pieOption = useMemo(() => ({
    tooltip: { trigger: 'item' as const },
    series: [{
      type: 'pie',
      radius: ['45%', '75%'],
      center: ['50%', '50%'],
      label: { show: true, formatter: '{b}\n{d}%' },
      emphasis: { label: { fontSize: 16, fontWeight: 'bold' } },
      data: expenseByCategory,
    }],
  }), [expenseByCategory])

  const barOption = useMemo(() => ({
    tooltip: { trigger: 'axis' as const },
    legend: { data: ['收入', '支出'], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '12%', top: '8%', containLabel: true },
    xAxis: { type: 'category' as const, data: last6Months.map((m) => m.month) },
    yAxis: { type: 'value' as const },
    series: [
      { name: '收入', type: 'bar', data: last6Months.map((m) => m.income), itemStyle: { color: '#10b981' } },
      { name: '支出', type: 'bar', data: last6Months.map((m) => m.expense), itemStyle: { color: '#ef4444' } },
    ],
  }), [last6Months])

  const goPrevMonth = useCallback(() => {
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1)
      setCurrentMonth(12)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }, [currentMonth])

  const goNextMonth = useCallback(() => {
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1)
      setCurrentMonth(1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }, [currentMonth])

  const openAdd = useCallback(() => {
    setEditingId(null)
    const now = new Date()
    setForm({
      ...emptyForm,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    })
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((f: Finance) => {
    setEditingId(f.id)
    setForm({
      type: f.type,
      title: f.title,
      amount: f.amount,
      category: f.category,
      tags: f.tags.join(', '),
      date: f.date,
      note: f.note,
    })
    setModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditingId(null)
  }, [])

  const handleSave = useCallback(async () => {
    if (!form.title.trim() || !form.amount || !form.date) {
      toast('请填写标题、金额和日期', 'warning')
      return
    }
    setSaving(true)
    try {
      const data = {
        type: form.type,
        title: form.title.trim(),
        amount: Number(form.amount),
        category: form.category || '其他',
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        date: form.date,
        note: form.note?.trim() || '',
      }
      if (editingId) {
        await updateFinance(editingId, data)
        toast('记录已更新', 'success')
      } else {
        await addFinance(data)
        toast('记录已添加', 'success')
      }
      closeModal()
    } catch {
      toast('保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }, [form, editingId, addFinance, updateFinance, closeModal, toast])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('确定删除此记录？')) return
    await deleteFinance(id)
    toast('记录已删除', 'success')
  }, [deleteFinance, toast])

  const sortedFinance = useMemo(
    () => [...monthFinance].sort((a, b) => b.date.localeCompare(a.date)),
    [monthFinance],
  )

  return (
    <div className={styles.page}>
      <PageHeader
        title="记账本"
        description="收支记录与财务管理"
        actions={
          <Button onClick={openAdd}>记一笔</Button>
        }
      />

      {/* Summary Cards */}
      <div className={styles.summaryRow}>
        <Card className={styles.summaryCard}>
          <span className={styles.summaryLabel}>本月收入</span>
          <span className={`${styles.summaryValue} ${styles.summaryIncome}`}>
            ¥{monthIncome.toFixed(2)}
          </span>
        </Card>
        <Card className={styles.summaryCard}>
          <span className={styles.summaryLabel}>本月支出</span>
          <span className={`${styles.summaryValue} ${styles.summaryExpense}`}>
            ¥{monthExpense.toFixed(2)}
          </span>
        </Card>
        <Card className={styles.summaryCard}>
          <span className={styles.summaryLabel}>结余</span>
          <span className={`${styles.summaryValue} ${balance >= 0 ? styles.summaryIncome : styles.summaryExpense}`}>
            ¥{balance >= 0 ? '+' : ''}{balance.toFixed(2)}
          </span>
        </Card>
      </div>

      {/* Month Selector */}
      <div className={styles.monthSelector}>
        <button className={styles.monthBtn} onClick={goPrevMonth}>
          ‹
        </button>
        <span className={styles.monthLabel}>
          {currentYear}年{currentMonth}月
        </span>
        <button className={styles.monthBtn} onClick={goNextMonth}>
          ›
        </button>
      </div>

      {/* Charts */}
      <div className={styles.chartsRow}>
        <Card className={styles.chartCard}>
          <h3 className={styles.chartTitle}>支出分类</h3>
          {expenseByCategory.length > 0 ? (
            <ReactEChartsCore echarts={echarts} option={pieOption} style={{ height: 260 }} />
          ) : (
            <EmptyState icon="📊" title="暂无支出数据" />
          )}
        </Card>
        <Card className={styles.chartCard}>
          <h3 className={styles.chartTitle}>近6月收支趋势</h3>
          {last6Months.some((m) => m.income > 0 || m.expense > 0) ? (
            <ReactEChartsCore echarts={echarts} option={barOption} style={{ height: 260 }} />
          ) : (
            <EmptyState icon="📈" title="暂无历史数据" />
          )}
        </Card>
      </div>

      {/* Transaction List */}
      <h3 className={styles.listTitle}>交易记录</h3>
      {loading ? (
        <EmptyState icon="⏳" title="加载中..." />
      ) : sortedFinance.length === 0 ? (
        <EmptyState
          icon="💰"
          title="本月暂无记录"
          description="点击「记一笔」开始记账"
          action={<Button onClick={openAdd}>记一笔</Button>}
        />
      ) : (
        <div className={styles.transactionList}>
          {sortedFinance.map((item) => (
            <div key={item.id} className={styles.transactionItem}>
              <div className={styles.transactionIcon}>
                {item.type === 'income' ? (
                  <span className={styles.iconIncome}>↑</span>
                ) : (
                  <span className={styles.iconExpense}>↓</span>
                )}
              </div>
              <div className={styles.transactionInfo}>
                <div className={styles.transactionTitle}>{item.title}</div>
                <div className={styles.transactionMeta}>
                  <span className={styles.transactionCategory}>{item.category || '其他'}</span>
                  <span className={styles.transactionDate}>{item.date}</span>
                  {item.note && (
                    <span className={styles.transactionNote}>{item.note}</span>
                  )}
                </div>
              </div>
              <div className={`${styles.transactionAmount} ${item.type === 'income' ? styles.amountIncome : styles.amountExpense}`}>
                {item.type === 'income' ? '+' : '-'}¥{item.amount.toFixed(2)}
              </div>
              <div className={styles.transactionActions}>
                <button
                  className={styles.actionBtn}
                  onClick={() => openEdit(item)}
                  title="编辑"
                >
                  ✏️
                </button>
                <button
                  className={styles.actionBtn}
                  onClick={() => handleDelete(item.id)}
                  title="删除"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingId ? '编辑记录' : '记一笔'}
      >
        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>类型</label>
            <div className={styles.typeToggle}>
              <button
                className={`${styles.typeOption} ${form.type === 'expense' ? styles.typeOptionActive : ''}`}
                onClick={() => setForm((f) => ({ ...f, type: 'expense' }))}
              >
                支出
              </button>
              <button
                className={`${styles.typeOption} ${form.type === 'income' ? styles.typeOptionActive : ''}`}
                onClick={() => setForm((f) => ({ ...f, type: 'income' }))}
              >
                收入
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>标题</label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="例如：午餐、工资..."
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>金额</label>
            <Input
              type="number"
              value={form.amount ? String(form.amount) : ''}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value ? Number(e.target.value) : 0 }))}
              placeholder="0.00"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>分类</label>
            <div className={styles.categorySelect}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className={`${styles.categoryOption} ${form.category === cat ? styles.categoryOptionActive : ''}`}
                  onClick={() => setForm((f) => ({ ...f, category: cat }))}
                >
                  {cat}
                </button>
              ))}
            </div>
            <Input
              className={styles.categoryInput}
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="或自定义分类..."
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>日期</label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>标签（逗号分隔）</label>
            <Input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="例如：外卖, 零食"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>备注</label>
            <Input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="可选备注..."
            />
          </div>

          <div className={styles.formActions}>
            <Button variant="secondary" onClick={closeModal}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}