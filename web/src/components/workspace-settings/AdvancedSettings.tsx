"use client";
import React from 'react';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { toast } from 'sonner';
import { apiDeleteWorkspace } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface AdvancedSettingsProps {
  token: string | null;
  workspaceSlug: string;
}

interface DialogStates {
  showDelete: boolean;
  deleteConfirmation: string;
}

export function AdvancedSettings({
  token,
  workspaceSlug,
}: AdvancedSettingsProps) {
  const router = useRouter();
  const [dialogs, setDialogs] = React.useState<DialogStates>({
    showDelete: false,
    deleteConfirmation: '',
  });
  const [isLoading, setIsLoading] = React.useState(false);

  const handleDeleteWorkspace = async () => {
    if (dialogs.deleteConfirmation !== workspaceSlug) {
      toast.error('Please enter the correct workspace slug');
      return;
    }

    if (!token) return;

    setIsLoading(true);
    try {
      await apiDeleteWorkspace(token, workspaceSlug);
      toast.success('Workspace deleted');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete workspace');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm border-red-200">
        <CardHeader className="border-b bg-gradient-to-r from-red-50 to-orange-50 p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-red-700 text-lg sm:text-xl">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 pt-4 sm:pt-6 p-4 sm:p-6">
          <div className="p-3 sm:p-4 border-2 border-red-200 rounded-lg bg-red-50/50">
            <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">
              Delete Workspace
            </h4>
            <p className="text-xs sm:text-sm text-gray-600 mb-4">
              Once you delete a workspace, there is no going back. All devices, data,
              automations, and settings will be permanently removed.
            </p>
            <Button
              variant="destructive"
              onClick={() =>
                setDialogs((prev) => ({
                  ...prev,
                  showDelete: true,
                }))
              }
              className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Workspace
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Workspace Dialog */}
      <Dialog
        open={dialogs.showDelete}
        onOpenChange={(open) =>
          setDialogs((prev) => ({
            ...prev,
            showDelete: open,
            deleteConfirmation: '',
          }))
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-700">Delete Workspace</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the workspace
              and all associated data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delete-confirm">
                Type <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                  {workspaceSlug}
                </code> to confirm
              </Label>
              <Input
                id="delete-confirm"
                value={dialogs.deleteConfirmation}
                onChange={(e) =>
                  setDialogs((prev) => ({
                    ...prev,
                    deleteConfirmation: e.target.value,
                  }))
                }
                placeholder="Enter workspace slug"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setDialogs((prev) => ({
                  ...prev,
                  showDelete: false,
                  deleteConfirmation: '',
                }))
              }
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteWorkspace}
              disabled={
                dialogs.deleteConfirmation !== workspaceSlug || isLoading
              }
              className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

