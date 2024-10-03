package com.wultra.android.powerauth.cdv.util

/**
 * Cordova implementation of writable map.
 *
 * It's not in fact native, it's based on Kotlin collections.
 */
class WritableNativeMap(srcMap: Map<String, Any?> = emptyMap()) : ReadableNativeMap(srcMap), WritableMap {

  override fun putMap(key: String, value: ReadableMap?) {
    if (!(value == null || value is ReadableNativeMap)) {
      throw IllegalArgumentException("Illegal type provided")
    }
    _mutableMap.put(key, value as ReadableNativeMap?)
  }

  override fun putArray(key: String, value: ReadableArray?) {
    if (!(value == null || value is ReadableNativeArray)) {
      throw IllegalArgumentException("Illegal type provided")
    }
    _mutableMap.put(key, value as ReadableNativeArray?)
  }

  override fun putBoolean(key: String, value: Boolean) {
    _mutableMap[key] = value
  }

  override fun putDouble(key: String, value: Double) {
    _mutableMap[key] = value
  }

  override fun putInt(key: String, value: Int) {
    _mutableMap[key] = value
  }

  override fun putLong(key: String, value: Long) {
    _mutableMap[key] = value
  }

  override fun putNull(key: String) {
    _mutableMap[key] = null
  }

  override fun putString(key: String, value: String?) {
    _mutableMap[key] = value
  }

  override fun merge(source: ReadableMap) {
    if (source !is ReadableNativeMap) {
      throw IllegalArgumentException("Illegal type provided")
    }
    val iter = source.entryIterator
    while (iter.hasNext()) {
      val entry = iter.next()
      _mutableMap[entry.key] = entry.value
    }
  }

  override fun copy(): WritableMap {
    val target = WritableNativeMap()
    target.merge(this)
    return target
  }

}
