'use strict';

const { spawn } = require('node:child_process');

const BASE_URL = (process.env.SNIP_API || 'http://localhost:3000').replace(/\/$/, '');

function logError(message) {
  process.stderr.write(`${message}\n`);
}

function printUsage() {
  console.log('Usage: snip <command> [args]\n\nCommands:\n  snip add <url>    Create a short link\n  snip ls           List links\n  snip open <code>  Open a shortened URL in the browser\n  snip help         Show this help text');
}

function parseArgs(argList) {
  const [command, ...rest] = argList;
  return { command: command || 'help', args: rest };
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const data = await response.text();
  let parsed;
  try {
    parsed = data ? JSON.parse(data) : null;
  } catch {
    parsed = data;
  }

  if (!response.ok) {
    const message = typeof parsed === 'object' && parsed && parsed.error ? parsed.error : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return parsed;
}

async function cmdAdd(url) {
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new Error('Bad input: expected an http(s) URL.');
  }

  const created = await requestJson(`${BASE_URL}/api/links`, {
    method: 'POST',
    body: JSON.stringify({ url }),
  });

  console.log(created.shortUrl);
}

async function cmdLs() {
  const links = await requestJson(`${BASE_URL}/api/links`);

  if (!links.length) {
    console.log('No links yet.');
    return;
  }

  const rows = links.map((link) => ({
    code: link.code,
    hits: String(link.hits),
    url: link.url,
  }));

  const codeWidth = Math.max(...rows.map((row) => row.code.length), 'CODE'.length);
  const hitsWidth = Math.max(...rows.map((row) => row.hits.length), 'HITS'.length);

  const header = `${'CODE'.padEnd(codeWidth)}  ${'HITS'.padEnd(hitsWidth)}  URL`;
  console.log(header);
  console.log('-'.repeat(header.length));

  for (const row of rows) {
    console.log(`${row.code.padEnd(codeWidth)}  ${row.hits.padEnd(hitsWidth)}  ${row.url}`);
  }
}

async function cmdOpen(code) {
  if (!code) {
    throw new Error('Bad input: expected a code.');
  }

  const response = await fetch(`${BASE_URL}/${code}`, { redirect: 'manual' });
  const location = response.headers.get('location');

  if (response.status === 404 || !location) {
    throw new Error('Unknown code.');
  }

  const target = location;
  if (process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', target], { stdio: 'ignore', detached: true });
  } else if (process.platform === 'darwin') {
    spawn('open', [target], { stdio: 'ignore', detached: true });
  } else {
    spawn('xdg-open', [target], { stdio: 'ignore', detached: true });
  }

  console.log(target);
}

async function main() {
  const { command, args } = parseArgs(process.argv.slice(2));

  try {
    switch (command) {
      case 'add':
        if (args.length !== 1) {
          throw new Error('Bad input: expected exactly one URL.');
        }
        await cmdAdd(args[0]);
        return;
      case 'ls':
        if (args.length !== 0) {
          throw new Error('Bad input: ls takes no arguments.');
        }
        await cmdLs();
        return;
      case 'open':
        if (args.length !== 1) {
          throw new Error('Bad input: expected exactly one code.');
        }
        await cmdOpen(args[0]);
        return;
      case 'help':
      case '--help':
      case '-h':
      case undefined:
        printUsage();
        return;
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError(message);
    process.exit(1);
  }
}

main();
