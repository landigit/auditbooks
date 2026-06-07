import path from 'path';
import { fileURLToPath } from 'url';

process.env['NODE_ENV'] = 'development';
process.env['VITE_HOST'] = '127.0.0.1';
process.env['VITE_PORT'] = '6969';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dirname, '..', '..');

console.log('Starting Auditbooks Web Dev Server...');

let isExiting = false;

// Start the lightweight dev backend
const backendProcess = Bun.spawn(['bun', 'build/scripts/backend.ts'], {
  stdout: 'inherit',
  stderr: 'inherit',
  cwd: root,
});

// Start the rsbuild dev server
const rsbuildProcess = Bun.spawn(['bun', 'x', 'rsbuild', 'dev'], {
  stdout: 'inherit',
  stderr: 'inherit',
  cwd: root,
});

const terminate = () => {
  if (isExiting) return;
  isExiting = true;

  try {
    backendProcess.kill();
  } catch {}
  try {
    rsbuildProcess.kill();
  } catch {}

  process.exit(0);
};

process.on('SIGINT', terminate);
process.on('SIGTERM', terminate);

// Monitor processes for termination
Promise.all([backendProcess.exited, rsbuildProcess.exited]).then(() => {
  terminate();
});
