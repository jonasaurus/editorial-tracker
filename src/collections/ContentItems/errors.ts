import { APIError } from 'payload'

import { RULE_IDS, type RuleId } from './rules'

/**
 * A rejected item change: 403, the message, and the rule id in `data`.
 * The name is explicit: the production build minifies class names, and
 * Payload hides the message of an error without a name or data.
 */
export class ItemRuleError extends APIError<{ rule: RuleId }> {
  constructor(rule: RuleId, message: string) {
    super(message, 403, { rule })
    this.name = 'ItemRuleError'
  }
}

/**
 * True for an `ItemRuleError`. Checks the status and the rule id, not the class name.
 * Payload's own `Forbidden` has no `data`, so the two do not mix.
 */
export function isItemRuleError(error: unknown): error is APIError<{ rule: RuleId }> {
  if (!(error instanceof APIError) || error.status !== 403) return false
  const data: unknown = error.data
  return (
    typeof data === 'object' &&
    data !== null &&
    'rule' in data &&
    RULE_IDS.some((rule) => rule === data.rule)
  )
}
