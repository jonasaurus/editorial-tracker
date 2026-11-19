import type { ComponentProps } from 'react'

import { EmptyState, NoItemsState, NoResultsState } from '@/components/dashboard/empty-state'
import { ItemTable } from '@/components/dashboard/item-table'
import { StatusTabs } from '@/components/dashboard/status-tabs'
import type { BoardItem } from '@/lib/dashboard/board'
import type { ListEmpty } from '@/lib/dashboard/list'
import type { ListSort, SortDir } from '@/lib/dashboard/params'
import type { ItemStatus } from '@/lib/items'
import { cn } from '@/lib/utils'

/** EMPTY-2: the text of an empty status tab in the list. `all`: only archived items exist. */
const emptyTabText: Record<ItemStatus | 'all', { title: string; text: string }> = {
  all: { title: 'No active items', text: 'Turn on “Show archived” to see archived items.' },
  idea: { title: 'No ideas', text: 'Add one with New item.' },
  draft: { title: 'No drafts', text: 'Set an idea to Draft when you start writing.' },
  review: {
    title: 'Nothing to review',
    text: 'Set a draft to Review when it is ready for an editor.',
  },
  published: {
    title: 'Nothing published yet',
    text: 'Set an item to Review. An editor publishes it.',
  },
}

type Props = {
  /** The sorted rows of the selected tab. */
  rows: BoardItem[]
  /** Today as `YYYY-MM-DD` in Europe/Copenhagen (DL-1). */
  today: string
  /** The selected tab. `null` is All. */
  status: ItemStatus | null
  sort: ListSort
  dir: SortDir
  /** The status tabs with their URLs (LIST-1). */
  tabs: ComponentProps<typeof StatusTabs>['tabs']
  /** The URL of each column header (LIST-3). */
  sortHref: (column: ListSort) => string
  /** The URL that opens an item in the dialog (ITEM-1). */
  itemHref: (id: number) => string
  empty: ListEmpty
  /** All active items, without the filters (EMPTY-3). */
  total: number
  /** The URL that clears Type, Author and Show archived (EMPTY-3). */
  clearHref: string
  className?: string
}

/** The list view: status tabs, then the items as a table (LIST-1–LIST-4, EMPTY-1–EMPTY-3). */
export function ListView({
  rows,
  today,
  status,
  sort,
  dir,
  tabs,
  sortHref,
  itemHref,
  empty,
  total,
  clearHref,
  className,
}: Props) {
  return (
    <div className={cn('px-4 pt-6 pb-10 md:px-10', className)}>
      <StatusTabs tabs={tabs} current={status} />
      <ItemTable
        className="mt-5"
        rows={rows}
        today={today}
        sort={sort}
        dir={dir}
        sortHref={sortHref}
        itemHref={itemHref}
      />

      {/* The empty box is outside the table, full width under the header line (design 02a-empty-list). */}
      {empty.kind === 'no-items' && <NoItemsState className="mt-4" />}
      {empty.kind === 'no-results' && (
        <NoResultsState className="mt-4" total={total} clearHref={clearHref} />
      )}
      {empty.kind === 'empty-tab' && (
        <EmptyState className="mt-4" {...emptyTabText[empty.status ?? 'all']} />
      )}
    </div>
  )
}
