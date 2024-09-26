package com.wultra.android.powerauth.cdv.util


class WritableNativeArray(list: List<Any?> = emptyList()) : ReadableNativeArray(list), WritableArray {

    override fun pushArray(array: ReadableArray?) {
        if (!(array == null || array is ReadableNativeArray)) {
            throw IllegalArgumentException("Illegal type provided")
        }
        _mutableList.add(array as ReadableNativeArray?)
    }

    override fun pushBoolean(value: Boolean) {
        _mutableList.add(value)
    }

    override fun pushDouble(value: Double) {
        _mutableList.add(value)
    }

    override fun pushInt(value: Int) {
        _mutableList.add(value)
    }

    override fun pushLong(value: Long) {
        _mutableList.add(value)
    }

    override fun pushMap(map: ReadableMap?) {
        _mutableList.add(map as ReadableNativeMap?)
    }

    override fun pushNull() {
        _mutableList.add(null)
    }

    override fun pushString(value: String?) {
        _mutableList.add(value)
    }
}