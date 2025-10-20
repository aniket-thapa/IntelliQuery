// src/pages/app/settings/TeamPage.jsx
import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoreHorizontal, UserPlus, LoaderCircle } from 'lucide-react';

export default function TeamPage() {
  const { user } = useAuth();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isInviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState(null);
  const [memberToRemove, setMemberToRemove] = useState(null);

  useEffect(() => {
    fetchTenant();
  }, []);

  const fetchTenant = async () => {
    try {
      const res = await api.get('/tenant/me');
      setTenant(res.data.tenant);
    } catch (error) {
      toast.error('Failed to fetch team members.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const InviteDialog = () => {
    const [form, setForm] = useState({ email: '', name: '', role: 'member' });
    const [isInviting, setInviting] = useState(false);

    const handleInvite = async (e) => {
      e.preventDefault();
      setInviting(true);
      try {
        await api.post('/tenant/invite', form);
        toast.success('Invitation Sent!', {
          description: `An invitation has been sent to ${form.email}.`,
        });
        setInviteDialogOpen(false);
        fetchTenant(); // Refresh the list
      } catch (error) {
        toast.error('Invite Failed', {
          description:
            error.response?.data?.error || 'Could not send invitation.',
        });
      } finally {
        setInviting(false);
      }
    };

    return (
      <Dialog open={isInviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogTrigger asChild>
          <Button className="w-full sm:w-auto">
            <UserPlus className="mr-2 h-4 w-4" /> Invite Member
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a new member</DialogTitle>
            <DialogDescription>
              Enter the details of the person you want to invite to your
              workspace.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select
                value={form.role}
                onValueChange={(value) => setForm({ ...form, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isInviting}>
                {isInviting && (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                )}
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  /**
   * Dialog for changing a member's role
   */
  const ChangeRoleDialog = () => {
    const [newRole, setNewRole] = useState(memberToEdit?.role || 'member');
    const [isUpdating, setUpdating] = useState(false);

    const handleUpdateRole = async (e) => {
      e.preventDefault();
      if (!memberToEdit) return;
      setUpdating(true);

      try {
        // Use the PUT /api/user/:id route
        await api.put(`/user/${memberToEdit._id}`, { role: newRole });
        toast.success('Role updated successfully.');
        setMemberToEdit(null); // Close dialog
        fetchTenant(); // Refresh list
      } catch (error) {
        toast.error('Update Failed', {
          description: error.response?.data?.error || 'Could not update role.',
        });
      } finally {
        setUpdating(false);
      }
    };

    return (
      <Dialog open={!!memberToEdit} onOpenChange={() => setMemberToEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change role for {memberToEdit?.name}</DialogTitle>
            <DialogDescription>
              Select a new role for {memberToEdit?.email}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateRole} className="space-y-4 py-4">
            <div>
              <Label htmlFor="new-role">Role</Label>
              <Select id="new-role" value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setMemberToEdit(null)}
                type="button"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating && (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  /**
   * Dialog for confirming member removal
   */
  const RemoveMemberDialog = () => {
    const [isRemoving, setRemoving] = useState(false);

    const handleRemove = async () => {
      if (!memberToRemove) return;
      setRemoving(true);

      try {
        // Use the DELETE /api/user/:id route
        await api.delete(`/user/${memberToRemove._id}`);
        toast.success('Member removed successfully.');
        setMemberToRemove(null); // Close dialog
        fetchTenant(); // Refresh list
      } catch (error) {
        toast.error('Remove Failed', {
          description:
            error.response?.data?.error || 'Could not remove member.',
        });
      } finally {
        setRemoving(false);
      }
    };

    return (
      <Dialog
        open={!!memberToRemove}
        onOpenChange={() => setMemberToRemove(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This will remove <strong>{memberToRemove?.name}</strong> from the
              workspace. They will no longer have access. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setMemberToRemove(null)}
              disabled={isRemoving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={isRemoving}
            >
              {isRemoving && (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              )}
              Remove Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Manage who has access to this workspace.
          </CardDescription>
        </div>
        <InviteDialog />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <LoaderCircle className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenant?.members.map((member) => (
                  <TableRow key={member._id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell className="capitalize">{member.role}</TableCell>
                    <TableCell className="text-right">
                      {member._id !== tenant.ownerId &&
                        tenant.ownerId === user._id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {/* Trigger for Change Role Dialog */}
                              <DropdownMenuItem
                                onSelect={() => setMemberToEdit(member)}
                              >
                                Change role
                              </DropdownMenuItem>
                              {/* Trigger for Remove Member Dialog */}
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={() => setMemberToRemove(member)}
                              >
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Render the dialogs */}
      {/* They will be invisible until their respective state is set */}
      <ChangeRoleDialog />
      <RemoveMemberDialog />
    </Card>
  );
}
