/**
 * Tiny observable state, the React counterpart of Kotlin's StateFlow and callbackFlow.
 *
 *  - `createStore`: a value screens can read and subscribe to (`useStore`).
 *  - `createLive`: a value fed by a Firestore listener that starts when the first screen
 *    uses it and stops a few seconds after the last one leaves (like WhileSubscribed(5000)).
 */
import { useEffect, useState, useSyncExternalStore } from 'react';

type Listener = () => void;

export interface Store<T> {
  get(): T;
  set(value: T): void;
  update(fn: (value: T) => T): void;
  subscribe(listener: Listener): () => void;
}

export function createStore<T>(initial: T): Store<T> {
  let value = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => value,
    set(next) {
      if (Object.is(next, value)) return;
      value = next;
      listeners.forEach((l) => l());
    },
    update(fn) { this.set(fn(value)); },
    subscribe(l) {
      listeners.add(l);
      return () => { listeners.delete(l); };
    },
  };
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

/** Starts a listener, calling `emit` with each new value. Returns a stop function. */
export type LiveStart<T> = (emit: (value: T) => void) => () => void;

export interface Live<T> extends Store<T> {
  /** Stops the listener now and resets to the initial value (used on sign-out). */
  reset(): void;
}

const STOP_DELAY_MS = 5_000;
const allLive = new Set<Live<unknown>>();

export function createLive<T>(initial: T, start: LiveStart<T>): Live<T> {
  const store = createStore<T>(initial);
  let users = 0;
  let stop: (() => void) | null = null;
  let stopTimer: ReturnType<typeof setTimeout> | null = null;

  const live: Live<T> = {
    ...store,
    subscribe(l) {
      const off = store.subscribe(l);
      users++;
      if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
      if (!stop) stop = start((v) => store.set(v));
      return () => {
        off();
        users--;
        if (users === 0) {
          stopTimer = setTimeout(() => {
            stopTimer = null;
            if (users === 0 && stop) { stop(); stop = null; store.set(initial); }
          }, STOP_DELAY_MS);
        }
      };
    },
    reset() {
      if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
      if (stop) { stop(); stop = null; }
      store.set(initial);
      // Screens still mounted (rare during sign-out) get a fresh listener for the new account.
      if (users > 0) stop = start((v) => store.set(v));
    },
  };
  allLive.add(live as Live<unknown>);
  return live;
}

/** Stops every shared listener; called when the person signs out. */
export function resetAllLive(): void {
  allLive.forEach((l) => l.reset());
}

/**
 * A listener owned by one screen (e.g. the comments of one post). Restarts when `key`
 * changes and stops when the screen unmounts.
 */
export function useLiveQuery<T>(key: string | null, initial: T, start: LiveStart<T>): T {
  const [state, setState] = useState<{ key: string | null; value: T }>({ key, value: initial });
  useEffect(() => {
    if (key == null) return;
    return start((value) => setState({ key, value }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  // Until the new key's first value arrives, show the initial value rather than the old key's.
  return state.key === key ? state.value : initial;
}

// ---------------------------------------------------------------- Clock

const minuteClock = createStore(Date.now());
let clockTimer: ReturnType<typeof setInterval> | null = null;
let clockUsers = 0;

/**
 * The current time, refreshed every minute while some screen shows it. Pages that depend
 * on "today" or "the last 24 hours" read it here so they stay right if left open.
 */
export function useNow(): number {
  return useSyncExternalStore(subscribeClock, minuteClock.get, minuteClock.get);
}

// Defined once: useSyncExternalStore re-subscribes whenever this function changes identity.
function subscribeClock(listener: () => void): () => void {
  const off = minuteClock.subscribe(listener);
  if (clockUsers++ === 0) {
    // Catch up after a quiet period, outside of React's subscribe call.
    setTimeout(() => minuteClock.set(Date.now()), 0);
    clockTimer = setInterval(() => minuteClock.set(Date.now()), 60_000);
  }
  return () => {
    off();
    if (--clockUsers === 0 && clockTimer) { clearInterval(clockTimer); clockTimer = null; }
  };
}
