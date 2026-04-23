import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TabsContent } from "@/components/ui/tabs";
import { Bell, CheckCheck, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
    fetchNotifications,
    markAllNotificationsRead,
    markNotificationReadState,
    type UserNotification,
} from "@/services/notificationService";

export const Notification = () => {
        const { token } = useAuth();
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState<string | null>(null);
        const [showUnreadOnly, setShowUnreadOnly] = useState(true);
        const [notifications, setNotifications] = useState<UserNotification[]>([]);

        const unreadCount = useMemo(
            () => notifications.filter((item) => !item.read_at).length,
            [notifications]
        );

        const loadNotifications = async (readFilter?: boolean) => {
            if (!token) {
                return;
            }

            setLoading(true);
            setError(null);
            try {
                const page = await fetchNotifications(token, readFilter);
                setNotifications(page.data ?? []);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to load notifications");
            } finally {
                setLoading(false);
            }
        };

        useEffect(() => {
            loadNotifications(showUnreadOnly ? false : undefined);
        }, [token, showUnreadOnly]);

        const toggleReadState = async (item: UserNotification) => {
            if (!token) {
                return;
            }

            try {
                await markNotificationReadState(token, item.id, !item.read_at);
                await loadNotifications(showUnreadOnly ? false : undefined);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to update notification");
            }
        };

        const handleMarkAllRead = async () => {
            if (!token) {
                return;
            }

            try {
                await markAllNotificationsRead(token);
                await loadNotifications(showUnreadOnly ? false : undefined);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to mark all as read");
            }
        };

    return (
        <TabsContent value="notifications">
            <Card className="border-waterbase-200">
            <CardHeader>
                                <CardTitle className="text-waterbase-950">Notification Center</CardTitle>
                <CardDescription className="text-waterbase-600">
                                Event and report lifecycle updates with read-state tracking.
                </CardDescription>
            </CardHeader>
            <CardContent>
                                <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline">Unread: {unreadCount}</Badge>
                                        <Button type="button" variant="outline" size="sm" onClick={() => setShowUnreadOnly((v) => !v)}>
                                            {showUnreadOnly ? "Show all" : "Show unread only"}
                                        </Button>
                                        <Button type="button" variant="outline" size="sm" onClick={handleMarkAllRead}>
                                            <CheckCheck className="w-4 h-4 mr-2" />
                                            Mark all read
                                        </Button>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => loadNotifications(showUnreadOnly ? false : undefined)}>
                                            <RefreshCw className="w-4 h-4 mr-2" />
                                            Refresh
                                        </Button>
                </div>

                                {error && <p className="text-sm text-red-600">{error}</p>}

                                {loading ? (
                                    <p className="text-sm text-waterbase-700">Loading notifications...</p>
                                ) : notifications.length === 0 ? (
                                    <div className="p-4 bg-waterbase-50 rounded-lg">
                                        <Bell className="w-6 h-6 text-waterbase-600 mb-2" />
                                        <h4 className="font-medium text-waterbase-950 mb-1">No notifications yet</h4>
                                        <p className="text-sm text-waterbase-600">
                                            New event and report updates will appear here.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {notifications.map((item) => (
                                            <div
                                                key={item.id}
                                                className={`p-3 rounded-md border ${item.read_at ? "bg-white border-waterbase-200" : "bg-waterbase-50 border-waterbase-300"}`}
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div>
                                                        <p className="text-sm font-semibold text-waterbase-950">{item.title}</p>
                                                        <p className="text-sm text-waterbase-700">{item.message}</p>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => toggleReadState(item)}
                                                    >
                                                        {item.read_at ? "Mark unread" : "Mark read"}
                                                    </Button>
                                                </div>
                                                <p className="text-xs text-waterbase-600 mt-2">
                                                    {new Date(item.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                </div>
            </CardContent>
            </Card>
        </TabsContent>
    )
}