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
import { FileText, FileCode } from "lucide-react";

type FileType = "env" | "markdown";

const FILE_TYPE_CONFIG: Record<
  FileType,
  { label: string; icon: typeof FileText; defaultName: string; defaultContent: string; description: string }
> = {
  env: {
    label: "Env File",
    icon: FileCode,
    defaultName: ".env",
    defaultContent: "# Add your environment variables here\n",
    description: "Key-value configuration file",
  },
  markdown: {
    label: "Markdown",
    icon: FileText,
    defaultName: "README.md",
    defaultContent: "# Document Title\n\nStart writing your markdown document here.\n",
    description: "Rich text document with preview",
  },
};

export function CreateEnvDialog({
  orgId,
  children,
}: {
  orgId: Id<"organizations">;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [fileType, setFileType] = useState<FileType>("env");
  const [name, setName] = useState(FILE_TYPE_CONFIG.env.defaultName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createEnv = useMutation(api.envFiles.create);
  const org = useQuery(api.organizations.get, { orgId });
  const router = useRouter();

  const handleFileTypeChange = (type: FileType) => {
    setFileType(type);
    setName(FILE_TYPE_CONFIG[type].defaultName);
  };

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
        FILE_TYPE_CONFIG[fileType].defaultContent,
        key,
      );

      const envId = await createEnv({
        orgId,
        name: name.trim(),
        fileType,
        encryptedContent: encrypted,
        iv,
      });

      setOpen(false);
      setFileType("env");
      setName(FILE_TYPE_CONFIG.env.defaultName);
      router.push(`/org/${orgId}/env/${envId}`);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to create file",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create File</DialogTitle>
          <DialogDescription>
            Create a new encrypted file in your organization.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>File Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(FILE_TYPE_CONFIG) as [FileType, typeof FILE_TYPE_CONFIG.env][]).map(
                ([type, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleFileTypeChange(type)}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                        fileType === type
                          ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/20"
                          : "border-border hover:border-muted-foreground/30"
                      }`}
                    >
                      <Icon
                        className={`size-5 ${
                          fileType === type
                            ? "text-emerald-500"
                            : "text-muted-foreground"
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium">{config.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {config.description}
                        </p>
                      </div>
                    </button>
                  );
                },
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="env-name">File Name</Label>
            <Input
              id="env-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={FILE_TYPE_CONFIG[fileType].defaultName}
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
