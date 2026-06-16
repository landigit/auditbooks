import { parentPort } from 'worker_threads';

if (parentPort) {
  parentPort.postMessage({ type: 'trigger-erpnext-sync' });
}
