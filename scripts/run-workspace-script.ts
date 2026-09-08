#!/usr/bin/env tsx
// Runs `npm run <script> --workspaces --if-present`, but skips cleanly when no
// workspace packages exist yet (npm itself errors with "No workspaces found!" in that case).
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const WORKSPACE_GLOBS = ['apps', 'packages'];

// Paths below are built from a fixed local allowlist (WORKSPACE_GLOBS), never from user input.
function hasAnyWorkspacePackage(): boolean {
  return WORKSPACE_GLOBS.some((dir) => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (!existsSync(dir)) {
      return false;
    }
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    return readdirSync(dir, { withFileTypes: true }).some(
      (entry) =>
        entry.isDirectory() &&
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        existsSync(join(dir, entry.name, 'package.json')),
    );
  });
}

function main(): void {
  const scriptName = process.argv[2];
  if (!scriptName) {
    console.error('usage: run-workspace-script.ts <npm-script-name>');
    process.exit(1);
  }

  if (!hasAnyWorkspacePackage()) {
    console.log(`No workspace packages yet, skipping "${scriptName}".`);
    return;
  }

  // scriptName is a fixed identifier passed from package.json, not untrusted input.
  // eslint-disable-next-line sonarjs/no-os-command-from-path
  const result = spawnSync('npm', ['run', scriptName, '--workspaces', '--if-present'], {
    stdio: 'inherit',
    shell: true,
  });

  process.exit(result.status ?? 1);
}

main();
