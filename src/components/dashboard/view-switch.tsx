import { Columns4, List, type LucideIcon } from 'lucide-react'
import Link from 'next/link'

import type { DashboardView } from '@/lib/dashboard/params'
import { cn } from '@/lib/utils'

type Props = {
  current: DashboardView
  boardHref: string
  listHref: string
}

/** The Board/List switch (DASH-1). A 2px orange rule marks the active view (design-system §4). */
export function ViewSwitch({ current, boardHref, listHref }: Props) {
  const links: { view: DashboardView; label: string; href: string; Icon: LucideIcon }[] = [
    { view: 'board', label: 'Board', href: boardHref, Icon: Columns4 },
    { view: 'list', label: 'List', href: listHref, Icon: List },
  ]

  return (
    <nav aria-label="View" className="flex items-center gap-1">
      {links.map(({ view, label, href, Icon }) => {
        const active = view === current
        return (
          <Link
            key={view}
            href={href}
            scroll={false}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative inline-flex h-8 items-center gap-1.5 px-2 text-sm outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
              active
                ? 'font-semibold text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-publish'
                : 'text-muted-foreground',
            )}
          >
            <Icon aria-hidden className="size-4" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
