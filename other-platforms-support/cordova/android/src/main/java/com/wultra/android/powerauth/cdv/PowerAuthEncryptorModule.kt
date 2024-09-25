
package com.wultra.android.powerauth.cordova.plugin

class PowerAuthModule : CordovaPlugin() {

    internal lateinit var PowerAuthEncryptorJsModule powerAuthEncryptorJsModule;

    override public fun initialize(cordova: CordovaInterface, webView: CordovaWebView) {
        super.initialize(cordova, webView);
        val powerAuthObjectRegister = webVieiw.pluginManager.getPlugin("PowerAuthObjectRegister")
        powerAuthEncryptorJsModule = PowerAuthEncryptorJsModule(cordova.activity, powerAuthObjectRegister.objectRegisterJs)
    }

    @Throws(JSONException)
    override fun execute(action: String, args: JSONArray, callbackContext: CallbackContext): Boolean {
        val promise = Promise(callbackContext)
        when (action) {
            "initialize" -> {
                initialize(args, promise)
                return true
            }
            "release" -> {
                release(args)
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

    private fun initialize(args: JSONArray, Promise promise) {
        val scope = args.getString(0)
        val ownerId = args.getString(1)
        val autoreleaseTime = args.getInt(2)
        powerAuthEncryptorJsModule.initialize(scope, ownerId, autoreleaseTime, promise);
    }

    private fun release(args: JSONArray) {
        val encryptorId = args.getString(0)
        powerAuthEncryptorJsModule.release(encryptorId);
    }

    // Encryption

    private fun canEncryptRequest(args: JSONArray, Promise promise) {
        val encryptorId = args.getString(0)
        powerAuthEncryptorJsModule.canEncryptRequest(encryptorId, promise);
    }

    private fun encryptRequest(args: JSONArray, Promise promise) {
        val encryptorId = args.getString(0)
        val body = args.getString(1)
        val bodyFormat = args.getString(2)
        powerAuthEncryptorJsModule.encryptRequest(encryptorId, body, bodyFormat, promise);
    }

    // Decryption

    private fun canDecryptResponse(args: JSONArray, Promise promise) {
        val encryptorId = args.getString(0)
        powerAuthEncryptorJsModule.canDecryptResponse(encryptorId, promise);
    }

    private fun decryptResponse(args: JSONArray, Promise promise) {
        val encryptorId = args.getString(0)
        val cryptogram = args.getJSONObject(1)
        val outputFormat = args.getString(2)
        powerAuthEncryptorJsModule.decryptResponse(encryptorId, cryptogram, outputFormat, promise);
    }
}