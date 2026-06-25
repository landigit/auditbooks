import { DatabaseManager } from '../backend/database/manager';
import { ModelNameEnum } from '../models/types';

export async function checkLoyaltyProgramExpiry() {
  const dm = new DatabaseManager();

  try {
    const currentDate = new Date();

    const loyaltyPrograms = await dm.db?.getAll(ModelNameEnum.LoyaltyProgram, {
      fields: ['name', 'toDate', 'status', 'isEnabled', 'maximumUse', 'used'],
      filters: {
        status: ['not in', ['Expired']],
        isEnabled: true,
      },
    });

    if (loyaltyPrograms) {
      for (const program of loyaltyPrograms) {
        if (program.toDate && new Date(String(program.toDate)) <= currentDate) {
          await (dm.db?.kysely as any)
            .updateTable(ModelNameEnum.LoyaltyProgram)
            .set({
              status: 'Expired',
              isEnabled: false,
            })
            .where('name', '=', program.name)
            .execute();
        }
      }
    }

    const result = {
      timestamp: currentDate.toISOString(),
    };

    return result;
  } catch (error) {
    throw error;
  } finally {
    await dm.call('close');
  }
}

checkLoyaltyProgramExpiry().catch((error) => {
  throw error;
});
