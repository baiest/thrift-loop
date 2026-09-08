export interface KeyedMutex {
  runExclusive<T>(key: string, task: () => Promise<T>): Promise<T>;
}

/**
 * An in-process mutex keyed by string. All tasks queued for the same key run
 * strictly one after another; tasks on different keys run concurrently.
 *
 * Only serializes within a single Node process — it does not protect against
 * concurrent writes from multiple API instances. See docs/003-auction-bidding
 * for the trade-off this implies.
 */
export function createKeyedMutex(): KeyedMutex {
  const tails = new Map<string, Promise<void>>();

  function releaseIfCurrent(key: string, tail: Promise<void>): void {
    if (tails.get(key) === tail) {
      tails.delete(key);
    }
  }

  return {
    runExclusive<T>(key: string, task: () => Promise<T>): Promise<T> {
      const previous = tails.get(key) ?? Promise.resolve();
      const result = previous.then(task, task);
      const tail = result.then(
        () => undefined,
        () => undefined,
      );
      tails.set(key, tail);
      void tail.then(() => releaseIfCurrent(key, tail));
      return result;
    },
  };
}
