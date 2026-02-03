"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export function PublicPageHeader() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  const navItems = [
    { path: '/#features', label: 'Features', exactPath: '/' },
    { path: '/pricing', label: 'Pricing' },
    { path: '/developer', label: 'Developer' },
    { path: '/contact', label: 'Contact' },
  ];

  return (
    <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <Logo variant="full" size="md" />
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => {
            const active = isActive(item.exactPath || item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className="relative text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
              >
                <span className={active ? 'text-blue-600' : ''}>
                  {item.label}
                </span>
                {active && (
                  <div
                    className="absolute -bottom-2 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600"
                  />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">Sign In</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
