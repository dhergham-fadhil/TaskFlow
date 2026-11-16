import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { cn, tasksByStatus } from '../../lib/utils'
import { STATUS_META, STATUS_ORDER, type Task, type TaskStatus } from '../../types'
import { useUI } from '../../context/UIProvider'
import { useWorkspace } from '../../context/WorkspaceProvider'
import { useToast } from '../../context/ToastProvider'
import { TaskCard, TaskCardPreview } from '../tasks/TaskCard'

function KanbanColumn({
  status,
  tasks,
  showProject,
}: {
  status: TaskStatus
  tasks: Task[]
  showProject: boolean
}) {
  const { createTask } = useUI()
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { type: 'column', status },
  })
  const meta = STATUS_META[status]

  return (
    <section
      ref={setNodeRef}
      className={cn(
        'flex max-h-[calc(100dvh-268px)] min-h-[420px] w-[286px] shrink-0 flex-col rounded-2xl border bg-raised/40 transition-all duration-200 xl:w-[300px]',
        isOver ? 'border-accent/40 bg-accent/[0.04] shadow-glow' : 'border-line/80',
      )}
      aria-label={`${meta.label} column`}
    >
      <header className="flex items-center justify-between gap-2 px-3.5 pb-2.5 pt-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', meta.dot)} />
          <h2 className="truncate text-[12.5px] font-bold tracking-[-0.01em] text-ink">
            {meta.label}
          </h2>
          <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-md bg-surface px-1.5 font-mono text-[9.5px] font-semibold text-muted shadow-sm">
            {tasks.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => createTask({ status })}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted/60 transition hover:bg-surface hover:text-accent hover:shadow-sm"
          aria-label={`Add task to ${meta.label}`}
          title={`Add task to ${meta.label}`}
        >
          <Plus size={14} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2.5">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} showProject={showProject} />
            ))}

            {tasks.length === 0 && (
              <div
                className={cn(
                  'flex flex-col items-center justify-center rounded-xl border border-dashed px-4 py-10 text-center transition-colors',
                  isOver
                    ? 'border-accent/40 bg-accent/[0.04]'
                    : 'border-line bg-surface/30',
                )}
              >
                <p className="text-[11px] font-medium text-muted/70">
                  {isOver ? 'Release to drop' : 'Nothing here yet'}
                </p>
                <button
                  type="button"
                  onClick={() => createTask({ status })}
                  className="mt-2 flex items-center gap-1 text-[10.5px] font-semibold text-accent hover:underline"
                >
                  <Plus size={10} />
                  Add a task
                </button>
              </div>
            )}
          </div>
        </SortableContext>
      </div>

      <button
        type="button"
        onClick={() => createTask({ status })}
        className="mx-2 mb-2 flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-transparent text-[11px] font-semibold text-muted/60 transition hover:border-line hover:bg-surface hover:text-ink"
      >
        <Plus size={12} />
        Add task
      </button>
    </section>
  )
}

export function KanbanBoard({
  tasks,
  showProject = true,
}: {
  tasks: Task[]
  showProject?: boolean
}) {
  const { moveTask } = useWorkspace()
  const { toast } = useToast()
  const [activeId, setActiveId] = useState<string | null>(null)
  const groups = useMemo(() => tasksByStatus(tasks), [tasks])
  const activeTask = tasks.find((task) => task.id === activeId) ?? null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const movingTask = tasks.find((task) => task.id === active.id)
    if (!movingTask) return

    const overId = String(over.id)
    let destinationStatus: TaskStatus
    let destinationIndex: number

    if (overId.startsWith('column-')) {
      destinationStatus = overId.replace('column-', '') as TaskStatus
      destinationIndex = groups[destinationStatus].filter((task) => task.id !== active.id).length
    } else {
      const overTask = tasks.find((task) => task.id === overId)
      if (!overTask) return
      destinationStatus = overTask.status
      const column = groups[destinationStatus].filter((task) => task.id !== active.id)
      const overIndex = column.findIndex((task) => task.id === overId)
      destinationIndex = overIndex >= 0 ? overIndex : column.length
    }

    const sameColumn = movingTask.status === destinationStatus
    const currentIndex = groups[movingTask.status].findIndex((task) => task.id === movingTask.id)
    if (sameColumn && currentIndex === destinationIndex) return

    void moveTask(movingTask.id, destinationStatus, destinationIndex).catch((caught) => {
      toast({
        title: 'Could not move task',
        description: caught instanceof Error ? caught.message : 'Please try again.',
        variant: 'error',
      })
    })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex items-stretch gap-3.5 overflow-x-auto pb-3">
        {STATUS_ORDER.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={groups[status]}
            showProject={showProject}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>
        {activeTask ? <TaskCardPreview task={activeTask} showProject={showProject} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
