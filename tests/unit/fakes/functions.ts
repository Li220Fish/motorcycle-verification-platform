/** Stand-in for `firebase/functions` — tests register callable handlers. */
type Handler = (data: unknown) => unknown

const handlers = new Map<string, Handler>()
export const calls: { name: string; data: unknown }[] = []

export const getFunctions = () => ({ type: 'functions-stub' })
export const connectFunctionsEmulator = () => {}

export function httpsCallable(_functions: unknown, name: string) {
  return async (data?: unknown) => {
    calls.push({ name, data })
    const handler = handlers.get(name)
    if (!handler) {
      throw Object.assign(new Error(`no fake handler for callable ${name}`), {
        code: 'functions/not-found',
      })
    }
    return { data: await handler(data) }
  }
}

export function __setCallable(name: string, handler: Handler): void {
  handlers.set(name, handler)
}
export function __reset(): void {
  handlers.clear()
  calls.length = 0
}
