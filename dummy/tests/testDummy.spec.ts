import { assertDoesNotThrow } from "backend/database/tests/helpers";
import { purchaseItemPartyMap } from "dummy/helpers";
import { describe, expect, test, afterAll } from "@rstest/core";
import { getTestDbPath, getTestFyo } from "tests/helpers";
import { setupDummyInstance } from "..";

describe("Dummy Data Tests", () => {
  const dbPath = getTestDbPath();
  const fyo = getTestFyo();

  test("setupDummyInstance", async () => {
    await assertDoesNotThrow(async () => {
      await setupDummyInstance(dbPath, fyo, 1, 25);
    }, "setup instance failed");
  }, 120_000);

  test("purchaseItemParty Existence", async () => {
    for (const item in purchaseItemPartyMap) {
      expect(await fyo.db.exists("Item", item)).toBe(true);

      const party = Reflect.get(purchaseItemPartyMap, item);
      expect(await fyo.db.exists("Party", party)).toBe(true);
    }
  });

  afterAll(async () => {
    await fyo.close();
  });
});
