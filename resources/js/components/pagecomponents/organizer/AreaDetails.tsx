import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Plus,
    AlertTriangle,
    CheckCircle,
    MapPin,
    Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Report {
    id: number;
    title: string;
    content: string;
    address: string;
    latitude: number;
    longitude: number;
    pollutionType: string;
    severityByUser: string;
    status: string;
    image: string;
    user_id: number;
    created_at: string;
    updated_at: string;
    user?: {
        firstName: string;
        lastName: string;
        email: string;
    };
}

interface AreaReport {
    id: number;
    location: string;
    coordinates: { lat: number; lng: number };
    reportCount: number;
    severityLevel: string;
    lastReported: string;
    description: string;
    estimatedCleanupEffort: string;
    priority: string;
    reports: Report[];
}

interface AreaDetailsProps {
    isOpen: boolean;
    onClose: () => void;
    selectedArea: AreaReport | null;
    onCreateEvent: () => void;
    onApproveReport: (reportId: number) => void;
    onDeclineReport: (reportId: number) => void;
    onBulkApproveReports: (reports: Report[]) => void;
    onBulkDeclineReports: (reports: Report[]) => void;
    onViewReport: (report: Report) => void;
}

export const AreaDetails = ({
    isOpen,
    onClose,
    selectedArea,
    onCreateEvent,
    onApproveReport,
    onDeclineReport,
    onBulkApproveReports,
    onBulkDeclineReports,
    onViewReport,
}: AreaDetailsProps) => {
    const [hoveredImage, setHoveredImage] = useState<string | null>(null);

    const getSeverityColor = (severity: string) => {
        switch (severity.toLowerCase()) {
            case "critical":
                return "bg-red-500 text-white";
            case "high":
                return "bg-orange-500 text-white";
            case "medium":
                return "bg-yellow-500 text-black";
            case "low":
                return "bg-green-500 text-white";
            default:
                return "bg-gray-500 text-white";
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case "verified":
                return "bg-green-100 text-green-800";
            case "pending":
                return "bg-yellow-100 text-yellow-800";
            case "rejected":
                return "bg-red-100 text-red-800";
            case "active":
                return "bg-green-100 text-green-800";
            case "recruiting":
                return "bg-blue-100 text-blue-800";
            case "completed":
                return "bg-gray-100 text-gray-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl">
                        📍 Area Details - {selectedArea?.location}
                    </DialogTitle>
                    <DialogDescription>
                        Comprehensive overview of {selectedArea?.reportCount} reports in this area
                    </DialogDescription>
                </DialogHeader>

                {selectedArea && (
                    <div className="space-y-6">
                        {/* Area Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gradient-to-r from-waterbase-50 to-enviro-50 rounded-lg">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-waterbase-600">
                                    {selectedArea.reportCount}
                                </div>
                                <div className="text-sm text-gray-600">Total Reports</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-enviro-600">
                                    {selectedArea.reports.filter(
                                        (r) => r.severityByUser === "critical" || r.severityByUser === "high"
                                    ).length}
                                </div>
                                <div className="text-sm text-gray-600">High Priority</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                    {selectedArea.reports.filter((r) => r.status === "verified").length}
                                </div>
                                <div className="text-sm text-gray-600">Verified</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-waterbase-600">
                                    {selectedArea.estimatedCleanupEffort}
                                </div>
                                <div className="text-sm text-gray-600">Cleanup Effort</div>
                            </div>
                        </div>

                        {/* Area Information */}
                        <Card className="border-waterbase-200">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>Area Information</span>
                                    <Badge
                                        className={cn("text-sm", getSeverityColor(selectedArea.severityLevel))}
                                    >
                                        {selectedArea.severityLevel} Priority
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Location</label>
                                    <p className="text-sm mt-1">{selectedArea.location}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Coordinates</label>
                                    <p className="text-sm mt-1 font-mono">
                                        {selectedArea.coordinates.lat.toFixed(6)},{" "}
                                        {selectedArea.coordinates.lng.toFixed(6)}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Last Reported</label>
                                    <p className="text-sm mt-1">{selectedArea.lastReported}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Description</label>
                                    <p className="text-sm mt-1">{selectedArea.description}</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Reports Grid with Images */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-waterbase-950">Individual Reports</h3>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {selectedArea.reports.map((report) => (
                                    <Card
                                        key={report.id}
                                        className="border-gray-200 hover:shadow-md transition-shadow"
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex gap-4">
                                                {/* Image Container with Hover Zoom */}
                                                <div className="relative w-24 h-24 flex-shrink-0">
                                                    <img
                                                        src={
                                                            report.image.startsWith("data:")
                                                                ? report.image
                                                                : `data:image/jpeg;base64,${report.image}`
                                                        }
                                                        alt={report.title}
                                                        className="w-full h-full object-cover rounded-lg cursor-pointer transition-transform hover:scale-105"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src =
                                                                "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMiA5VjEzTTEyIDE3SDE2TTggMTdIMTJNOCAxM0gxNk04IDlIMTYiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+";
                                                        }}
                                                        onClick={() => onViewReport(report)}
                                                        onMouseEnter={() =>
                                                            setHoveredImage(report.id.toString())
                                                        }
                                                        onMouseLeave={() => setHoveredImage(null)}
                                                    />

                                                    {/* Hover Zoom Modal */}
                                                    {hoveredImage === report.id.toString() && (
                                                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 pointer-events-none">
                                                            <img
                                                                src={
                                                                    report.image.startsWith("data:")
                                                                        ? report.image
                                                                        : `data:image/jpeg;base64,${report.image}`
                                                                }
                                                                alt={report.title}
                                                                className="max-w-[80vw] max-h-[80vh] object-contain rounded-lg shadow-2xl"
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Report Details */}
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-start justify-between">
                                                        <h4 className="font-medium text-sm line-clamp-2">
                                                            {report.title}
                                                        </h4>
                                                        <div className="flex gap-1">
                                                            <Badge
                                                                className={cn(
                                                                    "text-xs",
                                                                    getSeverityColor(report.severityByUser)
                                                                )}
                                                            >
                                                                {report.severityByUser}
                                                            </Badge>
                                                            <Badge
                                                                className={cn(
                                                                    "text-xs",
                                                                    getStatusColor(report.status)
                                                                )}
                                                            >
                                                                {report.status}
                                                            </Badge>
                                                        </div>
                                                    </div>

                                                    <p className="text-xs text-gray-600 line-clamp-2">
                                                        {report.content}
                                                    </p>

                                                    <div className="space-y-1 text-xs text-gray-500">
                                                        <div>📍 {report.pollutionType}</div>
                                                        <div>
                                                            📅{" "}
                                                            {new Date(report.created_at).toLocaleDateString()}
                                                        </div>
                                                        {report.user && (
                                                            <div>
                                                                👤 {report.user.firstName} {report.user.lastName}
                                                            </div>
                                                        )}
                                                        <div>💬 {report.content}</div>
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex gap-2 mt-2">
                                                        {report.status === "pending" ? (
                                                            <>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="flex-1 text-green-600 border-green-200 hover:bg-green-50"
                                                                    onClick={() => onApproveReport(report.id)}
                                                                >
                                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                                    Approve
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                                                                    onClick={() => onDeclineReport(report.id)}
                                                                >
                                                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                                                    Decline
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="w-full"
                                                                onClick={() => onViewReport(report)}
                                                            >
                                                                <Eye className="w-3 h-3 mr-1" />
                                                                View Details
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-between pt-4 border-t">
                            <div className="flex items-center space-x-2">
                                <Button variant="outline">
                                    <MapPin className="w-4 h-4 mr-2" />
                                    View on Map
                                </Button>

                                {/* Bulk Actions for Pending Reports */}
                                {selectedArea.reports.some((r) => r.status === "pending") && (
                                    <>
                                        <Button
                                            variant="outline"
                                            className="text-green-600 border-green-200 hover:bg-green-50"
                                            onClick={() =>
                                                onBulkApproveReports(
                                                    selectedArea.reports.filter((r) => r.status === "pending")
                                                )
                                            }
                                        >
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Approve All Pending (
                                            {selectedArea.reports.filter((r) => r.status === "pending").length})
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="text-red-600 border-red-200 hover:bg-red-50"
                                            onClick={() =>
                                                onBulkDeclineReports(
                                                    selectedArea.reports.filter((r) => r.status === "pending")
                                                )
                                            }
                                        >
                                            <AlertTriangle className="w-4 h-4 mr-2" />
                                            Decline All Pending (
                                            {selectedArea.reports.filter((r) => r.status === "pending").length})
                                        </Button>
                                    </>
                                )}
                            </div>

                            <div className="space-x-2">
                                <Button variant="outline" onClick={onClose}>
                                    Close
                                </Button>
                                <Button
                                    className="bg-waterbase-500 hover:bg-waterbase-600"
                                    onClick={() => {
                                        onClose();
                                        onCreateEvent();
                                    }}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Cleanup Event
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};