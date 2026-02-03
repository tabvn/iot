"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { User, Settings, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface AvatarMenuProps {
  currentWorkspaceId?: string;
}

export function AvatarMenu({ currentWorkspaceId }: AvatarMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Get current workspace from URL
  const pathParts = pathname.split('/').filter(Boolean);
  const workspace = (!pathParts[0] || pathParts[0] === 'dashboard' || pathParts[0] === 'developer')
    ? null
    : pathParts[0];

  const handleSignOut = () => {
    logout();
    toast.success("Signed out successfully");
    router.push('/');
  };

  // Show skeleton placeholder while user is loading
  if (!user) {
    return (
      <div className="h-11 w-11 rounded-full bg-gray-200 animate-pulse" />
    );
  }

  const displayName = user.name || user.email;
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const avatarFallback = (size: string, textSize: string) => (
    <div className={`${size} rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold ${textSize}`}>
      {initials}
    </div>
  );

  const avatarImage = (size: string) => (
    <img
      src={`${process.env.NEXT_PUBLIC_API_BASE_URL}${user.avatarUrl}`}
      alt={displayName}
      className={`${size} rounded-full object-cover`}
    />
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative h-11 w-11 rounded-full hover:ring-4 hover:ring-blue-100 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all group">
          <div className="h-11 w-11 rounded-full border-2 border-white shadow-lg group-hover:scale-105 transition-transform overflow-hidden">
            {user.avatarUrl ? avatarImage("h-full w-full") : avatarFallback("h-full w-full", "text-sm")}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72 bg-white shadow-2xl border border-gray-200/50 rounded-2xl p-2" align="end" sideOffset={12}>
        {/* Profile Header with Gradient */}
        <div className="px-4 py-4 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 mb-2">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full shadow-lg overflow-hidden flex-shrink-0">
              {user.avatarUrl ? avatarImage("h-12 w-12") : avatarFallback("h-12 w-12", "text-base")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-600 truncate">{user.email}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-500 font-medium">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-1">
          <DropdownMenuItem asChild>
            <Link href="/dashboard/account" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 rounded-xl cursor-pointer transition-all group">
              <div className="w-9 h-9 rounded-lg bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                <User className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
              </div>
              <span className="font-semibold">My Account</span>
            </Link>
          </DropdownMenuItem>

          {workspace && (
            <DropdownMenuItem asChild>
              <Link href={`/${workspace}/settings`} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 rounded-xl cursor-pointer transition-all group">
                <div className="w-9 h-9 rounded-lg bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                  <Settings className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                </div>
                <span className="font-semibold">Workspace Settings</span>
              </Link>
            </DropdownMenuItem>
          )}
        </div>

        <div className="my-2 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

        <div>
          <DropdownMenuItem
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-xl cursor-pointer transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-red-50 group-hover:bg-red-100 flex items-center justify-center transition-colors">
              <LogOut className="w-4 h-4 text-red-600" />
            </div>
            <span className="font-semibold">Sign Out</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
