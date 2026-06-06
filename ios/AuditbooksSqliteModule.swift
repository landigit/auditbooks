import Foundation
import SQLite3
import Lynx

/**
 * AuditbooksSqliteModule
 * Lynx native module wrapping iOS SQLite3 C API.
 *
 * JS interface:
 *   openDatabase(filename, onSuccess, onError)
 *   execute(sql, args, onSuccess, onError)  ->  { rows: [[String: Any]], rowsAffected: Int }
 *   closeDatabase(onSuccess, onError)
 *   deleteDatabase(filename, onSuccess, onError)
 *   listDatabases(onSuccess, onError)        ->  [String]
 *
 * Register in AppDelegate / LynxView setup:
 *   LynxEnv.sharedInstance().registerModule(AuditbooksSqliteModule.self)
 */
@objc public class AuditbooksSqliteModule: NSObject, LynxModule {

    private var db: OpaquePointer?
    private var documentsDir: String {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)
            .first!.path
    }

    public static func moduleName() -> String { "AuditbooksSqliteModule" }

    // MARK: - openDatabase
    @objc public func openDatabase(_ filename: String,
                                   success: @escaping LynxCallbackBlock,
                                   error: @escaping LynxCallbackBlock) {
        let path = (documentsDir as NSString).appendingPathComponent(filename)
        // Ensure directory exists
        try? FileManager.default.createDirectory(atPath: documentsDir,
                                                 withIntermediateDirectories: true)
        guard sqlite3_open_v2(path, &db,
                              SQLITE_OPEN_CREATE | SQLITE_OPEN_READWRITE | SQLITE_OPEN_FULLMUTEX,
                              nil) == SQLITE_OK else {
            error(["error": "Failed to open database at \(path)"])
            return
        }
        sqlite3_exec(db, "PRAGMA foreign_keys=ON", nil, nil, nil)
        sqlite3_exec(db, "PRAGMA journal_mode=WAL", nil, nil, nil)
        sqlite3_exec(db, "PRAGMA synchronous=NORMAL", nil, nil, nil)
        success(["ok": true])
    }

    // MARK: - execute
    @objc public func execute(_ sql: String,
                              args: [Any],
                              success: @escaping LynxCallbackBlock,
                              error: @escaping LynxCallbackBlock) {
        guard let db = db else {
            error(["error": "Database not open. Call openDatabase first."])
            return
        }

        var stmt: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
            let msg = String(cString: sqlite3_errmsg(db))
            error(["error": "Prepare failed: \(msg)"])
            return
        }
        defer { sqlite3_finalize(stmt) }

        // Bind arguments
        for (i, arg) in args.enumerated() {
            let idx = Int32(i + 1)
            switch arg {
            case is NSNull:
                sqlite3_bind_null(stmt, idx)
            case let n as NSNumber:
                if CFNumberIsFloatType(n) {
                    sqlite3_bind_double(stmt, idx, n.doubleValue)
                } else {
                    sqlite3_bind_int64(stmt, idx, n.int64Value)
                }
            case let s as String:
                sqlite3_bind_text(stmt, idx, (s as NSString).utf8String, -1, SQLITE_TRANSIENT)
            default:
                sqlite3_bind_text(stmt, idx, "\(arg)", -1, SQLITE_TRANSIENT)
            }
        }

        let trimmed = sql.trimmingCharacters(in: .whitespaces).lowercased()
        let isQuery = trimmed.hasPrefix("select") || trimmed.hasPrefix("pragma") || trimmed.hasPrefix("explain")

        if isQuery {
            var rows: [[String: Any]] = []
            while sqlite3_step(stmt) == SQLITE_ROW {
                var row: [String: Any] = [:]
                let colCount = sqlite3_column_count(stmt)
                for col in 0..<colCount {
                    let name = String(cString: sqlite3_column_name(stmt, col))
                    switch sqlite3_column_type(stmt, col) {
                    case SQLITE_INTEGER:
                        row[name] = sqlite3_column_int64(stmt, col)
                    case SQLITE_FLOAT:
                        row[name] = sqlite3_column_double(stmt, col)
                    case SQLITE_TEXT:
                        row[name] = String(cString: sqlite3_column_text(stmt, col))
                    case SQLITE_NULL:
                        row[name] = NSNull()
                    default:
                        row[name] = String(cString: sqlite3_column_text(stmt, col))
                    }
                }
                rows.append(row)
            }
            success(["rows": rows, "rowsAffected": 0])
        } else {
            let rc = sqlite3_step(stmt)
            if rc != SQLITE_DONE && rc != SQLITE_ROW {
                let msg = String(cString: sqlite3_errmsg(db))
                error(["error": "Execute failed: \(msg)"])
                return
            }
            let affected = Int(sqlite3_changes(db))
            success(["rows": [], "rowsAffected": affected])
        }
    }

    // MARK: - closeDatabase
    @objc public func closeDatabase(_ success: @escaping LynxCallbackBlock,
                                    error: @escaping LynxCallbackBlock) {
        if let db = db {
            sqlite3_close_v2(db)
            self.db = nil
        }
        success(["ok": true])
    }

    // MARK: - deleteDatabase
    @objc public func deleteDatabase(_ filename: String,
                                     success: @escaping LynxCallbackBlock,
                                     error: @escaping LynxCallbackBlock) {
        if let db = db { sqlite3_close_v2(db); self.db = nil }
        let path = (documentsDir as NSString).appendingPathComponent(filename)
        do {
            try FileManager.default.removeItem(atPath: path)
            success(["ok": true])
        } catch {
            error(["error": error.localizedDescription])
        }
    }

    // MARK: - listDatabases
    @objc public func listDatabases(_ success: @escaping LynxCallbackBlock,
                                    error: @escaping LynxCallbackBlock) {
        do {
            let files = try FileManager.default.contentsOfDirectory(atPath: documentsDir)
            let dbs = files.filter { .hasSuffix(".db") }
            success(["files": dbs])
        } catch {
            error(["error": error.localizedDescription])
        }
    }
}

// Keep SQLITE_TRANSIENT for Swift compatibility
private let SQLITE_TRANSIENT = unsafeBitCast(-1, to: sqlite3_destructor_type.self)
