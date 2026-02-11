"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { hashInviteCode, generateSalt } from "@/lib/crypto";
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

export function CreateOrgDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createOrg = useMutation(api.organizations.create);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !inviteCode.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const inviteCodeHash = await hashInviteCode(inviteCode);
      const encryptionSalt = generateSalt();

      const orgId = await createOrg({
        name: name.trim(),
        inviteCodeHash,
        encryptionSalt,
      });

      storePassphrase(orgId, inviteCode);
      setOpen(false);
      setName("");
      setInviteCode("");
      router.push(`/org/${orgId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create organization");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription>
            Set a name and an invite code. Share the invite code with your team
            to let them join and decrypt files.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Team"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-code">
              Invite Code / Encryption Passphrase
            </Label>
            <Input
              id="invite-code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="A strong passphrase..."
              type="password"
              minLength={6}
              required
            />
            <p className="text-xs text-muted-foreground">
              This is used to both invite members and encrypt all data. Keep it
              safe — it cannot be recovered!
            </p>
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
              {loading ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
