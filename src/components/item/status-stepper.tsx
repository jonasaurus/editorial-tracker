'use client'

import { Check, Lock } from 'lucide-react'
import type { CSSProperties } from 'react'

import { STATUS_FILL } from '@/components/dashboard/status-marker'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { type ItemStatus, STATUS_LABELS, STATUSES } from '@/lib/items'
import { cn } from '@/lib/utils'

/** The chevron depth (design-system §3). */
const DEPTH = '10px'

/** Read-only: the selected step at 50% (design-system §3). Static class names, so Tailwind finds them. */
const fillReadOnly: Record<ItemStatus, string> = {
  idea: 'bg-status-idea/50',
  draft: 'bg-status-draft/50',
  review: 'bg-status-review/50',
  published: 'bg-status-published/50',
}

/** The chevron shape of a step. The first step has no notch, the last step has no tip. */
function shape(index: number): CSSProperties {
  const first = index === 0
  const last = index === STATUSES.length - 1
  const tip = last
    ? ['100% 0', '100% 100%']
    : [`calc(100% - ${DEPTH}) 0`, '100% 50%', `calc(100% - ${DEPTH}) 100%`]
  const notch = first ? ['0 100%'] : ['0 100%', `${DEPTH} 50%`]
  return {
    clipPath: `polygon(0 0, ${[...tip, ...notch].join(', ')})`,
    // The next step starts under the tip. 1px stays open: the frame shows as the chevron line.
    marginLeft: first ? undefined : `calc(1px - ${DEPTH})`,
  }
}

type Props = {
  value: ItemStatus
  onChange: (status: ItemStatus) => void
  /** Steps the user cannot select (ITEM-4). */
  locked: ItemStatus[]
  /** Archived or published read-only (ITEM-8, ITEM-13). */
  readOnly: boolean
  /** The `name` of the radio group. */
  name: string
}

/**
 * The status stepper (ITEM-3, ITEM-4, design-system §3). Native radios: arrow keys and form
 * semantics come from the browser. The chevrons are drawn by `clip-path`.
 */
export function StatusStepper({ value, onChange, locked, readOnly, name }: Props) {
  const selectedIndex = STATUSES.indexOf(value)

  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm font-semibold text-foreground">Status</legend>
      <TooltipProvider>
        <div className={cn('flex p-px', readOnly ? 'bg-disabled-border' : 'bg-input')}>
          {STATUSES.map((status, index) => {
            const selected = status === value
            const done = index < selectedIndex
            const isLocked = !readOnly && locked.includes(status)
            const label = STATUS_LABELS[status]

            const step = (
              <label
                key={status}
                style={shape(index)}
                // No `min-w-0`: a step does not get narrower than its label. The steps have equal
                // widths when they fit; a long label (for example with a check icon) takes more.
                className={cn(
                  'relative flex h-[38px] flex-1',
                  !readOnly && !isLocked && 'cursor-pointer',
                )}
              >
                <input
                  type="radio"
                  name={name}
                  value={status}
                  checked={selected}
                  disabled={readOnly || isLocked}
                  onChange={() => onChange(status)}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    'flex size-full items-center justify-center gap-1.5 text-sm',
                    index > 0 && 'pl-2.5',
                    index < STATUSES.length - 1 && 'pr-2.5',
                    // The focus indicator is inside the shape: an outer ring is clipped.
                    'peer-focus-visible:underline peer-focus-visible:underline-offset-4 peer-focus-visible:shadow-[inset_0_0_0_2px_var(--color-ring)]',
                    stepStyle({ status, selected, done, isLocked, readOnly }),
                  )}
                >
                  {isLocked && <Lock aria-hidden className="size-3.5 shrink-0" />}
                  {done && !selected && <Check aria-hidden className="size-3.5 shrink-0" />}
                  <span className="truncate">{label}</span>
                  {isLocked && <span className="sr-only"> (Only editors can publish items)</span>}
                </span>
              </label>
            )

            if (!isLocked) return step
            return (
              <Tooltip key={status}>
                <TooltipTrigger asChild>{step}</TooltipTrigger>
                <TooltipContent side="bottom">Only editors can publish items</TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </TooltipProvider>
    </fieldset>
  )
}

function stepStyle(step: {
  status: ItemStatus
  selected: boolean
  done: boolean
  isLocked: boolean
  readOnly: boolean
}): string {
  const { status, selected, done, isLocked, readOnly } = step
  if (readOnly) {
    // design-system §3: the selected step at 50% with an ink label, the rest in disabled greys.
    return selected
      ? cn(fillReadOnly[status], 'font-semibold text-foreground')
      : 'bg-background text-disabled-foreground'
  }
  if (selected) {
    // Draft (gold) has an ink label.
    return cn(
      STATUS_FILL[status],
      'font-semibold',
      status === 'draft' ? 'text-foreground' : 'text-primary-foreground',
    )
  }
  if (isLocked) return 'bg-subtle text-muted-foreground'
  if (done) return 'bg-card text-muted-foreground'
  return 'bg-card text-foreground'
}
