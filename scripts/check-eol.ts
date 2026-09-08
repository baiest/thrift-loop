#!/usr/bin/env tsx
// Fails if any tracked, non-binary file uses CRLF or mixed line endings.
import { execFileSync } from 'node:child_process';

function main(): void {
  // git is resolved from PATH deliberately: this script only runs in trusted local/CI shells.
  // eslint-disable-next-line sonarjs/no-os-command-from-path
  const output = execFileSync('git', ['ls-files', '--eol'], { encoding: 'utf8' });
  const offenders = output
    .split('\n')
    .filter((line) => line.length > 0)
    .filter((line) => /w\/(crlf|mixed)/.test(line));

  if (offenders.length > 0) {
    console.error('Files with non-LF line endings:\n');
    for (const line of offenders) {
      console.error(`  ${line}`);
    }
    process.exit(1);
  }

  console.log('All tracked files use LF line endings.');
}

main();
