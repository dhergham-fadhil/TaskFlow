import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  CalendarDays,
  Check,
  ListChecks,
  MessageSquare,
  RotateCcw,
} from 'lucide-react'
import { cn, dueMeta, progressOf } from '../../lib/utils'
import type { Task } from '../../types'
import { useWorkspace } from '../../context/WorkspaceProvider'
import { useUI } from '../../context/UIProvider'
import { useToast } from '../../context/ToastProvider'
import { Avatar } from '../ui/Avatar'
import { PriorityBadge, Tag } from '../ui/Badge'

interface TaskCardContentProps {
  task: Task
  dragging?: boolean
  overlay?: boolean
  showProject?: boolean
}

function TaskCardContent({ task, dragging, overlay, showProject = true }: TaskCardContentProps) {
  const { projects, members, updateTask } = useWorkspace()
  const { openTask } = useUI()
  const { toast } = useToast()
  const [completing, setCompleting] = useState(false)

  const project = projects.find((item) => item.id === task.projectId)
  const assignee = members.find((member) => member.id === task.assigneeId) ?? null
  const due = dueMeta(task.dueDate)
  const progress = progressOf(task)

  async function toggleComplete(event: React.MouseEvent) {
    event.stopPropagation()
    event.preventDefault()
    setCompleting(true)
    try {
      const next = task.status === 'done' ? 'in_progress' : 'done'
      await updateTask(task.id, { status: next })
      toast({
        title: next === 'done' ? 'Task completed' : 'Task reopened',
        description: task.title,
        variant: next === 'done' ? 'success' : 'info',
      })
    } catch (caught) {
      toast({
        title: 'Could not update task',
        description: caught instanceof Error ? caught.message : 'Please try again.',
        variant: 'error',
      })
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div
      onClick={() => !dragging && openTask(task.id)}
      className={cn(
        'group relative cursor-grab overflow-hidden rounded-xl border border-line bg-surface p-3.5 text-left shadow-soft transition-all duration-200',
        'hover:-translate-y-px hover:border-accent/25 hover:shadow-lift active:cursor-grabbing',
        dragging && 'opacity-40',
        overlay && 'rotate-[1.5deg] cursor-grabbing shadow-lift ring-2 ring-accent/20',
        task.status === 'done' && 'bg-surface/80',
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        {showProject && project ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <span className="truncate text-[10px] font-semibold uppercase tracking-[0.07em] text-muted/80">
              {project.name}
            </span>
          </span>
        ) : (
          <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-muted/70">
            {task.status === 'done' ? 'Completed' : 'Task'}
          </span>
        )}
        <div className="flex shrink-0 items-center gap-1">
          <PriorityBadge priority={task.priority} />
          <button
            type="button"
            onClick={(event) => void toggleComplete(event)}
            onPointerDown={(event) => event.stopPropagation()}
            disabled={completing}
            title={task.status === 'done' ? 'Reopen task' : 'Mark complete'}
            aria-label={task.status === 'done' ? 'Reopen task' : 'Mark task complete'}
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded-md border transition-all',
              task.status === 'done'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                : 'border-line bg-surface text-muted/50 opacity-0 hover:border-accent hover:text-accent group-hover:opacity-100',
            )}
          >
            {completing ? (
              <span className="h-2.5 w-2.5 animate-spin rounded-full border border-current border-t-transparent" />
            ) : task.status === 'done' ? (
              <RotateCcw size={10} />
            ) : (
              <Check size={10} strokeWidth={3} />
            )}
          </button>
        </div>
      </div>

      <h3
        className={cn(
          'text-[13px] font-bold leading-snug tracking-[-0.01em] text-ink',
          task.status === 'done' && 'text-muted',
        )}
      >
        {task.title}
      </h3>

      {task.description && (
        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted/80">
          {task.description}
        </p>
      )}

      {task.labels.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1">
          {task.labels.slice(0, 2).map((label) => (
            <Tag key={label}>{label}</Tag>
          ))}
          {task.labels.length > 2 && (
            <span className="text-[9.5px] font-medium text-muted/60">
              +{task.labels.length - 2}
            </span>
          )}
        </div>
      )}

      {task.subtasks.length > 0 && (
        <div className="mt-2.5 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted/10">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                progress === 100 ? 'bg-emerald-500' : 'bg-accent/70',
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="font-mono text-[9px] text-muted/70">
            {task.subtasks.filter((subtask) => subtask.done).length}/{task.subtasks.length}
          </span>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <Avatar user={assignee} size="xs" />
        <div className="flex items-center gap-2.5">
          {task.subtasks.length > 0 && (
            <span className="flex items-center gap-1 text-[9.5px] font-medium text-muted/70">
              <ListChecks size={11} />
              {task.subtasks.length}
            </span>
          )}
          {task.comments.length > 0 && (
            <span className="flex items-center gap-1 text-[9.5px] font-medium text-muted/70">
              <MessageSquare size={10.5} />
              {task.comments.length}
            </span>
          )}
          {task.dueDate && (
            <span
              className={cn(
                'flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9.5px] font-semibold',
                due.tone === 'overdue'
                  ? 'bg-rose-500/10 text-rose-500'
                  : due.tone === 'today'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : due.tone === 'soon'
                      ? 'text-amber-600/90 dark:text-amber-400/90'
                      : 'text-muted/70',
              )}
            >
              <CalendarDays size={10} />
              {due.label}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function TaskCard({
  task,
  showProject = true,
}: {
  task: Task
  showProject?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', status: task.status },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn('touch-none outline-none', isDragging && 'z-10')}
    >
      <TaskCardContent task={task} dragging={isDragging} showProject={showProject} />
    </div>
  )
}

export function TaskCardPreview({
  task,
  showProject = true,
}: {
  task: Task
  showProject?: boolean
}) {
  return (
    <div className="w-[280px]">
      <TaskCardContent task={task} overlay showProject={showProject} />
    </div>
  )
}
