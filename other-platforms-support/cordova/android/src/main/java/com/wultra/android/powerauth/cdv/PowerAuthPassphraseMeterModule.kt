
package com.wultra.android.powerauth.cordova.plugin

class PowerAuthPassphraseMeterModule : CordovaPlugin() {

    internal lateinit var PowerAuthPassphraseMeterJsModule powerAuthPassphraseMeterJsModule;

    override public fun initialize(cordova: CordovaInterface, webView: CordovaWebView) {
        super.initialize(cordova, webView);
        val powerAuthPasswordModule = webVieiw.pluginManager.getPlugin("PowerAuthPasswordModule")
        powerAuthPassphraseMeterJsModule = PowerAuthPassphraseMeterJsModule(powerAuthPasswordModule.pawerAuthPasswordJsModule)
    }

    @Throws(JSONException)
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