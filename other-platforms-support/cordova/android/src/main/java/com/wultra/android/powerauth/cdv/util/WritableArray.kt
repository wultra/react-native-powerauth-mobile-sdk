package com.wultra.android.powerauth.cdv.util

/** Interface for a mutable array. Used to pass arguments from Kotlin to JS. */
public interface WritableArray : ReadableArray {
  public fun pushArray(array: ReadableArray?)

  public fun pushBoolean(value: Boolean)

  public fun pushDouble(value: Double)

  public fun pushInt(value: Int)

  public fun pushLong(value: Long)

  public fun pushMap(map: ReadableMap?)

  public fun pushNull()

  public fun pushString(value: String?)
}
