import { ArrowDown, ArrowUp } from 'lucide-react'
import Link from 'next/link'
import { Fragment } from 'react'

import { ArchivedBadge } from '@/components/dashboard/archived-badge'
import { StatusMarker } from '@/components/dashboard/status-marker'
import { DeadlineText } from '@/components/deadline-text'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { BoardItem } from '@/lib/dashboard/board'
import { LIST_SORTS, type ListSort, type SortDir } from '@/lib/dashboard/params'
import type { PlainDate } from '@/lib/deadline'
import { STATUS_LABELS, TYPE_LABELS } from '@/lib/items'
import { cn } from '@/lib/utils'

/**
 * The column header text and width (design-system §11 "List table"). Widths include 12px
 * padding each side.
 * Below `xl`, Type, Status, Authors and Created by are only as wide as their text (`w-px`). The
 * authors wrap after a comma. The title gets the rest of the width.
 */
const columns: Record<ListSort, { label: string; className?: string }> = {
  // The title wraps; below this width the table scrolls in its box (small screens).
  title: { label: 'Title', className: 'min-w-[240px]' },
  type: { label: 'Type', className: 'w-px xl:w-[120px]' },
  status: { label: 'Status', className: 'w-px xl:w-[120px]' },
  authors: { label: 'Authors', className: 'w-px xl:w-[220px]' },
  creator: { label: 'Created by', className: 'w-px xl:w-[160px]' },
  // design-system §5: the Deadline column is 200px wide (plus the cell padding).
  deadline: { label: 'Deadline', className: 'w-[224px]' },
}

type Props = {
  /** The sorted rows. Empty: the table shows only its header. */
  rows: BoardItem[]
  today: PlainDate
  sort: ListSort
  dir: SortDir
  /** The URL of each column header: the sort after a click on it (LIST-3). */
  sortHref: (column: ListSort) => string
  /** The URL that opens an item in the dialog (ITEM-1). */
  itemHref: (id: number) => string
  className?: string
}

/**
 * The items as a table (LIST-2, LIST-3, LIST-4, ADR 0005). Each header is a link that sorts on
 * the server. Archived rows are greyed and show an "Archived" label.
 */
export function ItemTable({ rows, today, sort, dir, sortHref, itemHref, className }: Props) {
  const SortIcon = dir === 'asc' ? ArrowUp : ArrowDown

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow className="border-foreground hover:bg-transparent">
          {LIST_SORTS.map((column) => {
            const sorted = column === sort
            return (
              <TableHead
                key={column}
                aria-sort={sorted ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}
                className={cn(
                  'px-3 text-xs font-medium',
                  sorted ? 'text-foreground' : 'text-muted-foreground',
                  columns[column].className,
                )}
              >
                <Link
                  href={sortHref(column)}
                  scroll={false}
                  className="inline-flex items-center gap-1 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {columns[column].label}
                  {sorted && <SortIcon aria-hidden className="size-3.5" />}
                </Link>
              </TableHead>
            )
          })}
        </TableRow>
      </TableHeader>
      <TableBody className="[&_tr:last-child]:border-b">
        {rows.map((item) => (
          <ItemRow key={item.id} item={item} today={today} href={itemHref(item.id)} />
        ))}
      </TableBody>
    </Table>
  )
}

/**
 * One item. LIST-6: the title link stretches over the whole row, so a click anywhere opens the item.
 * The link name is the title (ADR 0005).
 */
function ItemRow({ item, today, href }: { item: BoardItem; today: PlainDate; href: string }) {
  const { archived } = item
  const cell = 'h-12 px-3 py-2'

  return (
    // `translate-x-0`: WebKit uses a `<tr>` as the containing block of the stretched link only when
    // the row has a transform. Without it, every row opens the last item.
    <TableRow className="relative translate-x-0 border-border">
      <TableCell className={cn(cell, 'whitespace-normal')}>
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <Link
            href={href}
            scroll={false}
            data-item-link={item.id}
            className={cn(
              'font-semibold text-balance underline-offset-4 outline-none hover:underline',
              // The focus ring is on the stretched area, inset: the table box clips an outer ring.
              'after:absolute after:inset-0 focus-visible:after:ring-3 focus-visible:after:ring-ring/50 focus-visible:after:ring-inset',
              archived ? 'text-muted-foreground' : 'text-foreground',
            )}
          >
            {item.title}
          </Link>
          {archived && <ArchivedBadge />}
        </span>
      </TableCell>
      <TableCell className={cn(cell, 'text-muted-foreground')}>{TYPE_LABELS[item.type]}</TableCell>
      <TableCell className={cell}>
        <span
          className={cn(
            'flex items-baseline gap-2',
            archived ? 'text-muted-foreground' : 'text-foreground',
          )}
        >
          <StatusMarker status={item.status} className={cn(archived && 'opacity-50')} />
          {STATUS_LABELS[item.status]}
        </span>
      </TableCell>
      <TableCell
        className={cn(
          cell,
          'whitespace-normal',
          archived ? 'text-muted-foreground' : 'text-foreground',
        )}
      >
        {/* A name does not break: the authors wrap only after a comma. */}
        {item.authorNames.map((name, index) => (
          <Fragment key={index}>
            {index > 0 && ', '}
            <span className="whitespace-nowrap">{name}</span>
          </Fragment>
        ))}
      </TableCell>
      <TableCell className={cn(cell, 'text-muted-foreground')}>{item.creatorName}</TableCell>
      <TableCell className={cell}>
        <DeadlineText item={item} today={today} variant="short" />
      </TableCell>
    </TableRow>
  )
}
