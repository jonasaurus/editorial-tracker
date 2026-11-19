'use client'

import { CircleAlert } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'

import { CloseButton } from '@/components/item/close-button'
import { Button } from '@/components/ui/button'

/**
 * ITEM-12 (design 03e): one message for a missing id, a malformed id and an item without
 * access. The same text for all three, so the dialog does not tell which items exist.
 */
export function NotFoundContent({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="px-7 pt-7 pb-6">
        <div className="flex items-start justify-between gap-4">
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CircleAlert aria-hidden className="size-4" />
            Item not found
          </p>
          <CloseButton />
        </div>
        <DialogPrimitive.Title className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-foreground">
          This item does not exist, or you do not have access to it.
        </DialogPrimitive.Title>
        <DialogPrimitive.Description className="mt-3 text-sm text-muted-foreground">
          Check the link, or ask an editor to add you as an author.
        </DialogPrimitive.Description>
      </div>
      <div className="flex justify-end border-t border-border px-7 py-4">
        <Button type="button" onClick={onClose}>
          Close
        </Button>
      </div>
    </>
  )
}
