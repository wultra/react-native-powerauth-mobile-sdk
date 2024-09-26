package com.wultra.android.powerauth.cdv.util

import com.wultra.android.powerauth.bridge.toList
import com.wultra.android.powerauth.bridge.toMap
import com.wultra.android.powerauth.bridge.toReadableType
import org.json.JSONArray
import org.json.JSONObject
import java.util.HashMap


open class ReadableArrayImpl(srcList: List<Any?>) : ReadableArray {

    protected val _mutableList = srcList.toMutableList()
    protected val list: List<Any?> = _mutableList
    
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

