#!/usr/bin/env tsx
// Validates commit messages against the ThriftLoop template:
//   title: <text, max 50 chars>
//   what: <text, max 50 chars>
//   why: <text, max 50 chars>
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const MAX_VALUE_LENGTH = 50;
const EXPECTED_LINES = ['title:', 'what:', 'why:'] as const;

function validateMessage(message: string): string[] {
  const lines = message
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  if (lines.length < EXPECTED_LINES.length) {
    return [`expected ${EXPECTED_LINES.length} lines (title/what/why), got ${lines.length}`];
  }

  const errors: string[] = [];
  EXPECTED_LINES.forEach((prefix, index) => {
    // Numeric index from a bounded forEach loop, not attacker-controlled input.
    // eslint-disable-next-line security/detect-object-injection
    const line = lines[index];
    if (!line || !line.startsWith(prefix)) {
      errors.push(`line ${index + 1} must start with "${prefix}"`);
      return;
    }
    const value = line.slice(prefix.length).trim();
    if (value.length === 0) {
      errors.push(`"${prefix}" must not be empty`);
    }
    if (value.length > MAX_VALUE_LENGTH) {
      errors.push(`"${prefix}" value exceeds ${MAX_VALUE_LENGTH} chars (${value.length})`);
    }
  });

  return errors;
}

function getMessagesFromRange(range: string): string[] {
  // git is resolved from PATH deliberately: this script only runs in trusted local/CI shells.
  // eslint-disable-next-line sonarjs/no-os-command-from-path
  const output = execFileSync('git', ['log', range, '--format=%B%x00'], {
    encoding: 'utf8',
  });
  return output
    .split('\x00')
    .map((message) => message.trim())
    .filter((message) => message.length > 0);
}

const RANGE_FLAG = '--range';
const COMMIT_MSG_FILE_ARG_INDEX = 0;

function resolveMessages(args: string[]): string[] {
  const rangeFlagIndex = args.indexOf(RANGE_FLAG);
  if (rangeFlagIndex !== -1) {
    const range = args[rangeFlagIndex + 1] ?? 'origin/main..HEAD';
    return getMessagesFromRange(range);
  }

  // Fixed constant index into process.argv, not attacker-controlled input.
  // eslint-disable-next-line security/detect-object-injection
  const filePath = args[COMMIT_MSG_FILE_ARG_INDEX];
  if (!filePath) {
    console.error('usage: check-commit-msg.ts <commit-msg-file> | --range <git-range>');
    process.exit(1);
  }
  // filePath comes from the trusted Husky/CI invocation, not untrusted user input.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  return [readFileSync(filePath, 'utf8')];
}

function reportErrors(message: string, errors: string[]): void {
  console.error(`Invalid commit message:\n${message}\n`);
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  console.error(
    '\nExpected format:\n  title: <text, max 50 chars>\n  what: <text, max 50 chars>\n  why: <text, max 50 chars>\n',
  );
}

const NODE_AND_SCRIPT_ARGV_COUNT = 2;

function main(): void {
  const messages = resolveMessages(process.argv.slice(NODE_AND_SCRIPT_ARGV_COUNT));

  let hasErrors = false;
  for (const message of messages) {
    const errors = validateMessage(message);
    if (errors.length > 0) {
      hasErrors = true;
      reportErrors(message, errors);
    }
  }

  process.exit(hasErrors ? 1 : 0);
}

main();
