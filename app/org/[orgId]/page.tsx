"use client";

import { useParams, useRouter } from "next/navigation";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { CreateEnvDialog } from "@/components/CreateEnvDialog";
import {
  getStoredPassphrase,
  storePassphrase,
  clearPassphrase,
} from "@/lib/keys";
import { hashInviteCode } from "@/lib/crypto";
import Link from "next/link";
import { FileText, Plus, Lock, Shield, Trash2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function OrgPage() {
  const params = useParams();
  const orgId = params.orgId as Id<"organizations">;
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const router = useRouter();

  const org = useQuery(
    api.organizations.get,
    isAuthenticated ? { orgId } : "skip",
  );
  const envFiles = useQuery(
    api.envFiles.list,
    isAuthenticated ? { orgId } : "skip",
  );
  const members = useQuery(
    api.organizations.getMembers,
    isAuthenticated ? { orgId } : "skip",
  );
  const removeMember = useMutation(api.organizations.removeMember);
  const deleteOrg = useMutation(api.organizations.deleteOrg);

  const [hasPassphrase, setHasPassphrase] = useState(false);
  const [passphraseInput, setPassphraseInput] = useState("");
  const [passphraseError, setPassphraseError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/signin");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    const stored = getStoredPassphrase(orgId);
    if (stored) setHasPassphrase(true);
  }, [orgId]);

  const handlePassphraseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setPassphraseError(null);

    try {
      const hash = await hashInviteCode(passphraseInput);
      if (org && hash === org.inviteCodeHash) {
        storePassphrase(orgId, passphraseInput);
        setHasPassphrase(true);
        setPassphraseInput("");
      } else {
        setPassphraseError("Invalid passphrase");
      }
    } catch {
      setPassphraseError("Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const handleDeleteOrg = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this organization? All env files will be lost.",
      )
    )
      return;
    try {
      await deleteOrg({ orgId });
      router.push("/");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete organization");
    }
  };

  const handleRemoveMember = async (memberId: Id<"orgMembers">) => {
    if (!confirm("Remove this member?")) return;
    try {
      await removeMember({ orgId, memberId });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Passphrase dialog */}
      <Dialog
        open={!hasPassphrase && org !== undefined}
        onOpenChange={() => {}}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="size-5" />
              Enter Passphrase
            </DialogTitle>
            <DialogDescription>
              Enter your organization&apos;s invite code to decrypt the
              environment files.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePassphraseSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="passphrase">Passphrase</Label>
              <Input
                id="passphrase"
                type="password"
                value={passphraseInput}
                onChange={(e) => setPassphraseInput(e.target.value)}
                placeholder="Enter invite code..."
                required
              />
            </div>
            {passphraseError && (
              <p className="text-sm text-destructive">{passphraseError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/")}
              >
                Back
              </Button>
              <Button type="submit" disabled={verifying}>
                {verifying ? "Verifying..." : "Unlock"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {org && (
        <main className="max-w-5xl mx-auto p-6">
          {/* Breadcrumb + header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Link
                  href="/"
                  className="hover:text-foreground transition-colors"
                >
                  Organizations
                </Link>
                <span>/</span>
                <span className="text-foreground">{org.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{org.name}</h1>
                <Shield className="size-4 text-emerald-500" />
              </div>
            </div>
            <div className="flex gap-2">
              {org.role === "owner" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="size-4" />
                  Settings
                </Button>
              )}
              {hasPassphrase && (
                <CreateEnvDialog orgId={orgId}>
                  <Button>
                    <Plus className="size-4" />
                    New Env File
                  </Button>
                </CreateEnvDialog>
              )}
            </div>
          </div>

          {/* Settings panel */}
          {showSettings && org.role === "owner" && (
            <div className="mb-6 p-4 border rounded-lg bg-card space-y-4">
              <h3 className="font-semibold text-sm">Organization Settings</h3>
              <div className="flex items-center gap-4">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteOrg}
                >
                  <Trash2 className="size-4" />
                  Delete Organization
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    clearPassphrase(orgId);
                    setHasPassphrase(false);
                  }}
                >
                  <Lock className="size-4" />
                  Lock (forget passphrase)
                </Button>
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Env files */}
            <div className="lg:col-span-2 space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Environment Files
              </h2>
              {envFiles === undefined ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-16 rounded-lg border bg-muted/50 animate-pulse"
                    />
                  ))}
                </div>
              ) : envFiles.length === 0 ? (
                <div className="text-center py-12 border rounded-lg bg-muted/10">
                  <FileText className="size-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    No environment files yet
                  </p>
                  {hasPassphrase && (
                    <CreateEnvDialog orgId={orgId}>
                      <Button variant="outline" className="mt-4">
                        <Plus className="size-4" />
                        Create your first .env file
                      </Button>
                    </CreateEnvDialog>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {envFiles.map((file) => (
                    <Link
                      key={file._id}
                      href={`/org/${orgId}/env/${file._id}`}
                      className="flex items-center gap-3 p-4 border rounded-lg hover:shadow-sm hover:border-emerald-500/30 transition-all group"
                    >
                      <FileText className="size-5 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Updated{" "}
                          {new Date(file._creationTime).toLocaleDateString()}
                        </p>
                      </div>
                      <Shield className="size-4 text-emerald-500" />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Members */}
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Members
              </h2>
              <div className="border rounded-lg divide-y">
                {members === undefined ? (
                  <div className="p-4 animate-pulse bg-muted/50 h-20 rounded-lg" />
                ) : (
                  members.map((member) => (
                    <div
                      key={member._id}
                      className="flex items-center gap-3 p-3"
                    >
                      <div className="size-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        {(member.email?.[0] ?? "?").toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.email}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {member.role}
                        </p>
                      </div>
                      {org.role === "owner" && member.role !== "owner" && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={(e) => {
                            e.preventDefault();
                            handleRemoveMember(member._id);
                          }}
                        >
                          <Trash2 className="size-3 text-muted-foreground hover:text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
