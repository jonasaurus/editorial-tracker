import type { LucideIcon } from 'lucide-react'

type Props = {
  icon: LucideIcon
  /** The first sentence, in semibold. */
  title: string
  text: string
}

/** A restriction on the whole item (design-system §7): quiet fill, 3px ink left rule. */
export function Banner({ icon: Icon, title, text }: Props) {
  return (
    <div className="flex gap-3 border-l-3 border-foreground bg-subtle px-4 py-3 text-sm text-foreground">
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p>
        <span className="font-semibold">{title}</span> {text}
      </p>
    </div>
  )
}
