import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  getPerformanceMetricsSnapshot,
  installPerformanceFetchMonitor,
  isPerformanceMetricsEnabled,
  setPerformanceMetricsEnabled,
  subscribePerformanceMetrics,
} from "@/utils/performanceMetrics";

const formatMs = (value: number | null | undefined) => (
  typeof value === "number" && Number.isFinite(value) ? `${Math.round(value)}ms` : "n/a"
);

export const PerformanceReadout = () => {
  const location = useLocation();
  const [enabled, setEnabled] = useState(isPerformanceMetricsEnabled());
  const [pageMs, setPageMs] = useState<number | null>(null);
  const [metricsVersion, setMetricsVersion] = useState(0);

  useEffect(() => {
    installPerformanceFetchMonitor();

    const token = localStorage.getItem("auth_token");
    if (!token) {
      setPerformanceMetricsEnabled(false);
      return;
    }

    fetch("/api/admin/system-settings", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.ok ? response.json() : null)
      .then((settings) => {
        setPerformanceMetricsEnabled(Boolean(settings?.performance_metrics_enabled));
      })
      .catch(() => setPerformanceMetricsEnabled(false));
  }, []);

  useEffect(() => {
    return subscribePerformanceMetrics(() => {
      setEnabled(isPerformanceMetricsEnabled());
      setMetricsVersion((value) => value + 1);
    });
  }, []);

  useEffect(() => {
    if (!enabled) {
      setPageMs(null);
      return;
    }

    const startedAt = performance.now();
    const frame = window.requestAnimationFrame(() => {
      setPageMs(performance.now() - startedAt);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [enabled, location.pathname, location.search]);

  const latestMetric = useMemo(() => {
    void metricsVersion;
    return getPerformanceMetricsSnapshot()[0] ?? null;
  }, [metricsVersion]);

  if (!enabled) {
    return null;
  }

  return (
    <div className="fixed bottom-3 left-3 z-[9999] max-w-[calc(100vw-1.5rem)] rounded border border-waterbase-200 bg-white/95 px-3 py-2 text-xs text-gray-700 shadow-lg backdrop-blur">
      <div className="font-semibold text-waterbase-950">Performance testing</div>
      <div>Page loaded: {formatMs(pageMs)}</div>
      <div>
        Objects taken: {latestMetric?.objectCount ?? "n/a"} in {formatMs(latestMetric?.durationMs)}
      </div>
      {latestMetric && (
        <div className="text-gray-500">
          {latestMetric.method} {latestMetric.path} ({latestMetric.status})
          {" | "}DB {formatMs(latestMetric.backendDbMs)}
          {typeof latestMetric.backendDbQueries === "number" ? `, ${latestMetric.backendDbQueries} queries` : ""}
        </div>
      )}
    </div>
  );
};
