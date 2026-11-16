import {
  BarChart3,
  BookOpen,
  Code2,
  Palette,
  Phone,
  Rocket,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import type { Project } from '../../types'

const icons: Record<Project['icon'], LucideIcon> = {
  rocket: Rocket,
  palette: Palette,
  code: Code2,
  chart: BarChart3,
  phone: Phone,
  book: BookOpen,
}

export function ProjectIcon({
  project,
  size = 'md',
  className,
  showBackground = true,
}: {
  project: Pick<Project, 'icon' | 'color'>
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showBackground?: boolean
}) {
  const Icon = icons[project.icon] ?? Rocket
  const dimension = size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-11 w-11' : 'h-8 w-8'
  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 20 : 15

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg',
        dimension,
        showBackground && 'border',
        className,
      )}
      style={
        showBackground
          ? {
              backgroundColor: `${project.color}16`,
              borderColor: `${project.color}28`,
              color: project.color,
            }
          : { color: project.color }
      }
    >
      <Icon size={iconSize} strokeWidth={2.1} />
    </span>
  )
}
