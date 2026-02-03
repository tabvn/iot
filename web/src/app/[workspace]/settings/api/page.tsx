"use client";

import { Suspense } from "react";
import { WorkspaceSettings } from "@/components/WorkspaceSettings";

export const dynamic = "force-dynamic";

export default function WorkspaceApiSettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <WorkspaceSettings initialTab="api" />
    </Suspense>
  );
}
