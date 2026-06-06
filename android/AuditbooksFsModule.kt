package com.landigit.auditbooks

import android.content.Context
import android.util.Base64
import com.lynx.tasm.behavior.utils.Prop
import com.lynx.tasm.behavior.utils.LynxModule
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream

/**
 * AuditbooksFsModule.kt
 *
 * Android Lynx native module that provides raw file-system access to the
 * Vue Lynx JS thread.
 *
 * Exposes two methods to the JavaScript layer:
 *
 *   - `readBytes(filename)` → Base64-encoded file contents, or `null`
 *   - `writeBytes(filename, base64)` → void (writes raw bytes back to disk)
 *
 * Database files are stored in the app's internal files directory
 * (`context.filesDir`) which is private to the app and never requires
 * storage permissions.
 *
 * ------------------------------------------------------------------
 * Registration (in your Application or Activity class)
 * ------------------------------------------------------------------
 * ```kotlin
 * LynxEnv.inst().registerModule(AuditbooksFsModule(applicationContext))
 * ```
 */
@LynxModule(name = "AuditbooksFsModule")
class AuditbooksFsModule(private val context: Context) {

    companion object {
        private const val TAG = "AuditbooksFsModule"
    }

    /**
     * Read the raw bytes of [filename] from the app's internal files directory.
     *
     * @param filename  Relative path within `filesDir`, e.g. `"company.db"`
     * @return Base64-encoded file contents, or `null` if the file does not exist
     */
    @Prop
    fun readBytes(filename: String): String? {
        val file = resolveFile(filename)
        if (!file.exists()) {
            android.util.Log.i(TAG, "readBytes: \"$filename\" not found → returning null")
            return null
        }
        return FileInputStream(file).use { stream ->
            val bytes = stream.readBytes()
            android.util.Log.d(TAG, "readBytes: read ${bytes.size} bytes from \"$filename\"")
            Base64.encodeToString(bytes, Base64.NO_WRAP)
        }
    }

    /**
     * Write [base64]-encoded bytes to [filename] in the app's internal files directory.
     * Creates intermediate directories as needed.
     *
     * @param filename  Relative path within `filesDir`, e.g. `"company.db"`
     * @param base64    Base64-encoded database bytes
     */
    @Prop
    fun writeBytes(filename: String, base64: String) {
        val file = resolveFile(filename)
        file.parentFile?.mkdirs()
        val bytes = Base64.decode(base64, Base64.NO_WRAP)
        FileOutputStream(file).use { it.write(bytes) }
        android.util.Log.d(TAG, "writeBytes: wrote ${bytes.size} bytes to \"$filename\"")
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    private fun resolveFile(filename: String): File {
        // Prevent path-traversal attacks
        val sanitised = filename.replace("..", "").trimStart('/', '\\')
        return File(context.filesDir, sanitised)
    }
}
