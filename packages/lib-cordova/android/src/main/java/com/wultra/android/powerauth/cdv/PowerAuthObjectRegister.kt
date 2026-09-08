
package com.wultra.android.powerauth.cordova.plugin

import com.wultra.android.powerauth.bridge.getOptString
import com.wultra.android.powerauth.bridge.getReadableMap
import com.wultra.android.powerauth.js.ObjectRegisterJs
import com.wultra.android.powerauth.cdv.util.Promise
import org.apache.cordova.CallbackContext
import org.apache.cordova.CordovaInterface
import org.apache.cordova.CordovaPlugin
import org.apache.cordova.CordovaWebView
import org.json.JSONArray
import org.json.JSONException


class PowerAuthObjectRegister : CordovaPlugin() {

    internal lateinit var objectRegisterJs: ObjectRegisterJs

    override fun initialize(cordova: CordovaInterface, webView: CordovaWebView) {
        super.initialize(cordova, webView);
        objectRegisterJs = ObjectRegisterJs(cordova.context.applicationContext)
    }

    @Throws(JSONException::class)
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
                debugCommand(args,promise)
                return true
            }
        }
        return false  // Returning false results in a "MethodNotFound" error.
    }

    
    private fun isValidNativeObject(args: JSONArray, promise: Promise) {
        val objectId = args.getOptString(0)
        objectRegisterJs.isValidNativeObject(objectId, promise)
    }

    private fun debugDump(args: JSONArray, promise: Promise) {
        val instanceId = args.getOptString(0)
        objectRegisterJs.debugDump(instanceId, promise);
    }

    private fun debugCommand(args: JSONArray, promise: Promise) {
        // String command, ReadableMap options
        val command = args.getString(0)
        val options = args.getReadableMap(1)
        objectRegisterJs.debugCommand(command, options, promise);
    }
}