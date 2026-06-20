/**
 * Model repository (C9, F7) — where the working document is persisted locally.
 *
 * IndexedDB (via `idb`) sits behind a tiny `ModelRepository` interface so the
 * storage engine is no longer a hard-to-reverse choice (T4): a future sync
 * backend (PouchDB, an API) is a new implementation behind the same two methods,
 * with no caller change. Phase 1 is single-document, so the current Model is
 * stored under one fixed key; a model list (C12) would key by `model.id` instead.
 */
import { type IDBPDatabase, openDB } from "idb"
import type { Model } from "./types"

export interface ModelRepository {
  /** Persist the current Model, overwriting the previous autosave. */
  save(model: Model): Promise<void>
  /** Load the autosaved Model, or null if nothing has been saved yet. */
  load(): Promise<Model | null>
}

const DB_NAME = "meadows"
const DB_VERSION = 1
const STORE = "models"
const CURRENT_KEY = "current"

let dbPromise: Promise<IDBPDatabase> | null = null

function db(): Promise<IDBPDatabase> {
  // Memoise the open so we pay the handshake once, not per save.
  dbPromise ??= openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE)
    },
  })
  return dbPromise
}

/** The default IndexedDB-backed repository used by the app. */
export function createRepository(): ModelRepository {
  return {
    async save(model: Model): Promise<void> {
      await (await db()).put(STORE, model, CURRENT_KEY)
    },
    async load(): Promise<Model | null> {
      const model = await (await db()).get(STORE, CURRENT_KEY)
      return (model as Model | undefined) ?? null
    },
  }
}
