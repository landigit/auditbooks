package com.auditbooks.lynx

import android.content.Context
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import com.lynx.jsbridge.LynxModule
import com.lynx.jsbridge.LynxMethod
import com.lynx.react.bridge.Arguments
import com.lynx.react.bridge.Callback
import com.lynx.react.bridge.ReadableArray
import com.lynx.react.bridge.WritableArray
import com.lynx.react.bridge.WritableMap
import java.io.File

/**
 * AuditbooksSqliteModule
 * Lynx native module wrapping Android SQLiteDatabase.
 *
 * JS interface:
 *   openDatabase(filename, onSuccess, onError)
 *   execute(sql, args, onSuccess, onError)  ->  { rows: any[], rowsAffected: number }
 *   closeDatabase(onSuccess, onError)
 *   deleteDatabase(filename, onSuccess, onError)
 *   listDatabases(onSuccess, onError)        ->  string[]
 *
 * Register in Application.onCreate():
 *   LynxEnv.inst().registerModule(AuditbooksSqliteModule(applicationContext))
 */
class AuditbooksSqliteModule(private val context: Context) : LynxModule(context) {

    companion object { const val NAME = "AuditbooksSqliteModule" }

    private var db: SQLiteDatabase? = null
    override fun getName(): String = NAME

    @LynxMethod
    fun openDatabase(filename: String, success: Callback, error: Callback) {
        try {
            val f = File(context.filesDir, filename)
            db = SQLiteDatabase.openOrCreateDatabase(f, null)
            db!!.execSQL("PRAGMA foreign_keys=ON")
            db!!.execSQL("PRAGMA journal_mode=WAL")
            db!!.execSQL("PRAGMA synchronous=NORMAL")
            success.invoke(true)
        } catch (e: Exception) { error.invoke(e.message ?: "openDatabase failed") }
    }

    @LynxMethod
    fun execute(sql: String, args: ReadableArray, success: Callback, error: Callback) {
        try {
            val d = db ?: throw IllegalStateException("DB not open")
            val bind = Array<String?>(args.size()) { i ->
                if (args.isNull(i)) null else args.getDynamic(i).asString()
            }
            val trimmed = sql.trim().lowercase()
            val isQuery = trimmed.startsWith("select") || trimmed.startsWith("pragma") || trimmed.startsWith("explain")
            val result: WritableMap = Arguments.createMap()
            if (isQuery) {
                val c: Cursor = d.rawQuery(sql, bind)
                val rows: WritableArray = Arguments.createArray()
                val cols = c.columnNames
                while (c.moveToNext()) {
                    val row: WritableMap = Arguments.createMap()
                    for (i in cols.indices) {
                        val col = cols[i]
                        when (c.getType(i)) {
                            Cursor.FIELD_TYPE_INTEGER -> row.putDouble(col, c.getLong(i).toDouble())
                            Cursor.FIELD_TYPE_FLOAT   -> row.putDouble(col, c.getDouble(i))
                            Cursor.FIELD_TYPE_STRING  -> row.putString(col, c.getString(i))
                            Cursor.FIELD_TYPE_NULL    -> row.putNull(col)
                            else                      -> row.putString(col, c.getString(i))
                        }
                    }
                    rows.pushMap(row)
                }
                c.close()
                result.putArray("rows", rows)
                result.putInt("rowsAffected", 0)
            } else {
                d.execSQL(sql, bind as Array<Any?>)
                result.putArray("rows", Arguments.createArray())
                result.putInt("rowsAffected", 1)
            }
            success.invoke(result)
        } catch (e: Exception) { error.invoke(e.message ?: "execute failed") }
    }

    @LynxMethod
    fun closeDatabase(success: Callback, error: Callback) {
        try { db?.close(); db = null; success.invoke(true) }
        catch (e: Exception) { error.invoke(e.message ?: "closeDatabase failed") }
    }

    @LynxMethod
    fun deleteDatabase(filename: String, success: Callback, error: Callback) {
        try {
            db?.close(); db = null
            val deleted = SQLiteDatabase.deleteDatabase(File(context.filesDir, filename))
            success.invoke(deleted)
        } catch (e: Exception) { error.invoke(e.message ?: "deleteDatabase failed") }
    }

    @LynxMethod
    fun listDatabases(success: Callback, error: Callback) {
        try {
            val arr: WritableArray = Arguments.createArray()
            context.filesDir.listFiles { f -> f.extension == "db" }
                ?.forEach { arr.pushString(it.name) }
            success.invoke(arr)
        } catch (e: Exception) { error.invoke(e.message ?: "listDatabases failed") }
    }
}
