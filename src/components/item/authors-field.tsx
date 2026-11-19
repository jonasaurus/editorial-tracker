'use client'

import { X } from 'lucide-react'
import { useRef, useState } from 'react'

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { UserOption } from '@/lib/item/types'
import { ROLE_LABELS } from '@/lib/items'
import { cn } from '@/lib/utils'

type Props = {
  labelId: string
  /** User ids in the shown order. */
  value: number[]
  onChange: (authorIds: number[]) => void
  users: UserOption[]
  /** The name of each id, also for authors that are not in `users`. */
  names: Map<number, string>
  /** Authors the user cannot remove (AUTH-1, AUTH-2). They show "(you)". */
  lockedIds: number[]
  disabled: boolean
  error?: string
  errorId?: string
}

/**
 * The authors field (ITEM-3, design-system §10): chips and a checkable menu of all users.
 * New authors are added at the end. The menu stays open after each change.
 */
export function AuthorsField({
  labelId,
  value,
  onChange,
  users,
  names,
  lockedIds,
  disabled,
  error,
  errorId,
}: Props) {
  const field = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  // The menu opens under the whole field, not under the trigger (design-system §10).
  const [offset, setOffset] = useState({ side: 4, align: 0 })

  function place(open: boolean) {
    const box = field.current?.getBoundingClientRect()
    const from = trigger.current?.getBoundingClientRect()
    if (!open || !box || !from) return
    setOffset({ side: box.bottom - from.bottom + 4, align: box.left - from.left })
  }

  function toggle(id: number, checked: boolean) {
    onChange(checked ? [...value, id] : value.filter((authorId) => authorId !== id))
  }

  return (
    <div
      ref={field}
      role="group"
      aria-labelledby={labelId}
      aria-describedby={error ? errorId : undefined}
      className={cn(
        'flex min-h-10 flex-wrap items-center gap-1.5 border bg-card px-2 py-1.5 transition-colors has-[[aria-expanded=true]]:border-ring',
        error ? 'border-destructive' : disabled ? 'border-disabled-border' : 'border-input',
      )}
    >
      {value.map((id) => {
        const name = names.get(id) ?? 'Unknown user'
        const locked = lockedIds.includes(id)
        return (
          <span
            key={id}
            className={cn(
              'inline-flex h-6.5 items-center gap-1.5 bg-subtle px-2.5 text-sm',
              disabled ? 'text-disabled-foreground' : 'text-foreground',
              !disabled && !locked && 'pr-1.5',
            )}
          >
            {locked ? `${name} (you)` : name}
            {!disabled && !locked && (
              <button
                type="button"
                aria-label={`Remove ${name}`}
                onClick={() => toggle(id, false)}
                className="inline-flex size-4 items-center justify-center outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X aria-hidden className="size-3.5" />
              </button>
            )}
          </span>
        )
      })}
      {!disabled && (
        <DropdownMenu onOpenChange={place}>
          <DropdownMenuTrigger asChild>
            <button
              ref={trigger}
              type="button"
              className="h-6.5 min-w-24 flex-1 px-1 text-left text-sm text-muted-foreground outline-none focus-visible:underline focus-visible:underline-offset-4"
            >
              Add author…
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-72" sideOffset={offset.side} alignOffset={offset.align}>
            {users.map((user) => {
              const locked = lockedIds.includes(user.id)
              return (
                <DropdownMenuCheckboxItem
                  key={user.id}
                  checked={value.includes(user.id)}
                  disabled={locked}
                  onCheckedChange={(checked) => toggle(user.id, checked === true)}
                  // The menu stays open after each change (design-system §10).
                  onSelect={(event) => event.preventDefault()}
                  // The check is on the left (design-system §10).
                  className="py-1.5 pr-2 pl-8 [&>[data-slot=dropdown-menu-checkbox-item-indicator]]:right-auto [&>[data-slot=dropdown-menu-checkbox-item-indicator]]:left-2"
                >
                  <span className="truncate">{user.name}</span>
                  <span className="ml-auto pl-3 text-xs text-muted-foreground">
                    {ROLE_LABELS[user.role]}
                  </span>
                </DropdownMenuCheckboxItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
