"use client";

import { Suspense } from "react";
import { NotificationsPage } from "@/components/NotificationsPage";

export const dynamic = "force-dynamic";

export default function WorkspaceNotificationsSettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <NotificationsPage />
    </Suspense>
  );
}
