"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { WorkspaceSettings } from "@/components/WorkspaceSettings";

export const dynamic = "force-dynamic";

export default function WorkspaceAdvancedPage() {
  const params = useParams();
  const workspace = params?.workspace as string;
  const router = useRouter();

  useEffect(() => {
    if (!workspace) return;
    router.replace(`/${workspace}/settings/advanced`);
  }, [workspace, router]);

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <WorkspaceSettings initialTab="advanced" />
    </Suspense>
  );
}
