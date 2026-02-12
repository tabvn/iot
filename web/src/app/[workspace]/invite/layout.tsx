// Standalone layout for invite pages - bypasses DashboardLayout
// since invite pages must be accessible to unauthenticated users
export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
