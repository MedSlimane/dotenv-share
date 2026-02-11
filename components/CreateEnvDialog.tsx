"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { encrypt } from "@/lib/crypto";
import { getOrDeriveKey } from "@/lib/keys";
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

export function CreateEnvDialog({
  orgId,
  children,
}: {
  orgId: Id<"organizations">;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(".env");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createEnv = useMutation(api.envFiles.create);
  const org = useQuery(api.organizations.get, { orgId });
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !org) return;

    setLoading(true);
    setError(null);

    try {
      const key = await getOrDeriveKey(orgId, org.encryptionSalt);
      if (!key) {
        setError("Passphrase not set. Please unlock the organization first.");
        setLoading(false);
        return;
      }

      const { encrypted, iv } = await encrypt(
        "# Add your environment variables here\n",
        key,
      );

      const envId = await createEnv({
        orgId,
        name: name.trim(),
        encryptedContent: encrypted,
        iv,
      });

      setOpen(false);
      setName(".env");
      router.push(`/org/${orgId}/env/${envId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create env file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Env File</DialogTitle>
          <DialogDescription>
            Create a new encrypted environment file.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="env-name">File Name</Label>
            <Input
              id="env-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder=".env"
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
              {loading ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
