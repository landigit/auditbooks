import { BalanceSheet } from "./BalanceSheet/BalanceSheet";
import { GeneralLedger } from "./GeneralLedger/GeneralLedger";
import { GSTR1 } from "./GoodsAndServiceTax/GSTR1";
import { GSTR2 } from "./GoodsAndServiceTax/GSTR2";
import { StockBalance } from "./inventory/StockBalance";
import { StockLedger } from "./inventory/StockLedger";
import { ProfitAndLoss } from "./ProfitAndLoss/ProfitAndLoss";
import { TrialBalance } from "./TrialBalance/TrialBalance";

export const reports = {
	GeneralLedger,
	ProfitAndLoss,
	BalanceSheet,
	TrialBalance,
	GSTR1,
	GSTR2,
	StockLedger,
	StockBalance,
} as const;
