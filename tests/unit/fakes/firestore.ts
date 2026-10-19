/**
 * In-memory stand-in for the `firebase/firestore` modular API — enough of it
 * for every service under src/ to run its real read/write logic in unit
 * tests (setup.ts swaps it in globally). Security rules are NOT modelled
 * here; those are covered separately by the emulator suite (npm run
 * test:rules).
 *
 * Test helpers: __reset(), __seed(path, data), __get(path), __paths(prefix),
 * __failNext(fnName, error).
 */

type Data = Record<string, unknown>

const store = new Map<string, Data>()
let autoId = 0
const failures = new Map<string, unknown>()

function maybeFail(fn: string): void {
  if (failures.has(fn)) {
    const err = failures.get(fn)
    failures.delete(fn)
    throw err
  }
}

// ── Timestamp ────────────────────────────────────────────────────────────
export class Timestamp {
  constructor(
    public readonly seconds: number,
    public readonly nanoseconds: number,
  ) {}
  static now(): Timestamp {
    return Timestamp.fromMillis(Date.now())
  }
  static fromMillis(ms: number): Timestamp {
    return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1e6)
  }
  static fromDate(d: Date): Timestamp {
    return Timestamp.fromMillis(d.getTime())
  }
  toMillis(): number {
    return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6)
  }
  toDate(): Date {
    return new Date(this.toMillis())
  }
  isEqual(other: Timestamp): boolean {
    return other instanceof Timestamp && other.toMillis() === this.toMillis()
  }
  valueOf(): string {
    return String(this.toMillis()).padStart(20, '0')
  }
}

// ── Sentinels ────────────────────────────────────────────────────────────
class Sentinel {
  constructor(
    public readonly kind: 'serverTimestamp' | 'increment' | 'arrayUnion' | 'arrayRemove' | 'delete',
    public readonly payload?: unknown,
  ) {}
}
export const serverTimestamp = () => new Sentinel('serverTimestamp')
export const increment = (n: number) => new Sentinel('increment', n)
export const arrayUnion = (...values: unknown[]) => new Sentinel('arrayUnion', values)
export const arrayRemove = (...values: unknown[]) => new Sentinel('arrayRemove', values)
export const deleteField = () => new Sentinel('delete')

const DOC_ID = '__name__'
export const documentId = () => DOC_ID

// ── References ───────────────────────────────────────────────────────────
interface QueryState {
  collectionPath: string | null
  groupId: string | null
  wheres: { field: string; op: string; value: unknown }[]
  orders: { field: string; dir: 'asc' | 'desc' }[]
  limit: number | null
  limitToLast: boolean
  startAfter: unknown[] | null
  startAt: unknown[] | null
  endBefore: unknown[] | null
}

export class Query {
  readonly type: string = 'query'
  constructor(
    public readonly firestore: unknown,
    public readonly _q: QueryState,
  ) {}
}

export class CollectionReference extends Query {
  override readonly type = 'collection'
  constructor(
    firestore: unknown,
    public readonly path: string,
  ) {
    super(firestore, emptyQuery(path, null))
  }
  get id(): string {
    return this.path.split('/').pop()!
  }
  get parent(): DocumentReference | null {
    const segs = this.path.split('/')
    return segs.length > 1
      ? new DocumentReference(this.firestore, segs.slice(0, -1).join('/'))
      : null
  }
}

export class DocumentReference {
  readonly type = 'document'
  constructor(
    public readonly firestore: unknown,
    public readonly path: string,
  ) {}
  get id(): string {
    return this.path.split('/').pop()!
  }
  get parent(): CollectionReference {
    return new CollectionReference(this.firestore, this.path.split('/').slice(0, -1).join('/'))
  }
  withConverter(): this {
    return this
  }
}

function emptyQuery(collectionPath: string | null, groupId: string | null): QueryState {
  return {
    collectionPath,
    groupId,
    wheres: [],
    orders: [],
    limit: null,
    limitToLast: false,
    startAfter: null,
    startAt: null,
    endBefore: null,
  }
}

function joinPath(base: unknown, segments: string[]): string {
  const prefix =
    base instanceof DocumentReference || base instanceof CollectionReference ? base.path : ''
  return [prefix, ...segments].filter(Boolean).join('/')
}

function newId(): string {
  autoId += 1
  return `auto${String(autoId).padStart(6, '0')}`
}

export function collection(base: unknown, ...segments: string[]): CollectionReference {
  return new CollectionReference(firestoreOf(base), joinPath(base, segments))
}

export function collectionGroup(db: unknown, groupId: string): Query {
  return new Query(db, emptyQuery(null, groupId))
}

export function doc(base: unknown, ...segments: string[]): DocumentReference {
  if (base instanceof CollectionReference && segments.length === 0) {
    return new DocumentReference(base.firestore, `${base.path}/${newId()}`)
  }
  return new DocumentReference(firestoreOf(base), joinPath(base, segments))
}

function firestoreOf(base: unknown): unknown {
  return base instanceof DocumentReference || base instanceof Query ? base.firestore : base
}

export const getFirestore = () => ({ type: 'firestore-stub' })

// ── Query constraints ────────────────────────────────────────────────────
type Constraint = (q: QueryState) => void

export const where =
  (field: string, op: string, value: unknown): Constraint =>
  (q) =>
    q.wheres.push({ field, op, value })
export const orderBy =
  (field: string, dir: 'asc' | 'desc' = 'asc'): Constraint =>
  (q) =>
    q.orders.push({ field, dir })
export const limit =
  (n: number): Constraint =>
  (q) => {
    q.limit = n
    q.limitToLast = false
  }
export const limitToLast =
  (n: number): Constraint =>
  (q) => {
    q.limit = n
    q.limitToLast = true
  }
export const startAfter =
  (...values: unknown[]): Constraint =>
  (q) => {
    q.startAfter = values
  }
export const startAt =
  (...values: unknown[]): Constraint =>
  (q) => {
    q.startAt = values
  }
export const endBefore =
  (...values: unknown[]): Constraint =>
  (q) => {
    q.endBefore = values
  }

export function query(base: Query, ...constraints: Constraint[]): Query {
  const next: QueryState = structuredCloneQuery(base._q)
  for (const c of constraints) c(next)
  return new Query(base.firestore, next)
}

function structuredCloneQuery(q: QueryState): QueryState {
  return {
    ...q,
    wheres: [...q.wheres],
    orders: [...q.orders],
  }
}

// ── Snapshots ────────────────────────────────────────────────────────────
export class DocumentSnapshot {
  constructor(
    public readonly ref: DocumentReference,
    private readonly _data: Data | undefined,
  ) {}
  get id(): string {
    return this.ref.id
  }
  exists(): boolean {
    return this._data !== undefined
  }
  data(): Data | undefined {
    return this._data === undefined ? undefined : clone(this._data)
  }
  get(field: string): unknown {
    return this._data === undefined ? undefined : getField(this._data, field)
  }
  readonly metadata = { hasPendingWrites: false, fromCache: false }
}
export class QueryDocumentSnapshot extends DocumentSnapshot {
  override data(): Data {
    return super.data()!
  }
}

export class QuerySnapshot {
  constructor(
    public readonly query: Query,
    public readonly docs: QueryDocumentSnapshot[],
    private readonly previous: Set<string> | null = null,
  ) {}
  get size(): number {
    return this.docs.length
  }
  get empty(): boolean {
    return this.docs.length === 0
  }
  forEach(cb: (d: QueryDocumentSnapshot) => void): void {
    this.docs.forEach(cb)
  }
  docChanges(): { type: 'added' | 'modified' | 'removed'; doc: QueryDocumentSnapshot }[] {
    return this.docs
      .filter((d) => !this.previous || !this.previous.has(d.ref.path))
      .map((d) => ({ type: 'added' as const, doc: d }))
  }
  readonly metadata = { hasPendingWrites: false, fromCache: false }
}

// ── Value helpers ────────────────────────────────────────────────────────
function clone<T>(value: T): T {
  if (value instanceof Timestamp || value instanceof DocumentReference) return value
  if (Array.isArray(value)) return value.map(clone) as T
  if (value && typeof value === 'object') {
    const out: Data = {}
    for (const [k, v] of Object.entries(value)) out[k] = clone(v)
    return out as T
  }
  return value
}

function getField(data: Data, field: string): unknown {
  let cur: unknown = data
  for (const seg of field.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Data)[seg]
  }
  return cur
}

function setField(data: Data, field: string, value: unknown): void {
  const segs = field.split('.')
  let cur = data
  for (const seg of segs.slice(0, -1)) {
    if (cur[seg] == null || typeof cur[seg] !== 'object' || Array.isArray(cur[seg])) cur[seg] = {}
    cur = cur[seg] as Data
  }
  const last = segs[segs.length - 1]
  const resolved = resolveSentinel(cur[last], value)
  if (resolved === DELETE) delete cur[last]
  else cur[last] = resolved
}

const DELETE = Symbol('delete')

function resolveSentinel(existing: unknown, value: unknown): unknown {
  if (value instanceof Sentinel) {
    switch (value.kind) {
      case 'serverTimestamp':
        return Timestamp.now()
      case 'increment':
        return (typeof existing === 'number' ? existing : 0) + (value.payload as number)
      case 'arrayUnion': {
        const arr = Array.isArray(existing) ? [...existing] : []
        for (const v of value.payload as unknown[]) if (!arr.some((a) => equal(a, v))) arr.push(v)
        return arr
      }
      case 'arrayRemove': {
        const arr = Array.isArray(existing) ? existing : []
        return arr.filter((a) => !(value.payload as unknown[]).some((v) => equal(a, v)))
      }
      case 'delete':
        return DELETE
    }
  }
  if (value && typeof value === 'object' && !Array.isArray(value) && !isLeaf(value)) {
    const base: Data =
      existing && typeof existing === 'object' && !Array.isArray(existing) ? {} : {}
    for (const [k, v] of Object.entries(value as Data)) {
      const r = resolveSentinel(undefined, v)
      if (r !== DELETE) base[k] = r
    }
    return base
  }
  return clone(value)
}

function isLeaf(v: object): boolean {
  return v instanceof Timestamp || v instanceof DocumentReference
}

function comparable(v: unknown): unknown {
  if (v instanceof Timestamp) return v.toMillis()
  if (v instanceof Date) return v.getTime()
  if (v instanceof DocumentReference) return v.path
  return v
}

function equal(a: unknown, b: unknown): boolean {
  return JSON.stringify(comparable(a)) === JSON.stringify(comparable(b))
}

function compare(a: unknown, b: unknown): number {
  const x = comparable(a)
  const y = comparable(b)
  if (x === y) return 0
  if (x === undefined || x === null) return -1
  if (y === undefined || y === null) return 1
  return (x as number) < (y as number) ? -1 : 1
}

function matches(path: string, data: Data, w: QueryState['wheres'][number]): boolean {
  const actual = w.field === DOC_ID ? path.split('/').pop() : getField(data, w.field)
  const expected = w.field === DOC_ID && w.value instanceof DocumentReference ? w.value.id : w.value
  switch (w.op) {
    case '==':
      return equal(actual, expected)
    case '!=':
      return actual !== undefined && !equal(actual, expected)
    case '<':
      return actual !== undefined && compare(actual, expected) < 0
    case '<=':
      return actual !== undefined && compare(actual, expected) <= 0
    case '>':
      return actual !== undefined && compare(actual, expected) > 0
    case '>=':
      return actual !== undefined && compare(actual, expected) >= 0
    case 'in':
      return (expected as unknown[]).some((v) => equal(actual, v))
    case 'not-in':
      return actual !== undefined && !(expected as unknown[]).some((v) => equal(actual, v))
    case 'array-contains':
      return Array.isArray(actual) && actual.some((v) => equal(v, expected))
    case 'array-contains-any':
      return (
        Array.isArray(actual) &&
        actual.some((v) => (expected as unknown[]).some((e) => equal(v, e)))
      )
    default:
      throw new Error(`fake firestore: unsupported operator ${w.op}`)
  }
}

function cursorValues(cursor: unknown[], orders: QueryState['orders']): unknown[] {
  if (cursor.length === 1 && cursor[0] instanceof DocumentSnapshot) {
    const snap = cursor[0]
    return orders.map((o) => (o.field === DOC_ID ? snap.id : snap.get(o.field)))
  }
  return cursor
}

function runQuery(q: QueryState): [string, Data][] {
  let rows = [...store.entries()].filter(([path]) => {
    const segs = path.split('/')
    if (q.groupId) return segs.length >= 2 && segs[segs.length - 2] === q.groupId
    const parent = segs.slice(0, -1).join('/')
    return parent === q.collectionPath
  })
  rows = rows.filter(([path, data]) => q.wheres.every((w) => matches(path, data, w)))
  // Firestore excludes documents missing an orderBy field.
  rows = rows.filter(([, data]) =>
    q.orders.every((o) => o.field === DOC_ID || getField(data, o.field) !== undefined),
  )
  const keyOf = (path: string, data: Data, field: string) =>
    field === DOC_ID ? path.split('/').pop() : getField(data, field)
  rows.sort(([pa, a], [pb, b]) => {
    for (const o of q.orders) {
      const c = compare(keyOf(pa, a, o.field), keyOf(pb, b, o.field))
      if (c !== 0) return o.dir === 'desc' ? -c : c
    }
    return pa < pb ? -1 : pa > pb ? 1 : 0
  })
  const cmpCursor = (path: string, data: Data, cursor: unknown[]): number => {
    const values = cursorValues(cursor, q.orders)
    for (const [i, o] of q.orders.entries()) {
      if (i >= values.length) break
      const c = compare(keyOf(path, data, o.field), values[i])
      if (c !== 0) return o.dir === 'desc' ? -c : c
    }
    return 0
  }
  if (q.startAfter) rows = rows.filter(([p, d]) => cmpCursor(p, d, q.startAfter!) > 0)
  if (q.startAt) rows = rows.filter(([p, d]) => cmpCursor(p, d, q.startAt!) >= 0)
  if (q.endBefore) rows = rows.filter(([p, d]) => cmpCursor(p, d, q.endBefore!) < 0)
  if (q.limit != null) rows = q.limitToLast ? rows.slice(-q.limit) : rows.slice(0, q.limit)
  return rows
}

// ── Listeners ────────────────────────────────────────────────────────────
type Listener = () => void
const listeners = new Set<Listener>()
function notify(): void {
  for (const l of [...listeners]) l()
}

// ── Reads / writes ───────────────────────────────────────────────────────
function snapshotOf(ref: DocumentReference): DocumentSnapshot {
  const data = store.get(ref.path)
  return new DocumentSnapshot(ref, data === undefined ? undefined : clone(data))
}

function querySnapshotOf(q: Query, previous: Set<string> | null = null): QuerySnapshot {
  const rows = runQuery(q._q)
  return new QuerySnapshot(
    q,
    rows.map(
      ([path, data]) =>
        new QueryDocumentSnapshot(new DocumentReference(q.firestore, path), clone(data)),
    ),
    previous,
  )
}

export async function getDoc(ref: DocumentReference): Promise<DocumentSnapshot> {
  maybeFail('getDoc')
  return snapshotOf(ref)
}
export const getDocFromServer = getDoc
export const getDocFromCache = getDoc

export async function getDocs(q: Query): Promise<QuerySnapshot> {
  maybeFail('getDocs')
  return querySnapshotOf(q)
}
export const getDocsFromServer = getDocs

export async function getCountFromServer(q: Query) {
  const n = runQuery(q._q).length
  return { data: () => ({ count: n }) }
}

function applySet(ref: DocumentReference, data: Data, options?: { merge?: boolean }): void {
  const existing = store.get(ref.path)
  const base: Data = options?.merge && existing ? clone(existing) : {}
  for (const [k, v] of Object.entries(data)) {
    if (
      options?.merge &&
      v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      !(v instanceof Sentinel) &&
      !isLeaf(v)
    ) {
      // merge nested maps field-by-field
      for (const [nk, nv] of flatten(v as Data, k)) setField(base, nk, nv)
    } else {
      setField(base, k, v)
    }
  }
  store.set(ref.path, base)
}

function flatten(obj: Data, prefix: string): [string, unknown][] {
  const out: [string, unknown][] = []
  for (const [k, v] of Object.entries(obj)) {
    const key = `${prefix}.${k}`
    if (
      v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      !(v instanceof Sentinel) &&
      !isLeaf(v) &&
      Object.keys(v).length > 0
    )
      out.push(...flatten(v as Data, key))
    else out.push([key, v])
  }
  return out
}

function notFound(path: string): Error {
  return Object.assign(new Error(`No document to update: ${path}`), { code: 'not-found' })
}

function applyUpdate(ref: DocumentReference, data: Data | string, ...rest: unknown[]): void {
  const existing = store.get(ref.path)
  if (!existing) throw notFound(ref.path)
  const next = clone(existing)
  const pairs: [string, unknown][] =
    typeof data === 'string'
      ? [[data, rest[0]], ...chunkPairs(rest.slice(1))]
      : Object.entries(data)
  for (const [k, v] of pairs) setField(next, k, v)
  store.set(ref.path, next)
}

function chunkPairs(arr: unknown[]): [string, unknown][] {
  const out: [string, unknown][] = []
  for (let i = 0; i + 1 < arr.length; i += 2) out.push([arr[i] as string, arr[i + 1]])
  return out
}

export async function setDoc(
  ref: DocumentReference,
  data: Data,
  options?: { merge?: boolean },
): Promise<void> {
  maybeFail('setDoc')
  applySet(ref, data, options)
  notify()
}

export async function addDoc(col: CollectionReference, data: Data): Promise<DocumentReference> {
  maybeFail('addDoc')
  const ref = doc(col)
  applySet(ref, data)
  notify()
  return ref
}

export async function updateDoc(
  ref: DocumentReference,
  data: Data | string,
  ...rest: unknown[]
): Promise<void> {
  maybeFail('updateDoc')
  applyUpdate(ref, data, ...rest)
  notify()
}

export async function deleteDoc(ref: DocumentReference): Promise<void> {
  maybeFail('deleteDoc')
  store.delete(ref.path)
  notify()
}

export function writeBatch() {
  const ops: (() => void)[] = []
  const batch = {
    set(ref: DocumentReference, data: Data, options?: { merge?: boolean }) {
      ops.push(() => applySet(ref, data, options))
      return batch
    },
    update(ref: DocumentReference, data: Data | string, ...rest: unknown[]) {
      ops.push(() => applyUpdate(ref, data, ...rest))
      return batch
    },
    delete(ref: DocumentReference) {
      ops.push(() => store.delete(ref.path))
      return batch
    },
    async commit() {
      maybeFail('writeBatch.commit')
      const snapshot = new Map(store)
      try {
        for (const op of ops) op()
      } catch (err) {
        store.clear()
        for (const [k, v] of snapshot) store.set(k, v)
        throw err
      }
      notify()
    },
  }
  return batch
}

export async function runTransaction<T>(
  _db: unknown,
  fn: (tx: {
    get(ref: DocumentReference): Promise<DocumentSnapshot>
    set(ref: DocumentReference, data: Data, options?: { merge?: boolean }): unknown
    update(ref: DocumentReference, data: Data | string, ...rest: unknown[]): unknown
    delete(ref: DocumentReference): unknown
  }) => Promise<T>,
): Promise<T> {
  maybeFail('runTransaction')
  const snapshot = new Map(store)
  const ops: (() => void)[] = []
  const tx = {
    get: async (ref: DocumentReference) => snapshotOf(ref),
    set: (ref: DocumentReference, data: Data, options?: { merge?: boolean }) => {
      ops.push(() => applySet(ref, data, options))
      return tx
    },
    update: (ref: DocumentReference, data: Data | string, ...rest: unknown[]) => {
      ops.push(() => applyUpdate(ref, data, ...rest))
      return tx
    },
    delete: (ref: DocumentReference) => {
      ops.push(() => store.delete(ref.path))
      return tx
    },
  }
  try {
    const result = await fn(tx)
    for (const op of ops) op()
    notify()
    return result
  } catch (err) {
    store.clear()
    for (const [k, v] of snapshot) store.set(k, v)
    throw err
  }
}

type SnapshotCallback<S> =
  ((snap: S) => void) | { next?: (snap: S) => void; error?: (e: unknown) => void }

export function onSnapshot(target: DocumentReference | Query, ...args: unknown[]): () => void {
  const fns = args.filter(
    (a) => typeof a === 'function' || (a && typeof a === 'object' && ('next' in a || 'error' in a)),
  )
  const first = fns[0] as SnapshotCallback<unknown>
  const next = typeof first === 'function' ? first : first?.next
  const error =
    typeof first === 'function' ? (fns[1] as ((e: unknown) => void) | undefined) : first?.error
  if (failures.has('onSnapshot')) {
    const err = failures.get('onSnapshot')
    failures.delete('onSnapshot')
    queueMicrotask(() => error?.(err))
    return () => {}
  }
  let previous: Set<string> | null = null
  let lastKey: string | null = null
  const emit = () => {
    if (target instanceof DocumentReference) {
      const snap = snapshotOf(target)
      const key = JSON.stringify(comparable(store.get(target.path) ?? null), replacer)
      if (key === lastKey) return
      lastKey = key
      next?.(snap)
    } else {
      const snap = querySnapshotOf(target, previous)
      const key = JSON.stringify(
        snap.docs.map((d) => [d.ref.path, store.get(d.ref.path)]),
        replacer,
      )
      if (key === lastKey) return
      lastKey = key
      previous = new Set(snap.docs.map((d) => d.ref.path))
      next?.(snap)
    }
  }
  listeners.add(emit)
  queueMicrotask(emit)
  return () => {
    listeners.delete(emit)
  }
}

function replacer(_k: string, v: unknown): unknown {
  return v instanceof Timestamp
    ? { __ts: v.toMillis() }
    : v instanceof DocumentReference
      ? v.path
      : v
}

// Misc exports some modules touch at import time.
export const connectFirestoreEmulator = () => {}
export const initializeFirestore = getFirestore
export const persistentLocalCache = () => ({})
export const persistentMultipleTabManager = () => ({})
export const enableIndexedDbPersistence = async () => {}

// ── Test helpers ─────────────────────────────────────────────────────────
export function __reset(): void {
  store.clear()
  listeners.clear()
  failures.clear()
  autoId = 0
}
export function __seed(path: string, data: Data): void {
  applySet(new DocumentReference(null, path), data)
  notify()
}
export function __get(path: string): Data | undefined {
  const d = store.get(path)
  return d === undefined ? undefined : clone(d)
}
export function __paths(prefix = ''): string[] {
  return [...store.keys()].filter((p) => p.startsWith(prefix)).sort()
}
export function __failNext(
  fn: string,
  error: unknown = Object.assign(new Error('permission-denied'), { code: 'permission-denied' }),
): void {
  failures.set(fn, error)
}
