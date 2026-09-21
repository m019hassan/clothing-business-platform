/**
 * Test stub for `next/headers`. Calls outside a React Server Component request
 * cannot use the real implementation, so the authentication flows get a small
 * request/cookie context instead.
 */
const cookieJar = new Map<string, string>();
const headerBag = new Headers();

export function __setHeader(name: string, value: string): void {
  headerBag.set(name, value);
}

export function __resetStub(): void {
  cookieJar.clear();

  for (const key of [...headerBag.keys()]) {
    headerBag.delete(key);
  }
}

export async function headers(): Promise<Headers> {
  return headerBag;
}

export async function cookies(): Promise<{
  get: (name: string) => { name: string; value: string } | undefined;
  set: (name: string, value: string) => void;
  delete: (name: string) => void;
}> {
  return {
    get: (name: string) =>
      cookieJar.has(name) ? { name, value: cookieJar.get(name) as string } : undefined,
    set: (name: string, value: string) => {
      cookieJar.set(name, value);
    },
    delete: (name: string) => {
      cookieJar.delete(name);
    },
  };
}
