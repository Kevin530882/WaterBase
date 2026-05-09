export interface PerformanceRequestMetric {
  id: number;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  objectCount: number | null;
  backendRequestMs: number | null;
  backendDbMs: number | null;
  backendDbQueries: number | null;
  createdAt: number;
}

type Listener = () => void;

let enabled = false;
let patched = false;
let nextId = 1;
let metrics: PerformanceRequestMetric[] = [];
const listeners = new Set<Listener>();

const originalFetch = window.fetch.bind(window);

const notify = () => {
  listeners.forEach((listener) => listener());
};

export const setPerformanceMetricsEnabled = (value: boolean) => {
  enabled = value;
  if (!value) {
    metrics = [];
  }
  notify();
};

export const isPerformanceMetricsEnabled = () => enabled;

export const subscribePerformanceMetrics = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getPerformanceMetricsSnapshot = () => metrics;

const toPath = (input: RequestInfo | URL): string => {
  const raw = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;

  try {
    const url = new URL(raw, window.location.origin);
    return `${url.pathname}${url.search}`;
  } catch {
    return raw;
  }
};

const getMethod = (input: RequestInfo | URL, init?: RequestInit): string => {
  if (init?.method) {
    return init.method.toUpperCase();
  }

  if (typeof input === 'object' && 'method' in input && input.method) {
    return input.method.toUpperCase();
  }

  return 'GET';
};

const countObjects = (payload: unknown): number | null => {
  if (Array.isArray(payload)) {
    return payload.length;
  }

  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.data)) {
    return record.data.length;
  }

  if (Array.isArray(record.reports)) {
    return record.reports.length;
  }

  if (Array.isArray(record.events)) {
    return record.events.length;
  }

  return Object.keys(record).length;
};

const readHeaderNumber = (headers: Headers, name: string): number | null => {
  const value = headers.get(name);
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const pushMetric = (metric: PerformanceRequestMetric) => {
  metrics = [metric, ...metrics].slice(0, 8);
  notify();
};

export const installPerformanceFetchMonitor = () => {
  if (patched) {
    return;
  }

  patched = true;
  window.fetch = async (input, init) => {
    if (!enabled) {
      return originalFetch(input, init);
    }

    const startedAt = performance.now();
    const response = await originalFetch(input, init);
    const durationMs = performance.now() - startedAt;
    const metricBase = {
      id: nextId++,
      method: getMethod(input, init),
      path: toPath(input),
      status: response.status,
      durationMs,
      backendRequestMs: readHeaderNumber(response.headers, 'X-WaterBase-Request-Ms'),
      backendDbMs: readHeaderNumber(response.headers, 'X-WaterBase-Db-Ms'),
      backendDbQueries: readHeaderNumber(response.headers, 'X-WaterBase-Db-Queries'),
      createdAt: Date.now(),
    };

    if (!response.headers.get('content-type')?.includes('application/json')) {
      pushMetric({ ...metricBase, objectCount: null });
      return response;
    }

    response.clone().json()
      .then((payload) => pushMetric({ ...metricBase, objectCount: countObjects(payload) }))
      .catch(() => pushMetric({ ...metricBase, objectCount: null }));

    return response;
  };
};
