
package com.wultra.android.powerauth.cordova.plugin

class PowerAuthPasswordModule : CordovaPlugin() {

    internal lateinit var PowerAuthPasswordJsModule powerAuthPasswordJsModule;

    override public fun initialize(cordova: CordovaInterface, webView: CordovaWebView) {
        super.initialize(cordova, webView);
        val powerAuthObjectRegister = webVieiw.pluginManager.getPlugin("PowerAuthObjectRegister")
        powerAuthPasswordJsModule = PowerAuthPasswordJsModule(powerAuthObjectRegister.objectRegisterJs)
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
                release(args, promise)
                return true
            }
            "clear" -> {
                clear(args, promise)
                return true
            }
            "length" -> {
                length(args, promise)
                return true
            }
            "isEqual" -> {
                isEqual(args, promise)
                return true
            }
            "addCharacter" -> {
                addCharacter(args, promise)
                return true
            }
            "insertCharacter" -> {
                insertCharacter(args, promise)
                return true
            }
            "removeCharacter" -> {
                removeCharacter(args, promise)
                return true
            }
            "removeLastCharacter" -> {
                removeLastCharacter(args, promise)
                return true
            }
        }
        return false  // Returning false results in a "MethodNotFound" error.
    }

    private fun initialize(args: JSONArray, promise: Promise) {
        val destroyOnUse = args.getBoolean(0)
        val ownerId = args.getString(1)
        val autoreleaseTime = args.getInt(2)
        powerAuthPasswordJsModule.initialize(destroyOnUse, ownerId, autoreleaseTime, promise);
    }

    private fun release(args: JSONArray, promise: Promise) {
        val objectId = args.getString(0)
        powerAuthPasswordJsModule.release(objectId, promise);
    }

    private fun clear(args: JSONArray, promise: Promise) {
        val objectId = args.getString(0)
        powerAuthPasswordJsModule.clear(objectId, promise);
    }

    private fun length(args: JSONArray, promise: Promise) {
        val objectId = args.getString(0)
        powerAuthPasswordJsModule.length(objectId, promise);
    }

    private fun isEqual(args: JSONArray, promise: Promise) {
        val id1 = args.getString(0)
        val id2 = args.getString(1)
        powerAuthPasswordJsModule.isEqual(id1, id2, promise);
    }

    private fun addCharacter(args: JSONArray, promise: Promise) {
        val objectId = args.getString(0)
        val character = args.getInt(1)
        powerAuthPasswordJsModule.addCharacter(objectId, character, promise);
    }

    private fun insertCharacter(args: JSONArray, promise: Promise) {
        val objectId = args.getString(0)
        val character = args.getInt(1)
        val position = args.getInt(2)
        powerAuthPasswordJsModule.insertCharacter(objectId, character, position, promise);
    }

    private fun removeCharacter(args: JSONArray, promise: Promise) {
        val objectId = args.getString(0)
        val position = args.getInt(1)
        powerAuthPasswordJsModule.removeCharacter(objectId, position, promise);
    }

    private fun removeLastCharacter(args: JSONArray, promise: Promise) {
        val objectId = args.getString(0)
        powerAuthPasswordJsModule.removeLastCharacter(objectId, promise);
    }
}