package com.wultra.android.powerauth.bridge

import android.util.Log
import com.wultra.android.powerauth.cdv.util.DefaultDynamic
import com.wultra.android.powerauth.cdv.util.Dynamic
import com.wultra.android.powerauth.cdv.util.ReadableArray
import com.wultra.android.powerauth.cdv.util.ReadableArrayImpl
import com.wultra.android.powerauth.cdv.util.ReadableMap
import com.wultra.android.powerauth.cdv.util.ReadableMapImpl
import com.wultra.android.powerauth.cdv.util.ReadableType
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

fun JSONArray.getDynamic(pos: Int): Dynamic? {
    // TODO improve
    Log.i("Dyn", "Dynamic: ${this}")
    val obj = get(pos)
    Log.i("Dyn", "The value is: ${obj}")
    if (isNull(pos)) {
        return object : DefaultDynamic() {
            override val type: ReadableType
                get() = ReadableType.Null
            override val isNull: Boolean
                get() = true
        }
    } else {
        when (obj) {
            is Boolean -> return object : DefaultDynamic() {
                override val type: ReadableType
                    get() = ReadableType.Boolean
                override fun asBoolean(): Boolean {
                    return obj
                }
            }
            is Int -> return object : DefaultDynamic() {
                override val type: ReadableType
                    get() = ReadableType.Number
                override fun asInt(): Int {
                    return obj
                }
            }
            is Double -> return object : DefaultDynamic() {
                override val type: ReadableType
                    get() = ReadableType.Number
                override fun asDouble(): Double {
                    return obj
                }
            }
            is String -> return object : DefaultDynamic() {
                override val type: ReadableType
                    get() = ReadableType.String
                override fun asString(): String {
                    return obj
                }
            }
            is JSONArray -> return object : DefaultDynamic() {
                override val type: com.wultra.android.powerauth.cdv.util.ReadableType
                    get() = ReadableType.Array
                override fun asArray(): ReadableArray {
                    return ReadableArrayImpl(obj)
                }
            }
            is JSONObject -> return object : DefaultDynamic() {
                override val type: ReadableType
                    get() = ReadableType.Map
                override fun asMap(): ReadableMap {
                    return ReadableMapImpl(obj)
                }
            }
            else -> {
                Log.i("Dyn", "Dynamic not handled: ${obj} -> ${obj::class}")
            }
        }
    }
    return null
}

fun Any?.toDynamic(): Dynamic {
    // TODO improve
    Log.i("Dyn", "The value is: ${this}")
    when (this) {
//        null -> return object : DefaultDynamic() {
//            override val type: ReadableType
//                get() = ReadableType.Null
//            override val isNull: Boolean
//                get() = true
//        }
        is Boolean -> return object : DefaultDynamic() {
            override val type: ReadableType
                get() = ReadableType.Boolean
            override fun asBoolean(): Boolean {
                return this@toDynamic
            }
        }
        is Int -> return object : DefaultDynamic() {
            override val type: ReadableType
                get() = ReadableType.Number
            override fun asInt(): Int {
                return this@toDynamic
            }
        }
        is Double -> return object : DefaultDynamic() {
            override val type: ReadableType
                get() = ReadableType.Number
            override fun asDouble(): Double {
                return this@toDynamic
            }
        }
        is String -> return object : DefaultDynamic() {
            override val type: ReadableType
                get() = ReadableType.String
            override fun asString(): String {
                return this@toDynamic
            }
        }
        is JSONArray -> return object : DefaultDynamic() {
            override val type: com.wultra.android.powerauth.cdv.util.ReadableType
                get() = ReadableType.Array
            override fun asArray(): ReadableArray {
                return ReadableArrayImpl(this@toDynamic)
            }
        }
        is JSONObject -> return object : DefaultDynamic() {
            override val type: ReadableType
                get() = ReadableType.Map
            override fun asMap(): ReadableMap {
                return ReadableMapImpl(this@toDynamic)
            }
        }
        is HashMap<*,*> -> return object : DefaultDynamic() {
            override val type: ReadableType
                get() = ReadableType.Map
            override fun asMap(): ReadableMap {
                return ReadableMapImpl(this@toDynamic as Map<String, Any?>)
            }
        }
        else -> {
            Log.i("Dyn", "Dynamic not handled: ${this}")
        }
    }
    return object : DefaultDynamic() {
        override val type: ReadableType
            get() = ReadableType.Null
        override val isNull: Boolean
            get() = true
    }
}

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
        return ReadableMapImpl(emptyMap())
    }
    val obj = getJSONObject(pos)
    Log.i("getReadableMap", "RedableMap obj[$pos]: ${obj}")
    return ReadableMapImpl(obj)
}

@Throws(JSONException::class)
fun JSONArray.getOptReadableMap(pos: Int): ReadableMap? {
    if (isNull(pos)) {
        return null
    }
    val obj = getJSONObject(pos)
    Log.i("getReadableMap", "RedableMap obj[$pos]: ${obj}")
    return ReadableMapImpl(obj)
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

