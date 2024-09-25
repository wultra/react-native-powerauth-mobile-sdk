package com.wultra.android.powerauth.cdv.util

import org.apache.cordova.CallbackContext

class Promise(
    val callbackContext: CallbackContext
) {
    /**
   * Successfully resolve the Promise with an optional value.
   *
   * @param value Object
   */
  public fun resolve(value: Any?) {
    callbackContext.success(value)
  }

  /**
   * Report an error without an exception using a custom code and error message.
   *
   * @param code String
   * @param message String
   */
  public fun reject(code: String, message: String?) {
    callbackContext.error("$code: $message")
  }

  /**
   * Report an exception with a custom code.
   *
   * @param code String
   * @param throwable Throwable
   */
  public fun reject(code: String, throwable: Throwable?) {
    callbackContext.error("$code: ($throwable)")
  }

  /**
   * Report an exception with a custom code and error message.
   *
   * @param code String
   * @param message String
   * @param throwable Throwable
   */
  public fun reject(code: String, message: String?, throwable: Throwable?) {
    callbackContext.error("$code: $message ($throwable)")
  }

  /**
   * Report an exception, with default error code. Useful in catch-all scenarios where it's unclear
   * why the error occurred.
   *
   * @param throwable Throwable
   */
  public fun reject(throwable: Throwable) {
    callbackContext.error(": ($throwable)")
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
  public fun reject(throwable: Throwable, userInfo: WritableMap) {
    callbackContext.error(": ($throwable) [$userInfo]")
  }

  /**
   * Reject with a code and userInfo WritableMap.
   *
   * @param code String
   * @param userInfo WritableMap
   */
  public fun reject(code: String, userInfo: WritableMap) {
    callbackContext.error("$code: [$userInfo]")
  }

  /**
   * Report an exception with a custom code and userInfo.
   *
   * @param code String
   * @param throwable Throwable
   * @param userInfo WritableMap
   */
  public fun reject(code: String, throwable: Throwable?, userInfo: WritableMap) {
    callbackContext.error("$code: ($throwable) [$userInfo]")
  }

  /**
   * Report an error with a custom code, error message and userInfo, an error not caused by an
   * exception.
   *
   * @param code String
   * @param message String
   * @param userInfo WritableMap
   */
  public fun reject(code: String, message: String?, userInfo: WritableMap) {
    callbackContext.error("$code: $message [$userInfo]")
  }

  /**
   * Report an exception with a custom code, error message and userInfo.
   *
   * @param code String
   * @param message String
   * @param throwable Throwable
   * @param userInfo WritableMap
   */
  public fun reject(code: String?, message: String?, throwable: Throwable?, userInfo: WritableMap?) {
    callbackContext.error("$code: $message ($throwable) [$userInfo]")
  }

  // /** Report an error which wasn't caused by an exception. */
  // @Deprecated(
  //     message =
  //         """Prefer passing a module-specific error code to JS. Using this method will pass the
  //       error code EUNSPECIFIED""",
  //     replaceWith = ReplaceWith("reject(code, message)"))
  // public fun reject(message: String) {
  //   callbackContext.error(": $message")
  // }
}