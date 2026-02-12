"use client";
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {Users, UserPlus, Mail, Send, Loader2, Calendar, Trash2, Shield} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MemberCard } from './MemberCard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  apiRemoveMember,
  apiUpdateMember,
  apiCreateInvitation,
  apiCancelInvitation,
  type WorkspaceMember,
  type MemberRole,
  type DevicePermission,
  type WorkspaceInvitation,
} from '@/lib/api';
import { ShowIf } from '@/lib/acl';
import { mutate } from 'swr';

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'editor', 'viewer']),
});

type InviteForm = z.infer<typeof inviteSchema>;

interface MembersSettingsProps {
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
  token: string | null;
  workspaceSlug: string;
}

interface DialogStates {
  showInvite: boolean;
  showInviteLinkResult: { token: string; email: string } | null;
}

export function MembersSettings({
  members,
  invitations,
  token,
  workspaceSlug,
}: MembersSettingsProps) {
  const [dialogs, setDialogs] = React.useState<DialogStates>({
    showInvite: false,
    showInviteLinkResult: null,
  });

  const form = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'viewer' },
  });

  const handleInviteMember = async (data: InviteForm) => {
    if (!token) return;

    try {
      const result = await apiCreateInvitation(token, workspaceSlug, {
        email: data.email,
        role: data.role as MemberRole,
      });
      setDialogs((prev) => ({ ...prev, showInvite: false }));
      form.reset();
      setDialogs((prev) => ({
        ...prev,
        showInviteLinkResult: { token: result.token, email: result.email },
      }));
      mutate(`invitations-${workspaceSlug}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create invitation');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!token) return;

    try {
      await apiRemoveMember(token, workspaceSlug, userId);
      toast.success('Member removed');
      mutate(`members-${workspaceSlug}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove member');
    }
  };

  const handleEditMember = async (
    userId: string,
    updates: { role?: MemberRole; devicePermissions?: Record<string, DevicePermission[]> }
  ) => {
    if (!token) return;

    try {
      await apiUpdateMember(token, workspaceSlug, userId, updates);
      toast.success('Member updated');
      mutate(`members-${workspaceSlug}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update member');
      throw err;
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!token) return;

    try {
      await apiCancelInvitation(token, workspaceSlug, invitationId);
      toast.success('Invitation cancelled');
      mutate(`invitations-${workspaceSlug}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel invitation');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Team Members</h2>
          <p className="text-xs sm:text-sm text-gray-600">Manage who has access to this workspace</p>
        </div>
        <ShowIf permission="members:invite">
          <Button
            onClick={() => setDialogs((prev) => ({ ...prev, showInvite: true }))}
            className="bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg w-full sm:w-auto"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Member
          </Button>
        </ShowIf>
      </div>

      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardContent className="p-0">
          {members.length === 0 && invitations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No team members yet</p>
              <p className="text-sm">Invite members to collaborate on this workspace</p>
            </div>
          ) : (
            <div className="divide-y">
              {/* Members List */}
              {members.map((member) => (
                <MemberCard
                  key={member.userId}
                  member={member}
                  onRemove={handleRemoveMember}
                  onEdit={handleEditMember}
                  canEdit={true}
                  canRemove={true}
                />
              ))}

              {/* Pending Invitations */}
              {invitations.map((invitation) => (
                <div
                  key={invitation.invitationId}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center hover:bg-gray-50/50 transition-colors bg-yellow-50/50"
                >
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center text-white font-semibold text-base sm:text-lg shadow-md flex-shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 text-base sm:text-lg truncate">
                        {invitation.email}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        Invited {new Date(invitation.createdAt).toLocaleDateString()}
                        {invitation.invitedByName && (
                          <span className="ml-2">by {invitation.invitedByName}</span>
                        )}
                      </div>
                      <div className="text-xs text-yellow-600 mt-1">
                        Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-auto sm:ml-0">
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                      <Send className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                    <Badge variant="secondary">
                      {invitation.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                      {invitation.role}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleCancelInvitation(invitation.invitationId)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={dialogs.showInvite} onOpenChange={(open) =>
        setDialogs((prev) => ({ ...prev, showInvite: open }))
      }>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>Send an invitation to join this workspace</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleInviteMember)} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={form.watch('role')}
                onValueChange={(v) =>
                  form.setValue('role', v as 'admin' | 'editor' | 'viewer')
                }
              >
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogs((prev) => ({ ...prev, showInvite: false }))}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="bg-gradient-to-r from-blue-600 to-purple-600 w-full sm:w-auto"
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invitation Link Result Dialog */}
      <Dialog
        open={!!dialogs.showInviteLinkResult}
        onOpenChange={() =>
          setDialogs((prev) => ({ ...prev, showInviteLinkResult: null }))
        }
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <span>✓</span>
              Invitation Sent
            </DialogTitle>
            <DialogDescription>
              Share the invitation link with {dialogs.showInviteLinkResult?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Tip:</strong> An email has been sent to the invitee. You can
                also share this link directly.
              </p>
            </div>
            <Label className="text-sm font-semibold mb-2 block">
              Invitation Link
            </Label>
            <div className="flex items-center gap-2 bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-sm">
              <code className="flex-1 break-all text-xs">
                {typeof window !== 'undefined'
                  ? `${window.location.origin}/${workspaceSlug}/invite/${dialogs.showInviteLinkResult?.token}`
                  : `/${workspaceSlug}/invite/${dialogs.showInviteLinkResult?.token}`}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-300 hover:text-white hover:bg-gray-800 flex-shrink-0"
                onClick={() => {
                  if (dialogs.showInviteLinkResult?.token) {
                    const link =
                      typeof window !== 'undefined'
                        ? `${window.location.origin}/${workspaceSlug}/invite/${dialogs.showInviteLinkResult.token}`
                        : `/${workspaceSlug}/invite/${dialogs.showInviteLinkResult.token}`;
                    copyToClipboard(link);
                    toast.success('Invitation link copied!');
                  }
                }}
              >
                📋
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              The invitation will expire in 7 days.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() =>
                setDialogs((prev) => ({ ...prev, showInviteLinkResult: null }))
              }
              className="w-full"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

