# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds the React + TypeScript app, organized by feature areas like `components/`, `pages/`, `stores/`, `lib/`, and `utils/`.
- `electron/` contains the Electron main process entry (`electron/main.cjs`).
- `public/` contains static assets for Vite.
- `dist/` is the Vite build output; `release/` holds Electron build artifacts.
- `supabase/` is legacy online-mode migration history; current desktop build uses local SQLite.
- `docker/` includes optional Supabase backend configuration.

## Build, Test, and Development Commands
- `pnpm install`: install dependencies (pnpm preferred).
- `pnpm dev`: run the Vite dev server at `http://localhost:5173`.
- `pnpm check`: TypeScript type-check (no emit).
- `pnpm lint`: run ESLint on the codebase.
- `pnpm build`: build the web app into `dist/`.
- `pnpm electron:dev`: run Vite + Electron together.
- `pnpm electron:build` / `pnpm electron:build:win`: package Electron builds.

## Coding Style & Naming Conventions
- Indentation: 2 spaces (default Vite/ESLint conventions).
- Language: TypeScript with React hooks; keep components in PascalCase (e.g., `MaterialTable.tsx`).
- File naming: kebab-case for non-component files (e.g., `audit-store.ts`).
- Encoding: save code files and comments as UTF-8 to avoid garbled text.
- Linting: ESLint with `typescript-eslint`, React Hooks rules, and React Refresh checks.

## Testing Guidelines
- No automated test suite is currently configured.
- Before opening a PR, run `pnpm check` and `pnpm lint`.
- If adding tests, keep them colocated under `src/` using `*.test.ts(x)` or `*.spec.ts(x)`.

## Commit & Pull Request Guidelines
- Commits follow Conventional Commits, e.g., `feat: ...`, `fix: ...`, `docs: ...`, `refactor: ...`, `chore: ...`.
- PRs should include: a short summary, linked issues (if any), and UI screenshots for visual changes.
- Note any data migrations or environment variable changes in the PR description.

## Security & Configuration Tips
- Use `.env.example` as the baseline; keep secrets out of git.
- Offline mode stores SQLite data in `%AppData%\tiaoma\tiaoma.sqlite3`; be careful with user data when reproducing bugs.
