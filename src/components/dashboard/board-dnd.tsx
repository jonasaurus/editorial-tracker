'use client'

import { Accessibility, PointerActivationConstraints } from '@dnd-kit/dom'
import {
  DragDropProvider,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useDragDropMonitor,
} from '@dnd-kit/react'
import { useRouter } from 'next/navigation'
import {
  type ComponentProps,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
} from 'react'

import { moveItem } from '@/app/(frontend)/item/actions'
import { BoardColumn } from '@/components/dashboard/board-column'
import { isItemDragData, ItemCardOverlay } from '@/components/dashboard/item-card'
import { usePauseLive } from '@/components/live/live-updates'
import { loginPath } from '@/lib/auth/next-path'
import { buildBoard, type BoardItem } from '@/lib/dashboard/board'
import {
  announceMove,
  applyMove,
  canDropOn,
  getMoveError,
  MOVE_INSTRUCTIONS,
} from '@/lib/dashboard/dnd'
import type { ItemActionResult } from '@/lib/item/types'
import { isItemStatus, type ItemStatus, type Role } from '@/lib/items'
import { showError } from '@/lib/toast'

type Props = {
  items: BoardItem[]
  /** Today as `YYYY-MM-DD` in Europe/Copenhagen (DL-1). */
  today: string
  role: Role
  /** The URL that opens each item in the dialog (BOARD-4, ITEM-1). */
  hrefs: Record<number, string>
  /** Show EMPTY-2 in empty columns. False when the board shows one empty box. */
  showEmptyState: boolean
}

/*
 * The sensors, plugins and texts are module constants: the provider compares them at each render
 * and compares functions by identity.
 */

/**
 * One arrow key press moves the item by one column (DND-5). The keyboard sensor reads `offset`
 * at each key press. `onDragStart` measures the column pitch; the getter reads no layout.
 */
let keyboardOffset = { x: 10, y: 0 }
const keyboardOptions = {
  keyboardCodes: {
    ...KeyboardSensor.defaults.keyboardCodes,
    // Enter opens the item. Tab cancels the move.
    start: ['Space'],
    end: ['Space', 'Enter'],
    cancel: ['Escape', 'Tab'],
  },
  get offset() {
    return keyboardOffset
  },
}

const sensors = [
  PointerSensor.configure({
    // A mouse or pen click on the link opens the item. A drag starts after 5px.
    activationConstraints(event, source) {
      if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
        return [new PointerActivationConstraints.Distance({ value: 5 })]
      }
      const defaults = PointerSensor.defaults.activationConstraints
      return typeof defaults === 'function' ? defaults(event, source) : defaults
    },
  }),
  KeyboardSensor.configure(keyboardOptions),
]

/** The item and the column of a drag operation, for the announcements and the drop. */
function describe(operation: DragEndEvent['operation']) {
  const data = operation.source?.data
  if (!isItemDragData(data)) return null
  const target = operation.target?.id
  return { title: data.title, from: data.status, to: isItemStatus(target) ? target : null }
}

/** DND-5: the screen-reader texts. A column where the user cannot drop counts as no column. */
function getAccessibility(role: Role) {
  const allowed = (from: ItemStatus, to: ItemStatus | null) =>
    to !== null && canDropOn(role, { status: from }, to) ? to : null

  return {
    screenReaderInstructions: { draggable: MOVE_INSTRUCTIONS },
    announcements: {
      dragstart({ operation }) {
        const move = describe(operation)
        return move ? announceMove('start', move.title, move.from, null) : undefined
      },
      dragover({ operation }) {
        const move = describe(operation)
        // The item starts over its own column. No text then, so the start text is not lost.
        if (!move || move.to === move.from) return undefined
        return announceMove('over', move.title, move.from, allowed(move.from, move.to))
      },
      dragend({ operation, canceled }) {
        const move = describe(operation)
        if (!move) return undefined
        if (canceled) return announceMove('cancel', move.title, move.from, null)
        return announceMove('end', move.title, move.from, allowed(move.from, move.to))
      },
    },
  } satisfies NonNullable<ConstructorParameters<typeof Accessibility>[1]>
}

type PluginsProp = NonNullable<ComponentProps<typeof DragDropProvider>['plugins']>
type PluginsFunction = Extract<PluginsProp, (...args: never[]) => unknown>

/** The default plugins with our texts. The registry keeps one Accessibility: the last options win. */
const withAccessibility =
  (role: Role): PluginsFunction =>
  (defaults) => [...defaults, Accessibility.configure(getAccessibility(role))]

const plugins: Record<Role, PluginsFunction> = {
  editor: withAccessibility('editor'),
  contributor: withAccessibility('contributor'),
}

/**
 * The keyboard sensor moves on ArrowUp and ArrowDown by `offset.y`, which is 0. It then does not
 * prevent the default, so the page scrolls. During a keyboard drag this listener prevents it.
 */
function preventArrowScroll(event: KeyboardEvent) {
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') event.preventDefault()
}

function stopArrowScrollGuard() {
  document.removeEventListener('keydown', preventArrowScroll, { capture: true })
}

/** Measures the distance between two columns, for the keyboard step. */
function measureColumnPitch() {
  const [first, second] = document.querySelectorAll('[data-board-column]')
  if (!first || !second) return
  const pitch = second.getBoundingClientRect().left - first.getBoundingClientRect().left
  keyboardOffset = { x: pitch > 0 ? pitch : 10, y: 0 }
}

/**
 * The board columns with drag and drop (DND-1 to DND-6). The server stays the source of truth:
 * a drop shows the move at once (optimistic), then the server action saves it.
 */
export function BoardDnd({ items, today, role, hrefs, showEmptyState }: Props) {
  const router = useRouter()
  const [optimisticItems, addOptimistic] = useOptimistic(items, applyMove)
  const columns = buildBoard(optimisticItems, today).columns
  /** The item to focus after a drop, when the focus is lost. */
  const focusId = useRef<number | null>(null)
  const pause = usePauseLive()
  /** The release of the 'drag' pause during a drag (LIVE-2). */
  const releaseDrag = useRef<(() => void) | null>(null)

  const endDrag = useCallback(() => {
    releaseDrag.current?.()
    releaseDrag.current = null
    stopArrowScrollGuard()
  }, [])

  const onDragStart = useCallback(
    ({ operation }: DragStartEvent) => {
      endDrag()
      // LIVE-2: no live refresh during a drag. A refresh would render the board under the drag.
      releaseDrag.current = pause('drag')
      if (operation.activatorEvent instanceof KeyboardEvent) {
        document.addEventListener('keydown', preventArrowScroll, { capture: true })
      }
    },
    [pause, endDrag],
  )

  // A drag can end with an unmount (for example, a navigation). Do not keep the pause then.
  useEffect(() => endDrag, [endDrag])

  const onDragEnd = useCallback(
    ({ operation, canceled }: DragEndEvent) => {
      endDrag()
      const id = operation.source?.id
      const move = describe(operation)
      // DND-2: no request for a cancel, the same column or a column the user cannot drop on.
      if (canceled || typeof id !== 'number' || !move || move.to === null) return
      if (!canDropOn(role, { status: move.from }, move.to)) return
      const { from, to } = move
      focusId.current = id

      startTransition(async () => {
        addOptimistic({ id, status: to })
        let result: ItemActionResult
        // LIVE-2: no live refresh while the move is pending.
        const releaseMove = pause('move')
        try {
          result = await moveItem(id, to)
        } catch {
          const error = getMoveError({ reason: 'no-response' }, from)
          showError(error.title, error.text)
          return
        } finally {
          releaseMove()
        }
        if (result.ok) return
        switch (result.reason) {
          case 'session-expired':
            // ERR-5: log in again, then come back to this URL.
            router.push(loginPath(window.location.pathname + window.location.search))
            return
          case 'no-access':
            showError('You no longer have access to this item.')
            router.refresh()
            return
          case 'rejected': {
            const error = getMoveError({ reason: 'rejected', message: result.message }, from)
            showError(error.title, error.text)
            router.refresh()
            return
          }
          case 'invalid': {
            const error = getMoveError({ reason: 'invalid' }, from)
            showError(error.title, error.text)
            router.refresh()
            return
          }
        }
      })
    },
    [role, router, addOptimistic, pause, endDrag],
  )

  // After a drop the item is in a new column. Keep the focus on it (keyboard drop).
  useEffect(() => {
    const id = focusId.current
    if (id === null) return
    focusId.current = null
    if (document.activeElement !== document.body) return
    document.querySelector<HTMLElement>(`[data-item-link="${id}"]`)?.focus()
  }, [optimisticItems])

  return (
    <DragDropProvider sensors={sensors} plugins={plugins[role]} onDragStart={measureColumnPitch}>
      <DropMonitor onDragStart={onDragStart} onDragEnd={onDragEnd} />
      <div className="grid gap-x-4 gap-y-8 md:grid-cols-4">
        {columns.map((column) => (
          <BoardColumn
            key={column.status}
            column={column}
            today={today}
            role={role}
            hrefs={hrefs}
            showEmptyState={showEmptyState}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {(source) => {
          const item = optimisticItems.find((candidate) => candidate.id === source.id)
          return item ? <ItemCardOverlay item={item} today={today} /> : null
        }}
      </DragOverlay>
    </DragDropProvider>
  )
}

/**
 * Runs the drop outside the provider's render transition, so the drop shows at once (G1).
 * Also starts and ends the live-update pause of a drag (LIVE-2).
 */
function DropMonitor({
  onDragStart,
  onDragEnd,
}: {
  onDragStart: (event: DragStartEvent) => void
  onDragEnd: (event: DragEndEvent) => void
}) {
  const handlers = useMemo(() => ({ onDragStart, onDragEnd }), [onDragStart, onDragEnd])
  useDragDropMonitor(handlers)
  return null
}
