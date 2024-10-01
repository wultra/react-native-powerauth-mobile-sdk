
package com.wultra.android.powerauth.cordova.plugin

import android.util.Log
import com.wultra.android.powerauth.bridge.getOptString
import com.wultra.android.powerauth.bridge.getReadableMap
import com.wultra.android.powerauth.js.PowerAuthEncryptorJsModule
import com.wultra.android.powerauth.cdv.util.Promise
import org.apache.cordova.CallbackContext
import org.apache.cordova.CordovaInterface
import org.apache.cordova.CordovaPlugin
import org.apache.cordova.CordovaWebView
import org.json.JSONArray
import org.json.JSONException

class PowerAuthEncryptorModule : CordovaPlugin() {

    companion object {
        const val TAG = "PowerAuthEncryptionModule"
    }

    internal lateinit var powerAuthEncryptorJsModule: PowerAuthEncryptorJsModule

    override fun initialize(cordova: CordovaInterface, webView: CordovaWebView) {
        super.initialize(cordova, webView)
        val powerAuthObjectRegister = webView.pluginManager.getPlugin("PowerAuthObjectRegister") as PowerAuthObjectRegister
        powerAuthEncryptorJsModule = PowerAuthEncryptorJsModule(cordova.activity, powerAuthObjectRegister.objectRegisterJs)
    }

    @Throws(JSONException::class)
    override fun execute(action: String, args: JSONArray, callbackContext: CallbackContext): Boolean {
        Log.i(TAG, "Executing $action(args=$args)")
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
        Log.d(TAG, "initialize(args=$args)")
        val scope = args.getString(0)
        val ownerId = args.getString(1)
        val autoreleaseTime = args.getInt(2)
        powerAuthEncryptorJsModule.initialize(scope, ownerId, autoreleaseTime, promise)
    }

    private fun release(args: JSONArray, promise: Promise) {
        Log.i(TAG, "release(args=$args)")
        val encryptorId = args.getString(0)
        powerAuthEncryptorJsModule.release(encryptorId)
        promise.resolve(null)
    }

    // Encryption

    private fun canEncryptRequest(args: JSONArray, promise: Promise) {
        val encryptorId = args.getString(0)
        powerAuthEncryptorJsModule.canEncryptRequest(encryptorId, promise)
    }

    private fun encryptRequest(args: JSONArray, promise: Promise) {
        val encryptorId = args.getString(0)
        val body = args.getOptString(1)
        val bodyFormat = args.getOptString(2)
        powerAuthEncryptorJsModule.encryptRequest(encryptorId, body, bodyFormat, promise)
    }

    // Decryption

    private fun canDecryptResponse(args: JSONArray, promise: Promise) {
        val encryptorId = args.getOptString(0)
        powerAuthEncryptorJsModule.canDecryptResponse(encryptorId, promise)
    }

    private fun decryptResponse(args: JSONArray, promise: Promise) {
        val encryptorId = args.getOptString(0)
        val cryptogram = args.getReadableMap(1)
        val outputFormat = args.getOptString(2)
        powerAuthEncryptorJsModule.decryptResponse(encryptorId, cryptogram, outputFormat, promise)
    }
}