"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Users, Shield, Check, X, Loader2, KeyRound, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { setAuthFromInvitation } from "@/app/actions/auth";
import {
  apiGetInvitationByToken,
  apiAcceptInvitation,
  apiDeclineInvitation,
  apiGetMe,
  type WorkspaceInvitation,
  type MemberRole,
} from "@/lib/api";

interface AcceptInvitationPageProps {
  token: string;
}

const roleLabels: Record<MemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

const roleDescriptions: Record<MemberRole, string> = {
  owner: "Full control over workspace, billing, and member management",
  admin: "Manage devices, automations, and most workspace settings",
  editor: "Create and edit devices and automations",
  viewer: "View-only access to devices and data",
};

export function AcceptInvitationPage({ token }: AcceptInvitationPageProps) {
  const router = useRouter();
  const { user, token: authToken, setUser } = useAuth();
  const isAuthenticated = !!user;
  const [invitation, setInvitation] = useState<WorkspaceInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Success state for auto-created accounts
  const [accepted, setAccepted] = useState(false);
  const [acceptedSlug, setAcceptedSlug] = useState("");
  const [accountCreated, setAccountCreated] = useState(false);

  useEffect(() => {
    async function loadInvitation() {
      try {
        const inv = await apiGetInvitationByToken(token);
        setInvitation(inv);
      } catch (err: any) {
        setError(err?.message || "Failed to load invitation");
      } finally {
        setLoading(false);
      }
    }
    loadInvitation();
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const result = await apiAcceptInvitation(authToken || undefined, token);

      if (result.userCreated && result.token && result.sessionId) {
        // Auto-created user — set auth cookie and login context
        await setAuthFromInvitation(result.token, result.sessionId);

        // Fetch user profile and update auth context
        try {
          const me = await apiGetMe(result.token);
          setUser({
            id: me.userId,
            name: me.name,
            email: me.email,
            avatarUrl: me.avatarUrl,
          });
        } catch {
          // Fallback: at least set the token
        }

        // Show success with account-created notice
        setAccepted(true);
        setAcceptedSlug(result.workspaceSlug);
        setAccountCreated(true);
      } else {
        // Existing logged-in user — redirect directly
        toast.success("You have joined the workspace!");
        router.push(`/${result.workspaceSlug}`);
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Failed to accept invitation";

      // API returns loginRequired for existing users who aren't logged in
      if (err?.message?.includes("log in") || err?.message?.includes("login")) {
        toast.error("Please log in to accept this invitation");
        const slug = invitation?.workspaceSlug || "";
        const returnUrl = slug
          ? encodeURIComponent(`/${slug}/invite/${token}`)
          : encodeURIComponent(`/invite/${token}`);
        router.push(`/login?email=${encodeURIComponent(invitation?.email || "")}&returnUrl=${returnUrl}`);
      } else if (err?.message?.includes("different email")) {
        toast.error("Please log in with the correct email to accept this invitation");
        const slug = invitation?.workspaceSlug || "";
        const returnUrl = slug
          ? encodeURIComponent(`/${slug}/invite/${token}`)
          : encodeURIComponent(`/invite/${token}`);
        router.push(`/login?email=${encodeURIComponent(invitation?.email || "")}&returnUrl=${returnUrl}`);
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    setDeclining(true);
    try {
      await apiDeclineInvitation(token);
      toast.success("Invitation declined");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err?.message || "Failed to decline invitation");
    } finally {
      setDeclining(false);
    }
  };

  const isExpired = invitation && new Date(invitation.expiresAt) < new Date();
  const isNotPending = invitation && invitation.status !== "pending";
  const emailMismatch = !!(user && invitation && user.email.toLowerCase() !== invitation.email.toLowerCase());

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      {/* Header */}
      <div className="p-4 sm:p-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to home</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Logo variant="icon" size="xl" />
          </div>

          <Card className="border-2 shadow-xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl sm:text-3xl">
                {accepted ? "Welcome!" : "Workspace Invitation"}
              </CardTitle>
              <CardDescription>
                {loading
                  ? "Loading invitation..."
                  : error
                  ? "Unable to load invitation"
                  : accepted
                  ? "You've successfully joined the workspace"
                  : "You've been invited to join a workspace"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Loading */}
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>

              /* Error */
              ) : error ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <X className="w-8 h-8 text-red-600" />
                  </div>
                  <p className="text-gray-600 mb-6">{error}</p>
                  <Button variant="outline" onClick={() => router.push("/dashboard")}>
                    Go to Dashboard
                  </Button>
                </div>

              /* Success — account created */
              ) : accepted ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="text-gray-700 font-medium">
                      You've joined <strong>{invitation?.workspaceName}</strong>!
                    </p>
                  </div>

                  {accountCreated && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <KeyRound className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-amber-900">
                            Account created automatically
                          </p>
                          <p className="text-sm text-amber-800 mt-1">
                            We created an account for <strong>{invitation?.email}</strong> with a temporary password. Please update your password in Account Settings.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={() => router.push(`/${acceptedSlug}`)}
                      className="h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      Go to Workspace
                    </Button>
                    {accountCreated && (
                      <Button
                        variant="outline"
                        onClick={() => router.push("/dashboard/account")}
                        className="h-11 gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Update Password in Account Settings
                      </Button>
                    )}
                  </div>
                </div>

              /* Expired */
              ) : isExpired ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <X className="w-8 h-8 text-yellow-600" />
                  </div>
                  <p className="text-gray-600 mb-2">This invitation has expired.</p>
                  <p className="text-sm text-gray-500 mb-6">
                    Please ask the workspace admin to send a new invitation.
                  </p>
                  <Button variant="outline" onClick={() => router.push("/dashboard")}>
                    Go to Dashboard
                  </Button>
                </div>

              /* Already handled */
              ) : isNotPending ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-gray-600" />
                  </div>
                  <p className="text-gray-600 mb-2">
                    This invitation has already been{" "}
                    {invitation.status === "accepted" ? "accepted" : invitation.status}.
                  </p>
                  <Button variant="outline" onClick={() => router.push("/dashboard")} className="mt-4">
                    Go to Dashboard
                  </Button>
                </div>

              /* Pending invitation */
              ) : invitation ? (
                <div className="space-y-6">
                  {/* Workspace Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{invitation.workspaceName}</h3>
                        <p className="text-sm text-gray-500">/{invitation.workspaceSlug}</p>
                      </div>
                    </div>
                    {invitation.invitedByName && (
                      <p className="text-sm text-gray-600">
                        Invited by <span className="font-medium">{invitation.invitedByName}</span>
                      </p>
                    )}
                  </div>

                  {/* Role Info */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-blue-900">Your Role</span>
                    </div>
                    <p className="text-lg font-semibold text-blue-700 mb-1">
                      {roleLabels[invitation.role]}
                    </p>
                    <p className="text-sm text-blue-600">{roleDescriptions[invitation.role]}</p>
                  </div>

                  {/* Device Permissions */}
                  {invitation.devicePermissions &&
                    Object.keys(invitation.devicePermissions).length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Device Permissions</p>
                        <p className="text-xs text-gray-500">
                          You will have specific permissions for{" "}
                          {Object.keys(invitation.devicePermissions).length} device(s).
                        </p>
                      </div>
                    )}

                  {/* Invited Email */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span>Invitation sent to: </span>
                    <span className="font-medium">{invitation.email}</span>
                  </div>

                  {/* Logged in user status */}
                  {user && !emailMismatch && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-800">
                        Logged in as <strong>{user.email}</strong> — ready to accept.
                      </p>
                    </div>
                  )}

                  {/* Email Mismatch Warning */}
                  {emailMismatch && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800">
                        <strong>Note:</strong> You are logged in as{" "}
                        <span className="font-medium">{user.email}</span>, but this invitation was
                        sent to <span className="font-medium">{invitation.email}</span>.
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Please log in with the correct email to accept this invitation.
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button
                      onClick={handleAccept}
                      disabled={accepting || declining || emailMismatch}
                      className="flex-1 h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      {accepting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Accepting...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Accept Invitation
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDecline}
                      disabled={accepting || declining}
                      className="flex-1 h-11"
                    >
                      {declining ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Declining...
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4 mr-2" />
                          Decline
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Login prompt if not authenticated */}
                  {!authToken && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                      <p className="text-sm text-blue-900 mb-2">
                        <strong>New here?</strong> We'll automatically create an account for you when you accept.
                      </p>
                      <p className="text-xs text-blue-700">
                        Already have an account?{" "}
                        <Link
                          href={`/login?email=${encodeURIComponent(invitation.email)}&returnUrl=${encodeURIComponent(`/${invitation.workspaceSlug}/invite/${token}`)}`}
                          className="font-medium hover:underline"
                        >
                          Sign in
                        </Link>
                        {" "}to accept with your existing account.
                      </p>
                    </div>
                  )}

                  {/* Expiry notice */}
                  <p className="text-center text-xs text-gray-400">
                    This invitation expires on{" "}
                    {new Date(invitation.expiresAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
