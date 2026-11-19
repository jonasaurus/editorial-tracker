'use client'

import { Calendar as CalendarIcon } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  type DeadlineState,
  formatDeadline,
  getDeadlineState,
  localDateToPlainDate,
  plainDateToLocalDate,
} from '@/lib/deadline'
import type { ItemStatus } from '@/lib/items'
import { cn } from '@/lib/utils'

/** The value style per state in the dialog (design-system §5). A done date stays ink. */
const tone: Record<DeadlineState, string> = {
  upcoming: 'font-medium text-foreground',
  today: 'font-semibold text-foreground',
  overdue: 'font-semibold text-destructive',
  none: 'font-normal text-disabled-foreground',
  done: 'font-normal text-foreground',
}

type Props = {
  id: string
  /** `YYYY-MM-DD` or null (ADR 0007). */
  value: string | null
  onChange: (deadline: string | null) => void
  status: ItemStatus
  archived: boolean
  /** Today as `YYYY-MM-DD` in Europe/Copenhagen (DL-1). */
  today: string
  disabled: boolean
  error?: string
  errorId?: string
}

/** The deadline field: a button that looks like an input, with a calendar (DL-4, DL-5). */
export function DeadlineField({
  id,
  value,
  onChange,
  status,
  archived,
  today,
  disabled,
  error,
  errorId,
}: Props) {
  const [open, setOpen] = useState(false)
  const state = getDeadlineState({ deadline: value, status, archived }, today)
  const selected = value === null ? undefined : plainDateToLocalDate(value)

  function select(day: string | null) {
    onChange(day)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          data-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'flex h-10 w-full items-center justify-between gap-2 border border-input bg-card px-3 text-left text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:border-ring data-invalid:border-destructive',
            disabled ? 'border-disabled-border text-disabled-foreground' : tone[state],
          )}
        >
          <span className="truncate">
            {value === null ? 'No deadline' : formatDeadline(value, state, today, 'long')}
          </span>
          <CalendarIcon
            aria-hidden
            className={cn(
              'size-4 shrink-0',
              disabled ? 'text-disabled-foreground' : 'text-muted-foreground',
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto gap-0 p-0">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? plainDateToLocalDate(today)}
          onSelect={(date) => select(date ? localDateToPlainDate(date) : null)}
          // A Danish newsroom: weeks start on Monday.
          weekStartsOn={1}
          today={plainDateToLocalDate(today)}
          className="[--cell-size:--spacing(9)]"
        />
        {value !== null && (
          <div className="border-t border-border p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => select(null)}
            >
              Remove deadline
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
