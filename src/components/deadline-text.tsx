import type { BoardItem } from '@/lib/dashboard/board'
import {
  formatDeadline,
  getDeadlineState,
  type DeadlineState,
  type DeadlineVariant,
  type PlainDate,
} from '@/lib/deadline'
import { cn } from '@/lib/utils'

/** The text style of each deadline state (design-system §5). */
const tone: Record<DeadlineState, string> = {
  upcoming: 'font-medium text-foreground',
  today: 'font-semibold text-foreground',
  overdue: 'font-semibold text-destructive',
  none: 'font-normal text-muted-foreground',
  done: 'font-normal text-muted-foreground',
}

type Props = {
  item: Pick<BoardItem, 'deadline' | 'status' | 'archived'>
  today: PlainDate
  variant: DeadlineVariant
  className?: string
}

/** The deadline of an item, with the text and style of its state (DL-2, DL-4). */
export function DeadlineText({ item, today, variant, className }: Props) {
  const state = getDeadlineState(item, today)
  const text = formatDeadline(item.deadline, state, today, variant)
  const style = cn(tone[state], className)

  if (item.deadline === null) return <span className={style}>{text}</span>
  return (
    <time dateTime={item.deadline} className={style}>
      {text}
    </time>
  )
}
