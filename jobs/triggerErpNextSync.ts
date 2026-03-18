// eslint-disable-next-line
const { parentPort } = require('worker_threads');

if (parentPort) {
  parentPort.postMessage({ type: 'trigger-erpnext-sync' });
}
