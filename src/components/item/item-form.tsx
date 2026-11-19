'use client'

import { Archive, ArrowRight, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Dialog as DialogPrimitive } from 'radix-ui'
import {
  type ComponentProps,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'

import { createItem, setArchived, updateItem } from '@/app/(frontend)/item/actions'
import { AuthorsField } from '@/components/item/authors-field'
import { Banner } from '@/components/item/banner'
import { CloseButton } from '@/components/item/close-button'
import { ConfirmDialog } from '@/components/item/confirm-dialog'
import { DeadlineField } from '@/components/item/deadline-field'
import { StatusStepper } from '@/components/item/status-stepper'
import { usePauseLive } from '@/components/live/live-updates'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { loginPath } from '@/lib/auth/next-path'
import { getItemAbilities, type ItemAbilities } from '@/lib/item/abilities'
import {
  getKicker,
  initialValues,
  isArmed,
  isDirty,
  type ItemFormValues,
  toItemInput,
  validateValues,
} from '@/lib/item/form'
import { formatItemMeta } from '@/lib/item/meta'
import type { FieldErrors, ItemActionResult, ItemDetail, ItemDialogState } from '@/lib/item/types'
import { type ItemType, type Role, TYPE_LABELS, TYPES } from '@/lib/items'
import { showError } from '@/lib/toast'
import { cn } from '@/lib/utils'

type FormState = Exclude<ItemDialogState, { kind: 'not-found' }>

type Props = {
  state: FormState
  user: { id: number; role: Role }
  /** Today as `YYYY-MM-DD` in Europe/Copenhagen (DL-1). */
  today: string
  /** Closes at once (ITEM-2, ITEM-7). */
  onClose: () => void
  /** Closes, or asks first when the form has unsaved edits (ITEM-10). */
  onRequestClose: () => void
  onDirtyChange: (dirty: boolean) => void
}

type Confirm = 'archive' | 'unarchive' | null

/** The item form in the dialog (ITEM-3–ITEM-11, ITEM-13, ERR-3, ERR-5). */
export function ItemForm({ state, user, today, onClose, onRequestClose, onDirtyChange }: Props) {
  const router = useRouter()
  const item = state.kind === 'edit' ? state.item : null
  const abilities = getItemAbilities(user, item)
  const readOnly = abilities.mode !== 'edit'

  const [initial] = useState(() => initialValues(item, user.id))
  const [values, setValues] = useState<ItemFormValues>(initial)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [pending, startTransition] = useTransition()

  const dirty = !readOnly && isDirty(initial, values)
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])

  // LIVE-2: no live refresh while a confirm is open. A refresh would remount the form.
  const pause = usePauseLive()
  useEffect(() => {
    if (confirm) return pause('confirm')
  }, [confirm, pause])

  const id = useId()
  const ids = {
    title: `${id}-title`,
    type: `${id}-type`,
    deadline: `${id}-deadline`,
    authors: `${id}-authors`,
    error: (field: keyof FieldErrors) => `${id}-${field}-error`,
  }

  const names = useMemo(() => {
    const map = new Map<number, string>()
    for (const author of item?.authors ?? []) map.set(author.id, author.name)
    for (const option of state.users) map.set(option.id, option.name)
    return map
  }, [item, state.users])

  function set<K extends keyof ItemFormValues>(key: K, value: ItemFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
    const field: keyof FieldErrors = key === 'authorIds' ? 'authors' : key
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current))
  }

  /** Runs a Server Action and handles each result (ITEM-7, ERR-3, ERR-5). */
  function run(action: () => Promise<ItemActionResult>, failTitle: string, onOk: () => void) {
    startTransition(async () => {
      let result: ItemActionResult
      try {
        result = await action()
      } catch {
        showError(failTitle, 'The server did not respond. Try again.')
        return
      }
      if (result.ok) {
        onOk()
        return
      }
      switch (result.reason) {
        case 'session-expired':
          // ERR-5: log in again, then come back to this URL.
          router.push(loginPath(window.location.pathname + window.location.search))
          return
        case 'no-access':
          showError('You no longer have access to this item.')
          onClose()
          return
        case 'invalid':
          setErrors(result.errors)
          return
        case 'rejected':
          showError(failTitle, result.message)
          return
      }
    })
  }

  function save(event: FormEvent) {
    event.preventDefault()
    if (readOnly || pending) return
    const found = validateValues(values)
    if (Object.keys(found).length > 0) {
      setErrors(found)
      return
    }
    // A save with no changes closes without a request.
    if (item && !dirty) {
      onClose()
      return
    }
    const input = toItemInput(values)
    run(
      () => (item ? updateItem(item.id, input) : createItem(input)),
      'Item not saved',
      // ITEM-7: the action refreshes the page data, then the dialog closes.
      onClose,
    )
  }

  function changeArchived(archived: boolean) {
    if (!item) return
    run(
      () => setArchived(item.id, archived),
      'Item not changed',
      // ITEM-9: archive closes. Unarchive keeps the dialog open: the action refreshes the page,
      // and the new `updatedAt` re-keys the form, so the fields can be edited.
      archived ? onClose : () => {},
    )
  }

  const armed = isArmed({
    isNew: item === null,
    savedStatus: item?.status ?? null,
    selected: values.status,
    role: user.role,
  })

  return (
    <form onSubmit={save} noValidate className="flex flex-col">
      <div className="flex flex-col gap-6 px-7 pt-7 pb-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {getKicker(item, values.status).map((part, index) => (
                <span key={index} className={cn(part.strong && 'font-semibold text-foreground')}>
                  {part.text}
                </span>
              ))}
            </p>
            <CloseButton />
          </div>
          <DialogPrimitive.Title className="sr-only">
            {item ? item.title : 'New item'}
          </DialogPrimitive.Title>
          {item && readOnly && <ReadOnlyBanner item={item} abilities={abilities} />}
          <div>
            <TitleField
              id={ids.title}
              aria-label="Title"
              placeholder="Title"
              value={values.title}
              onValueChange={(title) => set('title', title)}
              disabled={readOnly}
              data-autofocus={item ? undefined : true}
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={errors.title ? ids.error('title') : undefined}
              className={cn(
                'w-full border-b bg-transparent pb-2 text-2xl font-semibold tracking-[-0.02em] text-foreground outline-none placeholder:text-disabled-foreground',
                'border-input focus:-mb-px focus:border-b-2 focus:border-ring',
                'disabled:border-disabled-border disabled:text-disabled-foreground aria-invalid:border-destructive',
              )}
            />
            <FieldError id={ids.error('title')} message={errors.title} />
          </div>
        </div>

        <div>
          <StatusStepper
            name={`${id}-status`}
            value={values.status}
            onChange={(status) => set('status', status)}
            locked={abilities.lockedStatuses}
            readOnly={readOnly}
          />
          <FieldError id={ids.error('status')} message={errors.status} />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 sm:gap-4">
          <div className="min-w-0">
            <FieldLabel htmlFor={ids.type}>Type</FieldLabel>
            <Select
              value={values.type}
              onValueChange={(type) => set('type', toType(type))}
              disabled={readOnly}
            >
              <SelectTrigger
                id={ids.type}
                aria-invalid={errors.type ? true : undefined}
                className="w-full bg-card px-3 text-sm disabled:border-disabled-border disabled:text-disabled-foreground disabled:opacity-100 data-[size=default]:h-10"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {TYPES.map((type) => (
                  <SelectItem key={type} value={type} className="py-1.5">
                    {TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError id={ids.error('type')} message={errors.type} />
          </div>
          <div className="min-w-0">
            <FieldLabel htmlFor={ids.deadline}>Deadline</FieldLabel>
            <DeadlineField
              id={ids.deadline}
              value={values.deadline}
              onChange={(deadline) => set('deadline', deadline)}
              // The deadline state follows the saved status: an armed Publish still shows the
              // overdue text (design-system §5).
              status={item?.status ?? values.status}
              archived={item?.archived ?? false}
              today={today}
              disabled={readOnly}
              error={errors.deadline}
              errorId={ids.error('deadline')}
            />
            <FieldError id={ids.error('deadline')} message={errors.deadline} />
          </div>
        </div>

        <div>
          <p id={ids.authors} className="mb-2 text-sm font-semibold text-foreground">
            Authors
          </p>
          <AuthorsField
            labelId={ids.authors}
            value={values.authorIds}
            onChange={(authorIds) => set('authorIds', authorIds)}
            users={state.users}
            names={names}
            lockedIds={abilities.lockedAuthorIds}
            disabled={readOnly}
            error={errors.authors}
            errorId={ids.error('authors')}
          />
          <FieldError id={ids.error('authors')} message={errors.authors} />
        </div>

        {item && <MetaLine item={item} today={today} />}
      </div>

      {/* Sticky: the buttons stay visible when the dialog scrolls (short screens). */}
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-card px-7 py-4">
        {!item && (
          <>
            <Button
              type="button"
              variant="outline"
              className="border-input bg-card"
              onClick={onRequestClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              Create item
            </Button>
          </>
        )}
        {item && abilities.mode === 'edit' && (
          <>
            {abilities.canArchive && (
              <Button
                type="button"
                variant="ghost"
                className="mr-auto -ml-4"
                disabled={pending}
                onClick={() => setConfirm('archive')}
              >
                <Archive aria-hidden />
                Archive
              </Button>
            )}
            {armed ? (
              // ITEM-5: the armed Publish button (design-system §4).
              <Button
                type="submit"
                disabled={pending}
                className="animate-publish-pulse bg-publish text-publish-foreground hover:bg-publish/90"
              >
                <ArrowRight aria-hidden />
                Publish
              </Button>
            ) : (
              <Button type="submit" disabled={pending}>
                Save changes
              </Button>
            )}
          </>
        )}
        {item && readOnly && (
          <>
            {abilities.canUnarchive ? (
              <Button type="button" disabled={pending} onClick={() => setConfirm('unarchive')}>
                Unarchive
              </Button>
            ) : (
              <Button type="button" onClick={onClose}>
                Close
              </Button>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirm === 'archive'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Archive this item?"
        text={`It becomes read-only and hidden unless “Show archived” is on.${dirty ? ' Your unsaved changes are discarded.' : ''}`}
        action="Archive"
        onConfirm={() => changeArchived(true)}
      />
      <ConfirmDialog
        open={confirm === 'unarchive'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Unarchive this item?"
        text="You can edit it again."
        action="Unarchive"
        onConfirm={() => changeArchived(false)}
      />
    </form>
  )
}

/** True where the browser sizes a textarea to its text (`field-sizing: content`). */
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
function TitleField({ value, onValueChange, className, ...props }: TitleFieldProps) {
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

/** The `Select` gives a string. Only listed types reach here. */
function toType(value: string): ItemType {
  return TYPES.find((type) => type === value) ?? 'article'
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-sm font-semibold text-foreground">
      {children}
    </label>
  )
}

/** A field error: red text under the field (design-system §7). */
function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="mt-1.5 text-sm text-destructive">
      {message}
    </p>
  )
}

/** ITEM-8, ITEM-13: the reason the item is read-only. */
function ReadOnlyBanner({ item, abilities }: { item: ItemDetail; abilities: ItemAbilities }) {
  if (!item.archived) {
    return <Banner icon={Lock} title="This item is published." text="Only editors can change it." />
  }
  return abilities.canUnarchive ? (
    <Banner
      icon={Archive}
      title="This item is archived."
      text="It is read-only and hidden unless “Show archived” is on. Unarchive to edit it again."
    />
  ) : (
    <Banner
      icon={Archive}
      title="This item is archived."
      text="Only editors can unarchive a published item."
    />
  )
}

/** The metadata line (ITEM-3, design-system §6): created, then the last event. */
function MetaLine({ item, today }: { item: ItemDetail; today: string }) {
  const meta = formatItemMeta(item, today)
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
      <p>
        {meta.creatorName ? (
          <>
            Created by <span className="font-medium text-foreground">{meta.creatorName}</span>
            {' · '}
            {meta.created}
          </>
        ) : (
          `Created ${meta.created}`
        )}
      </p>
      <p>
        {meta.event.map((part, index) => (
          <span key={index} className={cn(part.strong && 'font-medium text-foreground')}>
            {part.text}
          </span>
        ))}
      </p>
    </div>
  )
}
