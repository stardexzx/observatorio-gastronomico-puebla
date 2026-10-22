import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
if (existsSync('.env')) loadEnvFile('.env');
const demo = process.env.VITE_DATA_SOURCE !== 'database';
const children = [];
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
function run(file, args, nodeArgs = []) {
  const child = spawn(process.execPath, [...nodeArgs, file, ...args], { stdio: 'inherit' });
  children.push(child);
  child.on('error', () => stop(1));
  child.on('exit', (code) => { if (!stopping) stop(code ?? 1); });
}
if (!demo) run('server/index.mjs', [], ['--watch']);
run('node_modules/vite/bin/vite.js', process.argv.slice(2));
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
