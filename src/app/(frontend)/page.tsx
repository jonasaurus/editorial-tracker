import config from '@payload-config'
import { getPayload } from 'payload'

import { AppBar } from '@/components/dashboard/app-bar'
import { Board, type BoardEmpty } from '@/components/dashboard/board'
import type { FilterOption } from '@/components/dashboard/filter-menu'
import { ListView } from '@/components/dashboard/list-view'
import { ItemDialog } from '@/components/item/item-dialog'
import { LiveUpdates } from '@/components/live/live-updates'
import { toPathWithQuery } from '@/lib/auth/next-path'
import { requireSession } from '@/lib/auth/session'
import { buildBoard, formatCounts } from '@/lib/dashboard/board'
import { buildList, getListEmpty } from '@/lib/dashboard/list'
import {
  dashboardHref,
  hasFilters,
  type ListSort,
  nextSort,
  parseDashboardParams,
  type SearchParams,
} from '@/lib/dashboard/params'
import { getDashboardData } from '@/lib/dashboard/query'
import { getDashboardVersion } from '@/lib/dashboard/version'
import { todayInCopenhagen } from '@/lib/deadline'
import { getItemDialogData } from '@/lib/item/detail'
import { TYPE_LABELS, TYPES } from '@/lib/items'

type Props = {
  searchParams: Promise<SearchParams>
}

/** The dashboard (spec §6.2). The URL holds the view and the filters (DASH-1, DASH-2). */
export default async function DashboardPage({ searchParams }: Props) {
  const query = await searchParams
  const { user, canAccessAdmin } = await requireSession(toPathWithQuery('/', query))
  const payload = await getPayload({ config })

  // LIVE-1: read the version before the items (ADR 0008). A change between the two reads then
  // gives one more refresh, and no change is missed.
  const version = await getDashboardVersion(payload, user)
  const { params, items, total, hasAnyItem, authors } = await getDashboardData(
    payload,
    user,
    parseDashboardParams(query, user.role),
  )
  // DL-1: the server decides today, and passes it down.
  const today = todayInCopenhagen()
  const board = buildBoard(items, today)
  // ITEM-1: the dashboard links do not include `item`, so a link never opens a dialog again.
  const base = { ...params, item: null }
  const href = (change: Parameters<typeof dashboardHref>[1]) => dashboardHref(base, change)
  const itemHref = (id: number) => href({ item: { kind: 'id', id } })
  const newItemHref = href({ item: { kind: 'new' } })
  // ITEM-2: close goes back to the dashboard URL with the same filters.
  const closeHref = href({})
  const dialog = params.item ? await getItemDialogData(payload, user, params.item) : null
  // LIST-3: a header link sets the sort after a click on that column.
  const sortHref = (column: ListSort) => href(nextSort(params, column))

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

  // EMPTY-3: "Clear filters" keeps the view, the status tab and the sort.
  const clearHref = href({ type: null, author: null, archived: false })
  const empty: BoardEmpty = !hasAnyItem
    ? { kind: 'no-items' }
    : hasFilters(params) && items.length === 0
      ? { kind: 'no-results', total, clearHref }
      : { kind: 'none' }

  const list = buildList(items, params)
  const listView = (className?: string) => (
    <ListView
      className={className}
      rows={list.rows}
      today={today}
      status={params.status}
      sort={params.sort}
      dir={params.dir}
      tabs={list.tabs.map((tab) => ({ tab, href: href({ status: tab.status }) }))}
      sortHref={sortHref}
      itemHref={itemHref}
      empty={getListEmpty({
        hasAnyItem,
        filtered: hasFilters(params),
        itemCount: items.length,
        rowCount: list.rows.length,
        status: params.status,
      })}
      total={total}
      clearHref={clearHref}
    />
  )

  return (
    <LiveUpdates version={version}>
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
        newItemHref={newItemHref}
      />
      <main>
        {params.view === 'board' ? (
          <>
            {/* LIST-5: below `md` the list is the only view. */}
            <Board
              className="hidden md:block"
              items={items}
              today={today}
              empty={empty}
              role={user.role}
              itemHref={itemHref}
            />
            {listView('md:hidden')}
          </>
        ) : (
          listView()
        )}
      </main>
      {/* Once, after `main`: on `view=board` both the board and the list render. */}
      {params.item && dialog && (
        <ItemDialog
          key={params.item.kind === 'id' ? `id-${params.item.id}` : params.item.kind}
          state={dialog}
          closeHref={closeHref}
          today={today}
          user={{ id: user.id, role: user.role }}
        />
      )}
    </LiveUpdates>
  )
}
