"use client";
import React from 'react';
import { Mail, Calendar, Crown, Shield, Trash2, Edit2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Label } from '@/components/ui/label';
import { type WorkspaceMember, type MemberRole, type DevicePermission } from '@/lib/api';

interface MemberCardProps {
  member: WorkspaceMember;
  onRemove: (userId: string) => void;
  onEdit: (userId: string, updates: { role?: MemberRole; devicePermissions?: Record<string, DevicePermission[]> }) => Promise<void>;
  canEdit: boolean;
  canRemove: boolean;
  isLoading?: boolean;
}

export function MemberCard({
  member,
  onRemove,
  onEdit,
  canEdit,
  canRemove,
  isLoading = false,
}: MemberCardProps) {
  const [showEditDialog, setShowEditDialog] = React.useState(false);
  const [editRole, setEditRole] = React.useState<MemberRole>(member.role);
  const [isSaving, setIsSaving] = React.useState(false);

  const initials = (member.name || member.email || member.userId)
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const roleColors: Record<MemberRole, { bg: string; text: string }> = {
    owner: { bg: 'bg-gradient-to-r from-yellow-500 to-orange-500', text: 'text-white' },
    admin: { bg: 'bg-blue-100', text: 'text-blue-700' },
    editor: { bg: 'bg-green-100', text: 'text-green-700' },
    viewer: { bg: 'bg-gray-100', text: 'text-gray-700' },
  };

  const roleColor = roleColors[member.role];

  const handleSaveEdit = async () => {
    if (editRole === member.role) {
      setShowEditDialog(false);
      return;
    }

    setIsSaving(true);
    try {
      await onEdit(member.userId, { role: editRole });
      setShowEditDialog(false);
    } finally {
      setIsSaving(false);
    }
  };

  const openEditDialog = () => {
    setEditRole(member.role);
    setShowEditDialog(true);
  };

  return (
    <>
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center hover:bg-gray-50/50 transition-colors">
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          {/* Avatar */}
          {member.avatarUrl ? (
            <img
              src={`${process.env.NEXT_PUBLIC_API_BASE_URL}${member.avatarUrl}`}
              alt={member.name || member.email || 'Member'}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover shadow-md flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm sm:text-base shadow-md flex-shrink-0">
              {initials}
            </div>
          )}

          {/* User Info */}
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-gray-900 text-base sm:text-lg truncate">
              {member.name || member.email || `User ${member.userId.slice(0, 8)}`}
            </div>
            {member.email && (
              <div className="text-xs sm:text-sm text-gray-600 flex items-center gap-2 mt-0.5">
                <Mail className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{member.email}</span>
              </div>
            )}
            <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
              <Calendar className="w-3 h-3 flex-shrink-0" />
              Joined {new Date(member.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Role and Actions */}
        <div className="flex items-center gap-2 ml-auto sm:ml-0">
          <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${roleColor.bg} ${roleColor.text}`}>
            {member.role === 'owner' && <Crown className="w-3 h-3" />}
            {member.role === 'admin' && <Shield className="w-3 h-3" />}
            <span className="capitalize">{member.role}</span>
          </div>

          {canEdit && member.role !== 'owner' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={openEditDialog}
              disabled={isLoading}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          )}

          {canRemove && member.role !== 'owner' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => onRemove(member.userId)}
              disabled={isLoading}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Edit Member Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Member Role</DialogTitle>
            <DialogDescription>
              Change the role for {member.name || member.email || 'this member'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {member.avatarUrl ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_API_BASE_URL}${member.avatarUrl}`}
                  alt={member.name || member.email || 'Member'}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                  {initials}
                </div>
              )}
              <div>
                <div className="font-medium text-gray-900">
                  {member.name || member.email || `User ${member.userId.slice(0, 8)}`}
                </div>
                {member.email && (
                  <div className="text-sm text-gray-500">{member.email}</div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as MemberRole)}>
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-600" />
                      <div>
                        <div className="font-medium">Admin</div>
                        <div className="text-xs text-gray-500">Full access to manage workspace</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="editor">
                    <div className="flex items-center gap-2">
                      <Edit2 className="w-4 h-4 text-green-600" />
                      <div>
                        <div className="font-medium">Editor</div>
                        <div className="text-xs text-gray-500">Can edit devices and automations</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-600" />
                      <div>
                        <div className="font-medium">Viewer</div>
                        <div className="text-xs text-gray-500">Can only view data</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-blue-800 mb-1">Role Permissions</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                {editRole === 'admin' && (
                  <>
                    <li>• Manage workspace settings</li>
                    <li>• Invite and remove members</li>
                    <li>• Create and edit devices</li>
                    <li>• Create and edit automations</li>
                  </>
                )}
                {editRole === 'editor' && (
                  <>
                    <li>• Create and edit devices</li>
                    <li>• Create and edit automations</li>
                    <li>• View all workspace data</li>
                  </>
                )}
                {editRole === 'viewer' && (
                  <>
                    <li>• View devices and their data</li>
                    <li>• View automations and logs</li>
                  </>
                )}
              </ul>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              className="w-full sm:w-auto"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSaving || editRole === member.role}
              className="bg-gradient-to-r from-blue-600 to-purple-600 w-full sm:w-auto"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
