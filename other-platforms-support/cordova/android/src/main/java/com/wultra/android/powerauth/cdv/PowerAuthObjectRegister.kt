
package com.wultra.android.powerauth.cordova.plugin

import com.wultra.android.powerauth.js.ObjectRegisterJs


class PowerAuthObjectRegister : CordovaPlugin() {

    internal lateinit var objectRegisterJs: ObjectRegisterJs

    override public fun initialize(cordova: CordovaInterface, webView: CordovaWebView) {
        super.initialize(cordova, webView);
        objectRegisterJs = ObjectRegisterJs()
    }

    @Throws(JSONException)
    override fun execute(action: String, args: JSONArray, callbackContext: CallbackContext): Boolean {
        val promise = Promise(callbackContext)
        when (action) {
            "isValidNativeObject" -> {
                isValidNativeObject(args, promise)
                return true
            }
            "debugDump" -> {
                debugDump(args, promise)
                return true
            }
            "debugCommand" -> {
                debugCommand(args,)
                return true
            }
        }
        return false  // Returning false results in a "MethodNotFound" error.
    }

    
    private fun isValidNativeObject(args: JSONArray, promise: Promise) {
        val objectId = args.getString(0)
        objectRegisterJs.isValidNativeObject(objectId, promise)
    }

    private fun debugDump(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        objectRegisterJs.debugDump(instanceId, promise);
    }

    private fun debugCommand(args: JSONARRAY, promise: Promise) {
        // String command, ReadableMap options
        val command = args.getString(0)
        val options = args.getJSONObject(1)
        objectRegisterJs.debugCommand(command, options, promise);
    }
}