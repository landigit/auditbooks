import { getDefaultMetaFieldValueMap } from 'backend/helpers';
import { AccountTypeEnum } from 'models/baseModels/Account/types';
import { ModelNameEnum } from 'models/types';
import type { DatabaseManager } from '../database/manager';

type AccountTypeMap = Record<AccountTypeEnum, string[] | undefined>;

async function execute(dm: DatabaseManager) {
  const accounts = (await dm.db?.getAll(ModelNameEnum.Account, {
    fields: ['name', 'accountType'],
    filters: {
      accountType: [
        'in',
        [
          AccountTypeEnum.Bank,
          AccountTypeEnum.Cash,
          AccountTypeEnum.Payable,
          AccountTypeEnum.Receivable,
        ],
      ],
    },
  })) as { name: string; accountType: AccountTypeEnum }[];

  const accountsMap = accounts.reduce((acc, ac) => {
    acc[ac.accountType] ??= [];
    acc[ac.accountType]?.push(ac.name);
    return acc;
  }, {} as AccountTypeMap);

  const defaults = getDefaultMetaFieldValueMap();

  const paymentMethods = [
    {
      name: 'Cash',
      type: 'Cash',
      account: accountsMap[AccountTypeEnum.Cash]?.[0],
      ...defaults,
    },
    {
      name: 'Bank',
      type: 'Bank',
      account: accountsMap[AccountTypeEnum.Bank]?.[0],
      ...defaults,
    },
    {
      name: 'Transfer',
      type: 'Bank',
      account: accountsMap[AccountTypeEnum.Bank]?.[0],
      ...defaults,
    },
  ];

  for (const paymentMethod of paymentMethods) {
    await dm.db?.insert(ModelNameEnum.PaymentMethod, paymentMethod);
  }
}
export default { execute };
