interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

const labelForStatus = (status: string) => status.replace(/_/g, ' ')

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const normalized = status.toLowerCase()
  const className = `rollout-badge ${normalized} ${size}`

  return <span className={className}>{labelForStatus(normalized)}</span>
}
