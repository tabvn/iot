# Workspace Invite Flow - Complete Guide

## Overview
This document explains the complete flow of how workspace invitations work in the Thebaycity platform.

## Architecture

### Components Involved
```
AcceptInvitationPage
├── Fetches invitation by token
├── Shows invitation details
├── Redirects to login/signup if needed
└── Calls apiAcceptInvitation when accepted

LoginPage / SignUpPage
├── Accepts email & returnUrl parameters
├── Pre-fills email from invitation
└── Redirects to returnUrl after auth

WorkspaceMember / MemberCard
├── Displays member info
├── Shows user profile data (name, email, avatar)
└── Shows role and permissions
```

## API Data Flow

### Member Information
```
API /members endpoint returns:
{
  members: [
    {
      userId: "user-id",
      name: "John Doe",           // From user profile
      email: "john@example.com",  // From user profile
      avatarUrl: "https://...",   // From user profile
      role: "admin",
      devicePermissions: {...},
      createdAt: "2025-02-09T..."
    }
  ]
}
```

### Invitation Information
```
API /invitations endpoint returns:
{
  invitations: [
    {
      invitationId: "inv-id",
      email: "john@example.com",
      role: "admin",
      workspaceName: "My Workspace",
      workspaceSlug: "my-workspace",
      status: "pending",
      expiresAt: "2025-02-16T...",
      ...
    }
  ]
}
```

## User Flows

### Flow 1: New User via Invite Link
```
1. User receives: /invite/[token]
2. Page loads, shows invitation details
3. User clicks "Create one" signup link
4. Redirects to: /signup?email=invitee@example.com&returnUrl=/invite/[token]
5. User fills name and password
6. POST /auth/signup with email and password
7. Session created, user logged in
8. Redirects to: /invite/[token]
9. User clicks "Accept Invitation"
10. POST /workspace/invitations/[token]/accept
11. Redirects to: /[workspaceSlug]
12. User is now workspace member
```

### Flow 2: Existing User via Invite Link
```
1. User receives: /invite/[token]
2. Page loads, shows invitation details
3. User is not logged in
4. User clicks "Sign in" link
5. Redirects to: /login?email=invitee@example.com&returnUrl=/invite/[token]
6. User enters email and password
7. POST /auth/login with credentials
8. Session created, user logged in
9. Redirects to: /invite/[token]
10. User clicks "Accept Invitation"
11. POST /workspace/invitations/[token]/accept
12. Redirects to: /[workspaceSlug]
13. User is now workspace member
```

### Flow 3: Logged In User via Invite Link
```
1. User receives: /invite/[token]
2. Page loads, verifies user is logged in
3. If email matches:
   - Shows "Accept Invitation" button (enabled)
   - User clicks to accept
4. If email doesn't match:
   - Shows warning message
   - Shows "Sign in with correct email" button
   - User must re-login with correct email
5. POST /workspace/invitations/[token]/accept
6. Redirects to: /[workspaceSlug]
7. User is now workspace member
```

## Query Parameters

### Login Page
```
/login?email=[email]&returnUrl=[url]

Parameters:
- email: Pre-fills email field (optional)
- returnUrl: URL to redirect to after login (default: /dashboard)

Example:
/login?email=john@example.com&returnUrl=/invite/abc123
```

### SignUp Page
```
/signup?email=[email]&returnUrl=[url]

Parameters:
- email: Pre-fills email field (optional)
- returnUrl: URL to redirect to after signup (default: /dashboard)

Example:
/signup?email=john@example.com&returnUrl=/invite/abc123
```

## Member Card Display

### What Shows
```
[Avatar]  John Doe                    [Admin Role] [Remove Button]
          john@example.com
          Joined Feb 9, 2025
```

### Avatar Handling
- If user has avatar: Shows profile image
- If no avatar: Shows initials (first letters of name or email)
- Colors: Gradient blue-to-purple for background
- Size: 40x40px (mobile), 48x48px (desktop)

### Role Styling
- Owner: Yellow-Orange gradient background
- Admin: Blue background
- Editor: Green background
- Viewer: Gray background

## Error Handling

### Expired Invitation
- Shows: "This invitation has expired"
- Action: Link to go to dashboard
- User must: Request new invitation from admin

### Already Accepted
- Shows: "This invitation has already been accepted"
- Action: Link to go to dashboard
- User: No action needed

### Email Mismatch
- Shows: Warning with both emails highlighted
- Suggests: Login with correct email
- Button: Disabled until correct email is used

### Invalid Token
- Shows: "Unable to load invitation"
- Action: Link to go to dashboard
- User must: Request new invitation from admin

## Best Practices

1. **Always Include Return URL**
   - Helps users get back to where they were going
   - Improves UX after authentication

2. **Pre-fill Email**
   - Reduces friction for users
   - Prevents email mismatch confusion

3. **Show Clear Warnings**
   - Alert users to email mismatches
   - Explain what went wrong

4. **Validate at Every Step**
   - Check invitation status
   - Verify user is authenticated
   - Verify email matches

5. **Handle All Edge Cases**
   - Expired invitations
   - Already accepted
   - Invalid tokens
   - Email mismatches

## Testing Checklist

- [ ] New user can signup via invite link
- [ ] Existing user can login and accept invite
- [ ] Email pre-fills correctly on login
- [ ] Email pre-fills correctly on signup
- [ ] User returns to invite page after auth
- [ ] Email mismatch warning shows
- [ ] Member appears in members list after accepting
- [ ] Member info shows name, email, avatar
- [ ] Invitation expires after 7 days
- [ ] Already accepted invitations show appropriate message
- [ ] Invalid tokens show error message
- [ ] Mobile responsive works correctly
- [ ] Return URL parameter respected

## Future Enhancements

1. **SMS Invitations**
   - Send invite link via SMS
   - QR code for mobile users

2. **Bulk Invitations**
   - CSV import for multiple users
   - Batch email sending

3. **Role-based Invite Links**
   - Pre-set role in link
   - Different permissions per link

4. **Invitation Resend**
   - Admin can resend expired invitations
   - Track invitation history

5. **Workspace Auto-discovery**
   - Suggest workspaces based on email domain
   - Auto-join for specific domains

