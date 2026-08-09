/**
 * Wraps a request whose endpoint may not exist yet (backend rollout in progress).
 * Read-style calls should degrade to an empty/default value instead of throwing,
 * so pages render gracefully while the API surface is still landing.
 */
export async function safeRequest<T>(request: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await request();
  } catch {
    return fallback;
  }
}
