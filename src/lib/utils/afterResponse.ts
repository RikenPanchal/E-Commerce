import { after } from "next/server";

/** Runs `task` after the current response has been sent when called during
 *  a request (route handler / server action) - so e.g. an admin's save never
 *  waits on a batch of emails - and falls back to running it in the
 *  background when there's no request scope at all (e.g. a script), where
 *  `after()` throws. Errors are logged under `label`, never rethrown. */
export function runAfterResponse(label: string, task: () => Promise<void>): void {
  const guarded = () => task().catch((error) => console.error(`${label} failed:`, error));
  try {
    after(guarded);
  } catch {
    void guarded();
  }
}
