package com.wultra.android.powerauth.cdv.util

import com.wultra.android.powerauth.bridge.toList
import com.wultra.android.powerauth.bridge.toMap
import com.wultra.android.powerauth.bridge.toReadableType
import org.json.JSONArray
import org.json.JSONObject
import java.util.HashMap


class ReadableArrayImpl(val list: List<Any?>) : ReadableArray {

    constructor(jsonArray: JSONArray) : this(jsonArray.toList())

    override fun getArray(index: Int): ReadableArray {
        return ReadableArrayImpl(list[index] as List<Any?>)
    }

    override fun getBoolean(index: Int): Boolean {
        return list[index] as Boolean
    }

    override fun getDouble(index: Int): Double {
        return list[index] as Double
    }

    override fun getDynamic(index: Int): Dynamic {
        return list[index] as Dynamic
    }

    override fun getInt(index: Int): Int {
        return list[index] as Int
    }

    override fun getLong(index: Int): Long {
        return list[index] as Long
    }

    override fun getMap(index: Int): ReadableMap {
        return ReadableMapImpl(list[index] as Map<String, Any?>)
    }

    override fun getString(index: Int): String {
        return list[index] as String
    }

    override fun getType(index: Int): ReadableType {
        return list[index].toReadableType()
    }

    override fun isNull(index: Int): Boolean {
        return list[index] == null
    }

    override fun size(): Int {
        return list.size
    }

    override fun toArrayList(): ArrayList<Any> {
        return ArrayList(list.filterNotNull())
    }
}

class ReadableMapImpl(val map: Map<String, Any?>) : ReadableMap {

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
        TODO("Not yet implemented")
    }

    override fun toHashMap(): HashMap<String, Any> {
        TODO("Not yet implemented")
    }
}