import { DashboardLayout } from "@/components/DashboardLayout";
import { WorkspaceACLProvider, RouteGuard } from "@/lib/acl";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  params: Promise<{ workspace: string }>;
}

export default async function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  const { workspace } = await params;

  return (
    <WorkspaceACLProvider workspaceSlug={workspace}>
      <DashboardLayout>
        <RouteGuard>{children}</RouteGuard>
      </DashboardLayout>
    </WorkspaceACLProvider>
  );
}
