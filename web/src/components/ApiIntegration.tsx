"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export function ApiIntegration() {
  const params = useParams();
  const workspace = params?.workspace as string;
  const router = useRouter();

  // Redirect to settings API route
  useEffect(() => {
    if (!workspace) return;
    router.replace(`/${workspace}/settings/api`);
  }, [workspace, router]);

  return null;
}
