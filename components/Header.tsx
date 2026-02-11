"use client";

import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b flex items-center justify-between px-6 h-14">
      <Link
        href="/"
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <Shield className="size-5 text-emerald-500" />
        <span className="font-bold text-lg tracking-tight">dotenv share</span>
      </Link>
      {isAuthenticated && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void signOut().then(() => router.push("/signin"))}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      )}
    </header>
  );
}
