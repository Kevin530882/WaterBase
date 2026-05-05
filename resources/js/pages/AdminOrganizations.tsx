import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import { AlertCircle, CheckCircle, ExternalLink, Loader2, ShieldAlert, XCircle } from "lucide-react";

interface PendingOrganization {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    organization: string;
    areaOfResponsibility: string;
    organization_proof_document: string | null;
    created_at: string;
}

export const AdminOrganizations = () => {
    const { token } = useAuth();
    const [pendingOrgs, setPendingOrgs] = useState<PendingOrganization[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [selectedOrg, setSelectedOrg] = useState<PendingOrganization | null>(null);
    const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
    const [rejectNotes, setRejectNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });

    const fetchPending = async (page = 1) => {
        setIsLoading(true);
        setError("");
        try {
            const response = await fetch(`/api/admin/organizations/pending?page=${page}`, {
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
            });
            if (!response.ok) throw new Error("Failed to fetch pending organizations");
            const data = await response.json();
            setPendingOrgs(data.data || []);
            setPagination({
                current_page: data.current_page || 1,
                last_page: data.last_page || 1,
                total: data.total || 0,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPending();
    }, [token]);

    const handleAction = async () => {
        if (!selectedOrg || !actionType) return;
        setIsSubmitting(true);
        setError("");
        setSuccess("");

        try {
            const endpoint =
                actionType === "approve"
                    ? `/api/admin/organizations/${selectedOrg.id}/approve`
                    : `/api/admin/organizations/${selectedOrg.id}/reject`;
            const body = actionType === "reject" ? JSON.stringify({ notes: rejectNotes }) : undefined;

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body,
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || "Action failed");
            }

            setSuccess(
                actionType === "approve"
                    ? `Approved ${selectedOrg.organization}`
                    : `Rejected ${selectedOrg.organization}`
            );
            setSelectedOrg(null);
            setActionType(null);
            setRejectNotes("");
            fetchPending(pagination.current_page);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    const openProofDocument = (path: string | null) => {
        if (!path) return;
        const url = path.startsWith("http") ? path : `${window.location.origin}${path}`;
        window.open(url, "_blank");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-waterbase-50 to-enviro-50">
            <Navigation />
            <div className="max-w-7xl mx-auto py-8 px-4">
                <Card className="border-waterbase-200 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-2xl text-waterbase-950 flex items-center gap-2">
                            <ShieldAlert className="w-6 h-6 text-orange-500" />
                            Organization Approvals
                        </CardTitle>
                        <CardDescription className="text-waterbase-600">
                            Review and approve pending organization registrations (NGO, LGU, Researcher).
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {error && (
                            <Alert variant="destructive" className="mb-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        {success && (
                            <Alert className="mb-4 border-green-200 bg-green-50">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-700">{success}</AlertDescription>
                            </Alert>
                        )}

                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-waterbase-500" />
                            </div>
                        ) : pendingOrgs.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
                                <p className="text-lg font-medium">No pending organizations</p>
                                <p className="text-sm mt-1">All organization registrations have been reviewed.</p>
                            </div>
                        ) : (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Organization</TableHead>
                                            <TableHead>Area</TableHead>
                                            <TableHead>Proof</TableHead>
                                            <TableHead>Submitted</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pendingOrgs.map((org) => (
                                            <TableRow key={org.id}>
                                                <TableCell className="font-medium">
                                                    {org.firstName} {org.lastName}
                                                </TableCell>
                                                <TableCell>{org.email}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="capitalize">
                                                        {org.role}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{org.organization}</TableCell>
                                                <TableCell>{org.areaOfResponsibility}</TableCell>
                                                <TableCell>
                                                    {org.organization_proof_document ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openProofDocument(org.organization_proof_document)}
                                                        >
                                                            <ExternalLink className="w-4 h-4 mr-1" />
                                                            View
                                                        </Button>
                                                    ) : (
                                                        <span className="text-gray-400 text-sm">None</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-500">
                                                    {new Date(org.created_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-green-600 border-green-200 hover:bg-green-50"
                                                            onClick={() => {
                                                                setSelectedOrg(org);
                                                                setActionType("approve");
                                                            }}
                                                        >
                                                            <CheckCircle className="w-4 h-4 mr-1" />
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-red-600 border-red-200 hover:bg-red-50"
                                                            onClick={() => {
                                                                setSelectedOrg(org);
                                                                setActionType("reject");
                                                            }}
                                                        >
                                                            <XCircle className="w-4 h-4 mr-1" />
                                                            Reject
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {pagination.last_page > 1 && (
                                    <div className="flex justify-center gap-2 mt-4">
                                        {Array.from({ length: pagination.last_page }, (_, i) => i + 1).map((page) => (
                                            <Button
                                                key={page}
                                                variant={page === pagination.current_page ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => fetchPending(page)}
                                            >
                                                {page}
                                            </Button>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={!!actionType} onOpenChange={() => { setActionType(null); setSelectedOrg(null); setRejectNotes(""); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {actionType === "approve" ? "Approve Organization" : "Reject Organization"}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedOrg && (
                                <>
                                    {actionType === "approve"
                                        ? `Approve ${selectedOrg.organization} (${selectedOrg.email})? They will be able to log in immediately.`
                                        : `Reject ${selectedOrg.organization} (${selectedOrg.email})? They will be notified and unable to log in.`}
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    {actionType === "reject" && (
                        <div className="space-y-2">
                            <Label htmlFor="rejectNotes">Rejection Reason (optional)</Label>
                            <Textarea
                                id="rejectNotes"
                                value={rejectNotes}
                                onChange={(e) => setRejectNotes(e.target.value)}
                                placeholder="e.g., Proof of legitimacy was unclear or invalid."
                            />
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => { setActionType(null); setSelectedOrg(null); setRejectNotes(""); }}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAction}
                            disabled={isSubmitting}
                            className={actionType === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {actionType === "approve" ? "Approve" : "Reject"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminOrganizations;
