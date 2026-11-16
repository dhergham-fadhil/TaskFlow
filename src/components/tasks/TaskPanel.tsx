import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CalendarDays,
  Check,
  ChevronDown,
  CircleDot,
  Copy,
  Flag,
  Link2,
  ListChecks,
  MoreHorizontal,
  Plus,
  Send,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { cn, dueMeta, formatDate, relativeTime, uid } from '../../lib/utils'
import { PRIORITY_META, STATUS_META, STATUS_ORDER } from '../../types'
import type { SubTask, Task, TaskPriority, TaskStatus } from '../../types'
import { useUI } from '../../context/UIProvider'
import { useWorkspace } from '../../context/WorkspaceProvider'
import { useToast } from '../../context/ToastProvider'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/Modal'
import { MenuItem, MenuSeparator, Popover } from '../ui/Popover'
import { ProgressBar } from '../ui/Progress'
import { ProjectIcon } from '../projects/ProjectIcon'

interface Draft {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  projectId: string
  assigneeId: string | null
  dueDate: string
  labels: string[]
  subtasks: SubTask[]
}

function draftFromTask(task: Task): Draft {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    projectId: task.projectId,
    assigneeId: task.assigneeId,
    dueDate: task.dueDate ?? '',
    labels: [...task.labels],
    subtasks: task.subtasks.map((subtask) => ({ ...subtask })),
  }
}

function PropertyRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex h-10 items-center gap-2.5">
      <span className="flex w-[68px] shrink-0 items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-muted/80">
        <span className="text-muted/60">{icon}</span>
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function NativeSelect({
  value,
  onChange,
  children,
  ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  children: ReactNode
  ariaLabel: string
}) {
  return (
    <div className="relative flex items-center">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full cursor-pointer appearance-none truncate rounded-lg bg-transparent pl-1 pr-6 text-[12px] font-semibold text-ink outline-none transition hover:bg-raised focus:bg-raised"
      >
        {children}
      </select>
      <ChevronDown
        size={12}
        className="pointer-events-none absolute right-1.5 text-muted/70"
      />
    </div>
  )
}

export function TaskPanel() {
  const { taskPanel, closeTaskPanel } = useUI()
  const {
    tasks,
    projects,
    members,
    currentUser,
    createTask,
    updateTask,
    deleteTask,
    addComment,
  } = useWorkspace()
  const { toast } = useToast()

  const task = tasks.find((item) => item.id === taskPanel.taskId) ?? null
  const isCreate = !taskPanel.taskId
  const open = taskPanel.open

  const firstProjectId = projects[0]?.id ?? ''
  const buildEmptyDraft = (): Draft => ({
    title: '',
    description: '',
    status: taskPanel.defaults.status ?? 'backlog',
    priority: 'medium',
    projectId: taskPanel.defaults.projectId ?? firstProjectId,
    assigneeId: currentUser?.id ?? null,
    dueDate: '',
    labels: [],
    subtasks: [],
  })

  const [draft, setDraft] = useState<Draft>(buildEmptyDraft)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newSubtask, setNewSubtask] = useState('')
  const [labelInput, setLabelInput] = useState('')
  const [comment, setComment] = useState('')
  const [commenting, setCommenting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    if (task) {
      setDraft(draftFromTask(task))
    } else {
      setDraft(buildEmptyDraft())
      window.setTimeout(() => titleRef.current?.focus(), 260)
    }
    setError(null)
    setNewSubtask('')
    setLabelInput('')
    setComment('')
    setConfirmDelete(false)
    setDiscardOpen(false)
    // Deliberately keyed on the panel target only — not on every workspace update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, taskPanel.taskId])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !confirmDelete && !discardOpen) requestClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = original
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, confirmDelete, discardOpen, draft, task])

  const baseline = useMemo(
    () => (task ? JSON.stringify(draftFromTask(task)) : null),
    [task],
  )
  const dirty = isCreate
    ? draft.title.trim().length > 0 ||
      draft.description.trim().length > 0 ||
      draft.labels.length > 0 ||
      draft.subtasks.length > 0
    : baseline !== JSON.stringify(draft)

  const progress = draft.subtasks.length
    ? Math.round(
        (draft.subtasks.filter((subtask) => subtask.done).length / draft.subtasks.length) * 100,
      )
    : draft.status === 'done'
      ? 100
      : 0

  const doneSubtasks = draft.subtasks.filter((subtask) => subtask.done).length

  const allLabels = useMemo(
    () => Array.from(new Set(tasks.flatMap((item) => item.labels))).slice(0, 12),
    [tasks],
  )
  const suggestedLabels = allLabels
    .filter((label) => !draft.labels.includes(label))
    .slice(0, 4)

  const setField = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function requestClose() {
    if (dirty) setDiscardOpen(true)
    else closeTaskPanel()
  }

  function addLabel(raw: string) {
    const value = raw.trim()
    if (!value) return
    if (draft.labels.length >= 6) {
      setError('You can add up to six labels per task.')
      return
    }
    if (!draft.labels.some((label) => label.toLowerCase() === value.toLowerCase())) {
      setField('labels', [...draft.labels, value])
    }
    setLabelInput('')
  }

  function addSubtask() {
    const title = newSubtask.trim()
    if (!title) return
    setField('subtasks', [...draft.subtasks, { id: uid('s'), title, done: false }])
    setNewSubtask('')
  }

  function toggleSubtask(id: string) {
    setField(
      'subtasks',
      draft.subtasks.map((subtask) =>
        subtask.id === id ? { ...subtask, done: !subtask.done } : subtask,
      ),
    )
  }

  async function handleSave() {
    if (!draft.title.trim()) {
      setError('Give your task a clear title before saving.')
      titleRef.current?.focus()
      return
    }
    if (!draft.projectId) {
      setError('Choose a project for this task.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      if (isCreate) {
        await createTask({
          title: draft.title,
          description: draft.description,
          status: draft.status,
          priority: draft.priority,
          projectId: draft.projectId,
          assigneeId: draft.assigneeId,
          dueDate: draft.dueDate || null,
          labels: draft.labels,
          subtasks: draft.subtasks,
        })
        toast({
          title: 'Task created',
          description: `“${draft.title.trim()}” was added to your backlog.`,
        })
        closeTaskPanel()
      } else if (task) {
        await updateTask(task.id, {
          title: draft.title.trim(),
          description: draft.description,
          status: draft.status,
          priority: draft.priority,
          projectId: draft.projectId,
          assigneeId: draft.assigneeId,
          dueDate: draft.dueDate || null,
          labels: draft.labels,
          subtasks: draft.subtasks,
        })
        toast({ title: 'Changes saved', description: 'Your task is up to date.' })
      }
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Something went wrong. Please try again.'
      setError(message)
      toast({ title: 'Could not save task', description: message, variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!task) return
    setDeleting(true)
    try {
      await deleteTask(task.id)
      setConfirmDelete(false)
      closeTaskPanel()
      toast({
        title: 'Task deleted',
        description: `“${task.title}” was removed from the workspace.`,
        variant: 'info',
      })
    } catch (caught) {
      toast({
        title: 'Could not delete task',
        description: caught instanceof Error ? caught.message : 'Please try again.',
        variant: 'error',
      })
    } finally {
      setDeleting(false)
    }
  }

  async function handleDuplicate() {
    if (!task) return
    setDuplicating(true)
    try {
      await createTask({
        title: `${task.title} (copy)`,
        description: task.description,
        status: 'backlog',
        priority: task.priority,
        projectId: task.projectId,
        assigneeId: task.assigneeId,
        dueDate: task.dueDate,
        labels: [...task.labels],
        subtasks: task.subtasks.map((subtask) => ({ ...subtask, done: false })),
      })
      toast({ title: 'Task duplicated', description: 'The copy is waiting in your backlog.' })
    } catch (caught) {
      toast({
        title: 'Could not duplicate task',
        description: caught instanceof Error ? caught.message : 'Please try again.',
        variant: 'error',
      })
    } finally {
      setDuplicating(false)
    }
  }

  async function handleToggleComplete() {
    if (!task) return
    const nextStatus: TaskStatus = task.status === 'done' ? 'in_progress' : 'done'
    setDraft((current) => ({ ...current, status: nextStatus }))
    try {
      await updateTask(task.id, { status: nextStatus })
      toast({
        title: nextStatus === 'done' ? 'Task completed' : 'Task reopened',
        description:
          nextStatus === 'done' ? 'Nice work — momentum is building.' : 'Moved back to In progress.',
      })
    } catch (caught) {
      setDraft((current) => ({ ...current, status: task.status }))
      toast({
        title: 'Could not update task',
        description: caught instanceof Error ? caught.message : 'Please try again.',
        variant: 'error',
      })
    }
  }

  async function handleComment() {
    if (!comment.trim() || !task) return
    setCommenting(true)
    try {
      await addComment(task.id, comment)
      setComment('')
      window.setTimeout(
        () => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
        80,
      )
    } catch (caught) {
      toast({
        title: 'Could not post comment',
        description: caught instanceof Error ? caught.message : 'Please try again.',
        variant: 'error',
      })
    } finally {
      setCommenting(false)
    }
  }

  const project = projects.find((item) => item.id === draft.projectId)
  const assignee = members.find((member) => member.id === draft.assigneeId) ?? null
  const due = dueMeta(draft.dueDate || null)

  return createPortal(
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[70]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="absolute inset-0 bg-[rgb(8_8_14/0.5)] backdrop-blur-[3px]"
            onClick={requestClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 36 }}
            role="dialog"
            aria-modal="true"
            aria-label={isCreate ? 'Create a task' : 'Task details'}
            className="absolute inset-y-0 right-0 flex w-full max-w-[580px] flex-col border-l border-line bg-surface shadow-lift"
          >
            {/* Header */}
            <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line/80 px-5">
              <div className="flex items-center gap-2">
                {!isCreate && task && (
                  <span className="rounded-md bg-raised px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted">
                    {task.id.slice(-6).toUpperCase()}
                  </span>
                )}
                <p className="text-[12px] font-semibold text-muted">
                  {isCreate ? 'New task' : 'Task details'}
                </p>
                {dirty && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-amber-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Unsaved
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {!isCreate && task && (
                  <>
                    <Popover
                      panelClassName="w-[200px]"
                      trigger={({ toggle }) => (
                        <button
                          type="button"
                          onClick={toggle}
                          className="icon-btn h-8 w-8"
                          aria-label="Task actions"
                        >
                          <MoreHorizontal size={17} />
                        </button>
                      )}
                    >
                      {(closeMenu) => (
                        <>
                          <MenuItem
                            icon={<Copy size={14} />}
                            disabled={duplicating}
                            onClick={() => {
                              closeMenu()
                              void handleDuplicate()
                            }}
                          >
                            Duplicate task
                          </MenuItem>
                          <MenuItem
                            icon={<Check size={14} />}
                            onClick={() => {
                              closeMenu()
                              void handleToggleComplete()
                            }}
                          >
                            {task.status === 'done' ? 'Reopen task' : 'Mark as complete'}
                          </MenuItem>
                          <MenuSeparator />
                          <MenuItem
                            icon={<Trash2 size={14} />}
                            danger
                            onClick={() => {
                              closeMenu()
                              setConfirmDelete(true)
                            }}
                          >
                            Delete task
                          </MenuItem>
                        </>
                      )}
                    </Popover>
                    <div className="mx-0.5 h-4 w-px bg-line" />
                  </>
                )}
                <button
                  type="button"
                  onClick={requestClose}
                  className="icon-btn h-8 w-8"
                  aria-label="Close task panel"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="px-5 pb-6 pt-5 sm:px-6">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/[0.07] px-2 py-1 text-[10.5px] font-semibold text-accent">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    {project?.name ?? 'Choose a project'}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10.5px] font-semibold',
                      STATUS_META[draft.status].tint,
                      STATUS_META[draft.status].text,
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_META[draft.status].dot)} />
                    {STATUS_META[draft.status].label}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10.5px] font-semibold',
                      PRIORITY_META[draft.priority].tint,
                      PRIORITY_META[draft.priority].text,
                    )}
                  >
                    <span
                      className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_META[draft.priority].dot)}
                    />
                    {PRIORITY_META[draft.priority].label} priority
                  </span>
                  {draft.dueDate && (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10.5px] font-semibold',
                        due.tone === 'overdue'
                          ? 'bg-rose-500/10 text-rose-500'
                          : due.tone === 'today'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-raised text-muted',
                      )}
                    >
                      <CalendarDays size={11} />
                      {due.label}
                    </span>
                  )}
                </div>

                <input
                  ref={titleRef}
                  value={draft.title}
                  onChange={(event) => {
                    setField('title', event.target.value)
                    if (error) setError(null)
                  }}
                  placeholder="What needs to be done?"
                  aria-label="Task title"
                  className="w-full bg-transparent text-[22px] font-extrabold leading-snug tracking-[-0.03em] text-ink outline-none placeholder:text-muted/35"
                />
                {error && (
                  <p className="mt-1.5 text-[11px] font-medium text-rose-500" role="alert">
                    {error}
                  </p>
                )}

                <textarea
                  value={draft.description}
                  onChange={(event) => setField('description', event.target.value)}
                  placeholder="Add a description, context, or acceptance criteria…"
                  aria-label="Task description"
                  rows={4}
                  className="mt-3 w-full resize-none rounded-xl border border-transparent bg-transparent px-0 py-1 text-[12.5px] leading-relaxed text-muted outline-none transition placeholder:text-muted/40 focus:border-line focus:bg-raised/50 focus:px-3"
                />

                <div className="mt-5 grid gap-x-5 rounded-xl border border-line bg-raised/40 px-3.5 py-2 sm:grid-cols-2">
                  <PropertyRow icon={<CircleDot size={12} />} label="Status">
                    <NativeSelect
                      ariaLabel="Task status"
                      value={draft.status}
                      onChange={(value) => setField('status', value as TaskStatus)}
                    >
                      {STATUS_ORDER.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_META[status].label}
                        </option>
                      ))}
                    </NativeSelect>
                  </PropertyRow>
                  <PropertyRow icon={<Flag size={12} />} label="Priority">
                    <NativeSelect
                      ariaLabel="Task priority"
                      value={draft.priority}
                      onChange={(value) => setField('priority', value as TaskPriority)}
                    >
                      {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map((priority) => (
                        <option key={priority} value={priority}>
                          {PRIORITY_META[priority].label}
                        </option>
                      ))}
                    </NativeSelect>
                  </PropertyRow>
                  <PropertyRow icon={<UserRound size={12} />} label="Assignee">
                    <div className="flex items-center gap-1.5">
                      <Avatar user={assignee} size="xs" />
                      <NativeSelect
                        ariaLabel="Task assignee"
                        value={draft.assigneeId ?? ''}
                        onChange={(value) => setField('assigneeId', value || null)}
                      >
                        <option value="">Unassigned</option>
                        {members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                  </PropertyRow>
                  <PropertyRow icon={<CalendarDays size={12} />} label="Due date">
                    <input
                      type="date"
                      aria-label="Due date"
                      value={draft.dueDate}
                      onChange={(event) => setField('dueDate', event.target.value)}
                      className="h-8 w-full cursor-pointer rounded-lg bg-transparent px-1 text-[12px] font-semibold text-ink outline-none transition hover:bg-raised focus:bg-raised"
                    />
                  </PropertyRow>
                  <div className="sm:col-span-2">
                    <PropertyRow icon={<Link2 size={12} />} label="Project">
                      <div className="flex items-center gap-1.5">
                        {project && <ProjectIcon project={project} size="sm" />}
                        <NativeSelect
                          ariaLabel="Project"
                          value={draft.projectId}
                          onChange={(value) => setField('projectId', value)}
                        >
                          {projects.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </NativeSelect>
                      </div>
                    </PropertyRow>
                  </div>
                </div>

                {/* Labels */}
                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.09em] text-muted">
                      Labels
                    </h3>
                    <span className="text-[10px] text-muted/60">{draft.labels.length}/6</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <AnimatePresence initial={false}>
                      {draft.labels.map((label) => (
                        <motion.span
                          key={label}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="inline-flex items-center gap-1 rounded-md border border-accent/20 bg-accent/[0.07] py-1 pl-2 pr-1 text-[10.5px] font-semibold text-accent"
                        >
                          {label}
                          <button
                            type="button"
                            onClick={() =>
                              setField(
                                'labels',
                                draft.labels.filter((item) => item !== label),
                              )
                            }
                            className="rounded p-0.5 transition hover:bg-accent/15"
                            aria-label={`Remove ${label} label`}
                          >
                            <X size={10} />
                          </button>
                        </motion.span>
                      ))}
                    </AnimatePresence>
                    <input
                      value={labelInput}
                      onChange={(event) => setLabelInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          addLabel(labelInput)
                        }
                        if (event.key === 'Backspace' && !labelInput && draft.labels.length) {
                          setField('labels', draft.labels.slice(0, -1))
                        }
                      }}
                      placeholder={draft.labels.length ? 'Add' : 'Add a label…'}
                      maxLength={24}
                      aria-label="Add a label"
                      className="h-7 w-24 rounded-md bg-transparent px-1.5 text-[11px] font-medium text-ink outline-none placeholder:text-muted/50 focus:bg-raised"
                    />
                  </div>
                  {suggestedLabels.length > 0 && draft.labels.length < 4 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[9.5px] font-medium uppercase tracking-wider text-muted/60">
                        Suggested
                      </span>
                      {suggestedLabels.map((label) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => addLabel(label)}
                          className="rounded-md border border-dashed border-line px-1.5 py-0.5 text-[10px] font-medium text-muted transition hover:border-accent/40 hover:text-accent"
                        >
                          + {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Subtasks */}
                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.09em] text-muted">
                      <ListChecks size={13} />
                      Subtasks
                      {draft.subtasks.length > 0 && (
                        <span className="rounded bg-raised px-1.5 py-0.5 font-mono text-[9px] text-muted">
                          {doneSubtasks}/{draft.subtasks.length}
                        </span>
                      )}
                    </h3>
                    {draft.subtasks.length > 0 && (
                      <span className="font-mono text-[10px] text-muted">{progress}%</span>
                    )}
                  </div>
                  {draft.subtasks.length > 0 && (
                    <ProgressBar value={progress} className="mb-3" height={4} />
                  )}
                  <div className="space-y-0.5">
                    {draft.subtasks.map((subtask) => (
                      <div
                        key={subtask.id}
                        className="group flex items-center gap-2.5 rounded-lg px-1 py-1.5 transition hover:bg-raised/60"
                      >
                        <button
                          type="button"
                          onClick={() => toggleSubtask(subtask.id)}
                          className={cn(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-all',
                            subtask.done
                              ? 'border-accent bg-accent text-accent-ink'
                              : 'border-muted/35 bg-surface hover:border-accent',
                          )}
                          aria-label={subtask.done ? 'Mark incomplete' : 'Mark complete'}
                        >
                          {subtask.done && <Check size={10} strokeWidth={3} />}
                        </button>
                        <input
                          value={subtask.title}
                          onChange={(event) =>
                            setField(
                              'subtasks',
                              draft.subtasks.map((item) =>
                                item.id === subtask.id
                                  ? { ...item, title: event.target.value }
                                  : item,
                              ),
                            )
                          }
                          className={cn(
                            'min-w-0 flex-1 bg-transparent text-[12px] outline-none transition',
                            subtask.done ? 'text-muted/60 line-through' : 'text-ink',
                          )}
                          aria-label="Subtask title"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setField(
                              'subtasks',
                              draft.subtasks.filter((item) => item.id !== subtask.id),
                            )
                          }
                          className="rounded p-1 text-muted/40 opacity-0 transition hover:bg-rose-500/10 hover:text-rose-500 group-hover:opacity-100"
                          aria-label="Remove subtask"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-1 flex items-center gap-2 rounded-lg px-1 py-1.5 transition focus-within:bg-raised/60">
                    <span className="flex h-4 w-4 items-center justify-center rounded-[5px] border border-dashed border-muted/35 text-muted">
                      <Plus size={10} />
                    </span>
                    <input
                      value={newSubtask}
                      onChange={(event) => setNewSubtask(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          addSubtask()
                        }
                      }}
                      placeholder="Add a subtask and press Enter"
                      aria-label="New subtask"
                      className="flex-1 bg-transparent text-[12px] text-ink outline-none placeholder:text-muted/45"
                    />
                    {newSubtask.trim() && (
                      <button
                        type="button"
                        onClick={addSubtask}
                        className="text-[10px] font-bold text-accent hover:underline"
                      >
                        Add
                      </button>
                    )}
                  </div>
                </div>

                {/* Comments */}
                {!isCreate && task && (
                  <div className="mt-6">
                    <h3 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.09em] text-muted">
                      Comments
                      <span className="rounded bg-raised px-1.5 py-0.5 font-mono text-[9px] text-muted">
                        {task.comments.length}
                      </span>
                    </h3>

                    {task.comments.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-[11.5px] text-muted">
                        No comments yet. Share an update or ask a question below.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {task.comments.map((entry) => {
                          const author = members.find((member) => member.id === entry.authorId)
                          return (
                            <div key={entry.id} className="flex gap-2.5">
                              <Avatar user={author} size="sm" className="mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-[11.5px] font-bold text-ink">
                                    {author?.name ?? 'Someone'}
                                  </p>
                                  <span className="text-[10px] text-muted/60">
                                    {relativeTime(entry.createdAt)}
                                  </span>
                                </div>
                                <div className="mt-1 rounded-lg rounded-tl-sm border border-line bg-raised/70 px-3 py-2 text-[12px] leading-relaxed text-muted">
                                  {entry.body}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        <div ref={commentsEndRef} />
                      </div>
                    )}

                    <div className="mt-3 flex items-start gap-2.5">
                      <Avatar user={currentUser} size="sm" className="mt-1.5" />
                      <div className="flex flex-1 items-end gap-2 rounded-xl border border-line bg-surface p-1.5 focus-within:border-accent/40 focus-within:ring-4 focus-within:ring-accent/10">
                        <textarea
                          value={comment}
                          onChange={(event) => setComment(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                              event.preventDefault()
                              void handleComment()
                            }
                          }}
                          rows={1}
                          placeholder="Write a comment…"
                          aria-label="Write a comment"
                          className="max-h-28 min-h-8 flex-1 resize-none bg-transparent px-2 py-1.5 text-[12px] text-ink outline-none placeholder:text-muted/50"
                        />
                        <Button
                          size="icon"
                          variant="primary"
                          className="h-8 w-8 shrink-0"
                          disabled={!comment.trim() || commenting}
                          loading={commenting}
                          onClick={() => void handleComment()}
                          aria-label="Post comment"
                        >
                          {!commenting && <Send size={13} />}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {!isCreate && task && (
                  <div className="mt-6 flex items-center gap-3 border-t border-line/70 pt-4 text-[10px] text-muted/70">
                    <span>Created {formatDate(task.createdAt, 'MMM d, yyyy')}</span>
                    <span className="h-1 w-1 rounded-full bg-muted/30" />
                    <span>Updated {relativeTime(task.updatedAt)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center gap-2 border-t border-line bg-surface/95 px-5 py-3.5 backdrop-blur">
              {!isCreate && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Trash2 size={13} />}
                    className="text-muted hover:text-rose-500"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                  <div className="flex-1" />
                  <Button
                    size="md"
                    variant="secondary"
                    disabled={!dirty || saving}
                    onClick={() => task && setDraft(draftFromTask(task))}
                  >
                    Discard
                  </Button>
                  <Button
                    size="md"
                    variant="primary"
                    loading={saving}
                    disabled={!dirty}
                    onClick={() => void handleSave()}
                  >
                    Save changes
                  </Button>
                </>
              )}
              {isCreate && (
                <>
                  <div className="flex-1 text-[10.5px] text-muted">
                    {dirty ? 'Ready when you are.' : 'Pick a project and a clear title.'}
                  </div>
                  <Button size="md" variant="secondary" onClick={requestClose}>
                    Cancel
                  </Button>
                  <Button
                    size="md"
                    variant="primary"
                    loading={saving}
                    icon={<Plus size={15} />}
                    onClick={() => void handleSave()}
                  >
                    Create task
                  </Button>
                </>
              )}
            </div>
          </motion.aside>
        </div>
      )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this task?"
        description={
          task
            ? `“${task.title}” will be permanently removed from the workspace.`
            : 'This task will be permanently removed.'
        }
        confirmLabel="Delete task"
        danger
        loading={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void handleDelete()}
      >
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] px-3.5 py-3 text-[11.5px] leading-relaxed text-muted">
          Any subtasks and comments on this task will be removed too. Other tasks and projects are
          not affected.
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={discardOpen}
        title="Discard unsaved changes?"
        description="You have edits that have not been saved yet."
        confirmLabel="Discard changes"
        danger
        onCancel={() => setDiscardOpen(false)}
        onConfirm={() => {
          setDiscardOpen(false)
          closeTaskPanel()
        }}
      >
        <p className="text-[12px] leading-relaxed text-muted">
          Closing now will lose your changes to this task. Save first if you want to keep them.
        </p>
      </ConfirmDialog>
    </>,
    document.body,
  )
}
