'use client'

import { useRouter } from 'next/navigation'
import { useId, useOptimistic, useTransition } from 'react'

import { Checkbox } from '@/components/ui/checkbox'

type Props = {
  checked: boolean
  /** The dashboard URL with the value toggled. The server builds it. */
  href: string
}

/** The "Show archived" filter (DASH-5). A change opens `href`. */
export function ShowArchived({ checked, href }: Props) {
  const id = useId()
  const router = useRouter()
  const [, startTransition] = useTransition()
  // The new value shows at once, before the server sends the new page.
  const [shown, setShown] = useOptimistic(checked)

  function toggle() {
    startTransition(() => {
      setShown(!checked)
      router.push(href, { scroll: false })
    })
  }

  return (
    <div className="flex h-8 items-center gap-2 px-1">
      <Checkbox id={id} checked={shown} onCheckedChange={toggle} />
      <label htmlFor={id} className="text-sm text-foreground select-none">
        Show archived
      </label>
    </div>
  )
}
