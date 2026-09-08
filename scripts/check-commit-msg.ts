#!/usr/bin/env tsx
// Validates commit messages against the ThriftLoop template:
//   <Type>: <text, max 50 chars>
//   what: <text, max 50 chars>
//   why: <text, max 50 chars>
// <Type> is one of COMMIT_TYPES. No Anthropic attribution lines are allowed.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const MAX_VALUE_LENGTH = 50;
const TRAILER_PREFIXES = ['what:', 'why:'] as const;
const COMMIT_TYPES = [
  'Feat',
  'Fix',
  'Docs',
  'Test',
  'Refactor',
  'Style',
  'Perf',
  'Chore',
  'Build',
  'CI',
  'Revert',
] as const;
const FORBIDDEN_PATTERNS = [/anthropic\.com/i, /claude\.ai\/code/i] as const;
const FIRST_LINE_COUNT = 1;
const RANGE_FLAG = '--range';
const LAST_FLAG = '--last';
const COMMIT_MSG_FILE_ARG_INDEX = 0;
const NODE_AND_SCRIPT_ARGV_COUNT = 2;

function validateFirstLine(line: string | undefined): string[] {
  if (!line) {
    return ['missing first line'];
  }
  const separatorIndex = line.indexOf(':');
  if (separatorIndex === -1) {
    return [`first line must start with one of ${COMMIT_TYPES.join(', ')} followed by ": "`];
  }
  const type = line.slice(0, separatorIndex);
  const value = line.slice(separatorIndex + 1).trim();

  const errors: string[] = [];
  if (!(COMMIT_TYPES as readonly string[]).includes(type)) {
    errors.push(`"${type}" is not a valid type, use one of ${COMMIT_TYPES.join(', ')}`);
  }
  if (value.length === 0) {
    errors.push('first line description must not be empty');
  }
  if (value.length > MAX_VALUE_LENGTH) {
    errors.push(`first line description exceeds ${MAX_VALUE_LENGTH} chars (${value.length})`);
  }
  return errors;
}

function validateTrailers(lines: string[]): string[] {
  const errors: string[] = [];
  TRAILER_PREFIXES.forEach((prefix, index) => {
    const lineNumber = index + FIRST_LINE_COUNT + 1;
    const line = lines[index + FIRST_LINE_COUNT];
    if (!line || !line.startsWith(prefix)) {
      errors.push(`line ${lineNumber} must start with "${prefix}"`);
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

function validateNoForbiddenContent(message: string): string[] {
  return FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(message)).map(
    (pattern) => `message must not contain content matching ${pattern.toString()}`,
  );
}

function validateMessage(message: string): string[] {
  const lines = message
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  const requiredLineCount = 1 + TRAILER_PREFIXES.length;
  if (lines.length < requiredLineCount) {
    return [`expected ${requiredLineCount} lines (type/what/why), got ${lines.length}`];
  }

  return [
    ...validateFirstLine(lines[0]),
    ...validateTrailers(lines),
    ...validateNoForbiddenContent(message),
  ];
}

function getMessagesFromGitLog(logArgs: string[]): string[] {
  // git is resolved from PATH deliberately: this script only runs in trusted local/CI shells.
  // --no-merges: GitHub's PR checkout adds a synthetic "Merge X into Y" commit
  // that never matches the template and isn't an authored commit to validate.
  // eslint-disable-next-line sonarjs/no-os-command-from-path
  const output = execFileSync('git', ['log', '--no-merges', ...logArgs, '--format=%B%x00'], {
    encoding: 'utf8',
  });
  return output
    .split('\x00')
    .map((message) => message.trim())
    .filter((message) => message.length > 0);
}

function resolveMessages(args: string[]): string[] {
  const rangeFlagIndex = args.indexOf(RANGE_FLAG);
  if (rangeFlagIndex !== -1) {
    const range = args[rangeFlagIndex + 1] ?? 'origin/main..HEAD';
    return getMessagesFromGitLog([range]);
  }

  const lastFlagIndex = args.indexOf(LAST_FLAG);
  if (lastFlagIndex !== -1) {
    const count = args[lastFlagIndex + 1] ?? '50';
    return getMessagesFromGitLog(['-n', count]);
  }

  // Fixed constant index into process.argv, not attacker-controlled input.
  // eslint-disable-next-line security/detect-object-injection
  const filePath = args[COMMIT_MSG_FILE_ARG_INDEX];
  if (!filePath) {
    console.error(
      'usage: check-commit-msg.ts <commit-msg-file> | --range <git-range> | --last <n>',
    );
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
    `\nExpected format:\n  <Type>: <text, max 50 chars>\n  what: <text, max 50 chars>\n  why: <text, max 50 chars>\n  Type is one of: ${COMMIT_TYPES.join(', ')}\n`,
  );
}

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
