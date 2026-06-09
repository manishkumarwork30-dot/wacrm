'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  Loader2, 
  Shield, 
  Trash2, 
  User as UserIcon, 
  Search, 
  AlertTriangle,
  Mail,
  Calendar,
  Lock
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role: 'super_admin' | 'admin' | 'user' | 'inactive';
  created_at: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, profileLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [deleteUser, setDeleteUser] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [roleChangingUser, setRoleChangingUser] = useState<{ user: UserProfile; nextRole: string } | null>(null);
  const [savingRole, setSavingRole] = useState(false);

  useEffect(() => {
    if (authLoading || profileLoading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }

    if (profile?.role !== 'super_admin') {
      // Forbidden: redirect or stay on page with forbidden view. We'll show forbidden view.
      setLoading(false);
      return;
    }

    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, profileLoading, user, profile]);

  async function fetchUsers() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users');
      if (!res.ok) {
        throw new Error(`Failed to load users (HTTP ${res.status})`);
      }
      const data = await res.json();
      setUsersList(data.profiles || []);
    } catch (err) {
      console.error('Fetch users error:', err);
      toast.error('Failed to load user profiles');
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChangeConfirm() {
    if (!roleChangingUser) return;
    const { user: target, nextRole } = roleChangingUser;

    try {
      setSavingRole(true);
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: target.user_id,
          role: nextRole
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update role');
      }

      toast.success(`Role of ${target.full_name || target.email} updated to ${nextRole}`);
      setUsersList(prev => prev.map(u => u.id === target.id ? { ...u, role: nextRole as any } : u));
    } catch (err) {
      console.error('Update role error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setSavingRole(false);
      setRoleChangingUser(null);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteUser) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/admin/users?userId=${deleteUser.user_id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete user');
      }

      toast.success(`Account for ${deleteUser.full_name || deleteUser.email} deleted successfully`);
      setUsersList(prev => prev.filter(u => u.id !== deleteUser.id));
    } catch (err) {
      console.error('Delete user error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setDeleting(false);
      setDeleteUser(null);
    }
  }

  if (authLoading || profileLoading || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Gate view for non-superadmin
  if (profile?.role !== 'super_admin') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 mb-4">
          <Lock className="h-6 w-6 animate-bounce" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Access Restrained</h1>
        <p className="text-slate-400 text-sm max-w-sm leading-relaxed mb-6">
          This panel is restricted to Super Administrator accounts. Your current profile does not have permission to view this page.
        </p>
        <Button onClick={() => router.push('/dashboard')} className="bg-primary text-primary-foreground hover:bg-primary/90">
          Return to Dashboard
        </Button>
      </div>
    );
  }

  const filteredUsers = usersList.filter(u => {
    const query = searchQuery.toLowerCase();
    return (
      u.email.toLowerCase().includes(query) ||
      (u.full_name && u.full_name.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Admin Panel — User Management
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Monitor registration records, promote admin accounts, and suspend or delete user access.
          </p>
        </div>
      </div>

      {/* Users Card Table */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-white text-base">All Registered Profiles</CardTitle>
              <CardDescription className="text-slate-400">
                Found {filteredUsers.length} user accounts
              </CardDescription>
            </div>
            {/* Search Input */}
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Search name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-400">
              <thead className="text-xs uppercase bg-slate-950 border-b border-slate-800 text-slate-300">
                <tr>
                  <th scope="col" className="px-6 py-3.5">User Profile</th>
                  <th scope="col" className="px-6 py-3.5">Registered On</th>
                  <th scope="col" className="px-6 py-3.5">Role Status</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                      No matching user accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Profile Column */}
                      <td className="px-6 py-4 flex items-center gap-3">
                        <Avatar className="h-9 w-9 shrink-0 border border-slate-700">
                          {item.avatar_url ? (
                            <AvatarImage src={item.avatar_url} alt={item.full_name || 'User'} />
                          ) : null}
                          <AvatarFallback className="bg-slate-800 text-primary text-sm font-semibold">
                            {item.full_name?.charAt(0).toUpperCase() || item.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-white font-medium truncate">
                            {item.full_name || 'No Name Set'}
                          </p>
                          <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                            <Mail className="h-3 w-3 inline" />
                            {item.email}
                          </p>
                        </div>
                      </td>

                      {/* Created On Column */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-500" />
                          {new Date(item.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </td>

                      {/* Role Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Select
                          value={item.role}
                          disabled={item.user_id === user?.id} // Don't let users self-demote
                          onValueChange={(val) => {
                            if (val !== item.role) {
                              setRoleChangingUser({ user: item, nextRole: val || 'user' });
                            }
                          }}
                        >
                          <SelectTrigger className={`w-40 border-slate-700 text-white ${
                            item.role === 'super_admin' ? 'bg-primary/10 border-primary/40 text-primary' : 
                            item.role === 'inactive' ? 'bg-red-500/10 border-red-500/40 text-red-400' : 'bg-slate-800'
                          }`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700 text-white">
                            <SelectItem value="user" className="focus:bg-slate-700 focus:text-white">User</SelectItem>
                            <SelectItem value="admin" className="focus:bg-slate-700 focus:text-white">Admin</SelectItem>
                            <SelectItem value="super_admin" className="focus:bg-slate-700 focus:text-white">Super Admin</SelectItem>
                            <SelectItem value="inactive" className="text-red-400 focus:bg-red-950/40 focus:text-red-300">Inactive (Suspended)</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>

                      {/* Actions Column */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {item.user_id === user?.id ? (
                          <span className="text-xs text-slate-600 italic select-none">Logged In Account</span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteUser(item)}
                            className="text-slate-500 hover:text-red-400 hover:bg-red-950/30 shrink-0"
                            title="Delete Account permanently"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Role Change Modal */}
      <Dialog open={!!roleChangingUser} onOpenChange={(v) => !v && setRoleChangingUser(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500 animate-bounce" />
              Confirm Role Modification
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">
              Are you sure you want to change the role of{' '}
              <strong className="text-white">
                {roleChangingUser?.user.full_name || roleChangingUser?.user.email}
              </strong>{' '}
              to <strong className="text-primary">{roleChangingUser?.nextRole}</strong>?
              {roleChangingUser?.nextRole === 'inactive' && (
                <span className="block mt-2 text-red-400 font-semibold bg-red-950/30 border border-red-500/10 p-2 rounded">
                  ⚠️ This will immediately lock them out of the CRM system dashboard.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 bg-slate-900 border-slate-700 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setRoleChangingUser(null)}
              disabled={savingRole}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRoleChangeConfirm}
              disabled={savingRole}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {savingRole ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Change'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Modal */}
      <Dialog open={!!deleteUser} onOpenChange={(v) => !v && setDeleteUser(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500 animate-ping" />
              Delete Account Permanently
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">
              Are you sure you want to delete the user account for{' '}
              <strong className="text-white">
                {deleteUser?.full_name || deleteUser?.email}
              </strong>
              ?
              <span className="block mt-2 text-red-400">
                This deletes their auth credentials, configs, leads, messages, and pipelines. This action is irreversible.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 bg-slate-900 border-slate-700 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteUser(null)}
              disabled={deleting}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
