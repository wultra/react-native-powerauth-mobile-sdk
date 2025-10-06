package com.wultra.android.powerauth.cdv.util

import org.apache.cordova.CallbackContext
import org.apache.cordova.PluginResult
import org.apache.cordova.PluginResult.Status
import org.json.JSONArray
import org.json.JSONObject

class Promise(
    val callbackContext: CallbackContext
) {
    /**
   * Successfully resolve the Promise with an optional value.
   *
   * @param value Object
   */
  fun resolve(value: Any?) {
    when (value) {
      null -> callbackContext.sendPluginResult(PluginResult(Status.OK, null as String?))
      is Int -> callbackContext.success(value)
      is String -> callbackContext.success(value)
      is Boolean -> callbackContext.sendPluginResult(PluginResult(Status.OK, value))
      is Collection<*> -> callbackContext.success(JSONArray(value))
      is Map<*,*> -> callbackContext.success(JSONObject(value))
      is ReadableMap -> callbackContext.sendPluginResult(PluginResult(Status.OK, JSONObject(value.toHashMap().toMap())))
      is ReadableArray -> callbackContext.sendPluginResult(PluginResult(Status.OK, JSONArray(value.toArrayList())))
      else -> throw IllegalArgumentException("Unknown value passed to promise ${value::class}")
    }
  }

  /**
   * Report an error without an exception using a custom code and error message.
   *
   * @param code String
   * @param message String
   */
  fun reject(code: String, message: String?) {
    val m = mapOf("code" to code, "message" to message)
    callbackContext.error(JSONObject(m))
  }

  /**
   * Report an exception with a custom code.
   *
   * @param code String
   * @param throwable Throwable
   */
  fun reject(code: String, throwable: Throwable?) {
    val m = mapOf("code" to code, "throwable" to throwable)
    callbackContext.error(JSONObject(m))
  }

  /**
   * Report an exception with a custom code and error message.
   *
   * @param code String
   * @param message String
   * @param throwable Throwable
   */
  fun reject(code: String, message: String?, throwable: Throwable?) {
    val m = mapOf("code" to code, "message" to message, "throwable" to throwable)
    callbackContext.error(JSONObject(m))
  }

  /**
   * Report an exception, with default error code. Useful in catch-all scenarios where it's unclear
   * why the error occurred.
   *
   * @param throwable Throwable
   */
  fun reject(throwable: Throwable) {
    val m = mapOf("throwable" to throwable)
    callbackContext.error(JSONObject(m))
  }

  /* ---------------------------
   *  With userInfo WritableMap
   * --------------------------- */
  /**
   * Report an exception, with default error code, with userInfo. Useful in catch-all scenarios
   * where it's unclear why the error occurred.
   *
   * @param throwable Throwable
   * @param userInfo WritableMap
   */
  fun reject(throwable: Throwable, userInfo: WritableMap) {
    val m = mapOf("throwable" to throwable, "userInfo" to JSONObject(userInfo.toHashMap().toMap()))
    callbackContext.error(JSONObject(m))
  }

  /**
   * Reject with a code and userInfo WritableMap.
   *
   * @param code String
   * @param userInfo WritableMap
   */
  fun reject(code: String, userInfo: WritableMap) {
    val m = mapOf("code" to code, "userInfo" to JSONObject(userInfo.toHashMap().toMap()))
    callbackContext.error(JSONObject(m))
  }

  /**
   * Report an exception with a custom code and userInfo.
   *
   * @param code String
   * @param throwable Throwable
   * @param userInfo WritableMap
   */
  fun reject(code: String, throwable: Throwable?, userInfo: WritableMap) {
    val m = mapOf("code" to code, "throwable" to throwable, "userInfo" to JSONObject(userInfo.toHashMap().toMap()))
    callbackContext.error(JSONObject(m))
  }

  /**
   * Report an error with a custom code, error message and userInfo, an error not caused by an
   * exception.
   *
   * @param code String
   * @param message String
   * @param userInfo WritableMap
   */
  fun reject(code: String, message: String?, userInfo: WritableMap) {
    val m = mapOf("code" to code, "message" to message, "userInfo" to JSONObject(userInfo.toHashMap().toMap()))
    callbackContext.error(JSONObject(m))
  }

  /**
   * Report an exception with a custom code, error message and userInfo.
   *
   * @param code String
   * @param message String
   * @param throwable Throwable
   * @param userInfo WritableMap
   */
  fun reject(code: String?, message: String?, throwable: Throwable?, userInfo: WritableMap?) {
    val m = mutableMapOf("code" to code, "message" to message, "throwable" to throwable)
    userInfo?.let { 
      m["userInfo"] = userInfo.toHashMap()
    }
    callbackContext.error(JSONObject(m.toMap()))
  }
}