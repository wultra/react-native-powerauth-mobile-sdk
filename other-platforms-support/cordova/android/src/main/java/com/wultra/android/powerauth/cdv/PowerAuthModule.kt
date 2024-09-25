
package com.wultra.android.powerauth.cordova.plugin

class PowerAuthModule : CordovaPlugin() {

    private lateinit var powerAuthJsModule: PowerAuthJsModule

    override public fun initialize(cordova: CordovaInterface, webView: CordovaWebView) {
        super.initialize(cordova, webView);
        val powerAuthObjectRegister = webView.pluginManager.getPlugin("PowerAuthObjectRegister")
        val powerAuthPasswordModule = webView.pluginManager.getPlugin("PowerAuthPasswordModule")
        powerAuthJsModule = PowerAuthJsModule(cordova.activity, powerAuthObjectRegister.objectRegisterJs, powerAuthPasswordModule)
    }

    @Throws(JSONException)
    override fun execute(action: String, args: JSONArray, callbackContext: CallbackContext): Boolean {
        val promise = Promise(callbackContext)
        when (action) {
            "isConfigured" -> {
                isConfigured(args, promise)
                return true;
            }
            "configure" -> {
                configure(args, promise)
                return true;
            }
            "deconfigure" -> {
                deconfigure(args, promise)
                return true;
            }
            "hasValidActivation" -> {
                hasValidActivation(args, promise)
                return true;
            }
            "canStartActivation" -> {
                canStartActivation(args, promise)
                return true;
            }
            "hasPendingActivation" -> {
                hasPendingActivation(args, promise)
                return true;
            }
            "activationIdentifier" -> {
                activationIdentifier(args, promise)
                return true;
            }
            "activationFingerprint" -> {
                activationFingerprint(args, promise)
                return true;
            }
            "getExternalPendingOperation" -> {
                getExternalPendingOperation(args, promise)
                return true;
            }
            "fetchActivationStatus" -> {
                fetchActivationStatus(args, promise)
                return true;
            }
            "createActivation" -> {
                createActivation(args, promise)
                return true;
            }
            "commitActivation" -> {
                commitActivation(args, promise)
                return true;
            }
            "removeActivationWithAuthentication" -> {
                removeActivationWithAuthentication(args, promise)
                return true;
            }
            "removeActivationLocal" -> {
                removeActivationLocal(args, promise)
                return true;
            }
            "requestGetSignature" -> {
                requestGetSignature(args, promise)
                return true;
            }
            "requestSignature" -> {
                requestSignature(args, promise)
                return true;
            }
            "offlineSignature" -> {
                offlineSignature(args, promise)
                return true;
            }
            "verifyServerSignedData" -> {
                verifyServerSignedData(args, promise)
                return true;
            }
            "unsafeChangePassword" -> {
                unsafeChangePassword(args, promise)
                return true;
            }
            "changePassword" -> {
                changePassword(args, promise)
                return true;
            }
            "addBiometryFactor" -> {
                addBiometryFactor(args, promise)
                return true;
            }
            "hasBiometryFactor" -> {
                hasBiometryFactor(args, promise)
                return true;
            }
            "removeBiometryFactor" -> {
                removeBiometryFactor(args, promise)
                return true;
            }
            "getBiometryInfo" -> {
                getBiometryInfo(args, promise)
                return true;
            }
            "fetchEncryptionKey" -> {
                fetchEncryptionKey(args, promise)
                return true;
            }
            "signDataWithDevicePrivateKey" -> {
                signDataWithDevicePrivateKey(args, promise)
                return true;
            }
            "validatePassword" -> {
                validatePassword(args, promise)
                return true;
            }
            "hasActivationRecoveryData" -> {
                hasActivationRecoveryData(args, promise)
                return true;
            }
            "activationRecoveryData" -> {
                activationRecoveryData(args, promise)
                return true;
            }
            "confirmRecoveryCode" -> {
                confirmRecoveryCode(args, promise)
                return true;
            }
            "authenticateWithBiometry" -> {
                authenticateWithBiometry(args, promise)
                return true;
            }
            // TOKEN BASED AUTHENTICATION
            "requestAccessToken" -> {
                requestAccessToken(args, promise)
                return true;
            }
            "removeAccessToken" -> {
                removeAccessToken(args, promise)
                return true;
            }
            "getLocalToken" -> {
                getLocalToken(args, promise)
                return true;
            }
            "hasLocalToken" -> {
                hasLocalToken(args, promise)
                return true;
            }
            "removeLocalToken" -> {
                removeLocalToken(args, promise)
                return true;
            }
            "removeAllLocalTokens" -> {
                removeAllLocalTokens(args, promise)
                return true;
            }
            "generateHeaderForToken" -> {
                generateHeaderForToken(args, promise)
                return true;
            }
            // ACTIVATION CODE UTIL METHODS
            "parseActivationCode" -> {
                parseActivationCode(args, promise)
                return true;
            }
            "validateActivationCode" -> {
                validateActivationCode(args, promise)
                return true;
            }
            "parseRecoveryCode" -> {
                parseRecoveryCode(args, promise)
                return true;
            }
            "validateRecoveryCode" -> {
                validateRecoveryCode(args, promise)
                return true;
            }
            "validateRecoveryPuk" -> {
                validateRecoveryPuk(args, promise)
                return true;
            }
            "validateTypedCharacter" -> {
                validateTypedCharacter(args, promise)
                return true;
            }
            "correctTypedCharacter" -> {
                correctTypedCharacter(args, promise)
                return true;
            }
        }
        return false  // Returning false results in a "MethodNotFound" error.
    }

    private fun isConfigured(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        powerAuthJsModule.isConfigured(instanceId, promise);
    }

    private fun configure(args: JSONArray, promise: Promise) {
        // final String instanceId, final ReadableMap configuration, final ReadableMap clientConfiguration, final ReadableMap biometryConfiguration, final ReadableMap keychainConfiguration, final ReadableMap sharingConfiguration, 
        val instanceId = args.getString(0)
        val configuration = args.getJSONObject(1)
        val clientConfiguration = args.getJSONObject(2)
        val biometryConfiguration = args.getJSONObject(3)
        val keychainConfiguration = args.getJSONObject(4)
        val sharingConfiguration = args.getJSONObject(5)
        powerAuthJsModule.configure(instanceId, configuration, clientConfiguration, biometryConfiguration, keychainConfiguration, sharingConfiguration, promise);
    }

    private fun deconfigure(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        powerAuthJsModule.deconfigure(instanceId, promise);
    }

    private fun hasValidActivation(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        powerAuthJsModule.hasValidActivation(instanceId, promise);
    }

    private fun canStartActivation(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        powerAuthJsModule.canStartActivation(instanceId, promise);
    }

    private fun hasPendingActivation(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        powerAuthJsModule.hasPendingActivation(instanceId, promise);
    }

    private fun activationIdentifier(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        powerAuthJsModule.activationIdentifier(instanceId, promise);
    }

    private fun activationFingerprint(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        powerAuthJsModule.activationFingerprint(instanceId, promise);
    }

    private fun getExternalPendingOperation(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        powerAuthJsModule.getExternalPendingOperation(instanceId, promise);
    }

    private fun fetchActivationStatus(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        powerAuthJsModule.fetchActivationStatus(instanceId, promise);
    }

    private fun createActivation(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        powerAuthJsModule.createActivation(instanceId, activation, promise);
    }

    private fun commitActivation(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        powerAuthJsModule.commitActivation(instanceId, authMap, promise);
    }

    private fun removeActivationWithAuthentication(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        val authMap = args.getJSONObject(1)
        powerAuthJsModule.removeActivationWithAuthentication(instanceId, authMap, promise);
    }

    private fun removeActivationLocal(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        powerAuthJsModule.removeActivationLocal(instanceId, promise);
    }

    private fun requestGetSignature(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        val authMap = args.getJSONObject(1)
        val uriId = args.getString(2)
        val params = args.getJSONObject(3)
        powerAuthJsModule.requestGetSignature(instanceId, authMap, uriId, params, promise);
    }

    private fun requestSignature(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        val authMap = args.getJSONObject(1)
        val uriId = args.getString(2)
        val body = args.getString(3)
        powerAuthJsModule.requestSignature(instanceId, authMap, method, uriId, body, promise);
    }

    private fun offlineSignature(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        val authMap = args.getJSONObject(1)
        val uriId = args.getString(2)
        val body = args.getString(3)
        val nonce = args.getString(4)
        powerAuthJsModule.offlineSignature(instanceId, authMap, uriId, body, nonce, promise);
    }

    private fun verifyServerSignedData(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        val `data` = args.getString(1)
        val signature = args.getString(2)
        val masterKey = args.getBoolean(3)
        powerAuthJsModule.verifyServerSignedData(instanceId, data, signature, masterKey, promise);
    }

    private fun unsafeChangePassword(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        val oldPassword = args.getDynamic(1)
        val newPassword = args.getDynamic(2)
        powerAuthJsModule.unsafeChangePassword(instanceId, oldPassword, newPassword, promise);
    }

    private fun changePassword(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        val oldPassword = args.getDynamic(1)
        val newPassword = args.getDynamic(2)
        powerAuthJsModule.changePassword(instanceId, oldPassword, newPassword, promise);
    }

    private fun addBiometryFactor(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        val oldPassword = args.getDynamic(1)
        val prompt = args.getJSONObject(2)
        powerAuthJsModule.addBiometryFactor(instanceId, password, prompt, promise);
    }

    private fun hasBiometryFactor(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        powerAuthJsModule.hasBiometryFactor(instanceId, promise);
    }

    private fun removeBiometryFactor(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        powerAuthJsModule.removeBiometryFactor(instanceId, promise);
    }

    private fun getBiometryInfo(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        powerAuthJsModule.getBiometryInfo(instanceId, promise);
    }

    private fun fetchEncryptionKey(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        val authMap = args.getJSONObject(1)
        val index = args.getInt(2)
        powerAuthJsModule.fetchEncryptionKey(instanceId, authMap, index, promise);
    }

    private fun signDataWithDevicePrivateKey(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        val authMap = args.getJSONObject(1)
        val `data` = args.getString(2)
        powerAuthJsModule.signDataWithDevicePrivateKey(instanceId, authMap, `data`, promise);
    }

    private fun validatePassword(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        val password = args.getDynamic(1)
        powerAuthJsModule.validatePassword(instanceId, password, promise);
    }

    private fun hasActivationRecoveryData(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        powerAuthJsModule.hasActivationRecoveryData(instanceId, promise);
    }

    private fun activationRecoveryData(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        val authMap = args.getJSONObject(1)
        powerAuthJsModule.activationRecoveryData(instanceId, authMap, promise);
    }

    private fun confirmRecoveryCode(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        val recoveryCode = args.getString(1)
        val authMap = args.getJSONObject(2)
        powerAuthJsModule.confirmRecoveryCode(instanceId, recoveryCode, authMap, promise);
    }

    private fun authenticateWithBiometry(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        val prompt = args.getJSONObject(1)
        val makeReusable = args.getBoolean(2)
        powerAuthJsModule.authenticateWithBiometry(instanceId, prompt, makeReusable, promise);
    }

    // TOKEN BASED AUTHENTICATION

    private fun requestAccessToken(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        val tokenName = args.getString(1)
        val authMap = args.getJSONObject(2)
        powerAuthJsModule.requestAccessToken(instanceId, tokenName, authMap, promise);
    }

    private fun removeAccessToken(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        val tokenName = args.getString(1)
        powerAuthJsModule.removeAccessToken(instanceId, tokenName, promise);
    }

    private fun getLocalToken(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        val tokenName = args.getString(1)
        powerAuthJsModule.getLocalToken(instanceId, tokenName, promise);
    }

    private fun hasLocalToken(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        val tokenName = args.getString(1)
        powerAuthJsModule.hasLocalToken(instanceId, tokenName, promise);
    }

    private fun removeLocalToken(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        val tokenName = args.getString(1)
        powerAuthJsModule.removeLocalToken(instanceId, tokenName, promise);
    }

    private fun removeAllLocalTokens(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        powerAuthJsModule.removeAllLocalTokens(instanceId, promise);
    }

    private fun generateHeaderForToken(args: JSONArray, promise: Promise) {
        val instanceId = args.getString(0)
        val tokenName = args.getString(1)
        powerAuthJsModule.generateHeaderForToken(instanceId, tokenName, promise);
    }

    // ACTIVATION CODE UTIL METHODS

    private fun parseActivationCode(args: JSONArray, promise: Promise) {
        val activationCode = args.getString(0)
        powerAuthJsModule.parseActivationCode(activationCode, promise);
    }

    private fun validateActivationCode(args: JSONArray, promise: Promise) {
        val activationCode = args.getString(0)
        powerAuthJsModule.validateActivationCode(activationCode, promise);
    }

    private fun parseRecoveryCode(args: JSONArray, promise: Promise) {
        val recoveryCode = args.getString(0)
        powerAuthJsModule.parseRecoveryCode(recoveryCode, promise);
    }

    private fun validateRecoveryCode(args: JSONArray, promise: Promise) {
        val recoveryCode = args.getString(0)
        powerAuthJsModule.validateRecoveryCode(recoveryCode, promise);
    }

    private fun validateRecoveryPuk(args: JSONArray, promise: Promise) {
        val puk = args.getString(0)
        powerAuthJsModule.validateRecoveryPuk(puk, promise);
    }

    private fun validateTypedCharacter(args: JSONArray, promise: Promise) {
        val character = args.getInt(0)
        powerAuthJsModule.validateTypedCharacter(character, promise);
    }

    private fun correctTypedCharacter(args: JSONArray, promise: Promise) {
        val character = args.getInt(0)
        powerAuthJsModule.correctTypedCharacter(character, promise);
    }
}