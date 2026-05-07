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
    Edit,
    Trash2,
    Eye,
    Users,
    Shield,
    MapPin,
    Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UserRecord {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    organization?: string;
    areaOfResponsibility?: string;
    created_at: string;
    attended_events_count?: number;
    created_events_count?: number;
    reports_count?: number;
    total_points?: number;
}

export const AdminUsers = () => {
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterRole, setFilterRole] = useState("all");
    const [isLoading, setIsLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
    const [showUserDialog, setShowUserDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const [editForm, setEditForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        role: "",
        organization: "",
        areaOfResponsibility: "",
    });

    const fetchUsers = async (page: number) => {
        try {
            setIsLoading(true);
            let url = `/api/admin/users?page=${page}`;
            if (filterRole !== 'all') url += `&role=${filterRole}`;
            if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                },
            });
            if (!response.ok) throw new Error('Failed to fetch users');
            const data = await response.json();
            setUsers(data.data || []);
            setTotalPages(data.last_page || 1);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch users');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [filterRole, searchQuery]);

    useEffect(() => {
        fetchUsers(currentPage);
    }, [currentPage, filterRole, searchQuery]);

    const getRoleColor = (role: string) => {
        switch (role.toLowerCase()) {
            case "admin": return "bg-purple-100 text-purple-800";
            case "ngo": return "bg-green-100 text-green-800";
            case "lgu": return "bg-blue-100 text-blue-800";
            case "researcher": return "bg-indigo-100 text-indigo-800";
            case "volunteer": return "bg-yellow-100 text-yellow-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    const openEditDialog = (user: UserRecord) => {
        setSelectedUser(user);
        setEditForm({
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            email: user.email || "",
            role: user.role || "",
            organization: user.organization || "",
            areaOfResponsibility: user.areaOfResponsibility || "",
        });
        setShowEditDialog(true);
    };

    const handleEditUser = async () => {
        if (!selectedUser) return;
        setIsSubmitting(true);
        setError("");
        try {
            const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(editForm),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to update user');
            }
            setShowEditDialog(false);
            fetchUsers(currentPage);
        } catch (err: any) {
            setError(err.message || 'Failed to update user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;
        setIsSubmitting(true);
        setError("");
        try {
            const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                },
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to delete user');
            }
            setShowDeleteDialog(false);
            fetchUsers(currentPage);
        } catch (err: any) {
            setError(err.message || 'Failed to delete user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const roleStats = {
        total: users.length,
        admin: users.filter((u) => u.role?.toLowerCase() === 'admin').length,
        ngo: users.filter((u) => u.role?.toLowerCase() === 'ngo').length,
        lgu: users.filter((u) => u.role?.toLowerCase() === 'lgu').length,
        volunteer: users.filter((u) => u.role?.toLowerCase() === 'volunteer').length,
        researcher: users.filter((u) => u.role?.toLowerCase() === 'researcher').length,
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navigation />
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-waterbase-950 mb-1">User Management</h1>
                            <p className="text-sm text-waterbase-700">Manage platform users, roles, and organizations</p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card className="border-waterbase-200">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-600">Total Users</p>
                                    <p className="text-2xl font-bold text-waterbase-950">{roleStats.total}</p>
                                </div>
                                <Users className="w-6 h-6 text-waterbase-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-waterbase-200">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-600">Admins</p>
                                    <p className="text-2xl font-bold text-purple-600">{roleStats.admin}</p>
                                </div>
                                <Shield className="w-6 h-6 text-purple-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-waterbase-200">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-600">Organizations</p>
                                    <p className="text-2xl font-bold text-green-600">{roleStats.ngo + roleStats.lgu}</p>
                                </div>
                                <MapPin className="w-6 h-6 text-green-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-waterbase-200">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-600">Volunteers</p>
                                    <p className="text-2xl font-bold text-yellow-600">{roleStats.volunteer}</p>
                                </div>
                                <Calendar className="w-6 h-6 text-yellow-600" />
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
                                    placeholder="Search users by name, email, or organization..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-8 text-xs"
                                />
                            </div>
                            <Select value={filterRole} onValueChange={setFilterRole}>
                                <SelectTrigger className="w-32 h-8 text-xs">
                                    <SelectValue placeholder="Role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Roles</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="ngo">NGO</SelectItem>
                                    <SelectItem value="lgu">LGU</SelectItem>
                                    <SelectItem value="volunteer">Volunteer</SelectItem>
                                    <SelectItem value="researcher">Researcher</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Users Table */}
                <Card className="border-waterbase-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center text-lg">
                            <FileText className="w-4 h-4 mr-2" />
                            All Users ({users.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs">User</TableHead>
                                        <TableHead className="text-xs">Role</TableHead>
                                        <TableHead className="text-xs">Organization</TableHead>
                                        <TableHead className="text-xs">Area</TableHead>
                                        <TableHead className="text-xs">Joined</TableHead>
                                        <TableHead className="text-xs">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-xs text-gray-500">
                                                Loading users...
                                            </TableCell>
                                        </TableRow>
                                    ) : users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="py-2">
                                                <div>
                                                    <div className="font-medium text-xs">{user.firstName} {user.lastName}</div>
                                                    <div className="text-xs text-gray-600">{user.email}</div>
                                                    <div className="text-xs text-gray-500 mt-1">ID: {user.id}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <Badge className={cn("text-xs h-5 px-1", getRoleColor(user.role))}>
                                                    {user.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <div className="text-xs">{user.organization || '-'}</div>
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <div className="text-xs">{user.areaOfResponsibility || '-'}</div>
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <div className="text-xs text-gray-600">
                                                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <div className="flex items-center space-x-1">
                                                    <Dialog open={showUserDialog && selectedUser?.id === user.id} onOpenChange={setShowUserDialog}>
                                                        <DialogTrigger asChild>
                                                            <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setSelectedUser(user)}>
                                                                <Eye className="w-3 h-3" />
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                                            <DialogHeader>
                                                                <DialogTitle>User Details</DialogTitle>
                                                                <DialogDescription>Complete information for user #{selectedUser?.id}</DialogDescription>
                                                            </DialogHeader>
                                                            <div className="space-y-4">
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div>
                                                                        <Label>Name</Label>
                                                                        <div className="text-sm font-medium">{selectedUser?.firstName} {selectedUser?.lastName}</div>
                                                                    </div>
                                                                    <div>
                                                                        <Label>Role</Label>
                                                                        <Badge className={cn("text-xs", getRoleColor(selectedUser?.role || ""))}>{selectedUser?.role}</Badge>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <Label>Email</Label>
                                                                    <div className="text-sm">{selectedUser?.email}</div>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div>
                                                                        <Label>Organization</Label>
                                                                        <div className="text-sm">{selectedUser?.organization || '-'}</div>
                                                                    </div>
                                                                    <div>
                                                                        <Label>Area of Responsibility</Label>
                                                                        <div className="text-sm">{selectedUser?.areaOfResponsibility || '-'}</div>
                                                                    </div>
                                                                </div>
                                                                <div className="grid grid-cols-3 gap-4">
                                                                    <div>
                                                                        <Label>Events Attended</Label>
                                                                        <div className="text-sm font-medium">{selectedUser?.attended_events_count ?? 0}</div>
                                                                    </div>
                                                                    <div>
                                                                        <Label>Events Created</Label>
                                                                        <div className="text-sm font-medium">{selectedUser?.created_events_count ?? 0}</div>
                                                                    </div>
                                                                    <div>
                                                                        <Label>Reports</Label>
                                                                        <div className="text-sm font-medium">{selectedUser?.reports_count ?? 0}</div>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <Label>Total Points</Label>
                                                                    <div className="text-sm font-medium">{selectedUser?.total_points ?? 0}</div>
                                                                </div>
                                                                <div>
                                                                    <Label>Joined</Label>
                                                                    <div className="text-sm">{selectedUser?.created_at ? new Date(selectedUser.created_at).toLocaleString() : '-'}</div>
                                                                </div>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>

                                                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => openEditDialog(user)}>
                                                        <Edit className="w-3 h-3" />
                                                    </Button>

                                                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700" onClick={() => { setSelectedUser(user); setShowDeleteDialog(true); }}>
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

                {/* Edit User Dialog */}
                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Edit User</DialogTitle>
                            <DialogDescription>Update user information and role</DialogDescription>
                        </DialogHeader>
                        {error && (
                            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>
                        )}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="editFirstName">First Name</Label>
                                    <Input id="editFirstName" value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
                                </div>
                                <div>
                                    <Label htmlFor="editLastName">Last Name</Label>
                                    <Input id="editLastName" value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="editEmail">Email</Label>
                                <Input id="editEmail" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="editRole">Role</Label>
                                    <Select value={editForm.role} onValueChange={(value) => setEditForm({ ...editForm, role: value })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="admin">Admin</SelectItem>
                                            <SelectItem value="ngo">NGO</SelectItem>
                                            <SelectItem value="lgu">LGU</SelectItem>
                                            <SelectItem value="volunteer">Volunteer</SelectItem>
                                            <SelectItem value="researcher">Researcher</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="editOrganization">Organization</Label>
                                    <Input id="editOrganization" value={editForm.organization} onChange={(e) => setEditForm({ ...editForm, organization: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="editArea">Area of Responsibility</Label>
                                <Input id="editArea" value={editForm.areaOfResponsibility} onChange={(e) => setEditForm({ ...editForm, areaOfResponsibility: e.target.value })} />
                            </div>
                            <div className="flex space-x-2 pt-4">
                                <Button onClick={handleEditUser} disabled={isSubmitting} className="flex-1 bg-waterbase-500 hover:bg-waterbase-600">
                                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                                </Button>
                                <Button variant="outline" onClick={() => setShowEditDialog(false)} className="flex-1">
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Delete User</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete {selectedUser?.firstName} {selectedUser?.lastName}? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        {error && (
                            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>
                        )}
                        <div className="flex space-x-2 pt-4">
                            <Button onClick={handleDeleteUser} disabled={isSubmitting} className="flex-1 bg-red-500 hover:bg-red-600">
                                {isSubmitting ? 'Deleting...' : 'Delete'}
                            </Button>
                            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="flex-1">
                                Cancel
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};
