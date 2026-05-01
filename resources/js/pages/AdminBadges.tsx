import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import { Award, Plus, Edit, Trash2, Upload, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Badge {
  id: number;
  name: string;
  description: string | null;
  icon_url: string | null;
  type: 'auto' | 'manual';
  criteria: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

interface UserSummary {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface UserBadge {
  id: number;
  name: string;
  description: string | null;
  type: string;
  earned_at: string | null;
  issued_at: string | null;
  status: 'active' | 'revoked';
}

export const AdminBadges = () => {
  const { token } = useAuth();
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedIssueBadge, setSelectedIssueBadge] = useState('');
  const [selectedIssueUser, setSelectedIssueUser] = useState('');
  const [issueNotes, setIssueNotes] = useState('');

  const [lookupUserId, setLookupUserId] = useState('');
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);

  const [createIconPreview, setCreateIconPreview] = useState<string | null>(null);
  const [editIconPreview, setEditIconPreview] = useState<string | null>(null);
  const createFileRef = useRef<HTMLInputElement>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  const [createForm, setCreateForm] = useState({ name: '', description: '', icon_url: '', type: 'manual', criteria: '' });
  const [editForm, setEditForm] = useState({ name: '', description: '', icon_url: '', type: 'manual', criteria: '' });
  const [createIconFile, setCreateIconFile] = useState<File | null>(null);
  const [editIconFile, setEditIconFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [isRevoking, setIsRevoking] = useState<number | null>(null);

  const fetchBadges = async () => {
    try {
      const res = await fetch('/api/badges', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      setAllBadges(json.data || []);
    } catch (error) {
      console.error('Failed to fetch badges', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      setUsers(json.data || json || []);
    } catch (error) {
      console.error('Failed to fetch users', error);
    }
  };

  useEffect(() => {
    if (token) {
      fetchBadges();
      fetchUsers();
    }
  }, [token]);

  const handleCreateBadge = async () => {
    if (!createForm.name.trim()) {
      toast({ title: "Name required", description: "Please enter a badge name.", variant: "destructive" });
      return;
    }
    setIsCreating(true);
    try {
      let iconUrl = createForm.icon_url || null;

      if (createIconFile) {
        const formData = new FormData();
        formData.append('icon', createIconFile);
        const uploadRes = await fetch('/api/admin/badges/icon', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadJson.message || 'Icon upload failed');
        iconUrl = uploadJson.icon_url || null;
      }

      const body = {
        name: createForm.name,
        description: createForm.description || null,
        icon_url: iconUrl,
        type: createForm.type,
        criteria: createForm.criteria ? JSON.parse(createForm.criteria) : null,
      };
      const res = await fetch('/api/admin/badges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create badge');
      }
      toast({ title: "Badge created", description: `"${createForm.name}" has been created successfully.` });
      setShowCreateDialog(false);
      setCreateForm({ name: '', description: '', icon_url: '', type: 'manual', criteria: '' });
      setCreateIconPreview(null);
      setCreateIconFile(null);
      fetchBadges();
    } catch (error) {
      toast({ title: "Failed to create badge", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditBadge = async () => {
    if (!selectedBadge) return;
    if (!editForm.name.trim()) {
      toast({ title: "Name required", description: "Please enter a badge name.", variant: "destructive" });
      return;
    }
    setIsEditing(true);
    try {
      let iconUrl = editForm.icon_url || null;

      if (editIconFile) {
        const formData = new FormData();
        formData.append('icon', editIconFile);
        const uploadRes = await fetch('/api/admin/badges/icon', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadJson.message || 'Icon upload failed');
        iconUrl = uploadJson.icon_url || null;
      }

      const body = {
        name: editForm.name,
        description: editForm.description || null,
        icon_url: iconUrl,
        type: editForm.type,
        criteria: editForm.criteria ? JSON.parse(editForm.criteria) : null,
      };
      const res = await fetch(`/api/admin/badges/${selectedBadge.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to update badge');
      }
      toast({ title: "Badge updated", description: `"${editForm.name}" has been updated successfully.` });
      setShowEditDialog(false);
      setSelectedBadge(null);
      setEditIconPreview(null);
      setEditIconFile(null);
      fetchBadges();
    } catch (error) {
      toast({ title: "Failed to update badge", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteBadge = async (badgeId: number) => {
    if (!window.confirm('Are you sure you want to delete this badge?')) return;
    try {
      const res = await fetch(`/api/admin/badges/${badgeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to delete badge');
      }
      toast({ title: "Badge deleted", description: "The badge has been removed." });
      fetchBadges();
    } catch (error) {
      toast({ title: "Failed to delete badge", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    }
  };

  const handleIssueBadge = async () => {
    if (!selectedIssueBadge || !selectedIssueUser) return;
    setIsIssuing(true);
    try {
      const res = await fetch('/api/badges/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          user_id: parseInt(selectedIssueUser),
          badge_id: parseInt(selectedIssueBadge),
          notes: issueNotes || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to issue badge');
      }
      const badgeName = allBadges.find(b => b.id === parseInt(selectedIssueBadge))?.name || selectedIssueBadge;
      const userName = users.find(u => u.id === parseInt(selectedIssueUser))?.firstName || selectedIssueUser;
      toast({ title: "Badge issued", description: `${badgeName} has been issued to ${userName}.` });
      setSelectedIssueBadge('');
      setSelectedIssueUser('');
      setIssueNotes('');
      fetchBadges();
    } catch (error) {
      toast({ title: "Failed to issue badge", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    } finally {
      setIsIssuing(false);
    }
  };

  const handleLookupUserBadges = async () => {
    if (!lookupUserId) return;
    setLookupLoading(true);
    try {
      const res = await fetch(`/api/users/${lookupUserId}/badges`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setUserBadges(json.data || []);
    } catch (error) {
      console.error('Failed to lookup user badges', error);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleRevokeBadge = async (badgeId: number) => {
    if (!lookupUserId) return;
    setIsRevoking(badgeId);
    try {
      const res = await fetch(`/api/users/${lookupUserId}/badges/${badgeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to revoke badge');
      }
      toast({ title: "Badge revoked", description: "The badge has been revoked from the user." });
      handleLookupUserBadges();
    } catch (error) {
      toast({ title: "Failed to revoke badge", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    } finally {
      setIsRevoking(null);
    }
  };

  const openEditDialog = (badge: Badge) => {
    setSelectedBadge(badge);
    setEditForm({
      name: badge.name,
      description: badge.description || '',
      icon_url: badge.icon_url || '',
      type: badge.type,
      criteria: badge.criteria ? JSON.stringify(badge.criteria) : '',
    });
    setEditIconPreview(badge.icon_url || null);
    setEditIconFile(null);
    setShowEditDialog(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-waterbase-950 mb-2">Badge Management</h1>
          <p className="text-waterbase-700">Create, edit, issue, and revoke badges for users</p>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All Badges ({allBadges.length})</TabsTrigger>
            <TabsTrigger value="issue">Issue Badge</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <Card className="border-waterbase-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center">
                  <Award className="w-5 h-5 mr-2" />
                  All Badges
                </CardTitle>
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-waterbase-500 hover:bg-waterbase-600">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Badge
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Create New Badge</DialogTitle>
                      <DialogDescription>Add a new badge to the system</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="createName">Name</Label>
                        <Input id="createName" placeholder="Badge name" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor="createDescription">Description</Label>
                        <Textarea id="createDescription" placeholder="Badge description" value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} rows={2} />
                      </div>
                      <div>
                        <Label>Icon Image</Label>
                        <div className="space-y-2">
                          <input
                            type="file"
                            ref={createFileRef}
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setCreateIconFile(file);
                                setCreateIconPreview(URL.createObjectURL(file));
                                setCreateForm({ ...createForm, icon_url: '' });
                              }
                            }}
                          />
                          {createIconPreview ? (
                            <div className="relative w-16 h-16">
                              <img src={createIconPreview} alt="Badge icon preview" className="w-16 h-16 rounded-full object-cover border" />
                              <button
                                type="button"
                                onClick={() => {
                                  setCreateIconFile(null);
                                  setCreateIconPreview(null);
                                  if (createFileRef.current) createFileRef.current.value = '';
                                }}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => createFileRef.current?.click()}
                              className="w-full"
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Upload Icon
                            </Button>
                          )}
                          {createForm.icon_url && (
                            <button
                              type="button"
                              onClick={() => {
                                setCreateForm({ ...createForm, icon_url: '' });
                                setCreateIconPreview(null);
                              }}
                              className="text-xs text-waterbase-500 underline"
                            >
                              Use URL instead
                            </button>
                          )}
                        </div>
                        <Input
                          id="createIconUrl"
                          placeholder="Or paste icon URL here"
                          value={createForm.icon_url}
                          onChange={(e) => {
                            setCreateForm({ ...createForm, icon_url: e.target.value });
                            setCreateIconPreview(null);
                          }}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="createType">Type</Label>
                        <Select value={createForm.type} onValueChange={(value) => setCreateForm({ ...createForm, type: value })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="auto">Auto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="createCriteria">Criteria (JSON)</Label>
                        <Textarea id="createCriteria" placeholder={'{"min_reports": 10}'} value={createForm.criteria} onChange={(e) => setCreateForm({ ...createForm, criteria: e.target.value })} rows={2} />
                      </div>
                      <div className="flex space-x-2 pt-4">
                        <Button onClick={handleCreateBadge} className="flex-1 bg-waterbase-500 hover:bg-waterbase-600" disabled={isCreating || !createForm.name.trim()}>
                          {isCreating ? 'Creating...' : 'Create Badge'}
                        </Button>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1" disabled={isCreating}>Cancel</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-waterbase-600">Loading badges...</div>
                ) : allBadges.length === 0 ? (
                  <div className="text-center py-8 text-waterbase-600">No badges found</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Criteria</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allBadges.map((badge) => (
                        <TableRow key={badge.id}>
                          <TableCell className="font-medium">{badge.name}</TableCell>
                          <TableCell className="text-sm text-gray-600 max-w-xs truncate">{badge.description || '\u2014'}</TableCell>
                          <TableCell>
                            <UIBadge variant="outline" className="text-xs">{badge.type}</UIBadge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 max-w-xs truncate">{badge.criteria ? JSON.stringify(badge.criteria) : '\u2014'}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Button variant="outline" size="sm" onClick={() => openEditDialog(badge)}>
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteBadge(badge.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="issue" className="space-y-6">
            <Card className="border-waterbase-200">
              <CardHeader>
                <CardTitle>Issue Badge to User</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="issueBadge">Select Badge</Label>
                  <Select value={selectedIssueBadge} onValueChange={setSelectedIssueBadge}>
                    <SelectTrigger><SelectValue placeholder="Select badge..." /></SelectTrigger>
                    <SelectContent>
                      {allBadges.map((b) => (<SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="issueUser">Select User</Label>
                  <Select value={selectedIssueUser} onValueChange={setSelectedIssueUser}>
                    <SelectTrigger><SelectValue placeholder="Select user..." /></SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (<SelectItem key={u.id} value={String(u.id)}>{u.firstName} {u.lastName} ({u.email})</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="issueNotes">Notes (optional)</Label>
                  <Input id="issueNotes" placeholder="Reason for issuing..." value={issueNotes} onChange={(e) => setIssueNotes(e.target.value)} />
                </div>
                <Button onClick={handleIssueBadge} className="bg-waterbase-500 hover:bg-waterbase-600" disabled={!selectedIssueBadge || !selectedIssueUser || isIssuing}>
                  {isIssuing ? 'Issuing...' : 'Issue Badge'}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-waterbase-200">
              <CardHeader>
                <CardTitle>User Badge Lookup & Revoke</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="lookupUser">Select User</Label>
                  <Select value={lookupUserId} onValueChange={setLookupUserId}>
                    <SelectTrigger><SelectValue placeholder="Select user to view badges..." /></SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (<SelectItem key={u.id} value={String(u.id)}>{u.firstName} {u.lastName} ({u.email})</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleLookupUserBadges} className="bg-waterbase-500 hover:bg-waterbase-600" disabled={!lookupUserId || lookupLoading}>
                  {lookupLoading ? 'Loading...' : 'Lookup Badges'}
                </Button>

                {userBadges.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Badge</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userBadges.map((ub) => (
                        <TableRow key={ub.id}>
                          <TableCell className="font-medium">{ub.name}</TableCell>
                          <TableCell><UIBadge variant="outline" className="text-xs">{ub.type}</UIBadge></TableCell>
                          <TableCell>
                            <UIBadge className={`text-xs ${ub.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{ub.status}</UIBadge>
                          </TableCell>
                          <TableCell className="text-xs text-gray-600">
                            {ub.issued_at || ub.earned_at || '\u2014'}
                          </TableCell>
                          <TableCell>
                            {ub.status === 'active' && (
                              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleRevokeBadge(ub.id)} disabled={isRevoking === ub.id}>
                                {isRevoking === ub.id ? 'Revoking...' : 'Revoke'}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {lookupUserId && userBadges.length === 0 && !lookupLoading && (
                  <p className="text-sm text-gray-600">No badges found for this user.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Badge</DialogTitle>
              <DialogDescription>Update badge information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editName">Name</Label>
                <Input id="editName" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="editDescription">Description</Label>
                <Textarea id="editDescription" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={2} />
              </div>
              <div>
                        <Label>Icon Image</Label>
                        <div className="space-y-2">
                          <input
                            type="file"
                            ref={editFileRef}
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setEditIconFile(file);
                                setEditIconPreview(URL.createObjectURL(file));
                                setEditForm({ ...editForm, icon_url: '' });
                              }
                            }}
                          />
                          {editIconPreview ? (
                            <div className="relative w-16 h-16">
                              <img src={editIconPreview} alt="Badge icon preview" className="w-16 h-16 rounded-full object-cover border" />
                              <button
                                type="button"
                                onClick={() => {
                                  setEditIconFile(null);
                                  setEditIconPreview(null);
                                  if (editFileRef.current) editFileRef.current.value = '';
                                }}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => editFileRef.current?.click()}
                              className="w-full"
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Upload Icon
                            </Button>
                          )}
                          {editForm.icon_url && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditForm({ ...editForm, icon_url: '' });
                                setEditIconPreview(null);
                              }}
                              className="text-xs text-waterbase-500 underline"
                            >
                              Use URL instead
                            </button>
                          )}
                        </div>
                        <Input
                          id="editIconUrl"
                          placeholder="Or paste icon URL here"
                          value={editForm.icon_url}
                          onChange={(e) => {
                            setEditForm({ ...editForm, icon_url: e.target.value });
                            setEditIconPreview(null);
                          }}
                          className="mt-2"
                        />
                      </div>
              <div>
                <Label htmlFor="editType">Type</Label>
                <Select value={editForm.type} onValueChange={(value) => setEditForm({ ...editForm, type: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="auto">Auto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="editCriteria">Criteria (JSON)</Label>
                <Textarea id="editCriteria" value={editForm.criteria} onChange={(e) => setEditForm({ ...editForm, criteria: e.target.value })} rows={2} />
              </div>
              <div className="flex space-x-2 pt-4">
                <Button onClick={handleEditBadge} className="flex-1 bg-waterbase-500 hover:bg-waterbase-600" disabled={isEditing || !editForm.name.trim()}>
                  {isEditing ? 'Updating...' : 'Update Badge'}
                </Button>
                <Button variant="outline" onClick={() => { setShowEditDialog(false); setSelectedBadge(null); }} className="flex-1" disabled={isEditing}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
