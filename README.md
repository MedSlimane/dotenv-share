# dotenv-share

A workspace for teams to share environment configuration and Markdown without passing file contents around in chat. Built with **Next.js, Convex, Convex Auth and CodeMirror**.

## What it does

- Organize files into team organizations with owner and member roles.
- Join an organization using its shared invitation code.
- Create, rename, edit and delete environment files and Markdown documents.
- Edit files in CodeMirror, with Markdown preview support.
- Encrypt file contents in the browser before storing them in Convex.

## How file encryption works

The browser derives an AES-256-GCM key from the organization's shared code and a random organization salt using PBKDF2-SHA-256 with 100,000 iterations. Each encryption uses a fresh 12-byte IV. Convex stores the encrypted content and IV; filenames, membership and other organization metadata remain visible to the backend.

The client keeps the passphrase in the tab's `sessionStorage` and caches derived keys in memory. Treat the organization code as a shared secret: anyone given it can join the organization and derive its file key. Removing a member does not rotate that key or revoke copies they already obtained. This describes the implementation; the project has not been independently security audited.

Implementation: [`lib/crypto.ts`](lib/crypto.ts), [`lib/keys.ts`](lib/keys.ts), [`convex/organizations.ts`](convex/organizations.ts) and [`convex/envFiles.ts`](convex/envFiles.ts).

## Run locally

You need Node.js, npm and access to a Convex deployment.

```sh
git clone https://github.com/MedSlimane/dotenv-share.git
cd dotenv-share
npm install
npm run dev
```

On first run, the `predev` script opens the Convex setup flow, configures Convex Auth through `setup.mjs` and opens the dashboard. Follow its prompts to create or select a deployment and configure the requested environment values. See [`.env.example`](.env.example) for the configuration names. Keep real values in `.env.local` and Convex environment settings.

The development command starts both the Next.js frontend and the Convex backend. Open the local URL printed by Next.js, sign in, create an organization and add a file. Invite a second account with the organization code to try the sharing flow. Use sample configuration when evaluating the app.

## Project layout

| Path | Responsibility |
| --- | --- |
| `app/` | Sign-in, organization workspaces and file editor routes |
| `components/` | Workspace controls, dialogs and shared UI |
| `convex/` | Authentication, organization membership, data model and file operations |
| `lib/crypto.ts` | Browser-side key derivation, encryption and decryption |
| `lib/keys.ts` | Tab-scoped passphrase storage and in-memory key cache |
| `setup.mjs` | Convex Auth setup helper |

## Development checks

```sh
npm run lint
npm run build
```

Builds require the appropriate Convex configuration. This README describes the published web implementation; unreleased local CLI and GitHub-integration work is outside its scope.
