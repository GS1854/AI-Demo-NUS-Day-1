# Snip

Snip is a tiny URL shortener built around a simple idea: one backend service plus two clients that use the same HTTP contract.

- The backend exposes the shared API and keeps the short-link state in memory.
- The Angular frontend gives humans a click-through dashboard for creating and listing links.
- The Node CLI gives power users a quick terminal workflow for `add`, `ls`, and `open`.

## One backend, two clients

This repo is organized as a superproject that pins three layer-specific branches as submodules:

- `backend/` - Bun API on the `backend` branch
- `frontend/` - Angular app on the `frontend` branch
- `cli/` - Node CLI on the `cli` branch
- `bundle/` - generated release output on the `bundle` branch

## API contract

| Method | Path | Response |
| --- | --- | --- |
| `POST` | `/api/links` with `{ "url": "https://..." }` | `201` with `{ code, url, shortUrl, hits, createdAt }` or `400` |
| `GET` | `/api/links` | `200` with an array of link records |
| `GET` | `/:code` | `302` redirect to the original URL, incrementing hits; `404` if missing |

The contract is intentionally tiny and shared by both clients.

## Branch-per-layer + submodule layout

This repo uses orphan branches to isolate each layer and then stitches them into a main aggregator branch:

- `backend` branch: API implementation and local in-memory data store
- `frontend` branch: Angular 19 UI project named `snip-frontend`
- `cli` branch: Node CLI for terminal usage
- `bundle` branch: generated Bun server, built UI, CLI, Docker, and Railway files
- `main` branch: documentation, build script, and submodule pointers for the layer branches

The superproject keeps the project structure simple:

```text
snip-demo/
+- backend/
+- frontend/
+- cli/
+- bundle/
+- scripts/build-bundle.mjs
+- README.md
+- .gitmodules
+- .git/
```

## Clone the repo correctly

Plain clones leave submodule folders empty. Use the recursive clone form:

```bash
git clone --recurse-submodules <REPO_URL>
```

If you already cloned without submodules, run:

```bash
git submodule update --init --recursive
```

## Run all three pieces

Start the API in one terminal:

```bash
cd backend
npm install
npm start
```

Start the Angular frontend in another terminal:

```bash
cd frontend
npm install
npx ng serve
```

Use the CLI in a third terminal:

```bash
cd cli
node cli.js add https://example.com
node cli.js ls
node cli.js open <code>
```

You can also override the API base URL for a different backend:

```bash
SNIP_API=http://localhost:3000 node cli.js ls
```

Build the generated release bundle:

```bash
node scripts/build-bundle.mjs
node scripts/build-bundle.mjs --push
```

The bundle script updates the source submodules to their branch tips, builds the Angular app, writes generated release files into `bundle/`, commits changed generated output, and bumps the superproject submodule pointers. The `bundle` branch is generated output; do not hand-edit it.

## Update workflow

1. Make changes inside a submodule directory.
2. Commit and push inside that submodule folder.
3. Update the superproject pointer:

```bash
git submodule update --remote <path>
git add <path>
git commit -m "Bump <path> pointer"
```

This keeps the main branch pinned to the latest submodule commit while preserving the architecture boundary.
