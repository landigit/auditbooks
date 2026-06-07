const { execSync } = require("child_process");
const path = require("path");

/**
 * Custom signing script for Windows
 * This script is called by electron-builder during the build process.
 */
async function sign(configuration) {
  const { path: filePath } = configuration;

  // Only sign Windows executables
  if (process.platform !== "win32") return;
  if (!filePath.endsWith(".exe")) return;

  console.log(`🔐 Signing: ${filePath}`);

  const signtoolPath =
    "C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.26100.0\\x64\\signtool.exe";
  const certPath = path.resolve(__dirname, "..", "certificate.pfx");
  const certPassword = process.env.CSC_KEY_PASSWORD;

  if (!certPassword) {
    console.warn("⚠️ Warning: CSC_KEY_PASSWORD environment variable is not set. Skipping signing.");
    return;
  }

  try {
    // Execute signtool
    execSync(
      `"${signtoolPath}" sign /fd SHA256 /a /f "${certPath}" /p "${certPassword}" /tr http://timestamp.digicert.com /td SHA256 "${filePath}"`,
      {
        stdio: "inherit",
      },
    );
    console.log("✅ Successfully signed:", filePath);
  } catch (err) {
    console.error("❌ Signing failed:", err.message);
    process.exit(1);
  }
}

module.exports = sign;
