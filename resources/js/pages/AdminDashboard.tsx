import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { format, parseISO } from 'date-fns';
import { useAuth } from "@/contexts/AuthContext";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import Navigation from "@/components/Navigation";
import {
    BarChart3,
    Users,
    FileText,
    Shield,
    Eye,
    Edit,
    Trash2,
    Plus,
    Search,
    Filter,
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    Settings,
    Download,
    RefreshCw,
    Calendar,
    Award,
    Mail,
    Phone,
    MapPin,
    X
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { cn } from "@/lib/utils";
import { SearchableSelect } from "@/components/pagecomponents/searchable-select";

export const AdminDashboard = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState("overview");
    const [selectedReport, setSelectedReport] = useState(null);
    const [showReportDialog, setShowReportDialog] = useState(false);
    const [reports, setReports] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState('');
    const [selectedReportId, setSelectedReportId] = useState(null);

    const [users, setUsers] = useState([]);
    const [currentUserPage, setCurrentUserPage] = useState(1);
    const [totalUserPages, setTotalUserPages] = useState(1);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showUserDialog, setShowUserDialog] = useState(false);
    const [showEditUserDialog, setShowEditUserDialog] = useState(false);
    const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [editFormData, setEditFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        role: '',
        organization: '',
        areaOfResponsibility: ''
    });
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    
    const [events, setEvents] = useState([]);
    const [currentEventPage, setCurrentEventPage] = useState(1);
    const [totalEventPages, setTotalEventPages] = useState(1);
    const [showEventDialog, setShowEventDialog] = useState(false);
    const [showDeleteEventDialog, setShowDeleteEventDialog] = useState(false);
    const [eventToDelete, setEventToDelete] = useState(null);
    const [isDeletingEvent, setIsDeletingEvent] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [adminStats, setAdminStats] = useState({
        totalUsers: 0,
        totalReports: 0,
        pendingValidation: 0,
        activeEvents: 0,
        activeVolunteers: 0,
        verifiedReports: 0,
        rejectedReports: 0,
        monthlyGrowth: 0,
    });
    const [recentAlerts, setRecentAlerts] = useState([]);
    
    const [refreshKey, setRefreshKey] = useState(0);

    // System settings state
    const [autoApproveEnabled, setAutoApproveEnabled] = useState(false);
    const [autoApproveThreshold, setAutoApproveThreshold] = useState(80);
    const [csvAutoApproveEnabled, setCsvAutoApproveEnabled] = useState(false);
    const [maintenanceHealth, setMaintenanceHealth] = useState<any>(null);
    const [maintenanceStats, setMaintenanceStats] = useState<any>(null);
    const [isMaintenanceBusy, setIsMaintenanceBusy] = useState(false);

    // Filter states for Reports Validation Queue
    const [filterPollutionType, setFilterPollutionType] = useState('');
    const [filterSeverityByUser, setFilterSeverityByUser] = useState('');
    const [filterSeverityByAI, setFilterSeverityByAI] = useState('');
    const [filterAIConfidenceMin, setFilterAIConfidenceMin] = useState('');
    const [filterAIConfidenceMax, setFilterAIConfidenceMax] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [filterSubmitter, setFilterSubmitter] = useState('');
    const [adminNotes, setAdminNotes] = useState('');

    // Filter states for Users Management
    const [filterRole, setFilterRole] = useState('');
    const [filterOrganization, setFilterOrganization] = useState('');
    const [filterArea, setFilterArea] = useState('');
    const [filterJoinDateFrom, setFilterJoinDateFrom] = useState('');
    const [filterJoinDateTo, setFilterJoinDateTo] = useState('');
    const [filterMinReports, setFilterMinReports] = useState('');
    const [filterMinEvents, setFilterMinEvents] = useState('');

    // Filter states for Task Management (Events)
    const [filterStatus, setFilterStatus] = useState('');
    const [filterEventDateFrom, setFilterEventDateFrom] = useState('');
    const [filterEventDateTo, setFilterEventDateTo] = useState('');
    const [filterLocation, setFilterLocation] = useState('');
    const [filterCreator, setFilterCreator] = useState('');
    const [filterVolunteersMin, setFilterVolunteersMin] = useState('');
    const [filterVolunteersMax, setFilterVolunteersMax] = useState('');
    

    const refreshData = () => {
        setRefreshKey(prev => prev + 1);
    };

    const fetchAdminStats = async () => {
        try {
            const response = await fetch('/api/admin/stats', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                },
            });
            if (!response.ok) throw new Error('Failed to fetch admin stats');
            const data = await response.json();
            setAdminStats(data);
        } catch (error) {
            console.error('Error fetching admin stats:', error);
            setErrorMessage('Failed to load admin statistics. Please try again.');
        }
    };

    const fetchReports = async (page) => {
        try {
            let url = `/api/admin/reports/pending?page=${page}`;
            if (filterPollutionType) url += `&pollutionType=${filterPollutionType}`;
            if (filterSeverityByUser) url += `&severityByUser=${filterSeverityByUser}`;
            if (filterSeverityByAI) url += `&severityByAI=${filterSeverityByAI}`;
            if (filterAIConfidenceMin) url += `&aiConfidenceMin=${filterAIConfidenceMin}`;
            if (filterAIConfidenceMax) url += `&aiConfidenceMax=${filterAIConfidenceMax}`;
            if (filterDateFrom) url += `&dateFrom=${filterDateFrom}`;
            if (filterDateTo) url += `&dateTo=${filterDateTo}`;
            if (filterSubmitter) url += `&submitter=${filterSubmitter}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                }
            });
            if (!response.ok) throw new Error('Failed to fetch reports');
            const data = await response.json();
            setReports(data.data);
            setTotalPages(data.last_page);
        } catch (error) {
            console.error('Error fetching reports:', error);
            setErrorMessage('Failed to load reports. Please try again.');
        }
    };

    const fetchUsers = async (page) => {
        try {
            let url = `/api/admin/users?page=${page}`;
            if (filterRole) url += `&role=${filterRole}`;
            if (filterOrganization) url += `&organization=${filterOrganization}`;
            if (filterArea) url += `&area=${filterArea}`;
            if (filterJoinDateFrom) url += `&joinDateFrom=${filterJoinDateFrom}`;
            if (filterJoinDateTo) url += `&joinDateTo=${filterJoinDateTo}`;
            if (filterMinReports) url += `&minReports=${filterMinReports}`;
            if (filterMinEvents) url += `&minEvents=${filterMinEvents}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                }
            });
            if (!response.ok) throw new Error('Failed to fetch users');
            const data = await response.json();
            setUsers(data.data);
            setTotalUserPages(data.last_page);
        } catch (error) {
            console.error('Error fetching users:', error);
            setErrorMessage('Failed to load users. Please try again.');
        }
    };

    const fetchEvents = async (page) => {
        try {
            let url = `/api/admin/events?page=${page}`;
            if (filterStatus) url += `&status=${filterStatus}`;
            if (filterEventDateFrom) url += `&dateFrom=${filterEventDateFrom}`;
            if (filterEventDateTo) url += `&dateTo=${filterEventDateTo}`;
            if (filterLocation) url += `&location=${filterLocation}`;
            if (filterCreator) url += `&creator=${filterCreator}`;
            if (filterVolunteersMin) url += `&volunteersMin=${filterVolunteersMin}`;
            if (filterVolunteersMax) url += `&volunteersMax=${filterVolunteersMax}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                }
            });
            if (!response.ok) throw new Error('Failed to fetch events');
            const data = await response.json();
            setEvents(data.data);
            setTotalEventPages(data.last_page);
        } catch (error) {
            console.error('Error fetching events:', error);
            setErrorMessage('Failed to load events. Please try again.');
        }
    };

    useEffect(() => {
        if (activeTab === 'reports') {
            fetchReports(currentPage);
        } else if (activeTab === 'users') {
            fetchUsers(currentUserPage);
        } else if (activeTab === 'volunteers') {
            fetchEvents(currentEventPage);
        }
    }, [activeTab, currentPage, currentUserPage, currentEventPage, refreshKey]);

    const handleReportAction = async (reportId, action, adminNotes) => {
        let status;
        if (action === 'approve') status = 'verified';
        else if (action === 'reject') status = 'declined';
        else if (action === 'request_info') status = 'info_requested';
        else {
            console.error('Invalid action');
            return;
        }

        try {
            const response = await fetch(`/api/admin/reports/${reportId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                },
                body: JSON.stringify({ status: status, verifiedBy: user?.id, admin_notes: adminNotes }),
            });
            if (!response.ok) throw new Error('Failed to update report status');
            setSuccessMessage('Report action completed successfully');
            fetchReports(currentPage);
            setShowReportDialog(false);
            setIsConfirmDialogOpen(false);
        } catch (error) {
            console.error('Error updating report status:', error);
            setErrorMessage('Failed to update report status');
        }
    };

    const openConfirmDialog = (reportId, action) => {
        setSelectedReportId(reportId);
        setPendingAction(action);
        setAdminNotes(''); // Reset notes when opening dialog
        setIsConfirmDialogOpen(true);
    };

    const getEventStatusColor = (eventStatus) => {
        switch (eventStatus.toLowerCase()) {
            case "recruiting": return "bg-blue-100 text-blue-800";
            case "active": return "bg-green-100 text-green-800";
            case "completed": return "bg-gray-100 text-gray-800";
            case "cancelled": return "bg-red-100 text-red-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity.toLowerCase()) {
            case "high": return "bg-orange-500 text-white";
            case "medium": return "bg-yellow-500 text-black";
            case "low": return "bg-green-500 text-white";
            default: return "bg-red-500 text-white";
        }
    };

    const shouldShowOrganizationFields = (role) => {
        return ['ngo', 'lgu', 'researcher'].includes(role);
    };

    const handleUpdateUser = async () => {
        setIsUpdating(true);
        setErrorMessage('');
        try {
            const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                },
                body: JSON.stringify(editFormData),
            });
            if (!response.ok) throw new Error('Failed to update user');
            fetchUsers(currentUserPage);
            setShowEditUserDialog(false);
        } catch (error) {
            console.error('Error updating user:', error);
            setErrorMessage('Failed to update user. Please try again.');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteUser = async () => {
        setIsDeleting(true);
        try {
            const response = await fetch(`/api/admin/users/${userToDelete.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                },
            });
            if (!response.ok) throw new Error('Failed to delete user');
            fetchUsers(currentUserPage);
            setShowDeleteUserDialog(false);
            setSuccessMessage('User deleted successfully');
            setTimeout(() => setSuccessMessage(''), 5000);
        } catch (error) {
            console.error('Error deleting user:', error);
            setErrorMessage('Failed to delete user. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteEvent = async () => {
        setIsDeletingEvent(true);
        try {
            const response = await fetch(`/api/admin/events/${eventToDelete.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                },
            });
            if (!response.ok) throw new Error('Failed to delete event');
            fetchEvents(currentEventPage);
            setShowDeleteEventDialog(false);
            setSuccessMessage('Event deleted successfully');
            setTimeout(() => setSuccessMessage(''), 5000);
        } catch (error) {
            console.error('Error deleting event:', error);
            setErrorMessage('Failed to delete event. Please try again.');
        } finally {
            setIsDeletingEvent(false);
        }
    };

    useEffect(() => {
        if (selectedUser) {
            setEditFormData({
                firstName: selectedUser.firstName || '',
                lastName: selectedUser.lastName || '',
                email: selectedUser.email || '',
                phoneNumber: selectedUser.phoneNumber ||

'',                role: selectedUser.role || '',
                organization: selectedUser.organization || '',
                areaOfResponsibility: selectedUser.areaOfResponsibility || ''
            });
        }
    }, [selectedUser]);

    useEffect(() => {
        fetchAdminStats();
        fetchRecentAlerts();
        // fetch system settings on refresh
        (async () => {
            try {
                const response = await fetch('/api/admin/system-settings', {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
                });
                if (response.ok) {
                    const data = await response.json();
                    setAutoApproveEnabled(Boolean(data.auto_approve_enabled));
                    setAutoApproveThreshold(Number(data.auto_approve_threshold));
                    setCsvAutoApproveEnabled(Boolean(data.csv_auto_approve_enabled));
                }
            } catch (e) {
                console.error('Error fetching system settings:', e);
            }
        })();
    }, [refreshKey]);

    const fetchRecentAlerts = async () => {
        try {
            const response = await fetch('/api/admin/reports/high-severity', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                },
            });
            if (!response.ok) throw new Error('Failed to fetch recent alerts');
            const data = await response.json();
            setRecentAlerts(data);
        } catch (error) {
            console.error('Error fetching recent alerts:', error);
            setErrorMessage('Failed to load recent alerts. Please try again.');
        }
    };

    const runMaintenanceAction = async (url: string, method: 'GET' | 'POST' = 'POST') => {
        try {
            setIsMaintenanceBusy(true);
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Accept': 'application/json',
                },
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data?.message || data?.error || 'Maintenance action failed');
            }

            return data;
        } finally {
            setIsMaintenanceBusy(false);
        }
    };

    const handleExportLogs = async () => {
        try {
            setIsMaintenanceBusy(true);
            const response = await fetch('/api/admin/maintenance/logs/export', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to export logs');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `waterbase-logs-${Date.now()}.log`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            setSuccessMessage('Logs exported successfully');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to export logs');
        } finally {
            setIsMaintenanceBusy(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navigation />
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {errorMessage && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                        {errorMessage}
                    </div>
                )}
                {successMessage && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
                        {successMessage}
                    </div>
                )}
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-waterbase-950 mb-1">
                                Administrator Dashboard
                            </h1>
                            <p className="text-sm text-waterbase-700">
                                Comprehensive system management and oversight
                            </p>
                        </div>
                        <div className="flex items-center space-x-3">
                            <Badge className="bg-red-600 text-white text-xs h-6 px-2">
                                <Shield className="w-3 h-3 mr-1" />
                                Admin
                            </Badge>
                            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={refreshData}>
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Refresh Data
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Card className="border-waterbase-200">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-600">Total Users</p>
                                    <p className="text-2xl font-bold text-waterbase-950">{adminStats.totalUsers.toLocaleString()}</p>
                                </div>
                                <Users className="w-6 h-6 text-waterbase-600" />
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{adminStats.monthlyGrowth >= 0 ? '+' : ''}{adminStats.monthlyGrowth}% from last month</p>
                        </CardContent>
                    </Card>
                    <Card className="border-waterbase-200">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-600">Total Reports</p>
                                    <p className="text-2xl font-bold text-waterbase-950">{adminStats.totalReports.toLocaleString()}</p>
                                </div>
                                <FileText className="w-6 h-6 text-enviro-600" />
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{adminStats.verifiedReports} verified, {adminStats.rejectedReports} rejected</p>
                        </CardContent>
                    </Card>
                    <Card className="border-waterbase-200">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-600">Pending Validation</p>
                                    <p className="text-2xl font-bold text-orange-600">{adminStats.pendingValidation}</p>
                                </div>
                                <Clock className="w-6 h-6 text-orange-600" />
                            </div>
                            <p className="text-xs text-gray-600 mt-1">Requires immediate attention</p>
                        </CardContent>
                    </Card>
                    <Card className="border-waterbase-200">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-600">Active Events</p>
                                    <p className="text-2xl font-bold text-waterbase-950">{adminStats.activeEvents}</p>
                                </div>
                                <Calendar className="w-6 h-6 text-purple-600" />
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{adminStats.activeVolunteers} volunteers participating</p>
                        </CardContent>
                    </Card>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-5 mb-4 h-8 bg-gray-100">
                        <TabsTrigger value="overview" className="text-xs px-2 py-1 data-[state=active]:bg-waterbase-500 data-[state=active]:text-white">Overview</TabsTrigger>
                        <TabsTrigger value="reports" className="text-xs px-2 py-1 data-[state=active]:bg-waterbase-500 data-[state=active]:text-white">Reports</TabsTrigger>
                        <TabsTrigger value="users" className="text-xs px-2 py-1 data-[state=active]:bg-waterbase-500 data-[state=active]:text-white">Users</TabsTrigger>
                        <TabsTrigger value="volunteers" className="text-xs px-2 py-1 data-[state=active]:bg-waterbase-500 data-[state=active]:text-white">Events</TabsTrigger>
                        <TabsTrigger value="settings" className="text-xs px-2 py-1 data-[state=active]:bg-waterbase-500 data-[state=active]:text-white">Settings</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="border-waterbase-200">
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <BarChart3 className="w-5 h-5 mr-2" />
                                        System Activity
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-2 h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart
                                            data={[
                                                { name: 'Total Users', value: adminStats.totalUsers },
                                                { name: 'Total Reports', value: adminStats.totalReports },
                                                { name: 'Active Events', value: adminStats.activeEvents },
                                                { name: 'Active Volunteers', value: adminStats.activeVolunteers },
                                            ]}
                                            margin={{
                                                top: 10,
                                                right: 30,
                                                left: 0,
                                                bottom: 0,
                                            }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: '10px' }} />
                                            <YAxis axisLine={false} tickLine={false} style={{ fontSize: '10px' }} />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#ffffff',
                                                    borderColor: '#e2e8f0',
                                                    borderRadius: '0.375rem',
                                                    fontSize: '12px',
                                                }}
                                                labelStyle={{ color: '#4b5563' }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                            <Line type="monotone" dataKey="value" stroke="#60A5FA" strokeWidth={2} dot={{ r: 4, fill: '#60A5FA' }} activeDot={{ r: 6, fill: '#2563EB', stroke: '#2563EB' }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                            <Card className="border-waterbase-200">
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <AlertTriangle className="w-5 h-5 mr-2" />
                                        Recent Alerts
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {recentAlerts.length > 0 ? (
                                            recentAlerts.map((alert) => (
                                                <div key={alert.id} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-medium text-red-800">{alert.title}</span>
                                                        <Badge variant="destructive" className="text-xs">{alert.severityByAI || alert.severityByUser}</Badge>
                                                    </div>
                                                    <p className="text-xs text-red-600 mt-1">{alert.address} - {format(parseISO(alert.created_at), 'dd MMM yy')}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-600">
                                                No recent high-severity alerts.
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="reports">
                        <Card className="border-waterbase-200">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center text-lg">
                                        <FileText className="w-4 h-4 mr-2" />
                                        Report Validation Queue
                                    </CardTitle>
                                    <div className="flex flex-wrap gap-4">
                                        <Select value={filterPollutionType} onValueChange={setFilterPollutionType}>
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="Pollution Type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="All">All</SelectItem>
                                                <SelectItem value="Industrial Waste">Industrial Waste</SelectItem>
                                                <SelectItem value="Plastic Pollution">Plastic Pollution</SelectItem>
                                                <SelectItem value="Sewage Discharge">Sewage Discharge</SelectItem>
                                                <SelectItem value="Chemical Pollution">Chemical Pollution</SelectItem>
                                                <SelectItem value="Oil Spill">Oil Spillage</SelectItem>
                                                <SelectItem value="Unnatural Color - AI">Unnatural Color - AI</SelectItem>
                                                <SelectItem value="Clean">Clean</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Select value={filterSeverityByUser} onValueChange={setFilterSeverityByUser}>
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="User Severity" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All</SelectItem>
                                                <SelectItem value="low">Low</SelectItem>
                                                <SelectItem value="medium">Medium</SelectItem>
                                                <SelectItem value="high">High</SelectItem>
                                                <SelectItem value="critical">Critical</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Select value={filterSeverityByAI} onValueChange={setFilterSeverityByAI}>
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="AI Severity" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All</SelectItem>
                                                <SelectItem value="low">Low</SelectItem>
                                                <SelectItem value="medium">Medium</SelectItem>
                                                <SelectItem value="high">High</SelectItem>
                                                <SelectItem value="critical">Critical</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            type="number"
                                            placeholder="Min AI Confidence"
                                            value={filterAIConfidenceMin}
                                            onChange={(e) => setFilterAIConfidenceMin(e.target.value)}
                                            className="w-[150px]"
                                        />
                                        <Input
                                            type="number"
                                            placeholder="Max AI Confidence"
                                            value={filterAIConfidenceMax}
                                            onChange={(e) => setFilterAIConfidenceMax(e.target.value)}
                                            className="w-[150px]"
                                        />
                                        <Input
                                            type="date"
                                            value={filterDateFrom}
                                            onChange={(e) => setFilterDateFrom(e.target.value)}
                                            placeholder="From Date"
                                        />
                                        <Input
                                            type="date"
                                            value={filterDateTo}
                                            onChange={(e) => setFilterDateTo(e.target.value)}
                                            placeholder="To Date"
                                        />
                                        <Input
                                            placeholder="Submitter Name"
                                            value={filterSubmitter}
                                            onChange={(e) => setFilterSubmitter(e.target.value)}
                                            className="w-[180px]"
                                        />
                                        <Button onClick={() => fetchReports(1)}>Apply Filters</Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-xs">Report Details</TableHead>
                                                <TableHead className="text-xs">Submitter</TableHead>
                                                <TableHead className="text-xs">Type & AI Severity</TableHead>
                                                <TableHead className="text-xs hidden md:table-cell">AI Confidence</TableHead>
                                                <TableHead className="text-xs hidden md:table-cell">Submitted</TableHead>
                                                <TableHead className="text-xs">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {reports.map((report) => (
                                                <TableRow key={report.id}>
                                                    <TableCell className="py-2">
                                                        <div className="max-w-[150px]">
                                                            <div className="font-medium text-xs truncate">{report.title}</div>
                                                            <div className="text-xs text-gray-600 truncate">{report.address}</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <div className="text-xs truncate">{report.username}</div>
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <div className="space-y-1">
                                                            <Badge variant="outline" className="text-xs h-5 px-1 mr-1 max-w-[100px] truncate">{report.pollutionType}</Badge>
                                                            <Badge className={cn("text-xs h-5 px-1 max-w-[100px] truncate", getSeverityColor(report.severityByAI))}>{report.severityByAI}</Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-2 hidden md:table-cell">
                                                        <div className="flex items-center">
                                                            <div className="text-xs font-medium">{report.ai_confidence}%</div>
                                                            <div className={cn("ml-2 w-2 h-2 rounded-full", report.ai_confidence > 90 ? "bg-green-500" : report.ai_confidence > 70 ? "bg-yellow-500" : "bg-red-500")} />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-2 hidden md:table-cell">
                                                        <div className="text-xs text-gray-600">{format(parseISO(report.created_at), 'dd MMM yyyy, h:mm a')}</div>
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <div className="flex items-center space-x-1">
                                                            <Dialog open={showReportDialog && selectedReport?.id === report.id} onOpenChange={setShowReportDialog}>
                                                                <DialogTrigger asChild>
                                                                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setSelectedReport(report)}>
                                                                        <Eye className="w-3 h-3" />
                                                                    </Button>
                                                                </DialogTrigger>
                                                                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                                                    <DialogHeader>
                                                                        <DialogTitle>Report Validation</DialogTitle>
                                                                        <DialogDescription>Review and validate pollution report</DialogDescription>
                                                                    </DialogHeader>
                                                                    <div className="space-y-4">
                                                                        <div className="grid grid-cols-2 gap-4">
                                                                            <div>
                                                                                <Label>Title</Label>
                                                                                <div className="text-sm font-medium">{selectedReport?.title}</div>
                                                                            </div>
                                                                            <div>
                                                                                <Label>Location</Label>
                                                                                <div className="text-sm">{selectedReport?.address}</div>
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <Label>Description</Label>
                                                                            <div className="text-sm">{selectedReport?.content}</div>
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-4 my-4">
                                                                            <div className="flex flex-col items-center">
                                                                                <Label className="mb-2">Submitted Image</Label>
                                                                                {selectedReport?.image ? (
                                                                                    <img src={selectedReport.image} alt="Submitted" className="w-full max-h-[400px] object-contain rounded-md border border-gray-300" />
                                                                                ) : (
                                                                                    <p className="text-xs text-gray-500">No submitted image available</p>
                                                                                 )}
                                                                            </div>
                                                                            <div className="flex flex-col items-center">
                                                                                <Label className="mb-2">AI Annotated Image</Label>
                                                                                {selectedReport?.ai_annotated_image ? (
                                                                                    <img src={selectedReport.ai_annotated_image} alt="AI Annotated" className="w-full max-h-[400px] object-contain rounded-md border border-gray-300" />
                                                                                ) : (
                                                                                    <p className="text-xs text-gray-500">No AI annotated image available</p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="grid grid-cols-3 gap-4">
                                                                            <div>
                                                                                <Label>Type</Label>
                                                                                <Badge variant="outline" className="ml-1">{selectedReport?.pollutionType}</Badge>
                                                                            </div>
                                                                            <div>
                                                                                <div>
                                                                                    <Label className="mr-1">User Severity</Label>
                                                                                    <Badge className={getSeverityColor(selectedReport?.severityByUser || "")}>{selectedReport?.severityByUser}</Badge>
                                                                                </div>
                                                                                <div>
                                                                                    <Label className="mr-5">AI Severity</Label>
                                                                                    <Badge className={getSeverityColor(selectedReport?.severityByAI || "")}>{selectedReport?.severityByAI}</Badge>
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <Label>AI Confidence</Label>
                                                                                <p className={cn("text-sm font-medium", selectedReport?.ai_confidence > 90 ? "text-green-500" : selectedReport?.ai_confidence > 70 ? "text-yellow-500" : "text-red-500")}>
                                                                                    {selectedReport?.ai_confidence}%
                                                                                </p>
                                                                            </div>
                                                                            <div>
                                                                                <Label>Date Report Created</Label>
                                                                                <div className="text-sm">{selectedReport && format(parseISO(selectedReport.created_at), 'dd MMM yyyy, h:mm a')}</div>
                                                                            </div>
                                                                            <div>
                                                                                <Label>Date Report Modified</Label>
                                                                                <div className="text-sm">{selectedReport && format(parseISO(selectedReport.updated_at), 'dd MMM yyyy, h:mm a')}</div>
                                                                            </div>
                                                                            <div>
                                                                                <Label>Report Submitted By</Label>
                                                                                <div className="text-sm">{selectedReport?.username}</div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex space-x-2 pt-4">
                                                                            {selectedReport?.auto_approved ? (
                                                                                <div className="flex items-center space-x-2 flex-1">
                                                                                    <Badge className="bg-green-100 text-green-800 flex-1 justify-center">
                                                                                        ✓ Auto-Approved
                                                                                    </Badge>
                                                                                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => openConfirmDialog(selectedReport?.id, "request_info")}>
                                                                                        <Clock className="w-3 h-3 mr-1" />
                                                                                        Override
                                                                                    </Button>
                                                                                </div>
                                                                            ) : (
                                                                                <>
                                                                                    <Button onClick={() => openConfirmDialog(selectedReport.id, "approve")} className="bg-green-600 hover:bg-green-700 h-8 text-xs" size="sm">
                                                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                                                        Approve Report
                                                                                    </Button>
                                                                                    <Button className="bg-red-600 hover:bg-red-700 h-8 text-xs" size="sm" onClick={() => openConfirmDialog(selectedReport.id, "reject")}>
                                                                                        <XCircle className="w-3 h-3 mr-1" />
                                                                                        Reject Report
                                                                                    </Button>
                                                                                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => openConfirmDialog(selectedReport?.id, "request_info")}>
                                                                                        <Clock className="w-3 h-3 mr-1" />
                                                                                        Request More Info
                                                                                    </Button>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </DialogContent>
                                                            </Dialog>
                                                            <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
                                                                <DialogContent>
                                                                    <DialogHeader>
                                                                        <DialogTitle>
                                                                            {pendingAction === 'approve' ? 'Approve Report' :
                                                                             pendingAction === 'reject' ? 'Reject Report' :
                                                                             'Request More Information'}
                                                                        </DialogTitle>
                                                                        <DialogDescription>
                                                                            {pendingAction === 'approve' ? "Please provide a reason for approving this report." :
                                                                             pendingAction === 'reject' ? "Please provide a reason for rejecting this report." :
                                                                             "Provide specific details about what information you need from the reporter."}
                                                                        </DialogDescription>
                                                                    </DialogHeader>
                                                                    <div className="mt-4">
                                                                        <Label htmlFor="adminNotes">
                                                                            {pendingAction === 'request_info' ? 'Information Requested' : 'Reason'} (required)
                                                                        </Label>
                                                                        <textarea
                                                                            id="adminNotes"
                                                                            className="w-full p-2 border rounded"
                                                                            value={adminNotes}
                                                                            onChange={(e) => setAdminNotes(e.target.value)}
                                                                            placeholder={
                                                                                pendingAction === 'approve' ? 'Reason for approving...' :
                                                                                pendingAction === 'reject' ? 'Reason for rejecting...' :
                                                                                'e.g., Please provide timestamp of incident, contact info, etc.'
                                                                            }
                                                                        />
                                                                    </div>
                                                                    <div className="flex justify-end space-x-2 mt-4">
                                                                        <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>Cancel</Button>
                                                                        <Button
                                                                            onClick={() => {
                                                                                if (selectedReportId && adminNotes.trim()) {
                                                                                    handleReportAction(selectedReportId, pendingAction, adminNotes);
                                                                                    setIsConfirmDialogOpen(false);
                                                                                }
                                                                            }}
                                                                            disabled={!adminNotes.trim()}
                                                                        >
                                                                            Confirm
                                                                        </Button>
                                                                    </div>
                                                                </DialogContent>
                                                            </Dialog>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <div className="flex items-center justify-between mt-4">
                                    <Button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} size="sm" className="h-8 text-xs">Previous</Button>
                                    <span className="text-xs">Page {currentPage} of {totalPages}</span>
                                    <Button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} size="sm" className="h-8 text-xs">Next</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="users">
                        <Card className="border-waterbase-200">
                            <CardHeader className="pb-1">
                                <div>
                                    <CardTitle className="flex items-center text-lg mb-2">
                                        <Users className="w-4 h-4 mr-2" />
                                        User Management
                                    </CardTitle>
                                    <div className="flex flex-wrap gap-4">
                                        <div className="relative">
                                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <Input placeholder="Search users..." className="pl-8 h-9 text-sm w-64 border-gray-300 focus:border-waterbase-500" />
                                        </div>
                                        <Select value={filterRole} onValueChange={setFilterRole}>
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="Role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All</SelectItem>
                                                <SelectItem value="admin">Admin</SelectItem>
                                                <SelectItem value="ngo">NGO</SelectItem>
                                                <SelectItem value="lgu">LGU</SelectItem>
                                                <SelectItem value="researcher">Researcher</SelectItem>
                                                <SelectItem value="volunteer">Volunteer</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Input placeholder="Organization" value={filterOrganization} onChange={(e) => setFilterOrganization(e.target.value)} className="w-[180px]" />
                                        <Input placeholder="Area of Responsibility" value={filterArea} onChange={(e) => setFilterArea(e.target.value)} className="w-[180px]" />
                                        <Input type="date" value={filterJoinDateFrom} onChange={(e) => setFilterJoinDateFrom(e.target.value)} placeholder="Join Date From" />
                                        <Input type="date" value={filterJoinDateTo} onChange={(e) => setFilterJoinDateTo(e.target.value)} placeholder="Join Date To" />
                                        <Input type="number" placeholder="Min Reports" value={filterMinReports} onChange={(e) => setFilterMinReports(e.target.value)} className="w-[150px]" />
                                        <Input type="number" placeholder="Min Events" value={filterMinEvents} onChange={(e) => setFilterMinEvents(e.target.value)} className="w-[150px]" />
                                        <Button onClick={() => fetchUsers(1)}>Apply Filters</Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-xs">User Details</TableHead>
                                                <TableHead className="text-xs">Role</TableHead>
                                                <TableHead className="text-xs hidden md:table-cell">Activity</TableHead>
                                                <TableHead className="text-xs hidden md:table-cell">Join Date</TableHead>
                                                <TableHead className="text-xs">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {users.map((user) => (
                                                <TableRow key={user.id}>
                                                    <TableCell className="py-2">
                                                        <div className="max-w-[150px]">
                                                            <div className="font-medium text-xs truncate">{user.firstName} {user.lastName}</div>
                                                            <div className="text-xs text-gray-600 truncate">{user.email}</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <Badge variant={user.role === "NGO" ? "default" : "outline"} className="text-xs h-5 px-1 max-w-[100px] truncate">{user.role}</Badge>
                                                    </TableCell>
                                                    <TableCell className="py-2 hidden md:table-cell">
                                                        <div className="text-xs space-y-1">
                                                            {user.role === "volunteer" ? (
                                                                <>
                                                                    <div>Events Attended: {user.attended_events_count}</div>
                                                                    <div>Points: {user.total_points}</div>
                                                                </>
                                                            ) : (
                                                                <div>Events Created: {user.created_events_count}</div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-2 hidden md:table-cell">
                                                        <div className="text-xs">{format(parseISO(user.created_at), 'dd MMM yyyy')}</div>
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <div className="flex items-center space-x-1">
                                                            <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => { setSelectedUser(user); setShowEditUserDialog(true); }}>
                                                                <Edit className="w-3 h-3" />
                                                            </Button>
                                                            <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => { setSelectedUser(user); setShowUserDialog(true); }}>
                                                                <Eye className="w-3 h-3" />
                                                            </Button>
                                                            <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-red-600" onClick={() => { setUserToDelete(user); setShowDeleteUserDialog(true); }}>
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <div className="flex items-center justify-between mt-4">
                                    <Button onClick={() => setCurrentUserPage(prev => Math.max(prev - 1, 1))} disabled={currentUserPage === 1} size="sm" className="h-8 text-xs">Previous</Button>
                                    <span className="text-xs">Page {currentUserPage} of {totalUserPages}</span>
                                    <Button onClick={() => setCurrentUserPage(prev => Math.min(prev + 1, totalUserPages))} disabled={currentUserPage === totalUserPages} size="sm" className="h-8 text-xs">Next</Button>
                                </div>
                            </CardContent>
                        </Card>
                        {selectedUser && (
                            <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
                                <DialogContent className="max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Edit User</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <Label htmlFor="firstName">First Name</Label>
                                                <Input id="firstName" placeholder="Maria" value={editFormData.firstName} onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })} disabled={isUpdating} />
                                            </div>
                                            <div>
                                                <Label htmlFor="lastName">Last Name</Label>
                                                <Input id="lastName" placeholder="Santos" value={editFormData.lastName} onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })} disabled={isUpdating} />
                                            </div>
                                        </div>
                                        <div>
                                            <Label htmlFor="email">Email Address</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                                <Input id="email" type="email" placeholder="maria@example.com" className="pl-10" value={editFormData.email} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} disabled={isUpdating} />
                                            </div>
                                        </div>
                                        <div>
                                            <Label htmlFor="phoneNumber">Phone Number</Label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                                <Input id="phoneNumber" type="tel" placeholder="+63 912 345 6789" className="pl-10" value={editFormData.phoneNumber} onChange={(e) => setEditFormData({ ...editFormData, phoneNumber: e.target.value })} disabled={isUpdating} />
                                            </div>
                                        </div>
                                        <div>
                                            <Label htmlFor="role">User Type</Label>
                                            <Select value={editFormData.role} onValueChange={(value) => setEditFormData({ ...editFormData, role: value })} disabled={isUpdating}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select user role" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="user">Concerned Citizen</SelectItem>
                                                    <SelectItem value="volunteer">Volunteer</SelectItem>
                                                    <SelectItem value="ngo">NGO</SelectItem>
                                                    <SelectItem value="lgu">Local Government Unit</SelectItem>
                                                    <SelectItem value="researcher">Researcher</SelectItem>
                                                    <SelectItem value="admin">Admin</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {shouldShowOrganizationFields(editFormData.role) && (
                                            <div>
                                                <Label htmlFor="organization">Organization</Label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                                    <Input id="organization" placeholder="Environmental Watch PH" className="pl-10" value={editFormData.organization} onChange={(e) => setEditFormData({ ...editFormData, organization: e.target.value })} disabled={isUpdating} />
                                                </div>
                                            </div>
                                        )}
                                        {shouldShowOrganizationFields(editFormData.role) && (
                                            <div>
                                                <Label htmlFor="areaOfResponsibility">Area of Responsibility</Label>
                                                <SearchableSelect value={editFormData.areaOfResponsibility} onValueChange={(value) => setEditFormData({ ...editFormData, areaOfResponsibility: value })} placeholder="Search for region, province, city, or barangay..." disabled={isUpdating} />
                                                <p className="text-xs text-gray-500 mt-1">Type at least 2 characters to search for locations</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex justify-end space-x-2 mt-6">
                                        <Button variant="outline" onClick={() => setShowEditUserDialog(false)} disabled={isUpdating}>Cancel</Button>
                                        <Button onClick={handleUpdateUser} disabled={isUpdating}>{isUpdating ? 'Saving...' : 'Save'}</Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}
                        {selectedUser && (
                            <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
                                <DialogContent className="max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>User Details</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div>
                                            <Label>Name</Label>
                                            <div className="text-sm">{selectedUser.firstName} {selectedUser.lastName}</div>
                                        </div>
                                        <div>
                                            <Label>Email</Label>
                                            <div className="text-sm">{selectedUser.email}</div>
                                        </div>
                                        <div>
                                            <Label>Phone Number</Label>
                                            <div className="text-sm">{selectedUser.phoneNumber}</div>
                                        </div>
                                        <div>
                                            <Label>Role</Label>
                                            <div className="text-sm">{selectedUser.role}</div>
                                        </div>
                                        {shouldShowOrganizationFields(selectedUser.role) && (
                                            <>
                                                <div>
                                                    <Label>Organization</Label>
                                                    <div className="text-sm">{selectedUser.organization}</div>
                                                </div>
                                                <div>
                                                    <Label>Area of Responsibility</Label>
                                                    <div className="text-sm">{selectedUser.areaOfResponsibility}</div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}
                        {userToDelete && (
                            <Dialog open={showDeleteUserDialog} onOpenChange={setShowDeleteUserDialog}>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Confirm Delete</DialogTitle>
                                        <DialogDescription>Are you sure you want to delete {userToDelete.firstName} {userToDelete.lastName}?</DialogDescription>
                                    </DialogHeader>
                                    <div className="flex justify-end space-x-2">
                                        <Button variant="outline" onClick={() => setShowDeleteUserDialog(false)} disabled={isDeleting}>Cancel</Button>
                                        <Button variant="destructive" onClick={handleDeleteUser} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete'}</Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}
                    </TabsContent>

                    <TabsContent value="volunteers">
                        <Card className="border-waterbase-200">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center text-lg">
                                        <Calendar className="w-5 h-5 mr-2" />
                                        Event Management
                                    </CardTitle>
                                    <div className="flex flex-wrap gap-4">
                                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All</SelectItem>
                                                <SelectItem value="recruiting">Recruiting</SelectItem>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="completed">Completed</SelectItem>
                                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Input type="date" value={filterEventDateFrom} onChange={(e) => setFilterEventDateFrom(e.target.value)} placeholder="From Date" />
                                        <Input type="date" value={filterEventDateTo} onChange={(e) => setFilterEventDateTo(e.target.value)} placeholder="To Date" />
                                        <Input placeholder="Location" value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="w-[180px]" />
                                        <Input placeholder="Creator Name" value={filterCreator} onChange={(e) => setFilterCreator(e.target.value)} className="w-[180px]" />
                                        <Input type="number" placeholder="Min Volunteers" value={filterVolunteersMin} onChange={(e) => setFilterVolunteersMin(e.target.value)} className="w-[150px]" />
                                        <Input type="number" placeholder="Max Volunteers" value={filterVolunteersMax} onChange={(e) => setFilterVolunteersMax(e.target.value)} className="w-[150px]" />
                                        <Button onClick={() => fetchEvents(1)}>Apply Filters</Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-xs">Title</TableHead>
                                                <TableHead className="text-xs">Date</TableHead>
                                                <TableHead className="text-xs hidden md:table-cell">Time</TableHead>
                                                <TableHead className="text-xs hidden md:table-cell">Location</TableHead>
                                                <TableHead className="text-xs">Volunteers</TableHead>
                                                <TableHead className="text-xs">Status</TableHead>
                                                <TableHead className="text-xs">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {events.map((event) => (
                                                <TableRow key={event.id}>
                                                    <TableCell className="py-2">
                                                        <div className="max-w-[150px] truncate">{event.title}</div>
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <div className="text-xs">{format(parseISO(event.date), 'dd MMM yyyy')}</div>
                                                    </TableCell>
                                                    <TableCell className="py-2 hidden md:table-cell">
                                                        <div className="text-xs">{event.time}</div>
                                                    </TableCell>
                                                    <TableCell className="py-2 hidden md:table-cell">
                                                        <div className="text-xs truncate max-w-[150px]">{event.address}</div>
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <div className="text-xs">{event.attendees_count} / {event.maxVolunteers}</div>
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <Badge className={cn(getEventStatusColor(event.status), "text-xs h-5 px-1 max-w-[100px] truncate")}>{event.status}</Badge>
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <div className="flex items-center space-x-1">
                                                            <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => { setSelectedEvent(event); setShowEventDialog(true); }}>
                                                                <Eye className="w-3 h-3" />
                                                            </Button>
                                                            <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => {setEventToDelete(event); setShowDeleteEventDialog(true);}}>
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <div className="flex items-center justify-between mt-4">
                                    <Button onClick={() => setCurrentEventPage(prev => Math.max(prev - 1, 1))} disabled={currentEventPage === 1} size="sm" className="h-8 text-xs">Previous</Button>
                                    <span className="text-xs">Page {currentEventPage} of {totalEventPages}</span>
                                    <Button onClick={() => setCurrentEventPage(prev => Math.min(prev + 1, totalEventPages))} disabled={currentEventPage === totalEventPages} size="sm" className="h-8 text-xs">Next</Button>
                                </div>
                            </CardContent>
                        </Card>
                        <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
                            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Event Details</DialogTitle>
                                    <DialogDescription>View all information about this event</DialogDescription>
                                </DialogHeader>
                                {selectedEvent && (
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div><Label className="font-bold">Title</Label><div className="text-sm">{selectedEvent.title}</div></div>
                                        <div><Label className="font-bold">Date</Label><div className="text-sm">{format(parseISO(selectedEvent.date), 'dd MMM yyyy')}</div></div>
                                        <div><Label className="font-bold">Time</Label><div className="text-sm">{selectedEvent.time}</div></div>
                                        <div><Label className="font-bold">Duration</Label><div className="text-sm">{selectedEvent.duration} hours</div></div>
                                        <div className="col-span-2"><Label className="font-bold">Description</Label><div className="text-sm">{selectedEvent.description}</div></div>
                                        <div><Label className="font-bold">Address</Label><div className="text-sm">{selectedEvent.address}</div></div>
                                        <div><Label className="font-bold">Coordinates</Label><div className="text-sm">{selectedEvent.latitude}, {selectedEvent.longitude}</div></div>
                                        <div><Label className="font-bold">Volunteers</Label><div className="text-sm">{selectedEvent.currentVolunteers} / {selectedEvent.maxVolunteers}</div></div>
                                        <div><Label className="font-bold mr-2">Status</Label><Badge className={getEventStatusColor(selectedEvent.status)}>{selectedEvent.status}</Badge></div>
                                        <div><Label className="font-bold">Points</Label><div className="text-sm">{selectedEvent.points}</div></div>
                                        <div><Label className="font-bold">Badge</Label><div className="text-sm">{selectedEvent.badge}</div></div>
                                        <div><Label className="font-bold">Created By</Label><div className="text-sm">{selectedEvent.creator.firstName} {selectedEvent.creator.lastName}</div></div>
                                    </div>
                                )}
                            </DialogContent>
                        </Dialog>
                        {eventToDelete && (
                            <Dialog open={showDeleteEventDialog} onOpenChange={setShowDeleteEventDialog}>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Confirm Delete</DialogTitle>
                                        <DialogDescription>Are you sure you want to delete the event "{eventToDelete.title}"?</DialogDescription>
                                    </DialogHeader>
                                    <div className="flex justify-end space-x-2">
                                        <Button variant="outline" onClick={() => setShowDeleteEventDialog(false)} disabled={isDeletingEvent}>Cancel</Button>
                                        <Button variant="destructive" onClick={handleDeleteEvent} disabled={isDeletingEvent}>{isDeletingEvent ? 'Deleting...' : 'Delete'}</Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}
                    </TabsContent>

                    <TabsContent value="settings">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="border-waterbase-200">
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <Settings className="w-5 h-5 mr-2" />
                                        System Configuration
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label>Auto-approve Reports</Label>
                                        <div className="mt-1">
                                            <Select value={autoApproveEnabled ? 'enabled' : 'disabled'} onValueChange={(v) => setAutoApproveEnabled(v === 'enabled')}>
                                                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="enabled">Enabled</SelectItem>
                                                    <SelectItem value="disabled">Disabled</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div>
                                        <Label>AI Confidence Threshold (%)</Label>
                                        <div className="mt-1">
                                            <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={autoApproveThreshold}
                                                onChange={(e) => setAutoApproveThreshold(Number(e.target.value))}
                                                placeholder="Enter threshold (0-100)"
                                                className="w-full"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Enter a value between 0 and 100</p>
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Auto-approve CSV Uploads</Label>
                                        <p className="text-xs text-gray-500 mt-1 mb-2">When enabled, reports imported via CSV bulk upload will be automatically verified.</p>
                                        <div className="mt-1">
                                            <Select value={csvAutoApproveEnabled ? 'enabled' : 'disabled'} onValueChange={(v) => setCsvAutoApproveEnabled(v === 'enabled')}>
                                                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="enabled">Enabled</SelectItem>
                                                    <SelectItem value="disabled">Disabled</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                        <Button onClick={async () => {
                                            try {
                                                const res = await fetch('/api/admin/system-settings', {
                                                    method: 'PUT',
                                                    headers: {
                                                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                                                        'Content-Type': 'application/json'
                                                    },
                                                    body: JSON.stringify({
                                                        auto_approve_enabled: autoApproveEnabled,
                                                        auto_approve_threshold: autoApproveThreshold,
                                                        csv_auto_approve_enabled: csvAutoApproveEnabled,
                                                    })
                                                });
                                                if (!res.ok) throw new Error('Failed');
                                                setSuccessMessage('Settings saved');
                                                setTimeout(() => setSuccessMessage(''), 3000);
                                            } catch (e) {
                                                setErrorMessage('Failed to save settings');
                                            }
                                        }}>Save Settings</Button>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-waterbase-200">
                                <CardHeader>
                                    <CardTitle>System Maintenance</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        disabled={isMaintenanceBusy}
                                        onClick={handleExportLogs}
                                    >
                                        <Download className="w-4 h-4 mr-2" />Export Logs
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        disabled={isMaintenanceBusy}
                                        onClick={async () => {
                                            try {
                                                const data = await runMaintenanceAction('/api/admin/maintenance/cache-clear');
                                                setSuccessMessage(data?.message || 'Cache cleared');
                                                setTimeout(() => setSuccessMessage(''), 3000);
                                            } catch (e) {
                                                setErrorMessage(e instanceof Error ? e.message : 'Failed to clear cache');
                                            }
                                        }}
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />Clear Cache
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        disabled={isMaintenanceBusy}
                                        onClick={async () => {
                                            try {
                                                const data = await runMaintenanceAction('/api/admin/maintenance/queue-restart');
                                                setSuccessMessage(data?.message || 'Queue restarted');
                                                setTimeout(() => setSuccessMessage(''), 3000);
                                            } catch (e) {
                                                setErrorMessage(e instanceof Error ? e.message : 'Failed to restart queue');
                                            }
                                        }}
                                    >
                                        <Settings className="w-4 h-4 mr-2" />Restart Queue Worker
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        disabled={isMaintenanceBusy}
                                        onClick={async () => {
                                            try {
                                                const data = await runMaintenanceAction('/api/admin/maintenance/health', 'GET');
                                                setMaintenanceHealth(data?.data || null);
                                                setSuccessMessage('Health check completed');
                                                setTimeout(() => setSuccessMessage(''), 3000);
                                            } catch (e) {
                                                setErrorMessage(e instanceof Error ? e.message : 'Failed to run health check');
                                            }
                                        }}
                                    >
                                        <Shield className="w-4 h-4 mr-2" />Run Health Check
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        disabled={isMaintenanceBusy}
                                        onClick={async () => {
                                            try {
                                                const data = await runMaintenanceAction('/api/admin/maintenance/stats', 'GET');
                                                setMaintenanceStats(data?.data || null);
                                                setSuccessMessage('System stats refreshed');
                                                setTimeout(() => setSuccessMessage(''), 3000);
                                            } catch (e) {
                                                setErrorMessage(e instanceof Error ? e.message : 'Failed to fetch system stats');
                                            }
                                        }}
                                    >
                                        <BarChart3 className="w-4 h-4 mr-2" />View System Stats
                                    </Button>
                                    {maintenanceHealth && (
                                        <div className="rounded-md border border-waterbase-200 p-3 text-xs text-waterbase-800">
                                            <p className="font-semibold mb-1">Health Snapshot</p>
                                            <p>Database: {maintenanceHealth.database?.status || 'unknown'}</p>
                                            <p>Cache: {maintenanceHealth.cache?.status || 'unknown'}</p>
                                            <p>Queue: {maintenanceHealth.queue?.status || 'unknown'} ({maintenanceHealth.queue?.failed_jobs ?? 0} failed)</p>
                                        </div>
                                    )}
                                    {maintenanceStats && (
                                        <div className="rounded-md border border-waterbase-200 p-3 text-xs text-waterbase-800">
                                            <p className="font-semibold mb-1">System Stats</p>
                                            <p>Uptime: {maintenanceStats.uptime || 'N/A'}</p>
                                            <p>Disk used: {maintenanceStats.disk_usage?.used_percent ?? 'N/A'}%</p>
                                            <p>Memory peak: {maintenanceStats.memory_usage?.peak_mb ?? 'N/A'} MB</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};