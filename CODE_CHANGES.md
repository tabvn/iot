# Quick Reference - Code Changes

## 1. New Component: MemberCard

**File:** `/web/src/components/workspace-settings/MemberCard.tsx`

```typescript
"use client";
import React from 'react';
import { Mail, Calendar, Crown, Shield, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/button';
import { Button } from '@/components/ui/button';
import { type WorkspaceMember, type MemberRole } from '@/lib/api';

interface MemberCardProps {
  member: WorkspaceMember;
  onRemove: (userId: string) => void;
  canRemove: boolean;
  isLoading?: boolean;
}

export function MemberCard({
  member,
  onRemove,
  canRemove,
  isLoading = false,
}: MemberCardProps) {
  // ... (implementation in component)
}
```

**Usage in MembersSettings:**
```typescript
{members.map((member) => (
  <MemberCard
    key={member.userId}
    member={member}
    onRemove={handleRemoveMember}
    canRemove={true}
  />
))}
```

## 2. Updated: LoginPage

**Key Changes:**
```typescript
import { useSearchParams } from "next/navigation";

export function LoginPage() {
  const searchParams = useSearchParams();
  
  // Get parameters from URL
  const prefillEmail = searchParams.get('email') || '';
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';
  
  // Use setValue to set form values
  useEffect(() => {
    if (prefillEmail) {
      setValue('email', prefillEmail);
    }
  }, [prefillEmail, setValue]);
  
  // Redirect to returnUrl after login
  const onSubmit = async (values: LoginFormValues) => {
    await login(...);
    router.push(returnUrl);  // Changed from '/dashboard'
  };
}
```

## 3. Updated: SignUpPage

**Key Changes:**
```typescript
import { useSearchParams } from "next/navigation";

export function SignUpPage() {
  const searchParams = useSearchParams();
  
  // Get parameters from URL
  const prefillEmail = searchParams.get('email') || '';
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';
  
  // Pre-fill email in form
  useEffect(() => {
    if (prefillEmail) {
      setValue('email', prefillEmail);
    }
  }, [prefillEmail, setValue]);
  
  // Redirect to returnUrl after signup
  const onSignUp = async (values: SignUpFormValues) => {
    await signup(...);
    router.push(returnUrl);  // Changed from '/dashboard'
  };
}
```

## 4. Updated: AcceptInvitationPage

**Key Changes:**
```typescript
const handleAccept = async () => {
  if (!authToken) {
    // Redirect to login with email and return URL
    const returnUrl = encodeURIComponent(`/invite/${token}`);
    router.push(
      `/login?email=${encodeURIComponent(invitation?.email || '')}&returnUrl=${returnUrl}`
    );
    return;
  }

  // Accept invitation
  setAccepting(true);
  try {
    const result = await apiAcceptInvitation(authToken, token);
    toast.success("You have joined the workspace!");
    router.push(`/${result.workspaceSlug}`);
  } catch (err: any) {
    toast.error(err?.message || "Failed to accept invitation");
  } finally {
    setAccepting(false);
  }
};

// Improved link handling
{!authToken && (
  <p className="text-center text-sm text-gray-500">
    Don't have an account?{" "}
    <Link
      href={`/signup?email=${encodeURIComponent(invitation.email)}&returnUrl=${encodeURIComponent(`/invite/${token}`)}`}
      className="font-medium text-blue-600 hover:text-blue-700"
    >
      Create one
    </Link>{" "}
    or{" "}
    <Link
      href={`/login?email=${encodeURIComponent(invitation.email)}&returnUrl=${encodeURIComponent(`/invite/${token}`)}`}
      className="font-medium text-blue-600 hover:text-blue-700"
    >
      sign in
    </Link>
  </p>
)}
```

## 5. Updated: MembersSettings

**Before:**
```typescript
{members.map((member) => (
  <div className="p-4 sm:p-5 flex ...">
    {/* Long member display code */}
  </div>
))}
```

**After:**
```typescript
import { MemberCard } from './MemberCard';

{members.map((member) => (
  <MemberCard
    key={member.userId}
    member={member}
    onRemove={handleRemoveMember}
    canRemove={true}
  />
))}
```

## API Integration (No Changes Needed)

The backend API already supports member user information:

```typescript
// In /api/src/routes/members-plan-billing.ts

const members = await Promise.all(
  memberRecords.map(async (e) => {
    const user = await getEntity<UserEntity>(env, `USER#${e.userId}`, "PROFILE");
    return {
      userId: e.userId,
      name: user?.name,              // ✅ Already fetched
      email: user?.email,            // ✅ Already fetched
      avatarUrl: user?.avatarUrl,    // ✅ Already fetched
      role: e.role,
      devicePermissions: e.devicePermissions ?? {},
      createdAt: e.createdAt,
    };
  })
);
```

## Testing Example URLs

**Invite with token:**
```
http://localhost:3000/invite/d32fddd2d3c5841805ce1e5be0b7ecfec832eb8077b8123d2f6142250becd954
```

**Login with pre-filled email and return:**
```
/login?email=user@example.com&returnUrl=/invite/d32fddd2d3c5841805ce1e5be0b7ecfec832eb8077b8123d2f6142250becd954
```

**SignUp with pre-filled email and return:**
```
/signup?email=user@example.com&returnUrl=/invite/d32fddd2d3c5841805ce1e5be0b7ecfec832eb8077b8123d2f6142250becd954
```

## Type Definitions

WorkspaceMember (already exists in api):
```typescript
export interface WorkspaceMember {
  userId: string;
  name?: string;           // ✅ Now displayed
  email?: string;          // ✅ Now displayed
  avatarUrl?: string;      // ✅ Now displayed
  role: MemberRole;
  devicePermissions?: Record<string, DevicePermission[]>;
  createdAt: string;
}
```

## Error Checks

All files verified with zero errors:
```
✅ /web/src/components/workspace-settings/MembersSettings.tsx
✅ /web/src/components/workspace-settings/MemberCard.tsx
✅ /web/src/components/AcceptInvitationPage.tsx
✅ /web/src/components/LoginPage.tsx
✅ /web/src/components/SignUpPage.tsx
```

## Summary

| Component | Change Type | What Changed |
|-----------|------------|--------------|
| MemberCard | New File | Created reusable member display component |
| MembersSettings | Updated | Now uses MemberCard component |
| AcceptInvitationPage | Updated | Better auth flow, improved links |
| LoginPage | Updated | Added email & returnUrl param support |
| SignUpPage | Updated | Added email & returnUrl param support |

All changes maintain backward compatibility and improve UX! 🎉

