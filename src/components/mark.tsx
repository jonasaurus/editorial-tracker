import type { ComponentProps } from 'react'

/**
 * The Editorial Tracker brand mark: a 3 × 4 grid with a full-height spine on the right and two
 * bars to the left. It uses `currentColor`. It is decorative by default (`aria-hidden`).
 */
export function Mark({ className, ...props }: ComponentProps<'svg'>) {
  return (
    <svg
      viewBox="0 0 3 4"
      fill="currentColor"
      aria-hidden
      focusable="false"
      className={className}
      {...props}
    >
      <path d="M2 0H3V4H0V3H2V2H0V1H2Z" />
    </svg>
  )
}
