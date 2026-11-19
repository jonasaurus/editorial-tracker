import { Plus } from 'lucide-react'
import Link from 'next/link'
import type { ComponentProps } from 'react'

import { Counts } from '@/components/dashboard/counts'
import { FilterMenu } from '@/components/dashboard/filter-menu'
import { ShowArchived } from '@/components/dashboard/show-archived'
import { UserMenu } from '@/components/dashboard/user-menu'
import { ViewSwitch } from '@/components/dashboard/view-switch'
import { Mark } from '@/components/mark'
import { Button } from '@/components/ui/button'
import type { CountParts } from '@/lib/dashboard/board'
import { cn } from '@/lib/utils'

type Props = {
  user: ComponentProps<typeof UserMenu>
  counts: CountParts
  typeFilter: ComponentProps<typeof FilterMenu>
  /** Editors only (DASH-2). `null` hides the Author filter. */
  authorFilter: ComponentProps<typeof FilterMenu> | null
  showArchived: ComponentProps<typeof ShowArchived>
  view: ComponentProps<typeof ViewSwitch>
  /** The URL that opens the new item dialog (ITEM-1, ITEM-11). */
  newItemHref: string
}

/**
 * A group of the app bar with a 1px vertical line in the gap before it. The bar clips its edges, so
 * the line of a group at the start of a row is hidden.
 */
const group =
  'relative before:absolute before:top-1/2 before:-left-3 before:h-5 before:w-px before:-translate-y-1/2 before:bg-border'

/**
 * The dashboard app bar: mark, user menu, counts, filters, view switch, "New item" (§6.2).
 *
 * - `md` and up: one row, in the order of design-system §11. A group goes to the next row only
 *   when it does not fit.
 * - Below `md`: mark, user menu and "New item", then counts, then filters.
 */
export function AppBar({
  user,
  counts,
  typeFilter,
  authorFilter,
  showArchived,
  view,
  newItemHref,
}: Props) {
  return (
    <header className="flex min-h-14 items-center border-b border-border px-4 py-3 md:px-10">
      {/* `-m-1 p-1`: room for the focus rings inside the clip box. */}
      <div className="-m-1 flex w-full flex-wrap items-center gap-x-6 gap-y-2 overflow-hidden p-1">
        <div className="flex items-center gap-3">
          <Mark className="h-5 w-auto shrink-0 text-foreground" />
          <UserMenu {...user} />
        </div>
        <Counts parts={counts} className={cn(group, 'order-1 w-full md:order-none md:w-auto')} />
        <div
          className={cn(
            group,
            'order-last flex w-full flex-wrap items-center gap-1 md:order-none md:w-auto',
          )}
        >
          <FilterMenu {...typeFilter} />
          {authorFilter && <FilterMenu {...authorFilter} />}
          <ShowArchived {...showArchived} />
        </div>
        <div className={cn(group, 'max-md:hidden')}>
          <ViewSwitch {...view} />
        </div>
        <Button asChild size="sm" className="ml-auto">
          <Link href={newItemHref} scroll={false} data-item-link="new">
            <Plus aria-hidden />
            New item
          </Link>
        </Button>
      </div>
    </header>
  )
}
