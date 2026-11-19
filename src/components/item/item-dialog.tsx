'use client'

import { useRouter } from 'next/navigation'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { useCallback, useRef, useState } from 'react'

import { ConfirmDialog } from '@/components/item/confirm-dialog'
import { ItemForm } from '@/components/item/item-form'
import { NotFoundContent } from '@/components/item/not-found-dialog'
import type { ItemDialogState } from '@/lib/item/types'
import type { Role } from '@/lib/items'
import { cn } from '@/lib/utils'

type Props = {
  state: ItemDialogState
  /** The dashboard URL without `item` (ITEM-2). */
  closeHref: string
  /** Today as `YYYY-MM-DD` in Europe/Copenhagen (DL-1). */
  today: string
  user: { id: number; role: Role }
}

/**
 * The item dialog over the dashboard (ITEM-1, ITEM-2, ITEM-10, ITEM-12, ADR 0004).
 * The server renders it for a cold load: the content has no portal, so it is in the server HTML.
 * Close hides the dialog at once, then replaces the URL. The server render then removes it.
 */
export function ItemDialog({ state, closeHref, today, user }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const dirty = useRef(false)

  // ITEM-2: close with `replace`, and keep the filters.
  const close = useCallback(() => {
    setOpen(false)
    router.replace(closeHref, { scroll: false })
  }, [router, closeHref])

  // ITEM-10: Esc, ✕, Cancel and a click outside ask first when the form has unsaved edits.
  const requestClose = useCallback(() => {
    if (dirty.current) setConfirmDiscard(true)
    else close()
  }, [close])

  const onDirtyChange = useCallback((value: boolean) => {
    dirty.current = value
  }, [])

  const isForm = state.kind !== 'not-found'
  const opener = state.kind === 'edit' ? String(state.item.id) : state.kind

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && requestClose()}>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/50 duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
      <DialogPrimitive.Content
        // The form has no description: the fields speak for themselves.
        {...(isForm ? { 'aria-describedby': undefined } : {})}
        onOpenAutoFocus={(event) => {
          // ITEM-11: a new item starts in the title. Else the dialog itself gets the focus, so
          // the ✕ does not show a focus ring on open.
          const content = event.currentTarget
          if (!(content instanceof HTMLElement)) return
          event.preventDefault()
          ;(content.querySelector<HTMLElement>('[data-autofocus]') ?? content).focus()
        }}
        onCloseAutoFocus={(event) => {
          // The opener is a link that the page renders again. Focus it if it is there.
          event.preventDefault()
          document.querySelector<HTMLElement>(`[data-item-link="${opener}"]`)?.focus()
        }}
        className={cn(
          'fixed top-4 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 flex-col overflow-y-auto bg-card text-sm text-foreground shadow-xl outline-none md:max-h-[calc(100dvh-10rem)]',
          'duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
          // Design 03e: the small message dialog sits lower.
          isForm ? 'max-w-dialog md:top-20' : 'max-w-dialog-sm md:top-50',
        )}
      >
        {state.kind === 'not-found' ? (
          <NotFoundContent onClose={close} />
        ) : (
          <ItemForm
            key={state.kind === 'edit' ? state.item.updatedAt : 'new'}
            state={state}
            user={user}
            today={today}
            onClose={close}
            onRequestClose={requestClose}
            onDirtyChange={onDirtyChange}
          />
        )}
      </DialogPrimitive.Content>
      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard your changes?"
        text="Your changes to this item are not saved."
        action="Discard changes"
        onConfirm={close}
      />
    </DialogPrimitive.Root>
  )
}
