package com.wultra.android.powerauth.bridge

import android.util.Log
import com.wultra.android.powerauth.cdv.util.Dynamic
import com.wultra.android.powerauth.cdv.util.NativeDynamic
import com.wultra.android.powerauth.cdv.util.ReadableArray
import com.wultra.android.powerauth.cdv.util.ReadableNativeArray
import com.wultra.android.powerauth.cdv.util.ReadableNativeMap
import com.wultra.android.powerauth.cdv.util.ReadableMap
import com.wultra.android.powerauth.cdv.util.ReadableType
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

fun JSONArray.getDynamic(pos: Int): Dynamic? {
    val obj = get(pos)
    return NativeDynamic(obj)
}

fun Any?.toDynamic(): Dynamic = NativeDynamic(this)

fun JSONArray.getOptString(pos: Int): String? {
    return if (isNull(pos)) {
        null
    } else {
        getString(pos)
    }
}

@Throws(JSONException::class)
fun JSONArray.getReadableMap(pos: Int): ReadableMap {
    if (isNull(pos)) {
        return ReadableNativeMap(emptyMap())
    }
    val obj = getJSONObject(pos)
    return ReadableNativeMap(obj)
}

@Throws(JSONException::class)
fun JSONArray.getOptReadableMap(pos: Int): ReadableMap? {
    if (isNull(pos)) {
        return null
    }
    val obj = getJSONObject(pos)
    return ReadableNativeMap(obj)
}

fun JSONObject.toMap(): Map<String, Any?> = keys().asSequence()
    .associateWith { ait ->
        when (val value = this[ait]) {
            is JSONArray ->
            {
                val map = (0 until value.length()).associate { Pair(it.toString(), value[it]) }
                JSONObject(map).toMap().values.toList()
            }
            is JSONObject -> value.toMap()
            JSONObject.NULL -> null
            else            -> value
        }
}

fun JSONArray.toList(): List<Any> {
    return (0 until this.length()).map {
        when (val value = this[it]) {
            is JSONArray -> value.toList()
            is JSONObject -> value.toMap()
            else -> value
        }
    }
}

fun Any?.toReadableType(): ReadableType {
    return when (this) {
        is Boolean -> ReadableType.Boolean
        is Number -> ReadableType.Number
        is String -> ReadableType.String
        is List<*> -> ReadableType.Array
        is Array<*> -> ReadableType.Array
        is Map<*,*> -> ReadableType.Map
        null -> ReadableType.Null
        else -> ReadableType.Null
    }
}

