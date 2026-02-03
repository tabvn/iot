"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";

interface ProvidersProps {
  children: React.ReactNode;
  session?: { user: { id: string; email: string; avatarUrl?: string }; token: string } | null;
}

export function Providers({ children, session }: ProvidersProps) {
  return (
    <AuthProvider initialSession={session}>
      {children}
      <Toaster />
    </AuthProvider>
  );
}
