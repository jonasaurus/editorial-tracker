'use client'

import { type ComponentProps, type KeyboardEvent, useLayoutEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

function supportsFieldSizing(): boolean {
  return typeof CSS !== 'undefined' && CSS.supports('field-sizing', 'content')
}

type TitleFieldProps = Omit<ComponentProps<'textarea'>, 'onChange' | 'value' | 'rows'> & {
  value: string
  onValueChange: (value: string) => void
}

/**
 * The title: a textarea that grows with its text, but keeps one line of text. A long title wraps
 * and stays fully visible. Enter saves the form (the same as Enter in an input). Line breaks from
 * paste or drop become spaces.
 */
export function TitleField({ value, onValueChange, className, ...props }: TitleFieldProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // Browsers without `field-sizing: content` (for example Firefox): set the height from the text.
  useLayoutEffect(() => {
    const field = ref.current
    if (!field || supportsFieldSizing()) return
    field.style.height = 'auto'
    // `scrollHeight` has no border. The bottom border is part of the height (`border-box`).
    field.style.height = `${field.scrollHeight + field.offsetHeight - field.clientHeight}px`
  }, [value])

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Do not touch Enter while an IME composes text: there Enter confirms the text.
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
    event.preventDefault()
    event.currentTarget.form?.requestSubmit()
  }

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(event) => onValueChange(event.target.value.replace(/\r\n|\r|\n/g, ' '))}
      onKeyDown={onKeyDown}
      className={cn('block field-sizing-content resize-none overflow-hidden', className)}
      {...props}
    />
  )
}
