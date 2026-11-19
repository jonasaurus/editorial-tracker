'use client'

import { ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useOptimistic, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type FilterOption = {
  value: string
  label: string
  /** The dashboard URL with this option set. The server builds it. */
  href: string
}

type Props = {
  /** The filter name, for example "Type". */
  label: string
  /** The options. The first option is "All" with the value `all`. */
  options: FilterOption[]
  value: string
}

/** A Type or Author filter (DASH-2). A change opens the URL of the option. */
export function FilterMenu({ label, options, value }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  // The new value shows at once, before the server sends the new page.
  const [shown, setShown] = useOptimistic(value)
  const current = options.find((option) => option.value === shown)

  function select(next: string) {
    const option = options.find((candidate) => candidate.value === next)
    if (!option || next === shown) return
    startTransition(() => {
      setShown(next)
      router.push(option.href, { scroll: false })
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-sm font-normal">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-semibold text-foreground">{current?.label}</span>
          <ChevronDown aria-hidden className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-auto min-w-40">
        <DropdownMenuRadioGroup value={shown} onValueChange={select}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value} className="py-1.5">
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
