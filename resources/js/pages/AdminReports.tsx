import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
    FileText,
    Search,
    Filter,
    Plus,
    Edit,
    Trash2,
    Eye,
    Download,
    Upload,
    Camera,
    CheckCircle,
    XCircle,
    Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from 'date-fns';

export const AdminReports = () => {
    const [reports, setReports] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterType, setFilterType] = useState("all");
    const [reportStats, setReportStats] = useState({ total: 0, verified: 0, pending: 0, rejected: 0 });
    const [selectedReport, setSelectedReport] = useState(null);
    const [showReportDialog, setShowReportDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    const [editForm, setEditForm] = useState({
        title: "",
        description: "",
        type: "",
        severity: "",
        status: "",
        adminNotes: "",
    });

    const [advancedFilters, setAdvancedFilters] = useState({
        severityByUser: 'all',
        severityByAI: 'all',
        aiConfidenceMin: '',
        aiConfidenceMax: '',
        dateFrom: '',
        dateTo: '',
        submitter: '',
        verifier: '',
        aiVerified: 'all',
    });

    const fetchReports = async (page) => {
        try {
            let url = `/api/admin/reports?page=${page}`;
            if (filterStatus !== 'all') url += `&status=${filterStatus}`;
            if (filterType !== 'all') url += `&type=${filterType}`;
            if (searchQuery) url += `&search=${searchQuery}`;
            if (advancedFilters.severityByUser !== 'all') url += `&severityByUser=${advancedFilters.severityByUser}`;
            if (advancedFilters.severityByAI !== 'all') url += `&severityByAI=${advancedFilters.severityByAI}`;
            if (advancedFilters.aiConfidenceMin) url += `&aiConfidenceMin=${advancedFilters.aiConfidenceMin}`;
            if (advancedFilters.aiConfidenceMax) url += `&aiConfidenceMax=${advancedFilters.aiConfidenceMax}`;
            if (advancedFilters.dateFrom) url += `&dateFrom=${advancedFilters.dateFrom}`;
            if (advancedFilters.dateTo) url += `&dateTo=${advancedFilters.dateTo}`;
            if (advancedFilters.submitter) url += `&submitter=${advancedFilters.submitter}`;
            if (advancedFilters.verifier) url += `&verifier=${advancedFilters.verifier}`;
            if (advancedFilters.aiVerified !== 'all') url += `&aiVerified=${advancedFilters.aiVerified}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                },
            });
            if (!response.ok) throw new Error('Failed to fetch reports');
            const data = await response.json();
            setReports(data.data);
            setTotalPages(data.last_page);
        } catch (error) {
            console.error('Error fetching reports:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/admin/reports/stats', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
            });
            if (!response.ok) throw new Error('Failed to fetch stats');
            const data = await response.json();
            setReportStats(data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [filterStatus, filterType, searchQuery, advancedFilters]);

    useEffect(() => {
        fetchReports(currentPage);
    }, [currentPage, filterStatus, filterType, searchQuery, advancedFilters]);

    useEffect(() => {
        fetchStats();
    }, [filterStatus, filterType, searchQuery, advancedFilters]);

    const getStatusColor = (status) => {
        switch (status.toLowerCase()) {
            case "verified": return "bg-green-100 text-green-800";
            case "rejected":
            case "declined": return "bg-red-100 text-red-800";
            case "pending": return "bg-blue-100 text-blue-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity.toLowerCase()) {
            case "critical": return "bg-red-500 text-white";
            case "high": return "bg-orange-500 text-white";
            case "medium": return "bg-yellow-500 text-black";
            case "low": return "bg-green-500 text-white";
            default: return "bg-gray-500 text-white";
        }
    };

    const openEditDialog = (report) => {
        setSelectedReport(report);
        setEditForm({
            title: report.title,
            description: report.content,
            type: report.pollutionType,
            severity: report.severityByAI || report.severityByUser,
            status: report.status,
            adminNotes: report.admin_notes || "",
        });
        setShowEditDialog(true);
    };

    const handleEditReport = async () => {
        try {
            const response = await fetch(`/api/admin/reports/${selectedReport.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                },
                body: JSON.stringify({
                    title: editForm.title,
                    content: editForm.description,
                    pollutionType: editForm.type,
                    severityByAI: editForm.severity,
                    status: editForm.status,
                    admin_notes: editForm.adminNotes,
                }),
            });
            if (!response.ok) throw new Error('Failed to update report');
            fetchReports(currentPage);
            setShowEditDialog(false);
        } catch (error) {
            console.error('Error updating report:', error);
        }
    };

    const handleDeleteReport = async (reportId) => {
        if (window.confirm('Are you sure you want to delete this report?')) {
            try {
                const response = await fetch(`/api/admin/reports/${reportId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    },
                });
                if (!response.ok) throw new Error('Failed to delete report');
                fetchReports(currentPage);
            } catch (error) {
                console.error('Error deleting report:', error);
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navigation />
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-waterbase-950 mb-1">Report Management</h1>
                            <p className="text-sm text-waterbase-700">Comprehensive CRUD operations for pollution reports</p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card className="border-waterbase-200">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-600">Total Reports</p>
                                    <p className="text-2xl font-bold text-waterbase-950">{reportStats.total}</p>
                                </div>
                                <FileText className="w-6 h-6 text-waterbase-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-waterbase-200">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-600">Verified</p>
                                    <p className="text-2xl font-bold text-green-600">{reportStats.verified}</p>
                                </div>
                                <CheckCircle className="w-6 h-6 text-green-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-waterbase-200">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-600">Pending</p>
                                    <p className="text-2xl font-bold text-yellow-600">{reportStats.pending}</p>
                                </div>
                                <Clock className="w-6 h-6 text-yellow-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-waterbase-200">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-600">Rejected</p>
                                    <p className="text-2xl font-bold text-red-600">{reportStats.rejected}</p>
                                </div>
                                <XCircle className="w-6 h-6 text-red-600" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters and Search */}
                <Card className="border-waterbase-200 mb-4">
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                                <Input
                                    placeholder="Search reports by title, location, or submitter..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-8 text-xs"
                                />
                            </div>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="w-32 h-8 text-xs">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="verified">Verified</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="declined">Rejected</SelectItem>
                                    <SelectItem value="resolved">Resolved</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={filterType} onValueChange={setFilterType}>
                                <SelectTrigger className="w-32 h-8 text-xs">
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="Industrial Waste">Industrial Waste</SelectItem>
                                    <SelectItem value="Plastic Pollution">Plastic Pollution</SelectItem>
                                    <SelectItem value="Chemical Pollution">Chemical Pollution</SelectItem>
                                    <SelectItem value="Sewage Discharge">Sewage Discharge</SelectItem>
                                    <SelectItem value="Oil Spill">Oil Spillage</SelectItem>
                                </SelectContent>
                            </Select>
                            <Dialog open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="h-8 text-xs">
                                        <Filter className="w-3 h-3 mr-1" />
                                        Advanced
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Advanced Filters</DialogTitle>
                                        <DialogDescription>Apply additional filters to refine your report search</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div>
                                            <Label>Severity by User</Label>
                                            <Select value={advancedFilters.severityByUser} onValueChange={(value) => setAdvancedFilters(prev => ({ ...prev, severityByUser: value }))}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All</SelectItem>
                                                    <SelectItem value="low">Low</SelectItem>
                                                    <SelectItem value="medium">Medium</SelectItem>
                                                    <SelectItem value="high">High</SelectItem>
                                                    <SelectItem value="critical">Critical</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Severity by AI</Label>
                                            <Select value={advancedFilters.severityByAI} onValueChange={(value) => setAdvancedFilters(prev => ({ ...prev, severityByAI: value }))}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All</SelectItem>
                                                    <SelectItem value="low">Low</SelectItem>
                                                    <SelectItem value="medium">Medium</SelectItem>
                                                    <SelectItem value="high">High</SelectItem>
                                                    <SelectItem value="critical">Critical</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label>AI Confidence Min (%)</Label>
                                                <Input type="number" value={advancedFilters.aiConfidenceMin} onChange={(e) => setAdvancedFilters(prev => ({ ...prev, aiConfidenceMin: e.target.value }))} min="0" max="100" />
                                            </div>
                                            <div>
                                                <Label>AI Confidence Max (%)</Label>
                                                <Input type="number" value={advancedFilters.aiConfidenceMax} onChange={(e) => setAdvancedFilters(prev => ({ ...prev, aiConfidenceMax: e.target.value }))} min="0" max="100" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label>Date From</Label>
                                                <Input type="date" value={advancedFilters.dateFrom} onChange={(e) => setAdvancedFilters(prev => ({ ...prev, dateFrom: e.target.value }))} />
                                            </div>
                                            <div>
                                                <Label>Date To</Label>
                                                <Input type="date" value={advancedFilters.dateTo} onChange={(e) => setAdvancedFilters(prev => ({ ...prev, dateTo: e.target.value }))} />
                                            </div>
                                        </div>
                                        <div>
                                            <Label>Submitter Name</Label>
                                            <Input value={advancedFilters.submitter} onChange={(e) => setAdvancedFilters(prev => ({ ...prev, submitter: e.target.value }))} />
                                        </div>
                                        <div>
                                            <Label>Verifier Name</Label>
                                            <Input value={advancedFilters.verifier} onChange={(e) => setAdvancedFilters(prev => ({ ...prev, verifier: e.target.value }))} />
                                        </div>
                                        <div>
                                            <Label>AI Verified</Label>
                                            <Select value={advancedFilters.aiVerified} onValueChange={(value) => setAdvancedFilters(prev => ({ ...prev, aiVerified: value }))}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All</SelectItem>
                                                    <SelectItem value="true">Yes</SelectItem>
                                                    <SelectItem value="false">No</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="flex justify-end space-x-2 mt-4">
                                        <Button variant="outline" onClick={() => setShowAdvancedFilters(false)}>Cancel</Button>
                                        <Button onClick={() => setShowAdvancedFilters(false)}>Apply Filters</Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardContent>
                </Card>

                {/* Reports Table */}
                <Card className="border-waterbase-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center text-lg">
                            <FileText className="w-4 h-4 mr-2" />
                            All Reports ({reports.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs">Report Details</TableHead>
                                        <TableHead className="text-xs">Location</TableHead>
                                        <TableHead className="text-xs">Submitter</TableHead>
                                        <TableHead className="text-xs">Type & Severity</TableHead>
                                        <TableHead className="text-xs">Status</TableHead>
                                        <TableHead className="text-xs">Submitted</TableHead>
                                        <TableHead className="text-xs">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reports.map((report) => (
                                        <TableRow key={report.id}>
                                            <TableCell className="py-2">
                                                <div>
                                                    <div className="font-medium text-xs">{report.title}</div>
                                                    <div className="text-xs text-gray-600 mt-1">ID: {report.id}</div>
                                                    <div className="flex items-center mt-1">
                                                        <Camera className="w-3 h-3 mr-1 text-gray-400" />
                                                        <span className="text-xs text-gray-600">{report.photos || 0} photos</span>
                                                        <span className="text-xs text-gray-600 ml-2">AI: {report.ai_confidence}%</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <div>
                                                    <div className="text-xs font-medium">{report.address}</div>
                                                    <div className="text-xs text-gray-500 mt-1">{report.latitude}, {report.longitude}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <div className="text-xs">{report.user?.firstName} {report.user?.lastName}</div>
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <div className="space-y-1">
                                                    <Badge variant="outline" className="text-xs h-5 px-1 mr-1 whitespace-nowrap">{report.pollutionType}</Badge>
                                                    <Badge className={cn("text-xs h-5 px-1 mr-1 whitespace-nowrap", getSeverityColor(report.severityByUser))}>
                                                        User: {report.severityByUser}
                                                    </Badge>
                                                    <Badge className={cn("text-xs h-5 px-1 whitespace-nowrap", getSeverityColor(report.severityByAI))}>
                                                        AI: {report.severityByAI}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <Badge className={cn("text-xs h-5 px-1", getStatusColor(report.status))}>{report.status}</Badge>
                                                {report.verified_by?.firstName && report.verified_by?.lastName && (
                                                    <div className="text-xs text-gray-600 mt-1">by {report.verified_by.firstName + ' '+ report.verified_by.lastName}</div>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <div className="text-xs text-gray-600">{format(parseISO(report.created_at), 'dd MMM yyyy, h:mm a')}</div>
                                                {report?.verified_at && (
                                                    <div className="text-xs text-gray-500 mt-1">Processed: {format(parseISO(report.verified_at), 'dd MMM yyyy, h:mm a')}</div>
                                                )}
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
                                                                <DialogTitle>Report Details</DialogTitle>
                                                                <DialogDescription>Complete information for report #{selectedReport?.id}</DialogDescription>
                                                            </DialogHeader>
                                                            <div className="space-y-4">
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div>
                                                                        <Label>Title</Label>
                                                                        <div className="text-sm font-medium">{selectedReport?.title}</div>
                                                                    </div>
                                                                    <div>
                                                                        <Label>Status</Label>
                                                                        <Badge className={getStatusColor(selectedReport?.status || "")}>{selectedReport?.status}</Badge>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <Label>Location</Label>
                                                                    <div className="text-sm">{selectedReport?.address}</div>
                                                                    <div className="text-xs text-gray-600">{selectedReport?.latitude}, {selectedReport?.longitude}</div>
                                                                </div>
                                                                <div>
                                                                    <Label>Description</Label>
                                                                    <div className="text-sm">{selectedReport?.content}</div>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div>
                                                                        <Label>Submitted Image</Label>
                                                                        {selectedReport?.image ? (
                                                                            <img src={selectedReport.image} alt="Submitted" className="mt-2 rounded-lg shadow-sm max-h-48 object-cover" />
                                                                        ) : (
                                                                            <div className="text-sm text-gray-500">No image submitted</div>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <Label>AI Annotated Image</Label>
                                                                        {selectedReport?.ai_annotated_image ? (
                                                                            <img src={selectedReport.ai_annotated_image} alt="AI Annotated" className="mt-2 rounded-lg shadow-sm max-h-48 object-cover" />
                                                                        ) : (
                                                                            <div className="text-sm text-gray-500">No AI annotation available</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="grid grid-cols-3 gap-4">
                                                                    <div>
                                                                        <Label>Type</Label>
                                                                        <Badge variant="outline">{selectedReport?.pollutionType}</Badge>
                                                                    </div>
                                                                    <div>
                                                                        <Label>Severity</Label>
                                                                        <div className="space-y-1">
                                                                            {selectedReport?.severityByUser && (
                                                                                <Badge className={getSeverityColor(selectedReport.severityByUser)}>
                                                                                    User: {selectedReport.severityByUser}
                                                                                </Badge>
                                                                            )}
                                                                            {selectedReport?.severityByAI && (
                                                                                <Badge className={getSeverityColor(selectedReport.severityByAI)}>
                                                                                    AI: {selectedReport.severityByAI}
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <Label>AI Confidence</Label>
                                                                        <div className="text-sm font-medium">{selectedReport?.ai_confidence ? `${selectedReport.ai_confidence}%` : 'N/A'}</div>
                                                                    </div>
                                                                </div>
                                                                {selectedReport?.admin_notes && (
                                                                    <div>
                                                                        <Label>Admin Notes</Label>
                                                                        <div className="text-sm bg-gray-50 p-3 rounded-lg">{selectedReport.admin_notes}</div>
                                                                    </div>
                                                                )}
                                                                <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                                                                    <div>
                                                                        <Label>Submitted By</Label>
                                                                        <div>{selectedReport?.user?.firstName} {selectedReport?.user?.lastName}</div>
                                                                        <div>{format(parseISO(report?.created_at), 'dd MMM yyyy, h:mm a')}</div>
                                                                    </div>
                                                                    {(selectedReport?.status === 'verified' || selectedReport?.status === 'declined') && selectedReport?.verified_by && selectedReport?.verified_at && (
                                                                        <div>
                                                                            <Label>{selectedReport.status === 'verified' ? 'Verified' : 'Declined'} By</Label>
                                                                            <div>{selectedReport.verified_by.firstName} {selectedReport.verified_by.lastName}</div>
                                                                            <div>{format(parseISO(selectedReport.verified_at), 'dd MMM yyyy, h:mm a')}</div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => openEditDialog(report)}>
                                                        <Edit className="w-3 h-3" />
                                                    </Button>
                                                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700" onClick={() => handleDeleteReport(report.id)}>
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
                            <Button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} size="sm" className="h-8 text-xs">Previous</Button>
                            <span className="text-xs">Page {currentPage} of {totalPages}</span>
                            <Button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} size="sm" className="h-8 text-xs">Next</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Edit Report Dialog */}
                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Edit Report</DialogTitle>
                            <DialogDescription>Update report information and validation status</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="editTitle">Title</Label>
                                <Input id="editTitle" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                            </div>
                            <div>
                                <Label htmlFor="editDescription">Description</Label>
                                <Textarea id="editDescription" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="editType">Type</Label>
                                    <Select value={editForm.type} onValueChange={(value) => setEditForm({ ...editForm, type: value })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Industrial Waste">Industrial Waste</SelectItem>
                                            <SelectItem value="Plastic Pollution">Plastic Pollution</SelectItem>
                                            <SelectItem value="Chemical Pollution">Chemical Pollution</SelectItem>
                                            <SelectItem value="Sewage Discharge">Sewage Discharge</SelectItem>
                                            <SelectItem value="Oil Spill">Oil Spillage</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="editSeverity">Severity</Label>
                                    <Select value={editForm.severity} onValueChange={(value) => setEditForm({ ...editForm, severity: value })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Low</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                            <SelectItem value="critical">Critical</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="editStatus">Status</Label>
                                    <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="verified">Verified</SelectItem>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="declined">Rejected</SelectItem>
                                            <SelectItem value="resolved">Resolved</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="editNotes">Admin Notes</Label>
                                <Textarea id="editNotes" placeholder="Internal notes about this report..." value={editForm.adminNotes} onChange={(e) => setEditForm({ ...editForm, adminNotes: e.target.value })} rows={2} />
                            </div>
                            <div className="flex space-x-2 pt-4">
                                <Button onClick={handleEditReport} className="flex-1 bg-waterbase-500 hover:bg-waterbase-600">Update Report</Button>
                                <Button variant="outline" onClick={() => setShowEditDialog(false)} className="flex-1">Cancel</Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};