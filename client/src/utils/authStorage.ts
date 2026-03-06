const TOKEN_KEY = 'token'
const REFRESH_TOKEN_KEY = 'refreshToken'
const USER_KEY = 'user'
const REMEMBER_ME_KEY = 'becms-stay-signed-in'

type StorageKind = 'local' | 'session'

const hasWindow = () => typeof window !== 'undefined'

const getStorage = (kind: StorageKind): Storage | null => {
  if (!hasWindow()) return null
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

const readFromAnyStorage = (key: string): string | null => {
  const local = getStorage('local')?.getItem(key)
  if (local) return local
  return getStorage('session')?.getItem(key) ?? null
}

const clearAuthKeys = (storage: Storage | null) => {
  if (!storage) return
  storage.removeItem(TOKEN_KEY)
  storage.removeItem(REFRESH_TOKEN_KEY)
  storage.removeItem(USER_KEY)
}

const resolveAuthStorage = (): Storage | null => {
  const local = getStorage('local')
  const session = getStorage('session')
  if (!local && !session) return null

  if (local?.getItem(TOKEN_KEY) || local?.getItem(REFRESH_TOKEN_KEY)) {
    return local
  }

  if (session?.getItem(TOKEN_KEY) || session?.getItem(REFRESH_TOKEN_KEY)) {
    return session
  }

  return getRememberPreference() ? local : session
}

export const getRememberPreference = (): boolean => {
  const value = getStorage('local')?.getItem(REMEMBER_ME_KEY)
  if (value === null || value === undefined) return true
  return value === '1'
}

export const setRememberPreference = (remember: boolean): void => {
  getStorage('local')?.setItem(REMEMBER_ME_KEY, remember ? '1' : '0')
}

export const persistAuthData = ({
  token,
  refreshToken,
  user,
  remember = getRememberPreference(),
}: {
  token?: string | null
  refreshToken?: string | null
  user?: unknown
  remember?: boolean
}): void => {
  const local = getStorage('local')
  const session = getStorage('session')
  const target = remember ? local : session
  const other = remember ? session : local

  setRememberPreference(remember)
  clearAuthKeys(other)

  if (!target) return
  if (token) target.setItem(TOKEN_KEY, token)
  if (refreshToken) target.setItem(REFRESH_TOKEN_KEY, refreshToken)
  if (user !== undefined && user !== null) target.setItem(USER_KEY, JSON.stringify(user))
}

export const setStoredToken = (token: string): void => {
  const storage = resolveAuthStorage()
  storage?.setItem(TOKEN_KEY, token)
}

export const setStoredUser = (user: unknown): void => {
  const storage = resolveAuthStorage()
  if (!storage) return
  storage.setItem(USER_KEY, JSON.stringify(user))
}

export const getAuthToken = (): string | null => readFromAnyStorage(TOKEN_KEY)

export const getRefreshToken = (): string | null => readFromAnyStorage(REFRESH_TOKEN_KEY)

export const getStoredUser = <T = unknown>(): T | null => {
  const raw = readFromAnyStorage(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export const clearAuthData = (): void => {
  clearAuthKeys(getStorage('local'))
  clearAuthKeys(getStorage('session'))
}
