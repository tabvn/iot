"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function WorkspaceApiIntegrationLegacyPage() {
  const params = useParams();
  const workspace = params?.workspace as string;
  const router = useRouter();

  useEffect(() => {
    if (!workspace) return;
    router.replace(`/${workspace}/settings/api`);
  }, [workspace, router]);

  return null;
}
