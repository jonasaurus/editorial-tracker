import { Archive, ArrowDown, ArrowUp } from 'lucide-react'
import Link from 'next/link'

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
import { STATUS_LABELS, TYPE_LABELS } from '@/lib/items'
import { cn } from '@/lib/utils'

/** The column header text and width (design 02a-list). Widths include 12px padding each side. */
const columns: Record<ListSort, { label: string; className?: string }> = {
  // The title wraps; below this width the table scrolls in its box (small screens).
  title: { label: 'Title', className: 'min-w-[240px]' },
  type: { label: 'Type', className: 'w-[120px]' },
  status: { label: 'Status', className: 'w-[120px]' },
  authors: { label: 'Authors', className: 'w-[220px]' },
  creator: { label: 'Created by', className: 'w-[160px]' },
  // design-system §5: the Deadline column is 200px wide (plus the cell padding).
  deadline: { label: 'Deadline', className: 'w-[224px]' },
}

type Props = {
  /** The sorted rows. Empty: the table shows only its header. */
  rows: BoardItem[]
  /** Today as `YYYY-MM-DD` in Europe/Copenhagen (DL-1). */
  today: string
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

/** One item. Only the title is a link, so the row has no hover fill (ADR 0005). */
function ItemRow({ item, today, href }: { item: BoardItem; today: string; href: string }) {
  const { archived } = item
  const cell = 'h-12 px-3 py-2'

  return (
    <TableRow className="border-border hover:bg-transparent">
      <TableCell className={cn(cell, 'whitespace-normal')}>
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <Link
            href={href}
            scroll={false}
            data-item-link={item.id}
            className={cn(
              'font-semibold underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50',
              archived ? 'text-muted-foreground' : 'text-foreground',
            )}
          >
            {item.title}
          </Link>
          {/* LIST-4: a label, so the archived state is not colour only (same as the item card). */}
          {archived && (
            <span className="inline-flex items-center gap-1 rounded-full border border-input px-1.5 text-xs leading-4 text-muted-foreground">
              <Archive aria-hidden className="size-3" />
              Archived
            </span>
          )}
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
      <TableCell className={cn(cell, archived ? 'text-muted-foreground' : 'text-foreground')}>
        {item.authorNames.join(', ')}
      </TableCell>
      <TableCell className={cn(cell, 'text-muted-foreground')}>{item.creatorName}</TableCell>
      <TableCell className={cell}>
        <DeadlineText item={item} today={today} variant="short" />
      </TableCell>
    </TableRow>
  )
}
