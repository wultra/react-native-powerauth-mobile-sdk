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

  private fun buildErrorJson(code: String?, message: String?, userInfo: WritableMap?): JSONObject {
    val m = mutableMapOf<String, Any?>(
      "code" to code,
      "message" to message
    )
    userInfo?.let { m["userInfo"] = it.toHashMap() }
    return JSONObject(m.toMap())
  }

  /**
   * Report an error without an exception using a custom code and error message.
   *
   * @param code String
   * @param message String
   */
  fun reject(code: String, message: String?) {
    callbackContext.error(buildErrorJson(code, message, null))
  }

  /**
   * Report an exception with a custom code.
   *
   * @param code String
   * @param throwable Throwable
   */
  fun reject(code: String, throwable: Throwable?) {
    callbackContext.error(buildErrorJson(code, throwable?.message, null))
  }

  /**
   * Report an exception with a custom code and error message.
   *
   * @param code String
   * @param message String
   * @param throwable Throwable
   */
  fun reject(code: String, message: String?, throwable: Throwable?) {
    callbackContext.error(buildErrorJson(code, message?.takeIf { it.isNotEmpty() } ?: throwable?.message, null))
  }

  /**
   * Report an exception, with default error code. Useful in catch-all scenarios where it's unclear
   * why the error occurred.
   *
   * @param throwable Throwable
   */
  fun reject(throwable: Throwable) {
    callbackContext.error(buildErrorJson(null, throwable.message, null))
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
    callbackContext.error(buildErrorJson(null, throwable.message, userInfo))
  }

  /**
   * Reject with a code and userInfo WritableMap.
   *
   * @param code String
   * @param userInfo WritableMap
   */
  fun reject(code: String, userInfo: WritableMap) {
    callbackContext.error(buildErrorJson(code, null, userInfo))
  }

  /**
   * Report an exception with a custom code and userInfo.
   *
   * @param code String
   * @param throwable Throwable
   * @param userInfo WritableMap
   */
  fun reject(code: String, throwable: Throwable?, userInfo: WritableMap) {
    callbackContext.error(buildErrorJson(code, throwable?.message, userInfo))
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
    callbackContext.error(buildErrorJson(code, message, userInfo))
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
    callbackContext.error(buildErrorJson(code, message?.takeIf { it.isNotEmpty() } ?: throwable?.message, userInfo))
  }
}