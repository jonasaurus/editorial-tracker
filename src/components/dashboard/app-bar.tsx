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
function Divider() {
  return <div aria-hidden className="hidden h-5 w-px bg-border md:block" />
}

/** The dashboard app bar: mark, user menu, counts, filters, view switch, "New item" (§6.2). */
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
    <header className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3 md:px-10 md:py-0">
      <div className="flex items-center gap-3">
        <Mark className="h-5 w-auto shrink-0 text-foreground" />
        <UserMenu {...user} />
      </div>
      <Divider />
      <Counts parts={counts} />
      <Divider />
      <div className="flex flex-wrap items-center gap-1">
        <FilterMenu {...typeFilter} />
        {authorFilter && <FilterMenu {...authorFilter} />}
        <ShowArchived {...showArchived} />
      </div>
      <Divider />
      <ViewSwitch {...view} />
      <Button asChild size="sm" className="ml-auto">
        <Link href={newItemHref} scroll={false} data-item-link="new">
          <Plus aria-hidden />
          New item
        </Link>
      </Button>
    </header>
  )
}
