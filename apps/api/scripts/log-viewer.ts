#!/usr/bin/env tsx
// Dev-only tool: a tiny local web page to browse apps/api/data/logs/app.jsonl
// without any external service (no Grafana, no auth — same trust model as
// scripts/seed.ts and scripts/bot.ts). Not part of the shipped app, not
// spec-gated (see AGENTS.md — SDD applies to product features, not
// throwaway local tooling).
//
// Usage (from apps/api): tsx scripts/log-viewer.ts
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import express from 'express';
import { HTTP_STATUS } from '../src/lib/http-status.js';

const DEFAULT_PORT = 4100;
const port = process.env['LOG_VIEWER_PORT'] ? Number(process.env['LOG_VIEWER_PORT']) : DEFAULT_PORT;
const logFilePath = join(process.cwd(), 'data', 'logs', 'app.jsonl');

async function readEntries(): Promise<Record<string, unknown>[]> {
  try {
    // logFilePath is fixed app configuration, never user input.

    const raw = await readFile(logFilePath, 'utf8');
    return raw
      .split('\n')
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .reverse();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

const PAGE = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>ThriftLoop logs</title>
<style>
  body { font: 13px/1.4 monospace; background: #0b0d10; color: #d8dee4; margin: 0; padding: 1rem; }
  h1 { font-size: 1rem; margin: 0 0 0.75rem; }
  .controls { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
  input, select { background: #161a1f; color: #d8dee4; border: 1px solid #2a2f36; padding: 0.3rem 0.5rem; }
  table { border-collapse: collapse; width: 100%; }
  td, th { padding: 0.25rem 0.5rem; text-align: left; border-bottom: 1px solid #1c2026; vertical-align: top; }
  tr.info { color: #d8dee4; }
  tr.warning { color: #e3b341; }
  tr.error { color: #f47067; }
  tr.critical { color: #ff6a69; font-weight: bold; }
  .req { cursor: pointer; text-decoration: underline; }
  .fields { white-space: pre-wrap; word-break: break-all; }
</style>
</head>
<body>
<h1>ThriftLoop logs</h1>
<div class="controls">
  <input id="search" placeholder="search..." />
  <select id="level">
    <option value="">all levels</option>
    <option value="info">info</option>
    <option value="warning">warning</option>
    <option value="error">error</option>
    <option value="critical">critical</option>
  </select>
  <button id="clearReq">clear request filter</button>
</div>
<table>
  <thead><tr><th>time</th><th>level</th><th>event</th><th>request</th><th>fields</th></tr></thead>
  <tbody id="rows"></tbody>
</table>
<script>
let entries = [];
let requestFilter = null;

function render() {
  const search = document.getElementById('search').value.toLowerCase();
  const level = document.getElementById('level').value;
  const rows = document.getElementById('rows');
  rows.innerHTML = '';
  for (const entry of entries) {
    if (level && entry.level !== level) continue;
    if (requestFilter && entry.requestId !== requestFilter) continue;
    const text = JSON.stringify(entry).toLowerCase();
    if (search && !text.includes(search)) continue;
    const tr = document.createElement('tr');
    tr.className = entry.level || '';
    const { timestamp, level: lvl, event, requestId, ...fields } = entry;
    tr.innerHTML =
      '<td>' + (timestamp || '') + '</td>' +
      '<td>' + (lvl || '') + '</td>' +
      '<td>' + (event || '') + '</td>' +
      '<td class="req" data-req="' + (requestId || '') + '">' + (requestId || '') + '</td>' +
      '<td class="fields"></td>';
    tr.querySelector('.fields').textContent = JSON.stringify(fields);
    rows.appendChild(tr);
  }
}

document.getElementById('rows').addEventListener('click', (event) => {
  const cell = event.target.closest('.req');
  if (cell && cell.dataset.req) {
    requestFilter = cell.dataset.req;
    render();
  }
});
document.getElementById('clearReq').addEventListener('click', () => {
  requestFilter = null;
  render();
});
document.getElementById('search').addEventListener('input', render);
document.getElementById('level').addEventListener('change', render);

async function poll() {
  const response = await fetch('/api/logs');
  entries = await response.json();
  render();
}
poll();
setInterval(poll, 2000);
</script>
</body>
</html>`;

const app = express();
app.disable('x-powered-by');
app.get('/', (_req, res) => res.type('html').send(PAGE));
app.get('/api/logs', (_req, res) => {
  readEntries()
    .then((entries) => res.json(entries))
    .catch((error: unknown) => {
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ error: error instanceof Error ? error.message : String(error) });
    });
});

app.listen(port, () => {
  console.log(`Log viewer at http://localhost:${port}`);
});
