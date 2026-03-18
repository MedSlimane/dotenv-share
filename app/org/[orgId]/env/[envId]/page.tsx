"use client";

import { useParams, useRouter } from "next/navigation";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/Header";
import {
  getOrDeriveKey,
  getStoredPassphrase,
  storePassphrase,
} from "@/lib/keys";
import { encrypt, decrypt, hashInviteCode } from "@/lib/crypto";
import Link from "next/link";
import {
  Save,
  Download,
  ArrowLeft,
  Lock,
  Shield,
  Trash2,
  Eye,
  Columns2,
  Code,
} from "lucide-react";
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
import dynamic from "next/dynamic";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { MarkdownPreview } from "@/components/MarkdownPreview";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      Loading editor...
    </div>
  ),
});

type ViewMode = "editor" | "preview" | "split";

export default function EnvEditorPage() {
  const params = useParams();
  const orgId = params.orgId as Id<"organizations">;
  const envId = params.envId as Id<"envFiles">;
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const router = useRouter();

  const org = useQuery(
    api.organizations.get,
    isAuthenticated ? { orgId } : "skip",
  );
  const envFile = useQuery(
    api.envFiles.get,
    isAuthenticated ? { envId } : "skip",
  );
  const updateEnv = useMutation(api.envFiles.update);
  const deleteEnv = useMutation(api.envFiles.remove);

  const [content, setContent] = useState("");
  const [hasPassphrase, setHasPassphrase] = useState(false);
  const [passphraseInput, setPassphraseInput] = useState("");
  const [passphraseError, setPassphraseError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("editor");

  const isMarkdown = envFile?.fileType === "markdown";

  // Set default view mode for markdown files
  useEffect(() => {
    if (isMarkdown) {
      setViewMode("split");
    }
  }, [isMarkdown]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/signin");
  }, [isAuthenticated, authLoading, router]);

  // Check stored passphrase
  useEffect(() => {
    const stored = getStoredPassphrase(orgId);
    if (stored) setHasPassphrase(true);
  }, [orgId]);

  // Decrypt content when file loads
  useEffect(() => {
    if (!envFile || !org || loaded || !hasPassphrase) return;

    (async () => {
      try {
        const key = await getOrDeriveKey(orgId, org.encryptionSalt);
        if (!key) return;
        const decrypted = await decrypt(
          envFile.encryptedContent,
          envFile.iv,
          key,
        );
        setContent(decrypted);
        setLoaded(true);
      } catch (err) {
        console.error("Decryption failed:", err);
        setHasPassphrase(false);
        sessionStorage.removeItem(`dotenv-passphrase-${orgId}`);
      }
    })();
  }, [envFile, org, loaded, hasPassphrase, orgId]);

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

  const handleSave = useCallback(async () => {
    if (!org) return;
    setSaving(true);
    try {
      const key = await getOrDeriveKey(orgId, org.encryptionSalt);
      if (!key) return;
      const { encrypted, iv } = await encrypt(content, key);
      await updateEnv({ envId, encryptedContent: encrypted, iv });
      setHasChanges(false);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }, [org, orgId, content, envId, updateEnv]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = envFile?.name ?? ".env";
    a.click();
    URL.revokeObjectURL(url);
  }, [content, envFile]);

  const handleDelete = async () => {
    if (!confirm("Delete this file? This cannot be undone.")) return;
    await deleteEnv({ envId });
    router.push(`/org/${orgId}`);
  };

  // Keyboard shortcut: Cmd/Ctrl+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (loaded && hasChanges) {
          handleSave();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [loaded, hasChanges, handleSave]);

  // Load markdown language extension dynamically
  const [markdownExtensions, setMarkdownExtensions] = useState<
    import("@codemirror/state").Extension[]
  >([]);
  useEffect(() => {
    if (isMarkdown) {
      import("@codemirror/lang-markdown").then(({ markdown }) => {
        import("@codemirror/language").then(({ languages }) => {
          setMarkdownExtensions([markdown({ codeLanguages: languages })]);
        });
      });
    }
  }, [isMarkdown]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        Loading...
      </div>
    );
  }

  const editorHeight = "calc(100vh - 7.5rem)";

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
              Enter your organization&apos;s invite code to decrypt this file.
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
                onClick={() => router.push(`/org/${orgId}`)}
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

      {/* Editor toolbar */}
      {envFile && org && (
        <>
          <div className="border-b px-6 py-3 flex items-center justify-between bg-background">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon-sm" asChild>
                <Link href={`/org/${orgId}`}>
                  <ArrowLeft className="size-4" />
                </Link>
              </Button>
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Link
                    href="/"
                    className="hover:text-foreground transition-colors"
                  >
                    Orgs
                  </Link>
                  <span>/</span>
                  <Link
                    href={`/org/${orgId}`}
                    className="hover:text-foreground transition-colors"
                  >
                    {org.name}
                  </Link>
                  <span>/</span>
                  <span className="text-foreground">{envFile.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <h1 className="font-semibold">{envFile.name}</h1>
                  <Shield className="size-3.5 text-emerald-500" />
                  {isMarkdown && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-medium">
                      Markdown
                    </span>
                  )}
                  {hasChanges && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-medium">
                      unsaved
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {isMarkdown && (
                <div className="flex border rounded-md overflow-hidden">
                  <button
                    onClick={() => setViewMode("editor")}
                    className={`px-2.5 py-1.5 text-xs flex items-center gap-1.5 transition-colors ${
                      viewMode === "editor"
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Code className="size-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => setViewMode("split")}
                    className={`px-2.5 py-1.5 text-xs flex items-center gap-1.5 transition-colors border-x ${
                      viewMode === "split"
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Columns2 className="size-3.5" />
                    Split
                  </button>
                  <button
                    onClick={() => setViewMode("preview")}
                    className={`px-2.5 py-1.5 text-xs flex items-center gap-1.5 transition-colors ${
                      viewMode === "preview"
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Eye className="size-3.5" />
                    Preview
                  </button>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={!loaded}
              >
                <Download className="size-4" />
                Download
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="size-4" />
                Delete
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !loaded || !hasChanges}
              >
                <Save className="size-4" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>

          {/* Editor / Preview area */}
          <div className="flex-1">
            {loaded ? (
              isMarkdown ? (
                <div className="flex" style={{ height: editorHeight }}>
                  {/* Editor pane */}
                  {(viewMode === "editor" || viewMode === "split") && (
                    <div
                      className={
                        viewMode === "split"
                          ? "w-1/2 border-r overflow-hidden"
                          : "w-full"
                      }
                    >
                      <CodeMirror
                        value={content}
                        height={editorHeight}
                        theme={vscodeDark}
                        extensions={markdownExtensions}
                        onChange={(value) => {
                          setContent(value);
                          setHasChanges(true);
                        }}
                        basicSetup={{
                          lineNumbers: true,
                          foldGutter: true,
                          highlightActiveLine: true,
                          bracketMatching: true,
                          closeBrackets: true,
                          indentOnInput: true,
                        }}
                      />
                    </div>
                  )}
                  {/* Preview pane */}
                  {(viewMode === "preview" || viewMode === "split") && (
                    <div
                      className={`overflow-auto bg-background ${
                        viewMode === "split" ? "w-1/2" : "w-full"
                      }`}
                      style={{ height: editorHeight }}
                    >
                      <MarkdownPreview content={content} />
                    </div>
                  )}
                </div>
              ) : (
                <CodeMirror
                  value={content}
                  height={editorHeight}
                  theme={vscodeDark}
                  onChange={(value) => {
                    setContent(value);
                    setHasChanges(true);
                  }}
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: false,
                    highlightActiveLine: true,
                    bracketMatching: true,
                    closeBrackets: true,
                    indentOnInput: true,
                  }}
                />
              )
            ) : hasPassphrase ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-pulse text-muted-foreground">
                  Decrypting...
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
