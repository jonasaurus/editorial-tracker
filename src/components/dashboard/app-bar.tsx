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

/** A 1px vertical line between groups of the app bar. */
function Divider({ className }: { className?: string }) {
  return <div aria-hidden className={cn('hidden h-5 w-px bg-border md:block', className)} />
}

/**
 * The dashboard app bar: mark, user menu, counts, filters, view switch, "New item" (§6.2).
 *
 * - `xl` and up: one row, in the order of the design (02, 02c).
 * - `md` to `xl`: two rows. Mark, user menu, counts and "New item", then filters and view switch.
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
    <header className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3 md:px-10 xl:flex-nowrap xl:py-0">
      <div className="flex items-center gap-3">
        <Mark className="h-5 w-auto shrink-0 text-foreground" />
        <UserMenu {...user} />
      </div>
      <Divider />
      <Counts parts={counts} className="order-1 w-full md:order-none md:w-auto" />
      <div className="order-last flex w-full flex-wrap items-center gap-x-3 gap-y-2 xl:order-none xl:w-auto">
        <Divider className="md:hidden xl:block" />
        <div className="flex flex-wrap items-center gap-1">
          <FilterMenu {...typeFilter} />
          {authorFilter && <FilterMenu {...authorFilter} />}
          <ShowArchived {...showArchived} />
        </div>
        <Divider />
        <ViewSwitch {...view} />
      </div>
      <Button asChild size="sm" className="ml-auto">
        <Link href={newItemHref} scroll={false} data-item-link="new">
          <Plus aria-hidden />
          New item
        </Link>
      </Button>
    </header>
  )
}
