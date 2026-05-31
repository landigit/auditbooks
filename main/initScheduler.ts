import main from 'main';
import { checkLoyaltyProgramExpiry } from '../jobs/checkLoyaltyProgramExpiry';

let erpSyncIntervalId: any = null;
let loyaltyIntervalId: any = null;

function parseIntervalToMs(interval: string): number {
  const num = parseInt(interval, 10);
  if (isNaN(num)) return 3600000; // default to 1 hour
  if (interval.includes('minute')) return num * 60 * 1000;
  if (interval.includes('hour')) return num * 60 * 60 * 1000;
  if (interval.includes('day')) return num * 24 * 60 * 60 * 1000;
  return num * 1000; // default to seconds if no unit is recognized
}

export async function initScheduler(interval: string) {
  if (erpSyncIntervalId) {
    clearInterval(erpSyncIntervalId);
  }
  if (loyaltyIntervalId) {
    clearInterval(loyaltyIntervalId);
  }

  const erpMs = parseIntervalToMs(interval);

  // ERPNext Sync Trigger
  erpSyncIntervalId = setInterval(() => {
    main.mainWindow?.webContents.send('trigger-erpnext-sync');
  }, erpMs);

  // Loyalty Program Expiry Check (Runs every 24 hours)
  const checkExpiry = async () => {
    try {
      await checkLoyaltyProgramExpiry();
    } catch (err) {
      console.error('Failed to run checkLoyaltyProgramExpiry:', err);
    }
  };

  await checkExpiry();
  loyaltyIntervalId = setInterval(checkExpiry, 24 * 60 * 60 * 1000);
}
