import { UserRound } from 'lucide-react'
import { cn, initials } from '../../lib/utils'
import type { User } from '../../types'

const sizeMap = {
  xs: 'h-6 w-6 text-[9px]',
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-8 w-8 text-[11px]',
  lg: 'h-10 w-10 text-sm',
  xl: 'h-14 w-14 text-lg',
}

interface AvatarProps {
  user?: User | null
  size?: keyof typeof sizeMap
  className?: string
  ring?: boolean
  title?: string
}

export function Avatar({ user, size = 'md', className, ring = false, title }: AvatarProps) {
  if (!user) {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-line bg-raised text-muted',
          sizeMap[size],
          ring && 'ring-2 ring-surface',
          className,
        )}
        title={title ?? 'Unassigned'}
      >
        <UserRound size={size === 'xs' || size === 'sm' ? 12 : 14} />
      </span>
    )
  }

  return (
    <span
      title={title ?? `${user.name} · ${user.role}`}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white',
        sizeMap[size],
        ring && 'ring-2 ring-surface',
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(135deg, ${user.avatarColors[0]}, ${user.avatarColors[1]})`,
        boxShadow: `0 2px 8px -2px ${user.avatarColors[0]}66`,
      }}
    >
      {initials(user.name)}
    </span>
  )
}

interface AvatarGroupProps {
  users: User[]
  max?: number
  size?: keyof typeof sizeMap
  className?: string
}

export function AvatarGroup({ users, max = 3, size = 'sm', className }: AvatarGroupProps) {
  const visible = users.slice(0, max)
  const extra = users.length - visible.length

  return (
    <div className={cn('flex items-center -space-x-1.5', className)}>
      {visible.map((user) => (
        <Avatar key={user.id} user={user} size={size} ring />
      ))}
      {extra > 0 && (
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-raised font-semibold text-muted ring-2 ring-surface',
            sizeMap[size],
          )}
        >
          +{extra}
        </span>
      )}
    </div>
  )
}
