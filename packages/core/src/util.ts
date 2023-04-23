import { env } from 'node:process'

export function isTestEnv(): boolean {
  return env.NODE_ENV === 'test'
}
