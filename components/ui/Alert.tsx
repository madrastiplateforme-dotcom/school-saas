import { ReactNode } from 'react'

interface AlertProps {
  children: ReactNode
  type?: 'success' | 'warning' | 'danger' | 'info'
}

export default function Alert({ children, type = 'info' }: AlertProps) {
  const types = {
    success: 'alert-success',
    warning: 'alert-warning',
    danger: 'alert-danger',
    info: 'alert-info',
  }
  return <div className={`alert ${types[type]}`}>{children}</div>
}