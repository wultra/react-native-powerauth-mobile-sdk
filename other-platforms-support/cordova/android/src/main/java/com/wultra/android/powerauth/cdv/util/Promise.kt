package com.wultra.android.powerauth.cdv.util

import android.util.Log
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
    Log.d("Promise", "resolving: ${value?.let {value::class}}")
    when (value) {
      null -> callbackContext.sendPluginResult(PluginResult(Status.OK, null as String?))
      is Int -> callbackContext.success(value)
      is String -> callbackContext.success(value)
      is Boolean -> callbackContext.sendPluginResult(PluginResult(Status.OK, value))
      is Collection<*> -> callbackContext.success(JSONArray(value))
      is Map<*,*> -> callbackContext.success(JSONObject(value))
      is ReadableMap -> callbackContext.sendPluginResult(PluginResult(Status.OK, JSONObject(value.toHashMap().toMap())))
      is ReadableArray -> callbackContext.sendPluginResult(PluginResult(Status.OK, JSONArray(value.toArrayList())))
      else -> Log.d("Promise", "Promise not handled")
//      else -> callbackContext.sendPluginResult(PluginResult(Status.OK, JSONObject(value))
    }
    // callbackContext.success(value)
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
    val m = mapOf("code" to code)
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
    val m = mapOf("code" to code, "message" to message)
    callbackContext.error(JSONObject(m))
  }

  /**
   * Report an exception, with default error code. Useful in catch-all scenarios where it's unclear
   * why the error occurred.
   *
   * @param throwable Throwable
   */
  fun reject(throwable: Throwable) {
    callbackContext.error(JSONObject())
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
    callbackContext.error(JSONObject())
  }

  /**
   * Reject with a code and userInfo WritableMap.
   *
   * @param code String
   * @param userInfo WritableMap
   */
  fun reject(code: String, userInfo: WritableMap) {
    val m = mapOf("code" to code)
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
    val m = mapOf("code" to code)
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
    val m = mapOf("code" to code, "message" to message)
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
    val m = mapOf("code" to code, "message" to message)
    callbackContext.error(JSONObject(m))
//    callbackContext.error("$code: $message ($throwable) [$userInfo]")
  }

  // /** Report an error which wasn't caused by an exception. */
  // @Deprecated(
  //     message =
  //         """Prefer passing a module-specific error code to JS. Using this method will pass the
  //       error code EUNSPECIFIED""",
  //     replaceWith = ReplaceWith("reject(code, message)"))
  // fun reject(message: String) {
  //   callbackContext.error(": $message")
  // }
}