"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { hashInviteCode } from "@/lib/crypto";
import { storePassphrase } from "@/lib/keys";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function JoinOrgDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const joinOrg = useMutation(api.organizations.join);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const inviteCodeHash = await hashInviteCode(inviteCode);
      const orgId = await joinOrg({ inviteCodeHash });
      storePassphrase(orgId, inviteCode);
      setOpen(false);
      setInviteCode("");
      router.push(`/org/${orgId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to join organization");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join Organization</DialogTitle>
          <DialogDescription>
            Enter the invite code shared by your team to join their organization
            and access encrypted env files.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="join-invite-code">Invite Code</Label>
            <Input
              id="join-invite-code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter invite code..."
              type="password"
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Joining..." : "Join"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
