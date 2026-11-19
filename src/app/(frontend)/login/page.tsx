import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { demoLoginsFor } from '@/lib/auth/demo-users'
import { safeNextPath } from '@/lib/auth/next-path'
import { getUser } from '@/lib/auth/session'

import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Log in · Editorial Tracker',
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function LoginPage({ searchParams }: Props) {
  // LOGIN-3: a logged-in user goes to the dashboard. This is the real session check, so an
  // expired cookie does not cause a redirect loop.
  if (await getUser()) redirect('/')

  const { next } = await searchParams
  return <LoginForm next={safeNextPath(next)} demo={demoLoginsFor(process.env.NODE_ENV)} />
}
