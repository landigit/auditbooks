const path = require("node:path");
// @ts-expect-error
const Bree = require("bree").default ?? require("bree");
const main =
	require("../electron-main.ts").default || require("../electron-main.ts");

let bree: InstanceType<typeof Bree> | undefined;

async function initScheduler(interval: string) {
	const jobsRoot = path.join(__dirname, "..", "..", "jobs");

	if (bree) {
		await bree.stop();
	}

	bree = new Bree({
		root: jobsRoot,
		defaultExtension: "ts",
		jobs: [
			{
				name: "triggerErpNextSync",
				interval: interval,
				worker: {
					workerData: {
						useTsNode: true,
					},
				},
			},
			{
				name: "checkLoyaltyProgramExpiry",
				interval: "24 hours",
				worker: {
					workerData: {
						useTsNode: true,
					},
				},
			},
		],
		worker: {
			argv: ["--require", "ts-node/register"],
		},
	});

	bree.on("worker created", () => {
		main.mainWindow?.webContents.send("trigger-erpnext-sync");
	});

	await bree.start();
}

module.exports = { initScheduler, default: initScheduler };
