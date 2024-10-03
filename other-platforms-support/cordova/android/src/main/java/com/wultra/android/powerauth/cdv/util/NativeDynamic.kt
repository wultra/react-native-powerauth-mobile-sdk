package com.wultra.android.powerauth.cdv.util

import org.json.JSONArray
import org.json.JSONObject


/**
 * Implementation of dynamic type.
 */
class NativeDynamic(val data: Any?) : Dynamic {

    private val resolvedType: ReadableType = when (data) {
        null -> ReadableType.Null
        is Boolean -> ReadableType.Boolean
        is Int -> ReadableType.Number
        is Double -> ReadableType.Number
        is String -> ReadableType.String
        is JSONArray -> ReadableType.Array
        is JSONObject -> ReadableType.Map
        is HashMap<*,*> -> ReadableType.Map
        else -> throw IllegalArgumentException("Unknown dynamic type ${data::class}")
    }

    override val type: ReadableType
        get() = resolvedType

    override val isNull: Boolean
        get() = false

    override fun asArray(): ReadableArray {
        return ReadableNativeArray(data as JSONArray)
    }

    override fun asBoolean(): Boolean {
        return data as Boolean
    }

    override fun asDouble(): Double {
        return data as Double
    }

    override fun asInt(): Int {
        return data as Int
    }

    override fun asMap(): ReadableMap {
        if (data is JSONObject) {
            return ReadableNativeMap(data)
        } else {
            @Suppress("UNCHECKED_CAST")
            return ReadableNativeMap(data as Map<String, Any?>)
        }
    }

    override fun asString(): String {
        return data as String
    }

    override fun recycle() {
        // no op
    }
}