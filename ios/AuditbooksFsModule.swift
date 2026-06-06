import Foundation
import Lynx

/**
 * AuditbooksFsModule.swift
 *
 * iOS Lynx native module that provides raw file-system access to the
 * Vue Lynx JS thread.
 *
 * Exposes two methods to the JavaScript layer:
 *
 *   - `readBytes(filename)` → Base64-encoded file contents, or `nil`
 *   - `writeBytes(filename, base64)` → void (writes raw bytes back to disk)
 *
 * Database files are stored in the app's sandboxed Application Support
 * directory which is private, backed up by iCloud, and never requires any
 * special entitlements.
 *
 * ------------------------------------------------------------------
 * Registration (AppDelegate or LynxView setup)
 * ------------------------------------------------------------------
 * ```swift
 * LynxEnv.sharedInstance().registerModule(AuditbooksFsModule.self)
 * ```
 */
@objc(AuditbooksFsModule)
class AuditbooksFsModule: LynxModule {

    // MARK: - LynxModule metadata

    static func moduleName() -> String {
        return "AuditbooksFsModule"
    }

    static func methodsToExport() -> [LynxMethodDescriptor] {
        return [
            LynxMethodDescriptor(name: "readBytes",  selector: #selector(readBytes(_:resolver:rejecter:))),
            LynxMethodDescriptor(name: "writeBytes", selector: #selector(writeBytes(_:base64:resolver:rejecter:))),
        ]
    }

    // MARK: - Exported methods

    /**
     * Read the raw bytes of `filename` from Application Support.
     *
     * - Parameter filename: Relative path within Application Support, e.g. `"company.db"`
     * - Returns: Base64-encoded file contents via the promise, or `nil` if the file does
     *            not yet exist.
     */
    @objc func readBytes(
        _ filename: String,
        resolver resolve: @escaping LynxPromiseResolveBlock,
        rejecter  reject:  @escaping LynxPromiseRejectBlock
    ) {
        guard let fileURL = resolveURL(filename) else {
            reject("PATH_ERROR", "Could not resolve path for \(filename)", nil)
            return
        }

        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            NSLog("[AuditbooksFsModule] readBytes: \"%@\" not found → returning nil", filename)
            resolve(nil)
            return
        }

        do {
            let data = try Data(contentsOf: fileURL)
            let base64 = data.base64EncodedString()
            NSLog("[AuditbooksFsModule] readBytes: read %d bytes from \"%@\"", data.count, filename)
            resolve(base64)
        } catch {
            reject("READ_ERROR", "Failed to read \(filename): \(error.localizedDescription)", error as NSError)
        }
    }

    /**
     * Write `base64`-encoded bytes to `filename` in Application Support.
     * Creates intermediate directories as needed.
     *
     * - Parameter filename: Relative path within Application Support, e.g. `"company.db"`
     * - Parameter base64:   Base64-encoded database bytes
     */
    @objc func writeBytes(
        _ filename: String,
        base64:   String,
        resolver resolve: @escaping LynxPromiseResolveBlock,
        rejecter  reject:  @escaping LynxPromiseRejectBlock
    ) {
        guard let fileURL = resolveURL(filename) else {
            reject("PATH_ERROR", "Could not resolve path for \(filename)", nil)
            return
        }

        guard let data = Data(base64Encoded: base64) else {
            reject("DECODE_ERROR", "Invalid Base64 payload for \(filename)", nil)
            return
        }

        do {
            // Ensure parent directory exists
            let dir = fileURL.deletingLastPathComponent()
            try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            try data.write(to: fileURL, options: .atomic)
            NSLog("[AuditbooksFsModule] writeBytes: wrote %d bytes to \"%@\"", data.count, filename)
            resolve(nil)
        } catch {
            reject("WRITE_ERROR", "Failed to write \(filename): \(error.localizedDescription)", error as NSError)
        }
    }

    // MARK: - Internal helpers

    private func resolveURL(_ filename: String) -> URL? {
        guard let baseURL = FileManager.default.urls(
            for: .applicationSupportDirectory,
            in:  .userDomainMask
        ).first else {
            return nil
        }

        // Prevent path-traversal attacks: strip ".." components
        let sanitised = filename
            .components(separatedBy: "/")
            .filter { $0 != ".." && !$0.isEmpty }
            .joined(separator: "/")

        return baseURL.appendingPathComponent(sanitised)
    }
}
