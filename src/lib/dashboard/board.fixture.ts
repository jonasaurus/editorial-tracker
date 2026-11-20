import type { BoardItem } from './board'

let nextId = 1

/** A board item for unit tests: a draft article with a new id. `change` sets other values. */
export function boardItem(change: Partial<BoardItem> = {}): BoardItem {
  return {
    id: nextId++,
    title: 'A title',
    type: 'article',
    status: 'draft',
    deadline: null,
    publishedAt: null,
    archived: false,
    authorNames: [],
    creatorName: null,
    ...change,
  }
}
