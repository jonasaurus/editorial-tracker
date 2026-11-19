'use client'

import { CircleAlert } from 'lucide-react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

/**
 * ERR-1: the only toast type is an error (design-system §7): ink background, 3px red left rule,
 * `CircleAlert` icon, title + text.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      // No theme switch in this app: always light.
      theme="light"
      className="toaster group"
      icons={{
        error: <CircleAlert aria-hidden className="size-4 text-destructive" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-full items-start gap-3 border-l-3 border-destructive bg-foreground px-4 py-3.5 text-primary-foreground shadow-lg',
          icon: 'mt-0.5 flex size-4 shrink-0 items-center justify-center',
          content: 'flex min-w-0 flex-col gap-1',
          title: 'text-sm font-semibold',
          description: 'text-sm text-primary-foreground/80',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
