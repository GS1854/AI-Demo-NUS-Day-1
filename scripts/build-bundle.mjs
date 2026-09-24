import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backendDir = path.join(root, 'backend');
const frontendDir = path.join(root, 'frontend');
const cliDir = path.join(root, 'cli');
const bundleDir = path.join(root, 'bundle');
const frontendOutputDir = path.join(frontendDir, 'dist', 'snip-frontend', 'browser');
const shouldPush = process.argv.includes('--push');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || root,
    shell: options.shell ?? false,
    stdio: options.capture ? 'pipe' : 'inherit',
    encoding: 'utf8',
    env: { ...process.env, ...(options.env || {}) }
  });

  if (result.error && !options.allowFailure) {
    const fullCommand = [command, ...args].join(' ');
    throw new Error(`Command failed to start: ${fullCommand}\n${result.error.message}`);
  }

  if (result.status !== 0 && !options.allowFailure) {
    const fullCommand = [command, ...args].join(' ');
    throw new Error(`Command failed (${result.status}): ${fullCommand}`);
  }

  return result;
}

function git(args, options = {}) {
  return run('git', args, options);
}

function runPackageCommand(command, args, cwd) {
  if (process.platform === 'win32') {
    run('cmd.exe', ['/d', '/s', '/c', command, ...args], { cwd });
    return;
  }

  run(command, args, { cwd });
}

function hasStagedChanges(cwd) {
  const result = git(['diff', '--cached', '--quiet', '--exit-code'], { cwd, allowFailure: true, capture: true });
  return result.status === 1;
}

function ensureGitIdentity(cwd) {
  const name = git(['config', '--get', 'user.name'], { cwd, allowFailure: true, capture: true });
  const email = git(['config', '--get', 'user.email'], { cwd, allowFailure: true, capture: true });

  if (name.status !== 0 || !name.stdout.trim()) {
    git(['config', 'user.name', process.env.GIT_AUTHOR_NAME || 'Snip Bundle Bot'], { cwd });
  }

  if (email.status !== 0 || !email.stdout.trim()) {
    git(['config', 'user.email', process.env.GIT_AUTHOR_EMAIL || 'snip-bundle-bot@example.invalid'], { cwd });
  }
}

async function emptyDirectoryExceptGit(directory) {
  await fs.mkdir(directory, { recursive: true });
  const entries = await fs.readdir(directory, { withFileTypes: true });

  await Promise.all(entries
    .filter((entry) => entry.name !== '.git')
    .map((entry) => fs.rm(path.join(directory, entry.name), { recursive: true, force: true })));
}

async function copyDirectory(source, destination) {
  await fs.mkdir(destination, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, destinationPath);
    } else if (entry.isFile()) {
      await fs.copyFile(sourcePath, destinationPath);
    }
  }
}

async function writeFile(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}

function commitIfNeeded(cwd, message) {
  ensureGitIdentity(cwd);
  git(['add', '-A'], { cwd });

  if (!hasStagedChanges(cwd)) {
    console.log(`Nothing to commit in ${path.relative(root, cwd) || '.'}.`);
    return false;
  }

  git(['commit', '-m', message], { cwd });
  return true;
}

async function main() {
  git(['submodule', 'update', '--init', '--remote', 'backend', 'frontend', 'cli']);
  git(['submodule', 'update', '--init', 'bundle']);

  git(['fetch', 'origin', 'bundle'], { cwd: bundleDir });
  const bundleBranch = git(['rev-parse', '--verify', 'bundle'], { cwd: bundleDir, allowFailure: true, capture: true });
  if (bundleBranch.status === 0) {
    git(['checkout', 'bundle'], { cwd: bundleDir });
    git(['merge', '--ff-only', 'origin/bundle'], { cwd: bundleDir });
  } else {
    git(['checkout', '-B', 'bundle', 'origin/bundle'], { cwd: bundleDir });
  }

  runPackageCommand('npm', ['install'], frontendDir);
  runPackageCommand('npx', ['ng', 'build'], frontendDir);

  const indexPath = path.join(frontendOutputDir, 'index.html');
  if (!existsSync(indexPath)) {
    throw new Error(`Frontend build is missing expected file: ${indexPath}`);
  }

  await emptyDirectoryExceptGit(bundleDir);
  await fs.copyFile(path.join(backendDir, 'server.js'), path.join(bundleDir, 'server.js'));
  await fs.copyFile(path.join(cliDir, 'cli.js'), path.join(bundleDir, 'cli.js'));
  await copyDirectory(frontendOutputDir, path.join(bundleDir, 'public'));

  await writeFile(path.join(bundleDir, '.env'), 'PUBLIC_DIR=./public\n');
  await writeFile(path.join(bundleDir, 'package.json'), `${JSON.stringify({
    name: 'snip-bundle',
    version: '1.0.0',
    private: true,
    scripts: {
      start: 'bun server.js'
    }
  }, null, 2)}\n`);
  await writeFile(path.join(bundleDir, 'Dockerfile'), 'FROM oven/bun:1-alpine\nWORKDIR /app\nCOPY . .\nENV PORT=3000\nEXPOSE 3000\nCMD ["bun", "server.js"]\n');
  await writeFile(path.join(bundleDir, '.dockerignore'), '.git\n.gitmodules\nnode_modules\n');
  await writeFile(path.join(bundleDir, 'railway.json'), `${JSON.stringify({
    build: {
      builder: 'DOCKERFILE'
    }
  }, null, 2)}\n`);
  await writeFile(path.join(bundleDir, 'README.md'), '# Snip bundle\n\nThis branch contains generated release output. Do not hand-edit files here; regenerate it from the main branch with `node scripts/build-bundle.mjs`.\n');

  const bundleCommitted = commitIfNeeded(bundleDir, 'Regenerate bundle');

  git(['add', 'backend', 'frontend', 'cli', 'bundle']);
  const superprojectCommitted = hasStagedChanges(root);
  if (superprojectCommitted) {
    ensureGitIdentity(root);
    git(['commit', '-m', 'Update generated bundle']);
  } else {
    console.log('Nothing to commit in superproject submodule pointers.');
  }

  if (shouldPush) {
    git(['push', 'origin', 'HEAD:bundle'], { cwd: bundleDir });
    git(['push', 'origin', 'main']);
  } else if (bundleCommitted || superprojectCommitted) {
    console.log('Generated bundle commits locally. Re-run with --push to publish bundle and main.');
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
