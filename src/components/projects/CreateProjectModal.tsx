import { useEffect, useState } from 'react'
import { BarChart3, BookOpen, Code2, Palette, Phone, Rocket } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { Project } from '../../types'
import { useWorkspace } from '../../context/WorkspaceProvider'
import { useToast } from '../../context/ToastProvider'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

const ICONS: Array<{ key: Project['icon']; icon: LucideIcon }> = [
  { key: 'rocket', icon: Rocket },
  { key: 'palette', icon: Palette },
  { key: 'code', icon: Code2 },
  { key: 'chart', icon: BarChart3 },
  { key: 'phone', icon: Phone },
  { key: 'book', icon: BookOpen },
]

const COLORS = [
  '#6D5EF8',
  '#2563EB',
  '#0EA5E9',
  '#059669',
  '#EAB308',
  '#F97316',
  '#EC4899',
  '#E11D48',
]

export function CreateProjectModal({
  open,
  onClose,
  defaultName = '',
}: {
  open: boolean
  onClose: () => void
  defaultName?: string
}) {
  const { createProject } = useWorkspace()
  const { toast } = useToast()

  const [name, setName] = useState(defaultName)
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [icon, setIcon] = useState<Project['icon']>('rocket')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(defaultName)
      setDescription('')
      setColor(COLORS[0])
      setIcon('rocket')
      setDueDate('')
      setError(null)
      setSaving(false)
    }
  }, [open, defaultName])

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Give the project a name.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createProject({
        name: name.trim(),
        description: description.trim(),
        color,
        icon,
        dueDate: dueDate || null,
      })
      toast({ title: 'Project created', description: `“${name.trim()}” is ready for tasks.` })
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the project.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create a project"
      description="Projects group related tasks and give your work a shared goal."
      icon={<Palette size={16} />}
      footer={
        <>
          <Button size="md" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="md" variant="primary" loading={saving} onClick={() => void handleSubmit()}>
            Create project
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="project-name" className="field-label">
            Project name
          </label>
          <input
            id="project-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Mobile App v3"
            className="input"
            autoFocus
            maxLength={60}
          />
        </div>

        <div>
          <label htmlFor="project-description" className="field-label">
            Description
          </label>
          <textarea
            id="project-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What is this project about?"
            rows={3}
            maxLength={240}
            className="input h-auto resize-none py-2.5"
          />
        </div>

        <div>
          <span className="field-label">Colour</span>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setColor(option)}
                aria-label={`Choose colour ${option}`}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-xl transition-all',
                  color === option
                    ? 'scale-110 ring-2 ring-ink/30 ring-offset-2 ring-offset-surface'
                    : 'hover:scale-105',
                )}
                style={{ backgroundColor: option }}
              >
                {color === option && <span className="h-2 w-2 rounded-full bg-white/90" />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="field-label">Icon</span>
          <div className="flex flex-wrap gap-2">
            {ICONS.map(({ key, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setIcon(key)}
                aria-label={`Choose ${key} icon`}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl border transition-all',
                  icon === key
                    ? 'border-accent/50 bg-accent/10 text-accent'
                    : 'border-line bg-surface text-muted hover:bg-raised hover:text-ink',
                )}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="project-due" className="field-label">
            Target date <span className="font-normal normal-case text-muted/60">(optional)</span>
          </label>
          <input
            id="project-due"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className="input"
          />
        </div>

        {error && (
          <p className="text-[11.5px] font-medium text-rose-500" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
