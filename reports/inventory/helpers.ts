import { Fyo } from "fyo";
import { StockQueue } from "models/inventory/stockQueue";
import { ValuationMethod } from "models/inventory/types";
import { ModelNameEnum } from "models/types";
import { safeParseFloat, safeParseInt } from "utils/index";
import type {
  ComputedStockLedgerEntry,
  RawStockLedgerEntry,
  SerialNumberStatus,
  StockBalanceEntry,
} from "./types";
import type { QueryFilter } from "utils/db/types";
import type { StockTransfer } from "models/inventory/StockTransfer";

type Item = string;
type Location = string;
type Batch = string;

export async function getRawStockLedgerEntries(
  fyo: Fyo,
  filters: QueryFilter = {},
) {
  const fieldnames = [
    "name",
    "date",
    "item",
    "batch",
    "serialNumber",
    "rate",
    "quantity",
    "location",
    "referenceName",
    "referenceType",
  ];

  return (await fyo.db.getAllRaw(ModelNameEnum.StockLedgerEntry, {
    fields: fieldnames,
    filters,
    orderBy: ["date", "created", "name"],
    order: "asc",
  })) as RawStockLedgerEntry[];
}

export async function getShipmentCOGSAmountFromSLEs(
  stockTransfer: StockTransfer,
) {
  const fyo = stockTransfer.fyo;
  const date = stockTransfer.date ?? new Date();
  const items = (stockTransfer.items ?? []).filter((i) => i.item);
  const itemNames = Array.from(new Set(items.map((i) => i.item))) as string[];

  type Item = string;
  type Batch = string;
  type Location = string;
  type Queues = Record<Item, Record<Location, Record<Batch, StockQueue>>>;

  const rawSles = await getRawStockLedgerEntries(fyo, {
    item: ["in", itemNames],
    date: ["<=", date.toISOString()],
  });

  const q: Queues = Object.create(null);
  for (const sle of rawSles) {
    const i = sle.item;
    const l = sle.location;
    const b = sle.batch ?? "-";

    if (i === "__proto__" || i === "constructor" || i === "prototype") continue;
    if (l === "__proto__" || l === "constructor" || l === "prototype") continue;
    if (b === "__proto__" || b === "constructor" || b === "prototype") continue;

    q[i] ??= Object.create(null);
    q[i][l] ??= Object.create(null);
    q[i][l][b] ??= new StockQueue();

    const sq = q[i][l][b];
    if (sle.quantity > 0) {
      const rate = fyo.pesa(sle.rate);
      sq.inward(rate.float, sle.quantity);
    } else {
      sq.outward(-sle.quantity);
    }
  }

  let total = fyo.pesa(0);
  for (const item of items) {
    const i = item.item ?? "-";
    const l = item.location ?? "-";
    const b = item.batch ?? "-";
    const stAmount = item.amount ?? 0;

    if (Object.keys(q).length === 0) {
      total = total.add(stAmount);
      continue;
    }

    const sq = q[i][l][b];

    if (!sq) {
      total = total.add(stAmount);
    }

    const stRate = item.rate?.float ?? 0;
    const stQuantity = item.quantity ?? 0;

    const rate = sq.outward(stQuantity) ?? stRate;
    const amount = rate * stQuantity;

    total = total.add(amount);
  }

  return total;
}

export function getStockLedgerEntries(
  rawSLEs: RawStockLedgerEntry[],
  valuationMethod: ValuationMethod,
): ComputedStockLedgerEntry[] {
  const computedSLEs: ComputedStockLedgerEntry[] = [];
  const stockQueues: Record<
    Item,
    Record<Location, Record<Batch, StockQueue>>
  > = Object.create(null);

  for (const sle of rawSLEs) {
    const name = safeParseInt(sle.name);
    const date = new Date(sle.date);
    const rate = safeParseFloat(sle.rate);
    const { item, location, quantity, referenceName, referenceType } = sle;
    const batch = sle.batch ?? "";
    const serialNumber = sle.serialNumber ?? "";

    if (quantity === 0) {
      continue;
    }

    if (
      item === "__proto__" ||
      item === "constructor" ||
      item === "prototype"
    ) {
      continue;
    }
    if (
      location === "__proto__" ||
      location === "constructor" ||
      location === "prototype"
    ) {
      continue;
    }
    if (
      batch === "__proto__" ||
      batch === "constructor" ||
      batch === "prototype"
    ) {
      continue;
    }

    if (Reflect.get(stockQueues, item) == null) {
      Reflect.set(stockQueues, item, Object.create(null));
    }
    const itemQ = Reflect.get(stockQueues, item);

    if (Reflect.get(itemQ, location) == null) {
      Reflect.set(itemQ, location, Object.create(null));
    }
    const locQ = Reflect.get(itemQ, location);

    if (Reflect.get(locQ, batch) == null) {
      Reflect.set(locQ, batch, new StockQueue());
    }
    const q = Reflect.get(locQ, batch);
    const initialValue = q.value;

    let incomingRate: number | null;
    if (quantity > 0) {
      incomingRate = q.inward(rate, quantity);
    } else {
      incomingRate = q.outward(-quantity);
    }

    if (incomingRate === null) {
      continue;
    }

    const balanceQuantity = q.quantity;
    let valuationRate = q.fifo;
    if (valuationMethod === ValuationMethod.MovingAverage) {
      valuationRate = q.movingAverage;
    }

    const balanceValue = q.value;
    const valueChange = balanceValue - initialValue;

    const csle: ComputedStockLedgerEntry = {
      name,
      date,

      item,
      location,
      batch,
      serialNumber,

      quantity,
      balanceQuantity,

      incomingRate,
      valuationRate,

      balanceValue,
      valueChange,

      referenceName,
      referenceType,
    };

    computedSLEs.push(csle);
  }

  return computedSLEs;
}

export function getStockBalanceEntries(
  computedSLEs: ComputedStockLedgerEntry[],
  filters: {
    item?: string;
    location?: string;
    fromDate?: string;
    toDate?: string;
    batch?: string;
  },
  showSerialNumbers = false,
  serialNumberFilter: SerialNumberStatus = "All",
): StockBalanceEntry[] {
  const sbeMap: Record<
    Item,
    Record<Location, Record<Batch, Record<string, StockBalanceEntry>>>
  > = Object.create(null);

  const fromDate = filters.fromDate ? Date.parse(filters.fromDate) : null;
  const toDate = filters.toDate ? Date.parse(filters.toDate) : null;

  for (const sle of computedSLEs) {
    if (filters.item && sle.item !== filters.item) {
      continue;
    }

    if (filters.location && sle.location !== filters.location) {
      continue;
    }

    if (filters.batch && sle.batch !== filters.batch) {
      continue;
    }

    if (
      showSerialNumbers &&
      (!sle.serialNumber || sle.serialNumber.trim() === "")
    ) {
      continue;
    }

    const batch = sle.batch || "";
    const serialNumber = showSerialNumbers ? sle.serialNumber : "";

    if (
      sle.item === "__proto__" ||
      sle.item === "constructor" ||
      sle.item === "prototype"
    ) {
      continue;
    }
    if (
      sle.location === "__proto__" ||
      sle.location === "constructor" ||
      sle.location === "prototype"
    ) {
      continue;
    }
    if (
      batch === "__proto__" ||
      batch === "constructor" ||
      batch === "prototype"
    ) {
      continue;
    }
    if (
      serialNumber === "__proto__" ||
      serialNumber === "constructor" ||
      serialNumber === "prototype"
    ) {
      continue;
    }

    if (Reflect.get(sbeMap, sle.item) == null) {
      Reflect.set(sbeMap, sle.item, Object.create(null));
    }
    const itemSbe = Reflect.get(sbeMap, sle.item);

    if (Reflect.get(itemSbe, sle.location) == null) {
      Reflect.set(itemSbe, sle.location, Object.create(null));
    }
    const locSbe = Reflect.get(itemSbe, sle.location);

    if (Reflect.get(locSbe, batch) == null) {
      Reflect.set(locSbe, batch, Object.create(null));
    }
    const batchSbe = Reflect.get(locSbe, batch);

    if (Reflect.get(batchSbe, serialNumber) == null) {
      Reflect.set(
        batchSbe,
        serialNumber,
        getSBE(sle.item, sle.location, batch, serialNumber),
      );
    }
    const sbe = Reflect.get(batchSbe, serialNumber);
    const date = sle.date.valueOf();

    if (fromDate && date < fromDate) {
      updateOpeningBalances(sbe, sle);
      continue;
    }

    if (toDate && date > toDate) {
      continue;
    }

    updateCurrentBalances(sbe, sle);
  }

  let entries = Object.values(sbeMap)
    .map((sbeBatched) =>
      Object.values(sbeBatched).map((sbes) =>
        Object.values(sbes).map((sbeWithSN) => Object.values(sbeWithSN)),
      ),
    )
    .flat(3);

  // Filter by serial number status
  if (serialNumberFilter === "In stock") {
    entries = entries.filter((entry) => entry.balanceQuantity > 0);
  } else if (serialNumberFilter === "Out stock") {
    entries = entries.filter((entry) => entry.balanceQuantity <= 0);
  }

  return entries;
}

function getSBE(
  item: string,
  location: string,
  batch: string,
  serialNumber: string,
): StockBalanceEntry {
  return {
    name: 0,

    item,
    location,
    batch,
    serialNumber,

    balanceQuantity: 0,
    balanceValue: 0,

    openingQuantity: 0,
    openingValue: 0,

    incomingQuantity: 0,
    incomingValue: 0,

    outgoingQuantity: 0,
    outgoingValue: 0,

    valuationRate: 0,
  };
}

function updateOpeningBalances(
  sbe: StockBalanceEntry,
  sle: ComputedStockLedgerEntry,
) {
  sbe.openingQuantity += sle.quantity;
  sbe.openingValue += sle.valueChange;

  sbe.balanceQuantity += sle.quantity;
  sbe.balanceValue += sle.valueChange;
}

function updateCurrentBalances(
  sbe: StockBalanceEntry,
  sle: ComputedStockLedgerEntry,
) {
  sbe.balanceQuantity += sle.quantity;
  sbe.balanceValue += sle.valueChange;

  if (sle.quantity > 0) {
    sbe.incomingQuantity += sle.quantity;
    sbe.incomingValue += sle.valueChange;
  } else {
    sbe.outgoingQuantity -= sle.quantity;
    sbe.outgoingValue -= sle.valueChange;
  }

  sbe.valuationRate = sle.valuationRate;
}
