import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type SectionCardProps = {
  title: string
  children: ReactNode
  className?: string
}

export function SectionCard({ title, children, className }: SectionCardProps) {
  return (
    <section className={cn('rounded-lg border bg-card p-6 shadow-sm', className)}>
      <h2 className="mb-3 text-lg font-semibold text-card-foreground">{title}</h2>
      <div className="text-sm text-muted-foreground">{children}</div>
    </section>
  )
}
