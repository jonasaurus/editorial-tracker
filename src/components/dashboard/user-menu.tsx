'use client'

import { ArrowUpRight, ChevronDown, User } from 'lucide-react'
import { useTransition } from 'react'

import { logout } from '@/app/(frontend)/login/actions'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ROLE_LABELS, type Role } from '@/lib/items'

type Props = {
  name: string
  role: Role
  /** True when the user can open the Admin panel (ROLE-3). The server decides. */
  canAccessAdmin: boolean
}

/** The user menu: name and role, "Admin panel", "Log out" (DASH-6). */
export function UserMenu({ name, role, canAccessAdmin }: Props) {
  const [pending, startTransition] = useTransition()

  // The action runs in a transition, not in a form: the menu content can unmount before a submit.
  function logOut() {
    startTransition(async () => {
      await logout()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="User menu" className="gap-1 px-2">
          <User aria-hidden className="size-4" />
          <ChevronDown aria-hidden className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel className="flex items-baseline justify-between gap-3 px-2 py-2">
          <span className="truncate text-sm font-semibold text-foreground">{name}</span>
          <span className="text-xs font-normal text-muted-foreground">{ROLE_LABELS[role]}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {canAccessAdmin && (
          <DropdownMenuItem asChild className="px-2 py-1.5">
            <a href="/admin" target="_blank" rel="noopener noreferrer">
              Admin panel
              <ArrowUpRight aria-hidden className="ml-auto size-3.5 text-muted-foreground" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem disabled={pending} onSelect={logOut} className="px-2 py-1.5">
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
