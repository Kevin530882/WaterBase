export interface UserNotification {
  id: number;
  type: string;
  channel: string;
  severity: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPage {
  data: UserNotification[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const UNREAD_COUNT_CACHE_TTL_MS = 15000;
let unreadCountCache: { value: number; fetchedAt: number } | null = null;
let unreadCountInFlight: Promise<number> | null = null;

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
});

export async function fetchNotifications(token: string, read?: boolean): Promise<NotificationPage> {
  const params = new URLSearchParams({ per_page: '20' });
  if (typeof read === 'boolean') {
    params.append('read', read ? '1' : '0');
  }

  const response = await fetch(`/api/notifications?${params.toString()}`, {
    headers: authHeaders(token),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch notifications');
  }

  return response.json();
}

export async function fetchUnreadCount(token: string): Promise<number> {
  const now = Date.now();
  if (unreadCountCache && (now - unreadCountCache.fetchedAt) < UNREAD_COUNT_CACHE_TTL_MS) {
    return unreadCountCache.value;
  }

  if (unreadCountInFlight) {
    return unreadCountInFlight;
  }

  unreadCountInFlight = (async () => {
    const response = await fetch('/api/notifications/unread-count', {
      headers: authHeaders(token),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch unread count');
    }

    const payload = await response.json();
    const value = Number(payload.unread_count ?? 0);
    unreadCountCache = { value, fetchedAt: Date.now() };
    return value;
  })();

  try {
    return await unreadCountInFlight;
  } finally {
    unreadCountInFlight = null;
  }
}

export async function markNotificationReadState(token: string, id: number, read: boolean): Promise<void> {
  const response = await fetch(`/api/notifications/${id}/read-state`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ read }),
  });

  if (!response.ok) {
    throw new Error('Failed to update notification state');
  }
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  const response = await fetch('/api/notifications/mark-all-read', {
    method: 'PATCH',
    headers: authHeaders(token),
  });

  if (!response.ok) {
    throw new Error('Failed to mark all notifications as read');
  }
}
