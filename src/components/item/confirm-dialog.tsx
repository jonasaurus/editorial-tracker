'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  text: string
  /** The confirm button, a verb (design-system §8). */
  action: string
  onConfirm: () => void
}

/** A confirmation over the item dialog (ITEM-9, ITEM-10). 520px. */
export function ConfirmDialog({ open, onOpenChange, title, text, action, onConfirm }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[min(var(--container-dialog-sm),calc(100%-2rem))] gap-0 bg-card p-0 shadow-xl ring-0 data-[size=default]:max-w-[min(var(--container-dialog-sm),calc(100%-2rem))] data-[size=default]:sm:max-w-[min(var(--container-dialog-sm),calc(100%-2rem))]">
        <AlertDialogHeader className="place-items-start gap-2 px-7 pt-7 pb-6 text-left">
          <AlertDialogTitle className="text-lg font-semibold text-foreground">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            {text}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mx-0 mb-0 flex-row justify-end gap-2 border-t border-border bg-transparent px-7 py-4">
          <AlertDialogCancel className="border-input bg-card">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{action}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
