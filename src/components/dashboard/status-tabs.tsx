import Link from 'next/link'

import { StatusMarker } from '@/components/dashboard/status-marker'
import { formatColumnCount } from '@/lib/dashboard/board'
import type { ListTab } from '@/lib/dashboard/list'
import { type ItemStatus, STATUS_LABELS } from '@/lib/items'
import { cn } from '@/lib/utils'

type Props = {
  /** All, then one tab per status, each with its URL. */
  tabs: { tab: ListTab; href: string }[]
  /** The selected tab. `null` is All. */
  current: ItemStatus | null
}

/**
 * The status tabs of the list view (LIST-1, ADR 0005): links, not shadcn `Tabs`. A 2px orange
 * rule marks the active tab (design-system §4).
 */
export function StatusTabs({ tabs, current }: Props) {
  return (
    <nav aria-label="Status" className="border-b border-border">
      <ul className="flex flex-wrap gap-x-8">
        {tabs.map(({ tab, href }) => {
          const active = tab.status === current
          const { count, archived } = formatColumnCount(tab.count, tab.archivedCount)
          return (
            <li key={tab.status ?? 'all'}>
              <Link
                href={href}
                scroll={false}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  // 1px at the top, 7px at the bottom: the text sits 14px above the rule (design-system §11).
                  'relative flex items-baseline gap-2 pt-px pb-[7px] text-2xl tracking-[-0.02em] whitespace-nowrap outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
                  active
                    ? 'text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-publish'
                    : 'text-muted-foreground',
                )}
              >
                {tab.status !== null && <StatusMarker status={tab.status} />}
                <span className="font-semibold">
                  {tab.status === null ? 'All' : STATUS_LABELS[tab.status]}
                </span>
                <span className="font-light text-muted-foreground">
                  {count}
                  {/* "5 · 1 archived": the archived part is smaller (same as the column count). */}
                  {archived && <span className="text-sm font-normal"> · {archived}</span>}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
