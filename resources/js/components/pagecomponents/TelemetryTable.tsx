import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PaginatedResponse, Telemetry, TelemetryFilters } from '@/services/deviceService';

type SortDirection = 'asc' | 'desc';

interface TelemetryTableProps {
  title: string;
  description?: string;
  showDevice?: boolean;
  showStatusFilter?: boolean;
  downloadFilename: string;
  fetchRows: (page: number, perPage: number, filters: TelemetryFilters) => Promise<PaginatedResponse<Telemetry>>;
}

const columns = [
  { key: 'recorded_at', label: 'Recorded' },
  { key: 'received_at', label: 'Received' },
  { key: 'latency_ms', label: 'Latency' },
  { key: 'temperature_celsius', label: 'Temp' },
  { key: 'ph', label: 'pH' },
  { key: 'turbidity_ntu', label: 'Turbidity' },
  { key: 'tds_mg_l', label: 'TDS' },
];

const csvCell = (value: unknown) => {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return '--';
  return new Date(value).toLocaleString();
};

const formatNumber = (value: number | string | null | undefined, digits: number) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--';
  return Number(value).toFixed(digits);
};

const downloadFile = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const TelemetryTable = ({
  title,
  description,
  showDevice = false,
  showStatusFilter = false,
  downloadFilename,
  fetchRows,
}: TelemetryTableProps) => {
  const [rows, setRows] = useState<Telemetry[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('recorded_at');
  const [direction, setDirection] = useState<SortDirection>('desc');

  const filters = useMemo<TelemetryFilters>(() => ({
    q: q.trim() || undefined,
    from: from || undefined,
    to: to || undefined,
    status: showStatusFilter && status !== 'all' ? status : undefined,
    sort,
    direction,
  }), [direction, from, q, showStatusFilter, sort, status, to]);

  const loadRows = useCallback(async (nextPage: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchRows(nextPage, 20, filters);
      setRows(response.data);
      setPage(response.current_page);
      setLastPage(response.last_page);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load telemetry');
    } finally {
      setLoading(false);
    }
  }, [fetchRows, filters]);

  useEffect(() => {
    loadRows(1);
  }, [filters, loadRows]);

  const handleSort = (key: string) => {
    if (sort === key) {
      setDirection(direction === 'asc' ? 'desc' : 'asc');
      return;
    }

    setSort(key);
    setDirection(key === 'recorded_at' ? 'desc' : 'asc');
  };

  const sortIcon = (key: string) => {
    if (sort !== key) return <ArrowUpDown className="w-3 h-3" />;
    return direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  const exportCsv = async () => {
    try {
      setExporting(true);
      const allRows: Telemetry[] = [];
      let nextPage = 1;
      let finalPage = 1;

      do {
        const response = await fetchRows(nextPage, 100, filters);
        allRows.push(...response.data);
        finalPage = response.last_page;
        nextPage += 1;
      } while (nextPage <= finalPage);

      const header = [
        ...(showDevice ? ['station_id', 'device_name', 'mac_address', 'status'] : []),
        'recorded_at',
        'received_at',
        'latency_ms',
        'temperature_celsius',
        'ph',
        'turbidity_ntu',
        'tds_mg_l',
        'water_level_cm',
      ];

      const csv = [
        header,
        ...allRows.map((row) => [
          ...(showDevice ? [
            row.device?.station_id ?? '',
            row.device?.name ?? '',
            row.device?.mac_address ?? '',
            row.device?.status ?? '',
          ] : []),
          row.recorded_at,
          row.received_at ?? '',
          row.latency_ms ?? '',
          row.temperature_celsius ?? '',
          row.ph ?? '',
          row.turbidity_ntu ?? '',
          row.tds_mg_l ?? '',
          row.water_level_cm ?? '',
        ]),
      ].map((line) => line.map(csvCell).join(',')).join('\n');

      downloadFile(downloadFilename, csv);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export telemetry');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="rounded-lg border border-waterbase-200 bg-white">
      <div className="p-4 border-b border-waterbase-100">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold text-waterbase-950">{title}</h3>
            <p className="text-sm text-waterbase-600 mt-1">
              {description || `${total} matching telemetry records`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => loadRows(page)} disabled={loading} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={exporting || total === 0} className="gap-2">
              <Download className="w-4 h-4" />
              {exporting ? 'Downloading...' : 'Download CSV'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-waterbase-400" />
            <Input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search station, device name, or MAC"
              className="pl-9"
            />
          </div>
          <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          {showStatusFilter && (
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="paired">Paired</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="awaiting_pair">Awaiting Pair</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {error && <div className="m-4 p-3 rounded border border-red-200 bg-red-50 text-sm text-red-700">{error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-waterbase-200">
              {showDevice && (
                <>
                  <th className="text-left py-2 px-3">
                    <button className="inline-flex items-center gap-1 font-medium" onClick={() => handleSort('station_id')}>
                      Station {sortIcon('station_id')}
                    </button>
                  </th>
                  <th className="text-left py-2 px-3">
                    <button className="inline-flex items-center gap-1 font-medium" onClick={() => handleSort('device_name')}>
                      Device {sortIcon('device_name')}
                    </button>
                  </th>
                </>
              )}
              {columns.map((column) => (
                <th key={column.key} className="text-left py-2 px-3">
                  <button className="inline-flex items-center gap-1 font-medium" onClick={() => handleSort(column.key)}>
                    {column.label} {sortIcon(column.key)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={showDevice ? 9 : 7} className="py-8 text-center text-waterbase-500">Loading telemetry...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={showDevice ? 9 : 7} className="py-8 text-center text-waterbase-500">No telemetry found.</td>
              </tr>
            ) : rows.map((row) => (
              <tr key={row.id} className="border-b border-waterbase-100">
                {showDevice && (
                  <>
                    <td className="py-2 px-3 whitespace-nowrap">{row.device?.station_id || '--'}</td>
                    <td className="py-2 px-3 min-w-44">
                      <div className="font-medium text-waterbase-900">{row.device?.name || 'Unnamed Device'}</div>
                      <div className="text-xs text-waterbase-500">{row.device?.mac_address || '--'}</div>
                    </td>
                  </>
                )}
                <td className="py-2 px-3 whitespace-nowrap">{formatDate(row.recorded_at)}</td>
                <td className="py-2 px-3 whitespace-nowrap">{formatDate(row.received_at)}</td>
                <td className="py-2 px-3 whitespace-nowrap">{row.latency_ms !== null ? `${row.latency_ms} ms` : '--'}</td>
                <td className="py-2 px-3">{formatNumber(row.temperature_celsius, 1)}</td>
                <td className="py-2 px-3">{formatNumber(row.ph, 2)}</td>
                <td className="py-2 px-3">{formatNumber(row.turbidity_ntu, 1)}</td>
                <td className="py-2 px-3">{formatNumber(row.tds_mg_l, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-waterbase-600">
          Page {page} of {lastPage} &middot; {total} records
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadRows(page - 1)} disabled={page <= 1 || loading}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => loadRows(page + 1)} disabled={page >= lastPage || loading}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
