import { ArrowUpDown, Check, Search, SlidersHorizontal, X } from 'lucide-react'
import { cn, countActiveFilters } from '../../lib/utils'
import {
  PRIORITY_META,
  STATUS_META,
  STATUS_ORDER,
  type TaskFilters,
  type TaskPriority,
  type TaskStatus,
} from '../../types'
import { useWorkspace } from '../../context/WorkspaceProvider'
import { Popover, MenuItem, MenuLabel, MenuSeparator } from '../ui/Popover'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'

const sortLabels: Record<TaskFilters['sort'], string> = {
  updated: 'Last updated',
  due: 'Due date',
  priority: 'Priority',
  title: 'Alphabetical',
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

function CheckRow({
  checked,
  onClick,
  children,
}: {
  checked: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="checkbox"
      aria-checked={checked}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[12px] font-medium text-ink transition hover:bg-raised"
    >
      <span
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-all',
          checked
            ? 'border-accent bg-accent text-accent-ink'
            : 'border-muted/30 bg-surface',
        )}
      >
        {checked && <Check size={10} strokeWidth={3} />}
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate">{children}</span>
    </button>
  )
}

export function TaskFilterBar({
  filters,
  onChange,
  resultCount,
  showSort = true,
  className,
}: {
  filters: TaskFilters
  onChange: (filters: TaskFilters) => void
  resultCount: number
  showSort?: boolean
  className?: string
}) {
  const { projects, members, tasks } = useWorkspace()
  const activeCount = countActiveFilters(filters)

  const statusCounts = (status: TaskStatus) =>
    tasks.filter((task) => task.status === status).length
  const priorityCounts = (priority: TaskPriority) =>
    tasks.filter((task) => task.priority === priority).length

  return (
    <div className={cn('space-y-2.5', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-[260px]">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted/70"
          />
          <input
            value={filters.query}
            onChange={(event) => onChange({ ...filters, query: event.target.value })}
            placeholder="Search tasks…"
            aria-label="Search tasks"
            className="input h-9 pl-9 pr-8 text-[12px]"
          />
          {filters.query && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, query: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted transition hover:bg-raised hover:text-ink"
              aria-label="Clear search"
            >
              <X size={11} />
            </button>
          )}
        </div>

        <Popover
          panelClassName="w-[286px] p-0"
          trigger={({ toggle: togglePanel, open }) => (
            <Button
              size="sm"
              variant="secondary"
              onClick={togglePanel}
              icon={<SlidersHorizontal size={13} />}
              className={cn(
                'h-9',
                (activeCount > 0 || open) && 'border-accent/40 text-accent',
              )}
            >
              Filters
              {activeCount > 0 && (
                <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-md bg-accent px-1 font-mono text-[9px] font-bold text-accent-ink">
                  {activeCount}
                </span>
              )}
            </Button>
          )}
        >
          {(close) => (
            <div>
              <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
                <p className="text-[12px] font-bold text-ink">Filter tasks</p>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...filters,
                      statuses: [],
                      priorities: [],
                      projectIds: [],
                      assigneeIds: [],
                    })
                  }
                  className="text-[10.5px] font-semibold text-muted transition hover:text-accent"
                >
                  Reset
                </button>
              </div>
              <div className="max-h-[350px] overflow-y-auto p-1.5">
                <MenuLabel>Status</MenuLabel>
                {STATUS_ORDER.map((status) => (
                  <CheckRow
                    key={status}
                    checked={filters.statuses.includes(status)}
                    onClick={() =>
                      onChange({ ...filters, statuses: toggle(filters.statuses, status) })
                    }
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_META[status].dot)} />
                    {STATUS_META[status].label}
                    <span className="ml-auto font-mono text-[9.5px] text-muted/50">
                      {statusCounts(status)}
                    </span>
                  </CheckRow>
                ))}

                <MenuSeparator />
                <MenuLabel>Priority</MenuLabel>
                {(['urgent', 'high', 'medium', 'low'] as TaskPriority[]).map((priority) => (
                  <CheckRow
                    key={priority}
                    checked={filters.priorities.includes(priority)}
                    onClick={() =>
                      onChange({
                        ...filters,
                        priorities: toggle(filters.priorities, priority),
                      })
                    }
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_META[priority].dot)} />
                    {PRIORITY_META[priority].label}
                    <span className="ml-auto font-mono text-[9.5px] text-muted/50">
                      {priorityCounts(priority)}
                    </span>
                  </CheckRow>
                ))}

                <MenuSeparator />
                <MenuLabel>Project</MenuLabel>
                {projects.map((project) => (
                  <CheckRow
                    key={project.id}
                    checked={filters.projectIds.includes(project.id)}
                    onClick={() =>
                      onChange({
                        ...filters,
                        projectIds: toggle(filters.projectIds, project.id),
                      })
                    }
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="truncate">{project.name}</span>
                  </CheckRow>
                ))}

                <MenuSeparator />
                <MenuLabel>Assignee</MenuLabel>
                {members.map((member) => (
                  <CheckRow
                    key={member.id}
                    checked={filters.assigneeIds.includes(member.id)}
                    onClick={() =>
                      onChange({
                        ...filters,
                        assigneeIds: toggle(filters.assigneeIds, member.id),
                      })
                    }
                  >
                    <Avatar user={member} size="xs" />
                    <span className="truncate">{member.name}</span>
                  </CheckRow>
                ))}
              </div>
              <div className="border-t border-line p-2">
                <Button
                  size="sm"
                  variant="primary"
                  className="w-full"
                  onClick={close}
                >
                  Show {resultCount} task{resultCount === 1 ? '' : 's'}
                </Button>
              </div>
            </div>
          )}
        </Popover>

        {showSort && (
          <Popover
            panelClassName="w-[190px]"
            trigger={({ toggle: togglePanel, open }) => (
              <Button
                size="sm"
                variant="secondary"
                onClick={togglePanel}
                icon={<ArrowUpDown size={13} />}
                className={cn('h-9', open && 'border-accent/40 text-accent')}
              >
                <span className="hidden sm:inline">Sort:</span> {sortLabels[filters.sort]}
              </Button>
            )}
          >
            {(close) => (
              <>
                <MenuLabel>Sort by</MenuLabel>
                {(Object.keys(sortLabels) as TaskFilters['sort'][]).map((sort) => (
                  <MenuItem
                    key={sort}
                    active={filters.sort === sort}
                    icon={filters.sort === sort ? <Check size={13} /> : <span className="h-3 w-3" />}
                    onClick={() => {
                      onChange({ ...filters, sort })
                      close()
                    }}
                  >
                    {sortLabels[sort]}
                  </MenuItem>
                ))}
              </>
            )}
          </Popover>
        )}

        {activeCount > 0 && (
          <button
            type="button"
            onClick={() =>
              onChange({
                ...filters,
                query: '',
                statuses: [],
                priorities: [],
                projectIds: [],
                assigneeIds: [],
              })
            }
            className="flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-muted transition hover:bg-raised hover:text-ink"
          >
            <X size={11} />
            Clear all
          </button>
        )}

        <span className="ml-auto hidden font-mono text-[10.5px] text-muted/70 sm:block">
          {resultCount} task{resultCount === 1 ? '' : 's'}
        </span>
      </div>

      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.statuses.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() =>
                onChange({ ...filters, statuses: filters.statuses.filter((s) => s !== status) })
              }
              className="chip group h-6 gap-1 bg-surface py-0 pr-1.5 text-[10.5px] hover:border-accent/30 hover:text-ink"
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_META[status].dot)} />
              {STATUS_META[status].label}
              <X size={9} className="text-muted/50 group-hover:text-ink" />
            </button>
          ))}
          {filters.priorities.map((priority) => (
            <button
              key={priority}
              type="button"
              onClick={() =>
                onChange({
                  ...filters,
                  priorities: filters.priorities.filter((p) => p !== priority),
                })
              }
              className="chip group h-6 gap-1 bg-surface py-0 pr-1.5 text-[10.5px] hover:border-accent/30 hover:text-ink"
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_META[priority].dot)} />
              {PRIORITY_META[priority].label}
              <X size={9} className="text-muted/50 group-hover:text-ink" />
            </button>
          ))}
          {filters.projectIds.map((projectId) => {
            const project = projects.find((item) => item.id === projectId)
            if (!project) return null
            return (
              <button
                key={projectId}
                type="button"
                onClick={() =>
                  onChange({
                    ...filters,
                    projectIds: filters.projectIds.filter((id) => id !== projectId),
                  })
                }
                className="chip group h-6 gap-1 bg-surface py-0 pr-1.5 text-[10.5px] hover:border-accent/30 hover:text-ink"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                {project.name}
                <X size={9} className="text-muted/50 group-hover:text-ink" />
              </button>
            )
          })}
          {filters.assigneeIds.map((assigneeId) => {
            const member = members.find((item) => item.id === assigneeId)
            if (!member) return null
            return (
              <button
                key={assigneeId}
                type="button"
                onClick={() =>
                  onChange({
                    ...filters,
                    assigneeIds: filters.assigneeIds.filter((id) => id !== assigneeId),
                  })
                }
                className="chip group h-6 gap-1 bg-surface py-0 pr-1.5 text-[10.5px] hover:border-accent/30 hover:text-ink"
              >
                {member.name}
                <X size={9} className="text-muted/50 group-hover:text-ink" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
