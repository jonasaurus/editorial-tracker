import { formatPlainDate, toCopenhagenDate, toCopenhagenTime } from '@/lib/deadline'

import type { ItemDetail, TextPart } from './types'

export type ItemMeta = {
  /** "Created by <name> · <date>". Null: no creator ("Created <date>"). */
  creatorName: string | null
  /** The created date, for example "3 Nov" or "today". */
  created: string
  /** "Archived …", "Published … · updated …" or "Updated …" (design-system §6). */
  event: TextPart[]
}

/** "today" when the Copenhagen date of `iso` is `today`, else "3 Nov" (DL-1, DL-4). */
function dateWord(iso: string, today: string): string {
  const day = toCopenhagenDate(iso)
  return day === today ? 'today' : formatPlainDate(day, today)
}

/** "Published today" or "Published 3 Nov": the Copenhagen date of `publishedAt` (BOARD-3, ITEM-3). */
export function formatPublished(publishedAt: string, today: string): string {
  return `Published ${dateWord(publishedAt, today)}`
}

/** The date word and the `HH:mm` time in Copenhagen, for example "today 09:12". */
function dateTime(iso: string, today: string): string {
  return `${dateWord(iso, today)} ${toCopenhagenTime(iso)}`
}

/** The metadata line of the dialog (ITEM-3, design-system §6). `today`: `YYYY-MM-DD` (DL-1). */
export function formatItemMeta(
  item: Pick<
    ItemDetail,
    'creatorName' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'status' | 'archived'
  >,
  today: string,
): ItemMeta {
  return {
    creatorName: item.creatorName,
    created: dateWord(item.createdAt, today),
    event: formatEvent(item, today),
  }
}

function formatEvent(
  item: Pick<ItemDetail, 'updatedAt' | 'publishedAt' | 'status' | 'archived'>,
  today: string,
): TextPart[] {
  // MODEL-3 has no `archivedAt`. An archived item is read-only (PERM-6), so the last update
  // is the archive.
  if (item.archived) {
    return [{ text: `Archived ${dateTime(item.updatedAt, today)}`, strong: true }]
  }
  // MODEL-2: `publishedAt` stays after unpublish, so the status decides.
  if (item.status === 'published' && item.publishedAt) {
    return [
      { text: formatPublished(item.publishedAt, today), strong: true },
      { text: ` · updated ${dateTime(item.updatedAt, today)}`, strong: false },
    ]
  }
  return [{ text: `Updated ${dateTime(item.updatedAt, today)}`, strong: false }]
}
