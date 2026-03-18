interface D1PreparedStatement {
  bind: (...args: unknown[]) => D1PreparedStatement;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  all: <T = Record<string, unknown>>() => Promise<{ results: T[] }>;
  run: () => Promise<void>;
}

interface D1Database {
  prepare: (query: string) => D1PreparedStatement;
  batch: (statements: D1PreparedStatement[]) => Promise<unknown[]>;
}

interface R2Bucket {
  put: (key: string, value: ArrayBuffer | string | ReadableStream, options?: { httpMetadata?: { contentType?: string } }) => Promise<void>;
  get: (key: string) => Promise<{ text: () => Promise<string>, arrayBuffer: () => Promise<ArrayBuffer> } | null>;
  delete: (key: string) => Promise<void>;
}
