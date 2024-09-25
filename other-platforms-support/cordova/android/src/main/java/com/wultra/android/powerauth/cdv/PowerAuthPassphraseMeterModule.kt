
package com.wultra.android.powerauth.cordova.plugin

import com.wultra.android.powerauth.js.PowerAuthPassphraseMeterJsModule
import com.wultra.android.powerauth.cdv.util.Promise
import org.apache.cordova.CallbackContext
import org.apache.cordova.CordovaInterface
import org.apache.cordova.CordovaPlugin
import org.apache.cordova.CordovaWebView
import org.json.JSONArray
import org.json.JSONException

class PowerAuthPassphraseMeterModule : CordovaPlugin() {

    internal lateinit var powerAuthPassphraseMeterJsModule: PowerAuthPassphraseMeterJsModule

    override fun initialize(cordova: CordovaInterface, webView: CordovaWebView) {
        super.initialize(cordova, webView);
        val powerAuthPasswordModule = webView.pluginManager.getPlugin("PowerAuthPasswordModule") as PowerAuthPasswordModule
        powerAuthPassphraseMeterJsModule = PowerAuthPassphraseMeterJsModule(powerAuthPasswordModule.powerAuthPasswordJsModule)
    }

    @Throws(JSONException::class)
    override fun execute(action: String, args: JSONArray, callbackContext: CallbackContext): Boolean {
        val promise = Promise(callbackContext)
        when (action) {
            "testPin" -> {
                testPin(args, promise)
                return true
            }
        }
        return false  // Returning false results in a "MethodNotFound" error.
    }

    private fun testPin(args: JSONArray, promise: Promise) {
        val password = args.getDynamic(0)
        powerAuthPassphraseMeterJsModule.testPin(password, promise);
    }
}