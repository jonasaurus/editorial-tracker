'use client'

import { useActionState, useId, useRef } from 'react'

import { Mark } from '@/components/mark'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { DemoLogins } from '@/lib/auth/demo-users'
import { ROLE_LABELS } from '@/lib/items'

import { login } from './actions'
import type { LoginState } from './state'

type Props = {
  /** The safe path to open after login. */
  next: string
  /** Demo logins. The server sets them only in development. */
  demo?: DemoLogins
}

export function LoginForm({ next, demo }: Props) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, undefined)
  const emailId = useId()
  const passwordId = useId()
  const errorId = useId()
  const demoHeadingId = useId()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const submitRef = useRef<HTMLButtonElement>(null)

  const error = state?.error

  // Fills the fields only. The user still selects "Log in".
  function fill(email: string, password: string) {
    if (emailRef.current) emailRef.current.value = email
    if (passwordRef.current) passwordRef.current.value = password
    submitRef.current?.focus()
  }

  return (
    <main className="px-4 pt-16 pb-16 sm:pt-28">
      <div className="mx-auto w-full max-w-[400px]">
        <h1 className="mb-9 flex items-center gap-3.5 text-3xl font-semibold tracking-tight">
          <Mark className="h-7 w-auto shrink-0" />
          Editorial Tracker
        </h1>

        <form action={formAction} className="flex flex-col gap-6">
          <input type="hidden" name="next" value={next} />

          <div className="flex flex-col gap-3">
            <Label htmlFor={emailId}>Email</Label>
            <Input
              ref={emailRef}
              id={emailId}
              name="email"
              type="email"
              required
              autoComplete="username"
              defaultValue={state?.email}
              aria-describedby={error ? errorId : undefined}
              className="h-10"
            />
          </div>

          <div className="flex flex-col gap-3">
            <Label htmlFor={passwordId}>Password</Label>
            <Input
              ref={passwordRef}
              id={passwordId}
              name="password"
              type="password"
              required
              autoComplete="current-password"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className="h-10"
            />
            {error && (
              <p id={errorId} role="alert" className="-mt-1 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          <Button ref={submitRef} type="submit" disabled={pending} className="h-10 w-full">
            Log in
          </Button>
        </form>

        {demo && (
          <section
            aria-labelledby={demoHeadingId}
            className="mt-22 opacity-60 transition-opacity focus-within:opacity-100"
          >
            <div className="flex items-baseline justify-between border-b border-input pb-2">
              <h2 id={demoHeadingId} className="text-sm font-semibold">
                Demo users <span className="font-normal text-muted-foreground">· dev only</span>
              </h2>
              <p className="text-xs text-muted-foreground">Select to fill</p>
            </div>
            <ul>
              {demo.users.map((user) => (
                <li key={user.email} className="border-b border-border">
                  <button
                    type="button"
                    onClick={() => fill(user.email, demo.password)}
                    className="flex h-11 w-full items-center justify-between px-3 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {user.name}
                    <span className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  )
}
