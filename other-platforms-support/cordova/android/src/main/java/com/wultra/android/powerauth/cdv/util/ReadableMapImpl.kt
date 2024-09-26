package com.wultra.android.powerauth.cdv.util

import com.wultra.android.powerauth.bridge.toList
import com.wultra.android.powerauth.bridge.toMap
import com.wultra.android.powerauth.bridge.toReadableType
import org.json.JSONArray
import org.json.JSONObject
import java.util.HashMap

open class ReadableMapImpl(srcMap: Map<String, Any?>) : ReadableMap {

    protected val _mutableMap = srcMap.toMutableMap()
    protected val map: Map<String, Any?> = _mutableMap

    constructor(jsonObj: JSONObject) : this(jsonObj.toMap())

    override val entryIterator: Iterator<Map.Entry<String, Any>>
        get() = map.filter { entry -> entry.value == null }
            .map { it as Map.Entry<String, Any> }
            .iterator()

    override fun getArray(name: String): ReadableArray? {
        return map[name]?.let {
            ReadableArrayImpl(it as List<Any?>)
        }
    }

    override fun getBoolean(name: String): Boolean {
        return map[name] as Boolean
    }

    override fun getDouble(name: String): Double {
        return map[name] as Double
    }

    override fun getDynamic(name: String): Dynamic {
        return map[name] as Dynamic
    }

    override fun getInt(name: String): Int {
        return map[name] as Int
    }

    override fun getLong(name: String): Long {
        return map[name] as Long
    }

    override fun getMap(name: String): ReadableMap? {
        return map[name]?.let {
            ReadableMapImpl(it as Map<String, Any?>)
        }
    }

    override fun getString(name: String): String? {
        return map[name] as? String
    }

    override fun getType(name: String): ReadableType {
        return map[name]?.toReadableType() ?: ReadableType.Null
    }

    override fun hasKey(name: String): Boolean {
        return map[name] != null
    }

    override fun isNull(name: String): Boolean {
        return map[name] == null
    }

    override fun keySetIterator(): ReadableMapKeySetIterator {
        return ReadableMapKeySetIteratorImpl(map.keys.iterator())
    }

    override fun toHashMap(): HashMap<String, Any> {
        return HashMap<String, Any>(map)
    }
}