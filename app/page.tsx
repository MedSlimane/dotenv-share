"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Header } from "@/components/Header";
import { CreateOrgDialog } from "@/components/CreateOrgDialog";
import { JoinOrgDialog } from "@/components/JoinOrgDialog";
import { Building2, Plus, UserPlus, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Dashboard() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const orgs = useQuery(api.organizations.list, isAuthenticated ? {} : "skip");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/signin");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Your Organizations</h1>
            <p className="text-muted-foreground mt-1">
              Manage and share environment files securely
            </p>
          </div>
          <div className="flex gap-2">
            <JoinOrgDialog>
              <Button variant="outline">
                <UserPlus className="size-4" />
                Join
              </Button>
            </JoinOrgDialog>
            <CreateOrgDialog>
              <Button>
                <Plus className="size-4" />
                Create
              </Button>
            </CreateOrgDialog>
          </div>
        </div>

        {orgs === undefined ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 rounded-lg border bg-muted/50 animate-pulse"
              />
            ))}
          </div>
        ) : orgs.length === 0 ? (
          <div className="text-center py-20 border rounded-lg bg-muted/10">
            <Building2 className="size-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">No organizations yet</h2>
            <p className="text-muted-foreground mb-6">
              Create an organization or join one with an invite code
            </p>
            <div className="flex gap-2 justify-center">
              <JoinOrgDialog>
                <Button variant="outline">
                  <UserPlus className="size-4" />
                  Join Organization
                </Button>
              </JoinOrgDialog>
              <CreateOrgDialog>
                <Button>
                  <Plus className="size-4" />
                  Create Organization
                </Button>
              </CreateOrgDialog>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {orgs.map((org) => (
              <Link
                key={org._id}
                href={`/org/${org._id}`}
                className="group rounded-lg border bg-card p-5 hover:shadow-md transition-all hover:border-emerald-500/30"
              >
                <div className="flex items-start justify-between">
                  <Building2 className="size-8 text-emerald-500/80" />
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                    {org.role}
                  </span>
                </div>
                <h3 className="font-semibold mt-3 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {org.name}
                </h3>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Shield className="size-3" />
                  <span>End-to-end encrypted</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
