'use client'

import { X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'

import { Button } from '@/components/ui/button'

/** The ✕ in the dialog header. It closes like Esc (ITEM-10). */
export function CloseButton() {
  return (
    <DialogPrimitive.Close asChild>
      <Button variant="ghost" size="icon-sm" aria-label="Close" className="-mt-1.5 -mr-2 shrink-0">
        <X aria-hidden className="size-4" />
      </Button>
    </DialogPrimitive.Close>
  )
}
