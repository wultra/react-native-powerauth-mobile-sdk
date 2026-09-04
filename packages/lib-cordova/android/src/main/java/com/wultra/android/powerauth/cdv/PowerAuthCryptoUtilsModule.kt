package com.wultra.android.powerauth.cordova.plugin

import com.wultra.android.powerauth.cdv.util.Promise
import com.wultra.android.powerauth.js.PowerAuthCryptoUtilsJsModule
import org.apache.cordova.CallbackContext
import org.apache.cordova.CordovaInterface
import org.apache.cordova.CordovaPlugin
import org.apache.cordova.CordovaWebView
import org.json.JSONArray
import org.json.JSONException

class PowerAuthCryptoUtilsModule : CordovaPlugin() {

    private lateinit var powerAuthCryptoUtilsJsModule: PowerAuthCryptoUtilsJsModule

    override fun initialize(cordova: CordovaInterface, webView: CordovaWebView) {
        super.initialize(cordova, webView)
        powerAuthCryptoUtilsJsModule = PowerAuthCryptoUtilsJsModule()
    }

    @Throws(JSONException::class)
    override fun execute(action: String, args: JSONArray, callbackContext: CallbackContext): Boolean {
        val promise = Promise(callbackContext)
        when (action) {
            "hashSha256" -> {
                hashSha256(args, promise)
                return true
            }
            "randomBytes" -> {
                randomBytes(args, promise)
                return true
            }
        }
        return false // Returning false results in a "MethodNotFound" error.
    }

    private fun hashSha256(args: JSONArray, promise: Promise) {
        val base64Input = args.getString(0)
        powerAuthCryptoUtilsJsModule.hashSha256(base64Input, promise)
    }

    private fun randomBytes(args: JSONArray, promise: Promise) {
        val length = args.getInt(0)
        powerAuthCryptoUtilsJsModule.randomBytes(length, promise)
    }
}
