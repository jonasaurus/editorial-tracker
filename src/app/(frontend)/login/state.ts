/** The result of a failed login. The form shows `error` and keeps `email`. */
export type LoginState = { email: string; error: string } | undefined
