import config from '@payload-config'
import { getPayload } from 'payload'

import { AppBar } from '@/components/dashboard/app-bar'
import { Board, type BoardEmpty } from '@/components/dashboard/board'
import type { FilterOption } from '@/components/dashboard/filter-menu'
import { toPathWithQuery } from '@/lib/auth/next-path'
import { requireSession } from '@/lib/auth/session'
import { buildBoard, formatCounts } from '@/lib/dashboard/board'
import {
  dashboardHref,
  hasFilters,
  parseDashboardParams,
  type SearchParams,
} from '@/lib/dashboard/params'
import { getDashboardData } from '@/lib/dashboard/query'
import { todayInCopenhagen } from '@/lib/deadline'
import { TYPE_LABELS, TYPES } from '@/lib/items'

type Props = {
  searchParams: Promise<SearchParams>
}

/** The dashboard (spec §6.2). The URL holds the view and the filters (DASH-1, DASH-2). */
export default async function DashboardPage({ searchParams }: Props) {
  const query = await searchParams
  const { user, canAccessAdmin } = await requireSession(toPathWithQuery('/', query))
  const payload = await getPayload({ config })

  const { params, items, total, hasAnyItem, authors } = await getDashboardData(
    payload,
    user,
    parseDashboardParams(query, user.role),
  )
  // DL-1: the server decides today, and passes it down.
  const today = todayInCopenhagen()
  const board = buildBoard(items, today)
  const href = (change: Parameters<typeof dashboardHref>[1]) => dashboardHref(params, change)

  const typeOptions: FilterOption[] = [
    { value: 'all', label: 'All', href: href({ type: null }) },
    ...TYPES.map((type) => ({ value: type, label: TYPE_LABELS[type], href: href({ type }) })),
  ]
  const authorOptions: FilterOption[] = [
    { value: 'all', label: 'All', href: href({ author: null }) },
    ...authors.map(({ id, name }) => ({
      value: String(id),
      label: name,
      href: href({ author: id }),
    })),
  ]

  const empty: BoardEmpty = !hasAnyItem
    ? { kind: 'no-items' }
    : hasFilters(params) && items.length === 0
      ? {
          kind: 'no-results',
          total,
          clearHref: href({ type: null, author: null, archived: false }),
        }
      : { kind: 'none' }

  return (
    <>
      <AppBar
        user={{ name: user.name, role: user.role, canAccessAdmin }}
        counts={formatCounts({
          shown: board.shown,
          total,
          overdue: board.overdue,
          archived: board.archived,
          showArchived: params.archived,
        })}
        typeFilter={{ label: 'Type', options: typeOptions, value: params.type ?? 'all' }}
        authorFilter={
          user.role === 'editor'
            ? {
                label: 'Author',
                options: authorOptions,
                value: params.author === null ? 'all' : String(params.author),
              }
            : null
        }
        showArchived={{ checked: params.archived, href: href({ archived: !params.archived }) }}
        view={{
          current: params.view,
          boardHref: href({ view: 'board' }),
          listHref: href({ view: 'list' }),
        }}
      />
      <main>
        {params.view === 'board' ? (
          <Board board={board} today={today} empty={empty} />
        ) : (
          <p className="px-4 pt-6 text-sm text-muted-foreground md:px-10">
            The list view comes in a later session.
          </p>
        )}
      </main>
    </>
  )
}
