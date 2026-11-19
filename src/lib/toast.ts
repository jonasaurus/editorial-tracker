import { toast } from 'sonner'

/**
 * Shows an error toast (ERR-1, ERR-2): what is wrong, then what to do.
 * The style is in `src/components/ui/sonner.tsx` (design-system §7).
 */
export function showError(title: string, text?: string): void {
  toast.error(title, { description: text })
}
