
package com.wultra.android.powerauth.cordova.plugin

import com.wultra.android.powerauth.bridge.getOptString
import com.wultra.android.powerauth.js.PowerAuthEncryptorJsModule
import com.wultra.android.powerauth.cdv.util.Promise
import org.apache.cordova.CallbackContext
import org.apache.cordova.CordovaInterface
import org.apache.cordova.CordovaPlugin
import org.apache.cordova.CordovaWebView
import org.json.JSONArray
import org.json.JSONException

class PowerAuthEncryptorModule : CordovaPlugin() {

    internal lateinit var powerAuthEncryptorJsModule: PowerAuthEncryptorJsModule

    override fun initialize(cordova: CordovaInterface, webView: CordovaWebView) {
        super.initialize(cordova, webView)
        val powerAuthObjectRegister = webView.pluginManager.getPlugin("PowerAuthObjectRegister") as PowerAuthObjectRegister
        powerAuthEncryptorJsModule = PowerAuthEncryptorJsModule(cordova.activity, powerAuthObjectRegister.objectRegisterJs)
    }

    @Throws(JSONException::class)
    override fun execute(action: String, args: JSONArray, callbackContext: CallbackContext): Boolean {
        val promise = Promise(callbackContext)
        when (action) {
            "initialize" -> {
                initialize(args, promise)
                return true
            }
            "release" -> {
                release(args, promise)
                return true
            }
            // Encryption
            "canEncryptRequest" -> {
                canEncryptRequest(args, promise)
                return true
            }
            "encryptRequest" -> {
                encryptRequest(args, promise)
                return true
            }
            // Decryption
            "canDecryptResponse" -> {
                canDecryptResponse(args, promise)
                return true
            }
            "decryptResponse" -> {
                decryptResponse(args, promise)
                return true
            }
        }
        return false  // Returning false results in a "MethodNotFound" error.
    }

    private fun initialize(args: JSONArray, promise: Promise) {
        val scope = args.getString(0)
        val ownerId = args.getString(1)
        powerAuthEncryptorJsModule.initialize(scope, ownerId, promise)
    }

    private fun release(args: JSONArray, promise: Promise) {
        val encryptorId = args.getString(0)
        powerAuthEncryptorJsModule.release(encryptorId, promise)
    }

    // Encryption

    private fun canEncryptRequest(args: JSONArray, promise: Promise) {
        val encryptorId = args.getString(0)
        powerAuthEncryptorJsModule.canEncryptRequest(encryptorId, promise)
    }

    private fun encryptRequest(args: JSONArray, promise: Promise) {
        val encryptorId = args.getString(0)
        val requestBodyBase64 = args.getOptString(1)
        powerAuthEncryptorJsModule.encryptRequest(encryptorId, requestBodyBase64, promise)
    }

    // Decryption

    private fun canDecryptResponse(args: JSONArray, promise: Promise) {
        val encryptorId = args.getString(0)
        powerAuthEncryptorJsModule.canDecryptResponse(encryptorId, promise)
    }

    private fun decryptResponse(args: JSONArray, promise: Promise) {
        val encryptorId = args.getString(0)
        val responseBody = args.getString(1)
        powerAuthEncryptorJsModule.decryptResponse(encryptorId, responseBody, promise)
    }
}
