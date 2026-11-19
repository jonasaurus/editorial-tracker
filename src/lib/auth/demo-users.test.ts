import { describe, expect, it } from 'vitest'

import { demoLoginsFor } from './demo-users'

describe('demoLoginsFor (ROLE-4)', () => {
  it('lists the demo users in development', () => {
    const demo = demoLoginsFor('development')
    expect(demo?.users.map((user) => user.role)).toEqual(['editor', 'contributor', 'contributor'])
    expect(demo?.password).toBeTruthy()
  })

  it.each(['production', 'test', undefined])('lists nothing for NODE_ENV %s', (nodeEnv) => {
    expect(demoLoginsFor(nodeEnv)).toBeUndefined()
  })
})
