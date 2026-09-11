import { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  color?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
}

export default function Badge({ children, color = 'neutral' }: BadgeProps) {
  const colors = {
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    info: 'badge-info',
    neutral: 'badge-neutral',
  }
  return <span className={`badge ${colors[color]}`}>{children}</span>
}