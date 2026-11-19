import { Button } from '@/components/ui/button'
import { toPathWithQuery } from '@/lib/auth/next-path'
import { requireUser } from '@/lib/auth/session'

import { logout } from './login/actions'

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const roleLabel = { editor: 'Editor', contributor: 'Contributor' } as const

export default async function HomePage({ searchParams }: Props) {
  const user = await requireUser(toPathWithQuery('/', await searchParams))

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Editorial Tracker</h1>
      <p className="mt-2 text-muted-foreground">
        Logged in as {user.name} · {roleLabel[user.role]}
      </p>
      <p className="mt-2 text-muted-foreground">The dashboard comes in a later session.</p>
      <form action={logout} className="mt-6">
        <Button type="submit" variant="outline" size="sm">
          Log out
        </Button>
      </form>
    </main>
  )
}
