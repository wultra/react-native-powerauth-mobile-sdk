/*
 * Copyright 2020 Wultra s.r.o.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.wultra.android.powerauth.js

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Base64
import androidx.fragment.app.FragmentActivity
import com.wultra.android.powerauth.bridge.*
import io.getlime.security.powerauth.biometry.*
import io.getlime.security.powerauth.core.*
import io.getlime.security.powerauth.exception.*
import io.getlime.security.powerauth.keychain.KeychainProtection
import io.getlime.security.powerauth.networking.interceptors.BasicHttpAuthenticationRequestInterceptor
import io.getlime.security.powerauth.networking.interceptors.CustomHeaderRequestInterceptor
import io.getlime.security.powerauth.networking.response.*
import io.getlime.security.powerauth.networking.ssl.HttpClientSslNoValidationStrategy
import io.getlime.security.powerauth.sdk.*
import io.getlime.security.powerauth.sdk.impl.MainThreadExecutor
import java.nio.charset.StandardCharsets

class PowerAuthJsModule(
    private val context: Context,
    private val activityProvider: ActivityProvider,
    private val objectRegister: ObjectRegisterJs,
    private val passwordModule: PowerAuthPasswordJsModule
) : BaseJavaJsModule, ActivityAwareModule {

    private val configurationLock = Any()

    private fun clearPasswordChangeData(data: PowerAuthPasswordChangeData) {
        data.secureClear()
        data.oldPassword.destroy()
    }

    // React integration
    override fun getName(): String {
        return "PowerAuth"
    }

    override fun getCurrentActivity(): Activity {
        return activityProvider.getActivity()
    }

    @JsApiMethod
    fun isConfigured(instanceId: String, promise: Promise) {
        try {
            promise.resolve(getPowerAuthInstance(instanceId) != null)
        } catch (e: PowerAuthErrorException) {
            Errors.rejectPromise(promise, e)
        }
    }

    @JsApiMethod
    fun cleanupInstanceData(
        instanceId: String,
        configuration: ReadableMap,
        keychainConfiguration: ReadableMap,
        @Suppress("UNUSED_PARAMETER") sharingConfiguration: ReadableMap,
        promise: Promise
    ) {
        synchronized(configurationLock) {
            try {
                if (getPowerAuthInstance(instanceId) != null) {
                    throw PowerAuthErrorException(
                        PowerAuthErrorCodes.WRONG_PARAMETER,
                        "Cannot clean up data for a configured PowerAuth instance"
                    )
                }
                val paConfig = getPowerAuthConfigurationFromMap(instanceId, configuration)
                    ?: throw PowerAuthErrorException(PowerAuthErrorCodes.WRONG_PARAMETER, "Provided configuration is invalid")
                val paKeychainConfig = getPowerAuthKeychainConfigurationFromMap(keychainConfiguration)
                PowerAuthSDK.cleanupInstanceData(context, paConfig, paKeychainConfig)
                promise.resolve(null)
            } catch (e: Throwable) {
                Errors.rejectPromise(promise, e)
            }
        }
    }

    @JsApiMethod
    fun getConfiguration(instanceId: String, promise: Promise) {
        usePowerAuth(instanceId, promise, powerAuthBlock { sdk ->
            promise.resolve(powerAuthConfigurationToMap(sdk.configuration))
        })
    }

    @JsApiMethod
    fun getCurrentAlgorithm(instanceId: String, promise: Promise) {
        usePowerAuth(instanceId, promise, powerAuthBlock { sdk ->
            promise.resolve(powerAuthAlgorithmToString(sdk.currentAlgorithm))
        })
    }

    @JsApiMethod
    fun getClientConfiguration(instanceId: String, promise: Promise) {
        usePowerAuth(instanceId, promise, powerAuthBlock { sdk ->
            promise.resolve(powerAuthClientConfigurationToMap(sdk.clientConfiguration))
        })
    }

    @JsApiMethod
    fun getBiometryConfiguration(instanceId: String, promise: Promise) {
        usePowerAuth(instanceId, promise, powerAuthBlock { sdk ->
            promise.resolve(powerAuthBiometricConfigurationToMap(sdk.biometricConfiguration))
        })
    }

    @JsApiMethod
    fun getKeychainConfiguration(instanceId: String, promise: Promise) {
        usePowerAuth(instanceId, promise, powerAuthBlock { sdk ->
            promise.resolve(powerAuthKeychainConfigurationToMap(sdk.keychainConfiguration))
        })
    }

    @JsApiMethod
    fun getSharingConfiguration(instanceId: String, promise: Promise) {
        usePowerAuth(instanceId, promise, powerAuthBlock {
            promise.resolve(null)
        })
    }

    @Suppress("UNUSED_PARAMETER")
    @JsApiMethod
    fun configure(
        instanceId: String,
        configuration: ReadableMap,
        clientConfiguration: ReadableMap,
        biometryConfiguration: ReadableMap,
        keychainConfiguration: ReadableMap,
        sharingConfiguration: ReadableMap,
        promise: Promise
    ) {
        synchronized(configurationLock) {
            try {
                val result = registerPowerAuthInstance(instanceId, ObjectRegisterJs.objectFactory {
                    // Create configurations from maps
                    val paConfig: PowerAuthConfiguration = getPowerAuthConfigurationFromMap(instanceId, configuration)
                        ?: throw PowerAuthErrorException(PowerAuthErrorCodes.WRONG_PARAMETER, "Provided configuration is invalid")
                    val paClientConfig: PowerAuthClientConfiguration = getPowerAuthClientConfigurationFromMap(clientConfiguration)
                    val paBiometricConfig = getPowerAuthBiometricConfigurationFromMap(biometryConfiguration)
                    val paKeychainConfig: PowerAuthKeychainConfiguration = getPowerAuthKeychainConfigurationFromMap(keychainConfiguration)
                    // Configure the instance
                    val instance: PowerAuthSDK = PowerAuthSDK.Builder(paConfig)
                        .clientConfiguration(paClientConfig)
                        .biometricConfiguration(paBiometricConfig)
                        .keychainConfiguration(paKeychainConfig)
                        .build(this.context)
                    ManagedAny.wrap(instance)
                })
                if (result) {
                    promise.resolve(true)
                } else {
                    promise.reject(
                        Errors.EC_REACT_NATIVE_ERROR,
                        "PowerAuth object with this instanceId is already configured."
                    )
                }
            } catch (e: Throwable) {
                Errors.rejectPromise(promise, e)
            }
        }
    }

    @JsApiMethod
    fun deconfigure(instanceId: String, promise: Promise) {
        synchronized(configurationLock) {
            try {
                unregisterPowerAuthInstance(instanceId)
                promise.resolve(null)
            } catch (e: PowerAuthErrorException) {
                Errors.rejectPromise(promise, e)
            }
        }
    }

    @JsApiMethod
    fun hasValidActivation(instanceId: String, promise: Promise) {
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            override fun run(sdk: PowerAuthSDK) {
                promise.resolve(sdk.hasValidActivation())
            }
        })
    }

    @JsApiMethod
    fun canStartActivation(instanceId: String, promise: Promise) {
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            override fun run(sdk: PowerAuthSDK) {
                promise.resolve(sdk.canStartActivation())
            }
        })
    }

    @JsApiMethod
    fun hasPendingActivation(instanceId: String, promise: Promise) {
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            override fun run(sdk: PowerAuthSDK) {
                promise.resolve(sdk.hasPendingActivation())
            }
        })
    }

    @JsApiMethod
    fun activationIdentifier(instanceId: String, promise: Promise) {
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            override fun run(sdk: PowerAuthSDK) {
                promise.resolve(sdk.activationIdentifier)
            }
        })
    }

    @JsApiMethod
    fun activationFingerprint(instanceId: String, promise: Promise) {
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            override fun run(sdk: PowerAuthSDK) {
                promise.resolve(sdk.activationFingerprint)
            }
        })
    }

    @Suppress("UNUSED_PARAMETER")
    @JsApiMethod
    fun getExternalPendingOperation(instanceId: String, promise: Promise) {
        // // Not supported on Android
        promise.resolve(null)
    }

    @JsApiMethod
    fun fetchActivationStatus(instanceId: String, promise: Promise) {
        val context: Context = this.context
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            override fun run(sdk: PowerAuthSDK) {
                sdk.fetchActivationStatusWithCallback(context, object : IActivationStatusListener {
                    override fun onActivationStatusSucceed(status: PowerAuthActivationStatus) {
                        val map: WritableMap = Arguments.createMap()
                        map.putString("state", getStatusCode(status.state))
                        map.putInt("failCount", status.failCount)
                        map.putInt("maxFailCount", status.maxFailCount)
                        map.putInt("remainingAttempts", status.getRemainingAttempts())
                        map.putMap(
                            "customObject",
                            Arguments.makeNativeMap(status.customObject)
                        )
                        promise.resolve(map)
                    }

                    override fun onActivationStatusFailed(t: Throwable) {
                        Errors.rejectPromise(promise, t)
                    }
                })
            }
        })
    }

    @JsApiMethod
    fun hasProtocolUpgradeAvailable(instanceId: String, promise: Promise) {
        this.usePowerAuth(instanceId, promise, powerAuthBlock { sdk: PowerAuthSDK ->
            promise.resolve(sdk.hasProtocolUpgradeAvailable())
        })
    }

    @JsApiMethod
    fun hasPendingProtocolUpgrade(instanceId: String, promise: Promise) {
        this.usePowerAuth(instanceId, promise, powerAuthBlock { sdk: PowerAuthSDK ->
            promise.resolve(sdk.hasPendingProtocolUpgrade())
        })
    }

    @JsApiMethod
    fun startProtocolUpgrade(
        instanceId: String,
        password: Dynamic?,
        upgradeBiometry: Boolean,
        promise: Promise
    ) {
        val context = this.context
        this.usePowerAuthOnMainThread(instanceId, promise, powerAuthBlock { sdk: PowerAuthSDK ->
            val biometricPrompt = if (upgradeBiometry) {
                val fragmentActivity = getCurrentActivity() as FragmentActivity?
                    ?: throw IllegalStateException("Current fragment activity is not available")
                PowerAuthBiometricPrompt.noPromptForBiometricKeySetup(fragmentActivity)
            } else {
                null
            }
            val corePassword = passwordModule.usePasswordCopy(password)
            val listener = object : IProtocolUpgradeListener {
                override fun onProtocolUpgradeSucceed(result: ProtocolUpgradeResult) {
                    corePassword.destroy()
                    val map = Arguments.createMap()
                    map.putBoolean(
                        "activationStatusFetchRequired",
                        result.isActivationStatusFetchRequired
                    )
                    result.activationFingerprint?.let {
                        map.putString("activationFingerprint", it)
                    } ?: map.putNull("activationFingerprint")
                    map.putBoolean("biometryFactorRemoved", result.isBiometryFactorRemoved)
                    promise.resolve(map)
                }

                override fun onProtocolUpgradeFailed(throwable: Throwable) {
                    corePassword.destroy()
                    Errors.rejectPromise(promise, throwable)
                }
            }
            try {
                if (biometricPrompt != null) {
                    sdk.startProtocolUpgrade(context, corePassword, biometricPrompt, listener)
                } else {
                    sdk.startProtocolUpgrade(context, corePassword, listener)
                }
            } catch (t: Throwable) {
                corePassword.destroy()
                throw t
            }
        })
    }

    @JsApiMethod
    fun createActivation(instanceId: String, activation: ReadableMap, promise: Promise) {
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            override fun run(sdk: PowerAuthSDK) {
                var paActivation: PowerAuthActivation.Builder? = null

                val name: String? = activation.getString("activationName")
                val activationCode: String? =
                    if (activation.hasKey("activationCode")) activation.getString("activationCode") else null
                val identityAttributes: ReadableMap? =
                    if (activation.hasKey("identityAttributes")) activation.getMap("identityAttributes") else null
                val extras: String? =
                    if (activation.hasKey("extras")) activation.getString("extras") else null
                val customAttributes: ReadableMap? =
                    if (activation.hasKey("customAttributes")) activation.getMap("customAttributes") else null
                val additionalActivationOtp: String? =
                    if (activation.hasKey("additionalActivationOtp")) activation.getString("additionalActivationOtp") else null
                val oidcParameters: ReadableMap? =
                    if (activation.hasKey("oidcParameters")) activation.getMap("oidcParameters") else null

                try {
                    if (activationCode != null) {
                        paActivation = PowerAuthActivation.Builder.activation(activationCode, name)
                    } else if (identityAttributes != null) {
                        paActivation = PowerAuthActivation.Builder.customActivation(
                            getStringMap(identityAttributes), name
                        )
                    } else if (oidcParameters != null) {
                        val providerId = oidcParameters.getString("providerId")
                        val code = oidcParameters.getString("code")
                        val nonce = oidcParameters.getString("nonce")
                        val codeVerifier = if (oidcParameters.hasKey("codeVerifier")) oidcParameters.getString("codeVerifier") else null

                        if (providerId == null || code == null || nonce == null) {
                            promise.reject(
                                Errors.EC_INVALID_ACTIVATION_OBJECT,
                                "OIDC parameters are invalid."
                            )
                            return
                        }

                        try {
                            paActivation = PowerAuthActivation.Builder.oidcActivation(
                                providerId,
                                code,
                                nonce,
                                codeVerifier
                            ).also { builder ->
                                name?.let { builder.setActivationName(it) }
                            }
                        } catch (e: PowerAuthErrorException) {
                            promise.reject(Errors.EC_INVALID_ACTIVATION_OBJECT, "Invalid OIDC parameters provided")
                            return
                        }
                    }

                    if (paActivation == null) {
                        promise.reject(
                            Errors.EC_INVALID_ACTIVATION_OBJECT,
                            "Activation object is invalid."
                        )
                        return
                    }

                    if (extras != null) {
                        paActivation.setExtras(extras)
                    }

                    if (customAttributes != null) {
                        paActivation.setCustomAttributes(customAttributes.toHashMap())
                    }

                    if (additionalActivationOtp != null) {
                        paActivation.setAdditionalActivationOtp(additionalActivationOtp)
                    }

                    sdk.createActivation(paActivation.build(), object : ICreateActivationListener {
                        override fun onActivationCreateSucceed(result: CreateActivationResult) {
                            // activation fingerprint
                            val map: WritableMap = Arguments.createMap()
                            map.putString(
                                "activationFingerprint",
                                result.activationFingerprint
                            )
                            // custom attrs
                            val customAttr: Map<String, Any>? = result.customActivationAttributes
                            map.putMap(
                                "customAttributes",
                                if (customAttr == null) null
                                else Arguments.makeNativeMap(customAttr)
                            )
                            // user info
                            val userInfo: UserInfo? = result.userInfo
                            map.putMap(
                                "userInfo",
                                if(userInfo == null) null
                                else convertUserInfoToDict(userInfo)
                            )
                            promise.resolve(map)
                        }

                        override fun onActivationCreateFailed(t: Throwable) {
                            Errors.rejectPromise(promise, t)
                        }
                    })
                } catch (e: Exception) {
                    Errors.rejectPromise(promise, e)
                }
            }
        })
    }

    @JsApiMethod
    fun persistActivation(instanceId: String, authMap: ReadableMap, promise: Promise) {
        val context: Context = this.context
        this.usePowerAuthOnMainThread(instanceId, promise, powerAuthBlock { sdk: PowerAuthSDK ->
            var auth: PowerAuthAuthentication? = null
            try {
                val authentication = constructAuthentication(
                    authMap,
                    sdk.biometricConfiguration.isAuthenticateOnBiometricKeySetup
                )
                auth = authentication
                sdk.persistActivationWithAuthentication(
                    context,
                    authentication,
                    object : IPersistActivationListener {
                        override fun onPersistActivationSucceeded() {
                            authentication.destroy()
                            promise.resolve(null)
                        }

                        override fun onPersistActivationFailed(t: Throwable) {
                            authentication.destroy()
                            Errors.rejectPromise(promise, t)
                        }

                        override fun onPersistActivationCancelled(userCancel: Boolean) {
                            authentication.destroy()
                            Errors.rejectPromise(
                                promise,
                                PowerAuthErrorException(PowerAuthErrorCodes.OPERATION_CANCELED)
                            )
                        }
                    }
                )
            } catch (t: Throwable) {
                auth?.destroy()
                Errors.rejectPromise(promise, t)
            }
        })
    }

    @JsApiMethod
    fun removeActivationWithAuthentication(
        instanceId: String,
        authMap: ReadableMap,
        promise: Promise
    ) {
        val context: Context = this.context
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            @Throws(Exception::class)
            override fun run(sdk: PowerAuthSDK) {
                withOwnedAuthentication(authMap) { authentication ->
                    sdk.removeActivationWithAuthentication(
                        context,
                        authentication,
                        object : IActivationRemoveListener {
                            override fun onActivationRemoveSucceed() {
                                promise.resolve(null)
                            }

                            override fun onActivationRemoveFailed(t: Throwable) {
                                Errors.rejectPromise(promise, t)
                            }
                        })
                }
            }
        })
    }

    @JsApiMethod
    fun removeActivationLocal(instanceId: String, promise: Promise) {
        val context: Context = this.context
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            override fun run(sdk: PowerAuthSDK) {
                try {
                    sdk.removeActivationLocal(context)
                    promise.resolve(null)
                } catch (t: Throwable) {
                    Errors.rejectPromise(promise, t)
                }
            }
        })
    }

    @JsApiMethod
    fun authenticationHeaderForRequestWithParams(
        instanceId: String,
        authMap: ReadableMap,
        method: String,
        uriId: String,
        params: ReadableMap?,
        promise: Promise
    ) {
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            @Throws(Exception::class)
            override fun run(sdk: PowerAuthSDK) {
                val paramMap = if (params == null) null else getStringMap(params)
                val header =
                    withOwnedAuthentication(authMap) { authentication ->
                        sdk.authenticationHeaderForRequestWithParams(
                            authentication,
                            method,
                            uriId,
                            paramMap
                        )
                    }
                promise.resolve(getHttpHeaderObject(header))
            }
        })
    }

    @JsApiMethod
    fun authenticationHeaderForRequestWithBody(
        instanceId: String,
        authMap: ReadableMap,
        method: String,
        uriId: String,
        body: String?,
        promise: Promise
    ) {
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            @Throws(Exception::class)
            override fun run(sdk: PowerAuthSDK) {
                val decodedBody = body?.toByteArray(StandardCharsets.UTF_8)
                val header =
                    withOwnedAuthentication(authMap) { authentication ->
                        sdk.authenticationHeaderForRequestWithBody(
                            authentication,
                            method,
                            uriId,
                            decodedBody
                        )
                    }
                promise.resolve(getHttpHeaderObject(header))
            }
        })
    }

    @JsApiMethod
    fun offlineAuthenticationCode(
        instanceId: String,
        authMap: ReadableMap,
        uriId: String,
        body: String?,
        nonce: String,
        promise: Promise
    ) {
        val context: Context = this.context
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            @Throws(Exception::class)
            override fun run(sdk: PowerAuthSDK) {
                val auth = constructAuthentication(authMap)
                val decodedBody = body?.toByteArray(StandardCharsets.UTF_8)
                try {
                    sdk.offlineAuthenticationCode(
                        context,
                        auth,
                        uriId,
                        decodedBody,
                        nonce,
                        object : IOfflineAuthenticationCodeListener {
                            override fun onOfflineAuthenticationCodeSucceed(authenticationCode: String) {
                                auth.destroy()
                                promise.resolve(authenticationCode)
                            }

                            override fun onOfflineAuthenticationCodeFailed(t: Throwable) {
                                auth.destroy()
                                Errors.rejectPromise(promise, t)
                            }
                        }
                    )
                } catch (t: Throwable) {
                    auth.destroy()
                    throw t
                }
            }
        })
    }

    @JsApiMethod
    fun verifyServerSignedData(
        instanceId: String,
        data: String,
        signature: String?,
        masterKey: Boolean,
        promise: Promise
    ) {
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            override fun run(sdk: PowerAuthSDK) {
                try {
                    val decodedData = data.toByteArray(StandardCharsets.UTF_8)
                    val decodedSignature = Base64.decode(signature, Base64.NO_WRAP)
                    promise.resolve(
                        sdk.verifyServerSignedData(
                            decodedData,
                            decodedSignature,
                            masterKey
                        )
                    )
                } catch (e: Exception) {
                    Errors.rejectPromise(promise, e)
                }
            }
        })
    }

    @JsApiMethod
    fun unsafeChangePassword(
        instanceId: String,
        oldPassword: Dynamic?,
        newPassword: Dynamic?,
        promise: Promise
    ) {
        this.usePowerAuth(instanceId, promise, powerAuthBlock { sdk: PowerAuthSDK ->
            val coreOldPassword: Password = passwordModule.usePassword(oldPassword)
            val coreNewPassword: Password = passwordModule.usePassword(newPassword)
            promise.resolve(sdk.changePasswordUnsafe(coreOldPassword, coreNewPassword))
        })
    }

    @JsApiMethod
    fun changePassword(
        instanceId: String,
        oldPassword: Dynamic?,
        newPassword: Dynamic?,
        promise: Promise
    ) {
        val context: Context = this.context
        this.usePowerAuth(instanceId, promise, powerAuthBlock { sdk: PowerAuthSDK ->

            // Making copies of passwords to immutable form, as they will be used in `sdk.changePassword` call.
            // This call is actually 2 http requests, so it may take some time and the original password could
            // be released in the meantime by the object register.

            val coreOldPassword: Password = passwordModule.usePassword(oldPassword).copyToImmutable()
            val coreNewPassword: Password = passwordModule.usePassword(newPassword).copyToImmutable()
            val clear = { // Clear passwords from memory to not depend on garbage collector
                coreOldPassword.clear()
                coreNewPassword.clear()
            }

            sdk.changePassword(
                context,
                coreOldPassword,
                coreNewPassword,
                object : IChangePasswordListener {
                    override fun onPasswordChangeSucceed() {
                        clear()
                        promise.resolve(null)
                    }

                    override fun onPasswordChangeFailed(t: Throwable) {
                        clear()
                        Errors.rejectPromise(promise, t)
                    }
                })
        })
    }

    @JsApiMethod
    fun beginPasswordChange(
        instanceId: String,
        oldPassword: Dynamic?,
        promise: Promise
    ) {
        val context = this.context
        this.usePowerAuth(instanceId, promise, powerAuthBlock { sdk ->
            val coreOldPassword = passwordModule.usePasswordCopy(oldPassword)
            try {
                sdk.beginPasswordChange(
                    context,
                    coreOldPassword,
                    object : IBeginPasswordChangeListener {
                    override fun onBeginPasswordChangeSucceed(
                        passwordChangeData: PowerAuthPasswordChangeData
                    ) {
                        try {
                            val objectId = objectRegister.registerObjectIfOwnerMatches(
                                instanceId,
                                sdk,
                                ManagedAny.wrap(
                                    passwordChangeData,
                                    cleanup { clearPasswordChangeData(it) }
                                ),
                                listOf(
                                    ReleasePolicy.expire(
                                        Constants.PASSWORD_CHANGE_DATA_EXPIRE_TIME
                                    )
                                )
                            )
                            if (objectId == null) {
                                clearPasswordChangeData(passwordChangeData)
                                promise.reject(
                                    Errors.EC_INSTANCE_NOT_CONFIGURED,
                                    "PowerAuth instance is no longer configured"
                                )
                                return
                            }
                            promise.resolve(objectId)
                        } catch (t: Throwable) {
                            clearPasswordChangeData(passwordChangeData)
                            Errors.rejectPromise(promise, t)
                        }
                    }

                    override fun onBeginPasswordChangeFailed(t: Throwable) {
                        coreOldPassword.destroy()
                        Errors.rejectPromise(promise, t)
                    }
                    }
                )
            } catch (t: Throwable) {
                coreOldPassword.destroy()
                throw t
            }
        })
    }

    @JsApiMethod
    fun finishPasswordChange(
        instanceId: String,
        newPassword: Dynamic?,
        passwordChangeDataId: String?,
        promise: Promise
    ) {
        val context = this.context
        this.usePowerAuth(instanceId, promise, powerAuthBlock { sdk ->
            val passwordChangeData = objectRegister.takeObjectIfOwnerMatches(
                passwordChangeDataId,
                PowerAuthPasswordChangeData::class.java,
                instanceId,
                sdk
            ) ?: throw WrapperException(
                Errors.EC_INVALID_NATIVE_OBJECT,
                "Password change data object is no longer valid"
            )
            val coreNewPassword = try {
                passwordModule.usePasswordCopy(newPassword)
            } catch (t: Throwable) {
                clearPasswordChangeData(passwordChangeData)
                throw t
            }
            try {
                sdk.finishPasswordChange(
                    context,
                    coreNewPassword,
                    passwordChangeData,
                    object : IFinishPasswordChangeListener {
                    override fun onFinishPasswordChangeSucceed() {
                        coreNewPassword.destroy()
                        clearPasswordChangeData(passwordChangeData)
                        promise.resolve(null)
                    }

                    override fun onFinishPasswordChangeFailed(t: Throwable) {
                        coreNewPassword.destroy()
                        clearPasswordChangeData(passwordChangeData)
                        Errors.rejectPromise(promise, t)
                    }
                    }
                )
            } catch (t: Throwable) {
                coreNewPassword.destroy()
                clearPasswordChangeData(passwordChangeData)
                throw t
            }
        })
    }

    @JsApiMethod
    fun addBiometryFactor(
        instanceId: String,
        password: Dynamic?,
        prompt: ReadableMap?,
        promise: Promise
    ) {
        val context: Context = this.context
        this.usePowerAuthOnMainThread(instanceId, promise, powerAuthBlock { sdk: PowerAuthSDK ->
            try {
                val fragmentActivity = getCurrentActivity() as FragmentActivity?
                    ?: throw IllegalStateException("Current fragment activity is not available")
                val biometricPrompt = buildBiometricPrompt(
                    fragmentActivity,
                    prompt,
                    allowNoPrompt = true,
                    authenticateOnBiometricKeySetup = sdk.biometricConfiguration.isAuthenticateOnBiometricKeySetup
                )
                val corePassword = passwordModule.usePasswordCopy(password)
                try {
                    sdk.addBiometryFactor(
                        context,
                        corePassword,
                        biometricPrompt,
                        object : IAddBiometryFactorListener {
                            override fun onAddBiometryFactorSucceed() {
                                corePassword.destroy()
                                promise.resolve(null)
                            }

                            override fun onAddBiometryFactorFailed(error: Throwable) {
                                corePassword.destroy()
                                Errors.rejectPromise(promise, error)
                            }
                        })
                } catch (t: Throwable) {
                    corePassword.destroy()
                    throw t
                }
            } catch (t: Throwable) {
                Errors.rejectPromise(promise, t)
            }
        })
    }

    @JsApiMethod
    fun hasBiometryFactor(instanceId: String, promise: Promise) {
        val context: Context = this.context
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            override fun run(sdk: PowerAuthSDK) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    promise.resolve(sdk.hasBiometryFactor(context))
                } else {
                    promise.resolve(false)
                }
            }
        })
    }

    @JsApiMethod
    fun removeBiometryFactor(instanceId: String, promise: Promise) {
        val context: Context = this.context
        this.usePowerAuth(instanceId, promise, powerAuthBlock { sdk: PowerAuthSDK ->
            sdk.removeBiometryFactor(context, object : IRemoveBiometryFactorListener {
                override fun onRemoveBiometryFactorSucceed() {
                    promise.resolve(null)
                }

                override fun onRemoveBiometryFactorFailed(t: Throwable) {
                    Errors.rejectPromise(promise, t)
                }
            })
        })
    }

    @Suppress("UNUSED_PARAMETER")
    @JsApiMethod
    fun getBiometryInfo(instanceId: String?, promise: Promise) {
        val isAvailable: Boolean = BiometricAuthentication.isBiometricAuthenticationAvailable(
            this.context
        )
        val biometryType: String = when (BiometricAuthentication.getBiometryType(this.context)) {
            BiometryType.NONE -> "NONE"
            BiometryType.FINGERPRINT -> "FINGERPRINT"
            BiometryType.FACE -> "FACE"
            BiometryType.IRIS -> "IRIS"
            BiometryType.GENERIC -> "GENERIC"
            else -> "GENERIC"
        }
        val canAuthenticate: String = when (BiometricAuthentication.canAuthenticate(this.context)) {
            BiometricStatus.OK -> "OK"
            BiometricStatus.NOT_ENROLLED -> "NOT_ENROLLED"
            BiometricStatus.NOT_AVAILABLE -> "NOT_AVAILABLE"
            BiometricStatus.NOT_SUPPORTED -> "NOT_SUPPORTED"
            else -> "NOT_SUPPORTED"
        }
        val map: WritableMap = Arguments.createMap()
        map.putBoolean("isAvailable", isAvailable)
        map.putString("biometryType", biometryType)
        map.putString("canAuthenticate", canAuthenticate)
        promise.resolve(map)
    }

    @JsApiMethod
    fun getBiometricStatus(instanceId: String, promise: Promise) {
        this.usePowerAuth(instanceId, promise, powerAuthBlock { sdk: PowerAuthSDK ->
            promise.resolve(getBiometricStatusMap(sdk.getBiometricStatus(context)))
        })
    }

    @JsApiMethod
    fun isAuthenticationWithBiometricsAvailable(instanceId: String, promise: Promise) {
        this.usePowerAuth(instanceId, promise, powerAuthBlock { sdk: PowerAuthSDK ->
            promise.resolve(sdk.isAuthenticationWithBiometricsAvailable(context))
        })
    }

    @JsApiMethod
    fun fetchEncryptionKey(instanceId: String, authMap: ReadableMap, index: Int, promise: Promise) {
        val context: Context = this.context
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            @Throws(Exception::class)
            override fun run(sdk: PowerAuthSDK) {
                withOwnedAuthentication(authMap) { authentication ->
                    sdk.fetchEncryptionKey(
                        context,
                        authentication,
                        index.toLong(),
                        object : IFetchEncryptionKeyListener {
                            override fun onFetchEncryptionKeySucceed(encryptedEncryptionKey: SecureData) {
                                try {
                                    promise.resolve(
                                        Base64.encodeToString(
                                            encryptedEncryptionKey.sensitiveData,
                                            Base64.NO_WRAP
                                        )
                                    )
                                } finally {
                                    encryptedEncryptionKey.destroy()
                                }
                            }

                            override fun onFetchEncryptionKeyFailed(t: Throwable) {
                                Errors.rejectPromise(promise, t)
                            }
                        })
                }
            }
        })
    }

    @JsApiMethod
    fun signDataWithDevicePrivateKey(
        instanceId: String,
        authMap: ReadableMap,
        data: String,
        dataFormat: String,
        promise: Promise
    ) {
        val context: Context = this.context
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            @Throws(Exception::class)
            override fun run(sdk: PowerAuthSDK) {
                val format = DataFormat.fromString(dataFormat)
                val decodedData = format.decodeBytes(data)
                if (decodedData == null) {
                    promise.reject(
                        Errors.EC_WRONG_PARAMETER,
                        "Failed to decode data."
                    )
                    return
                }
                withOwnedAuthentication(authMap) { authentication ->
                    sdk.signDataWithDevicePrivateKey(
                        context,
                        authentication,
                        decodedData,
                        object : IDataSignatureListener {
                            override fun onDataSignedSucceed(signature: ByteArray) {
                                promise.resolve(Base64.encodeToString(signature, Base64.NO_WRAP))
                            }

                            override fun onDataSignedFailed(t: Throwable) {
                                Errors.rejectPromise(promise, t)
                            }
                        })
                }
            }
        })
    }

    @JsApiMethod
    fun validatePassword(instanceId: String, password: Dynamic?, promise: Promise) {
        val context: Context = this.context
        this.usePowerAuth(instanceId, promise, powerAuthBlock { sdk: PowerAuthSDK ->
            val corePassword: Password = passwordModule.usePassword(password)
            sdk.validatePassword(context, corePassword, object : IValidatePasswordListener {
                override fun onPasswordValid() {
                    promise.resolve(null)
                }

                override fun onPasswordValidationFailed(t: Throwable) {
                    Errors.rejectPromise(promise, t)
                }
            })
        })
    }

    @JsApiMethod
    fun authenticateWithBiometry(
        instanceId: String,
        prompt: ReadableMap?,
        makeReusable: Boolean,
        promise: Promise
    ) {
        val context: Context = this.context
        this.usePowerAuthOnMainThread(instanceId, promise, powerAuthBlock { sdk: PowerAuthSDK ->
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                try {
                    val fragmentActivity = getCurrentActivity() as FragmentActivity?
                        ?: throw WrapperException(
                            Errors.EC_REACT_NATIVE_ERROR,
                            "Current fragment activity is not available"
                        )
                    val biometricPrompt = buildBiometricPrompt(
                        fragmentActivity,
                        prompt,
                        allowNoPrompt = false
                    )
                    sdk.authenticateUsingBiometrics(
                        context,
                        biometricPrompt,
                        object : IAuthenticateWithBiometricsListener {
                            override fun onBiometricDialogCancelled(userCancel: Boolean) {
                                promise.reject(
                                    Errors.EC_BIOMETRY_CANCEL,
                                    "Biometry dialog was canceled"
                                )
                            }

                            override fun onBiometricDialogSuccess(authentication: PowerAuthAuthentication) {
                                val biometryKey = try {
                                    authentication.biometryFactorRelatedKey?.copy()
                                        ?: throw WrapperException(
                                            Errors.EC_REACT_NATIVE_ERROR,
                                            "Biometric key is missing after successful authentication."
                                        )
                                } catch (t: Throwable) {
                                    Errors.rejectPromise(promise, t)
                                    return
                                } finally {
                                    authentication.destroy()
                                }
                                try {
                                    val managedBytes = ManagedAny.wrap(
                                        biometryKey,
                                        cleanup { data: SecureData -> data.destroy() }
                                    )
                                    val releasePolicies = listOfNotNull(
                                        if (makeReusable) null else ReleasePolicy.afterUse(1),
                                        ReleasePolicy.keepAlive(Constants.BIOMETRY_KEY_KEEP_ALIVE_TIME)
                                    )
                                    val managedId = objectRegister.registerObjectIfOwnerMatches(
                                        instanceId,
                                        sdk,
                                        managedBytes,
                                        releasePolicies
                                    )
                                    if (managedId == null) {
                                        biometryKey.destroy()
                                        promise.reject(
                                            Errors.EC_INSTANCE_NOT_CONFIGURED,
                                            "PowerAuth instance is no longer configured."
                                        )
                                    } else {
                                        promise.resolve(managedId)
                                    }
                                } catch (t: Throwable) {
                                    biometryKey.destroy()
                                    Errors.rejectPromise(promise, t)
                                }
                            }

                            override fun onBiometricDialogFailed(error: PowerAuthErrorException) {
                                Errors.rejectPromise(promise, error)
                            }
                        }
                    )
                } catch (e: Exception) {
                    Errors.rejectPromise(promise, e)
                }
            } else {
                promise.reject(
                    Errors.EC_BIOMETRY_NOT_SUPPORTED,
                    "Biometry not supported on this android version."
                )
            }
        })
    }

    // TOKEN BASED AUTHENTICATION
    @JsApiMethod
    fun requestAccessToken(
        instanceId: String,
        tokenName: String,
        authMap: ReadableMap,
        promise: Promise
    ) {
        val context: Context = this.context
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            @Throws(Exception::class)
            override fun run(sdk: PowerAuthSDK) {
                withOwnedAuthentication(authMap) { authentication ->
                    sdk.tokenStore
                        .requestAccessToken(
                            context,
                            tokenName,
                            authentication,
                            object : IGetTokenListener {
                                override fun onGetTokenSucceeded(token: PowerAuthToken) {
                                    val response: WritableMap = Arguments.createMap()
                                    response.putString("tokenName", token.tokenName)
                                    response.putString("tokenIdentifier", token.tokenIdentifier)
                                    promise.resolve(response)
                                }

                                override fun onGetTokenFailed(t: Throwable) {
                                    Errors.rejectPromise(promise, t)
                                }
                            })
                }
            }
        })
    }

    @JsApiMethod
    fun removeAccessToken(instanceId: String, tokenName: String, promise: Promise) {
        val context: Context = this.context
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            override fun run(sdk: PowerAuthSDK) {
                sdk.tokenStore
                    .removeAccessToken(context, tokenName, object : IRemoveTokenListener {
                        override fun onRemoveTokenSucceeded() {
                            promise.resolve(null)
                        }

                        override fun onRemoveTokenFailed(t: Throwable) {
                            Errors.rejectPromise(promise, t)
                        }
                    })
            }
        })
    }

    @JsApiMethod
    fun getLocalToken(instanceId: String, tokenName: String, promise: Promise) {
        val context: Context = this.context
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            override fun run(sdk: PowerAuthSDK) {
                val token: PowerAuthToken? = sdk.tokenStore.getLocalToken(context, tokenName)
                if (token != null) {
                    val response: WritableMap = Arguments.createMap()
                    response.putString("tokenName", token.tokenName)
                    response.putString("tokenIdentifier", token.tokenIdentifier)
                    promise.resolve(response)
                } else {
                    promise.reject(
                        Errors.EC_LOCAL_TOKEN_NOT_AVAILABLE,
                        "Token with this name is not in the local store."
                    )
                }
            }
        })
    }

    @JsApiMethod
    fun hasLocalToken(instanceId: String, tokenName: String, promise: Promise) {
        val context: Context = this.context
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            override fun run(sdk: PowerAuthSDK) {
                promise.resolve(sdk.tokenStore.hasLocalToken(context, tokenName))
            }
        })
    }

    @JsApiMethod
    fun removeLocalToken(instanceId: String, tokenName: String, promise: Promise) {
        val context: Context = this.context
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            override fun run(sdk: PowerAuthSDK) {
                sdk.tokenStore.removeLocalToken(context, tokenName)
                promise.resolve(null)
            }
        })
    }

    @JsApiMethod
    fun removeAllLocalTokens(instanceId: String, promise: Promise) {
        val context: Context = this.context
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            override fun run(sdk: PowerAuthSDK) {
                sdk.tokenStore.removeAllLocalTokens(context)
                promise.resolve(null)
            }
        })
    }

    @JsApiMethod
    fun generateAuthenticationHeaderForToken(instanceId: String, tokenName: String, promise: Promise) {
        val context: Context = this.context
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            override fun run(sdk: PowerAuthSDK) {
                sdk.tokenStore.generateAuthenticationHeader(context, tokenName, object: IGenerateTokenHeaderListener {
                    override fun onGenerateTokenHeaderSucceeded(header: PowerAuthHttpHeader) {
                        promise.resolve(getHttpHeaderObject(header))
                    }

                    override fun onGenerateTokenHeaderFailed(t: Throwable) {
                        Errors.rejectPromise(promise, t)
                    }
                })
            }
        })
    }

    // ACTIVATION CODE UTIL METHODS
    @JsApiMethod
    fun parseActivationCode(activationCode: String, promise: Promise) {
        val ac: ActivationCode? = ActivationCodeUtil.parseFromActivationCode(activationCode)
        if (ac != null) {
            val response: WritableMap = Arguments.createMap()
            response.putString("activationCode", ac.activationCode)
            if (ac.activationSignature != null) {
                response.putString("activationSignature", ac.activationSignature)
            }
            promise.resolve(response)
        } else {
            promise.reject(Errors.EC_INVALID_ACTIVATION_CODE, "Invalid activation code.")
        }
    }

    @JsApiMethod
    fun validateActivationCode(activationCode: String, promise: Promise) {
        promise.resolve(ActivationCodeUtil.validateActivationCode(activationCode))
    }

    @JsApiMethod
    fun validateTypedCharacter(character: Int, promise: Promise) {
        promise.resolve(ActivationCodeUtil.validateTypedCharacter(character))
    }

    @JsApiMethod
    fun correctTypedCharacter(character: Int, promise: Promise) {
        val corrected: Int = ActivationCodeUtil.validateAndCorrectTypedCharacter(character)
        if (corrected == 0) {
            promise.reject(Errors.EC_INVALID_CHARACTER, "Invalid character cannot be corrected.")
        } else {
            promise.resolve(corrected)
        }
    }

    @JsApiMethod
    fun getEnvironmentInfo(promise: Promise) {

        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            PackageManager.GET_SIGNING_CERTIFICATES
        } else {
            @Suppress("DEPRECATION")
            PackageManager.GET_SIGNATURES
        }
        val appInfo = try {
            this.context.packageManager.getPackageInfo(this.context.packageName, flags)
        } catch (e: PackageManager.NameNotFoundException) {
            null
        }

        val map: WritableMap = Arguments.createMap()
        
        map.putString("systemName", "android")
        map.putString("systemVersion", Build.VERSION.RELEASE)

        map.putString("applicationVersion", appInfo?.versionName)
        map.putString("applicationIdentifier", appInfo?.packageName)

        map.putString("deviceManufacturer", Build.BRAND)
        map.putString("deviceId", Build.MODEL)

        promise.resolve(map)
    }

    @JsApiMethod
    fun isTimeSynchronized(instanceId: String, promise: Promise) {
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            override fun run(sdk: PowerAuthSDK) {
                promise.resolve(sdk.timeSynchronizationService.isTimeSynchronized)
            }
        })
    }

    /** Resolve a millisecond value as a bridge-compatible number. */
    private fun resolveTimeValue(promise: Promise, value: Long) {
        promise.resolve(value.toDouble())
    }

    @JsApiMethod
    fun localTimeAdjustment(instanceId: String, promise: Promise) {
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            override fun run(sdk: PowerAuthSDK) {
                resolveTimeValue(promise, sdk.timeSynchronizationService.localTimeAdjustment)
            }
        })
    }

    @JsApiMethod
    fun localTimeAdjustmentPrecision(instanceId: String, promise: Promise) {
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            override fun run(sdk: PowerAuthSDK) {
                resolveTimeValue(promise, sdk.timeSynchronizationService.localTimeAdjustmentPrecision)
            }
        })
    }

    @JsApiMethod
    fun currentTime(instanceId: String, promise: Promise) {
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            override fun run(sdk: PowerAuthSDK) {
                resolveTimeValue(promise, sdk.timeSynchronizationService.currentTime)
            }
        })
    }

    @JsApiMethod
    fun resetTimeSynchronization(instanceId: String, promise: Promise) {
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            override fun run(sdk: PowerAuthSDK) {
                sdk.timeSynchronizationService.resetTimeSynchronization()
                promise.resolve(null)
            }
        })
    }

    @JsApiMethod
    fun synchronizeTime(instanceId: String, promise: Promise) {
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            override fun run(sdk: PowerAuthSDK) {
                sdk.timeSynchronizationService.synchronizeTime(object: ITimeSynchronizationListener {
                    override fun onTimeSynchronizationSucceeded() {
                        promise.resolve(null)
                    }
                    override fun onTimeSynchronizationFailed(t: Throwable) {
                        Errors.rejectPromise(promise, t)
                    }
                })
            }
        })
    }

    // USER INFO

    @JsApiMethod
    fun fetchUserInfo(instanceId: String, promise: Promise) {
        val context: Context = this.context
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            override fun run(sdk: PowerAuthSDK) {
                sdk.fetchUserInfo(context, object : IUserInfoListener {
                    override fun onUserInfoSucceed(userInfo: UserInfo) {
                        val userDict = convertUserInfoToDict(userInfo)
                        promise.resolve(userDict)
                    }
                    override fun onUserInfoFailed(t: Throwable) {
                        Errors.rejectPromise(promise, t)
                    }
                })
            }
        })
    }

    @JsApiMethod
    fun getLastFetchedUserInfo(instanceId: String, promise: Promise) {
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            override fun run(sdk: PowerAuthSDK) {
                try {
                    val userInfo = convertUserInfoToDict(sdk.lastFetchedUserInfo)
                    promise.resolve(userInfo)
                } catch (t: Throwable) {
                    Errors.rejectPromise(promise, t)
                }
            }
        })
    }

    // -- PRIVATE HELPERS --

    /**
     * Helper function converts input readable map to PowerAuthAuthentication object.
     * @param map Map with authentication data.
     * @param authenticateOnBiometricKeySetup Set true to require authentication during biometric key setup.
     * @return [PowerAuthAuthentication] instance.
     */
    @Throws(Throwable::class)
    private fun constructAuthentication(
        map: ReadableMap,
        authenticateOnBiometricKeySetup: Boolean = true
    ): PowerAuthAuthentication {
        if (!map.hasKey("isPersist")) {
            throw WrapperException(
                Errors.EC_WRONG_PARAMETER,
                "Missing isPersist in authentication object."
            )
        }
        val forPersist = map.getBoolean("isPersist")
        val useBiometry = map.getBoolean("isBiometry")
        val biometryKeyId: String? = map.getString("biometryKeyId")
        if (!forPersist && useBiometry && biometryKeyId.isNullOrEmpty()) {
            throw WrapperException(
                Errors.EC_WRONG_PARAMETER,
                "biometryKeyId is required for biometric authentication."
            )
        }
        val biometricPrompt = if (
            forPersist &&
            useBiometry
        ) {
            val fragmentActivity = getCurrentActivity() as FragmentActivity?
                ?: throw WrapperException(
                    Errors.EC_REACT_NATIVE_ERROR,
                    "Current fragment activity is not available"
                )
            val promptMap: ReadableMap? =
                if (map.hasKey("biometricPrompt")) map.getMap("biometricPrompt") else null
            buildBiometricPrompt(
                fragmentActivity,
                promptMap,
                allowNoPrompt = true,
                authenticateOnBiometricKeySetup = authenticateOnBiometricKeySetup
            )
        } else {
            null
        }
        var password: Password? = null
        var biometryKey: SecureData? = null
        try {
            password = if (map.hasKey("password")) {
                passwordModule.usePasswordCopy(map.getDynamic("password"))
            } else {
                null
            }
            val authentication = if (forPersist) {
                // Authentication for activation persist
                val ownedPassword = password
                    ?: throw WrapperException(
                        Errors.EC_WRONG_PARAMETER,
                        "Password is required for persisting activation."
                    )
                if (useBiometry) {
                    PowerAuthAuthentication.persistWithPasswordAndBiometry(
                        ownedPassword,
                        checkNotNull(biometricPrompt)
                    )
                } else {
                    PowerAuthAuthentication.persistWithPassword(ownedPassword)
                }
            } else {
                // Authentication for data signing
                biometryKey = if (biometryKeyId != null) {
                    objectRegister.useObjectAndTransform(
                        biometryKeyId,
                        SecureData::class.java
                    ) { it.copy() }
                        ?: throw WrapperException(
                            Errors.EC_INVALID_NATIVE_OBJECT,
                            "Biometric key for ID '$biometryKeyId' (from biometryKeyId) not found or expired for signing."
                        )
                } else {
                    null
                }
                if (biometryKey != null) {
                    password?.destroy()
                    password = null
                    PowerAuthAuthentication.possessionWithBiometry(biometryKey)
                } else if (password != null) {
                    PowerAuthAuthentication.possessionWithPassword(password)
                } else {
                    PowerAuthAuthentication.possession()
                }
            }

            password = null
            biometryKey = null
            return authentication
        } catch (t: Throwable) {
            password?.destroy()
            biometryKey?.destroy()
            throw t
        }
    }

    /**
     * Executes an operation and destroys its copied authentication data after the native call returns.
     */
    private fun <T> withOwnedAuthentication(
        map: ReadableMap,
        block: (PowerAuthAuthentication) -> T
    ): T {
        val authentication = constructAuthentication(map)
        return try {
            block(authentication)
        } finally {
            authentication.destroy()
        }
    }

    private fun buildBiometricPrompt(
        activity: FragmentActivity,
        prompt: ReadableMap?,
        allowNoPrompt: Boolean,
        authenticateOnBiometricKeySetup: Boolean = true
    ): PowerAuthBiometricPrompt {
        if (prompt == null) {
            if (allowNoPrompt && !authenticateOnBiometricKeySetup) {
                return PowerAuthBiometricPrompt.noPromptForBiometricKeySetup(activity)
            }
            throw WrapperException(
                Errors.EC_WRONG_PARAMETER,
                if (allowNoPrompt) {
                    "Biometric prompt is required when authenticateOnBiometricKeySetup is enabled."
                } else {
                    "Biometric prompt is required for biometric authentication."
                }
            )
        }
        val title = prompt.getString("promptTitle")?.takeIf { it.isNotBlank() }
            ?: throw WrapperException(
                Errors.EC_WRONG_PARAMETER,
                "Biometric prompt title is required on Android."
            )
        val message = prompt.getString("promptMessage")?.takeIf { it.isNotBlank() }
            ?: throw WrapperException(
                Errors.EC_WRONG_PARAMETER,
                "Biometric prompt message is required on Android."
            )
        val builder = PowerAuthBiometricPrompt.Builder(activity)
            .setTitle(title)
            .setDescription(message)
        prompt.getString("promptSubtitle")?.takeIf { it.isNotBlank() }?.let {
            builder.setSubtitle(it)
        }
        return builder.build()
    }

    private fun getBiometricStatusMap(status: PowerAuthBiometricStatus): WritableMap {
        val systemStatus = when (status.systemStatus) {
            BiometricStatus.OK -> "OK"
            BiometricStatus.NOT_ENROLLED -> "NOT_ENROLLED"
            BiometricStatus.NOT_AVAILABLE -> "NOT_AVAILABLE"
            BiometricStatus.NOT_SUPPORTED -> "NOT_SUPPORTED"
            else -> "NOT_SUPPORTED"
        }
        val biometryType = when (status.biometryType) {
            BiometryType.NONE -> "NONE"
            BiometryType.FINGERPRINT -> "FINGERPRINT"
            BiometryType.FACE -> "FACE"
            BiometryType.IRIS -> "IRIS"
            BiometryType.GENERIC -> "GENERIC"
            else -> "GENERIC"
        }
        return Arguments.createMap().apply {
            putBoolean(
                "isAuthenticationWithBiometricsAvailable",
                status.isAuthenticationWithBiometricsAvailable
            )
            putBoolean("isBiometricFactorConfigured", status.isBiometricFactorConfigured)
            putString("systemStatus", systemStatus)
            putString("biometryType", biometryType)
        }
    }

    // PowerAuthBlock instance
    /**
     * The PowerAuthBlock is a closure-like interface, called with a valid instance of PowerAuthSDK.
     */
    private interface PowerAuthBlock {
        /**
         * Execute any functionality with PowerAuthSDK instance.
         * @param sdk PowerAuthSDK instance.
         */
        @Throws(Exception::class)
        fun run(sdk: PowerAuthSDK)
    }

    private fun powerAuthBlock(fce: (PowerAuthSDK) -> Unit): PowerAuthBlock {
        return object : PowerAuthBlock {
            @Throws(Exception::class)
            override fun run(sdk: PowerAuthSDK) {
                fce(sdk)
            }
        }
    }

    /**
     * Get PowerAuthSDK instance from the list of instances and run PowerAuthBlock with the instance.
     * @param instanceId Instance identifier
     * @param promise Promise to resolve TS call.
     * @param block Block to execute with acquired PowerAuthSDK instance.
     */
    private fun usePowerAuth(instanceId: String, promise: Promise, block: PowerAuthBlock) {
        try {
            val instance: PowerAuthSDK? = getPowerAuthInstance(instanceId)
            if (instance != null) {
                block.run(instance)
            } else {
                promise.reject(
                    Errors.EC_INSTANCE_NOT_CONFIGURED,
                    "This instance is not configured."
                )
            }
        } catch (e: Throwable) {
            Errors.rejectPromise(promise, e)
        }
    }

    /**
     * Get PowerAuthSDK instance from the list of instances and run PowerAuthBlock with the instance on main thread.
     * @param instanceId Instance identifier
     * @param promise Promise to resolve TS call.
     * @param block Block to execute on main thread with acquired PowerAuthSDK instance.
     */
    private fun usePowerAuthOnMainThread(
        instanceId: String,
        promise: Promise,
        block: PowerAuthBlock
    ) {
        // Note: Uses internal PowerAuth mobile SDK class, so we'll need to reimplement this in some future release.
        //       Right now it's OK to use native SDKs class, due to tight dependency between RN wrapper and mobile SDK.
        MainThreadExecutor.getInstance()
            .execute { usePowerAuth(instanceId, promise, block) }
    }

    // Instances register
    @Throws(PowerAuthErrorException::class)
    private fun getPowerAuthInstance(instanceId: String): PowerAuthSDK? {
        if (!objectRegister.isValidObjectId(instanceId)) {
            throw PowerAuthErrorException(
                PowerAuthErrorCodes.WRONG_PARAMETER,
                "Instance identifier is missing or empty or forbidden string"
            )
        }
        return objectRegister.findObject(instanceId, PowerAuthSDK::class.java)
    }

    @Throws(PowerAuthErrorException::class)
    private fun unregisterPowerAuthInstance(instanceId: String) {
        if (!objectRegister.isValidObjectId(instanceId)) {
            throw PowerAuthErrorException(
                PowerAuthErrorCodes.WRONG_PARAMETER,
                "Instance identifier is missing or empty or forbidden string"
            )
        }
        objectRegister.removeAllObjectsWithTag(instanceId)
    }

    @Throws(Throwable::class)
    private fun registerPowerAuthInstance(
        instanceId: String,
        factory: ObjectRegisterJs.ObjectFactory<Any>
    ): Boolean {
        if (!objectRegister.isValidObjectId(instanceId)) {
            throw PowerAuthErrorException(
                PowerAuthErrorCodes.WRONG_PARAMETER,
                "Instance identifier is missing or empty or forbidden string"
            )
        }
        return objectRegister.registerObjectWithId(
            instanceId,
            instanceId,
            listOf(ReleasePolicy.manual()),
            factory
        )
    }

    /**
     * Function converts UserInfo to dictionary.
     * */
    private fun convertUserInfoToDict(userInfo: UserInfo?): WritableMap? {
        val claims = userInfo?.getAllClaims() ?: return null

        val map: WritableMap = Arguments.createMap()
        val nativeMap = Arguments.makeNativeMap(claims) ?: return null

        map.putMap("allClaims", nativeMap)
        return map
    }

    companion object {
        /**
         * Create KeychainProtection value from given string.
         * @param stringValue String representation of keychain protection.
         * @return KeychainProtection converted from string value.
         */
        @KeychainProtection
        private fun getKeychainProtectionFromString(stringValue: String?): Int {
            if (stringValue != null) {
                when (stringValue) {
                    "NONE" -> {
                        return KeychainProtection.NONE
                    }
                    "SOFTWARE" -> {
                        return KeychainProtection.SOFTWARE
                    }
                    "HARDWARE" -> {
                        return KeychainProtection.HARDWARE
                    }
                    "STRONGBOX" -> {
                        return KeychainProtection.STRONGBOX
                    }
                }
            }
            return KeychainProtection.NONE
        }

        /**
         * Convert ReadableMap to [PowerAuthConfiguration] object.
         * @param instanceId PowerAuth instance identifier.
         * @param map Map with configuration.
         * @return [PowerAuthConfiguration] created from given map.
         */
        private fun getPowerAuthConfigurationFromMap(
            instanceId: String,
            map: ReadableMap
        ): PowerAuthConfiguration? {
            // Configuration parameters
            val baseEndpointUrl: String? = map.getString("baseEndpointUrl")
            val configuration: String? = map.getString("configuration")
            if (baseEndpointUrl == null || configuration == null) {
                return null
            }
            val builder = PowerAuthConfiguration.Builder(
                instanceId,
                baseEndpointUrl,
                configuration
            )
            if (map.hasKey("algorithm")) {
                map.getString("algorithm")?.let { builder.algorithm(powerAuthAlgorithmFromString(it)) }
            }
            if (map.hasKey("offlineAuthenticationCodeComponentLength")) {
                builder.offlineAuthenticationCodeComponentLength(
                    map.getInt("offlineAuthenticationCodeComponentLength")
                )
            }
            return builder.build()
        }

        @PowerAuthAlgorithm
        private fun powerAuthAlgorithmFromString(value: String): Int {
            return when (value) {
                "legacy" -> PowerAuthAlgorithm.LEGACY_P256
                "p384" -> PowerAuthAlgorithm.EC_P384
                "p384l3" -> PowerAuthAlgorithm.EC_P384_ML_L3
                "p384l5" -> PowerAuthAlgorithm.EC_P384_ML_L5
                else -> throw PowerAuthErrorException(
                    PowerAuthErrorCodes.WRONG_PARAMETER,
                    "Unknown PowerAuth algorithm: $value"
                )
            }
        }

        private fun powerAuthAlgorithmToString(@PowerAuthAlgorithm value: Int): String {
            return when (value) {
                PowerAuthAlgorithm.LEGACY_P256 -> "legacy"
                PowerAuthAlgorithm.EC_P384 -> "p384"
                PowerAuthAlgorithm.EC_P384_ML_L3 -> "p384l3"
                PowerAuthAlgorithm.EC_P384_ML_L5 -> "p384l5"
                else -> throw PowerAuthErrorException(
                    PowerAuthErrorCodes.WRONG_PARAMETER,
                    "Unknown native PowerAuth algorithm: $value"
                )
            }
        }

        private fun powerAuthConfigurationToMap(configuration: PowerAuthConfiguration): WritableMap {
            return Arguments.createMap().apply {
                putString("configuration", configuration.configuration)
                putString("baseEndpointUrl", configuration.baseEndpointUrl)
                putString("algorithm", powerAuthAlgorithmToString(configuration.algorithm))
                putInt(
                    "offlineAuthenticationCodeComponentLength",
                    configuration.offlineAuthenticationCodeComponentLength
                )
            }
        }

        private fun powerAuthClientConfigurationToMap(configuration: PowerAuthClientConfiguration): WritableMap {
            return Arguments.createMap().apply {
                putBoolean("enableUnsecureTraffic", configuration.isUnsecuredConnectionAllowed)
                putDouble("connectionTimeout", configuration.connectionTimeout / 1000.0)
                putDouble("readTimeout", configuration.readTimeout / 1000.0)
            }
        }

        private fun powerAuthBiometricConfigurationToMap(configuration: PowerAuthBiometricConfiguration): WritableMap {
            return Arguments.createMap().apply {
                putBoolean(
                    "invalidateBiometricFactorAfterChange",
                    configuration.isInvalidateBiometricFactorAfterChange
                )
                putBoolean("fallbackToDevicePasscode", false)
                putBoolean(
                    "confirmBiometricAuthentication",
                    configuration.isConfirmBiometricAuthentication
                )
                putBoolean(
                    "authenticateOnBiometricKeySetup",
                    configuration.isAuthenticateOnBiometricKeySetup
                )
                putBoolean(
                    "fallbackToSharedBiometryKey",
                    configuration.isFallbackToSharedBiometryKeyEnabled
                )
                putBoolean("useLegacySymmetricKey", configuration.isUseLegacySymmetricKeyType)
            }
        }

        private fun powerAuthKeychainConfigurationToMap(configuration: PowerAuthKeychainConfiguration): WritableMap {
            val protection = when (configuration.minimalRequiredKeychainProtection) {
                KeychainProtection.NONE -> "NONE"
                KeychainProtection.SOFTWARE -> "SOFTWARE"
                KeychainProtection.HARDWARE -> "HARDWARE"
                KeychainProtection.STRONGBOX -> "STRONGBOX"
                else -> throw PowerAuthErrorException(
                    PowerAuthErrorCodes.WRONG_PARAMETER,
                    "Unknown native keychain protection: ${configuration.minimalRequiredKeychainProtection}"
                )
            }
            return Arguments.createMap().apply {
                putString("minimalRequiredKeychainProtection", protection)
            }
        }

        /**
         * Convert ReadableMap to [PowerAuthClientConfiguration] object.
         * @param map Map with client configuration.
         * @return [PowerAuthClientConfiguration] created from given map.
         */
        private fun getPowerAuthClientConfigurationFromMap(map: ReadableMap): PowerAuthClientConfiguration {
            val enableUnsecureTraffic: Boolean =
                if (map.hasKey("enableUnsecureTraffic")) map.getBoolean("enableUnsecureTraffic") else PowerAuthClientConfiguration.DEFAULT_ALLOW_UNSECURED_CONNECTION
            val connectionTimeout: Int =
                if (map.hasKey("connectionTimeout")) (map.getDouble("connectionTimeout") * 1000).toInt() else PowerAuthClientConfiguration.DEFAULT_CONNECTION_TIMEOUT
            val readTimeout: Int =
                if (map.hasKey("readTimeout")) (map.getDouble("readTimeout") * 1000).toInt() else PowerAuthClientConfiguration.DEFAULT_READ_TIMEOUT
            val customHeaders: ReadableArray? = map.getArray("customHttpHeaders")
            val basicAuth: ReadableMap? = map.getMap("basicHttpAuthentication")

            val paClientConfigBuilder: PowerAuthClientConfiguration.Builder =
                PowerAuthClientConfiguration.Builder()
            if (enableUnsecureTraffic) {
                paClientConfigBuilder.clientValidationStrategy(HttpClientSslNoValidationStrategy())
                paClientConfigBuilder.allowUnsecuredConnection(true)
            }
            if (customHeaders != null && customHeaders.size() > 0) {
                for (i in 0 until customHeaders.size()) {
                    val headerObject: ReadableMap? = customHeaders.getMap(i)
                    val name: String? = headerObject?.getString("name")
                    val value: String? = headerObject?.getString("value")
                    if (name != null && value != null) {
                        paClientConfigBuilder.requestInterceptor(
                            CustomHeaderRequestInterceptor(
                                name,
                                value
                            )
                        )
                    }
                }
            }
            if (basicAuth != null) {
                val username: String? = basicAuth.getString("username")
                val password: String? = basicAuth.getString("password")
                if (username != null && password != null) {
                    paClientConfigBuilder.requestInterceptor(
                        BasicHttpAuthenticationRequestInterceptor(username, password)
                    )
                }
            }
            paClientConfigBuilder.timeouts(connectionTimeout, readTimeout)
            return paClientConfigBuilder.build()
        }

        /**
         * Convert ReadableMaps to [PowerAuthKeychainConfiguration] object.
         * @param keychainMap Map with keychain configuration.
         * @return [PowerAuthKeychainConfiguration] created from given maps.
         */
        private fun getPowerAuthKeychainConfigurationFromMap(
            keychainMap: ReadableMap
        ): PowerAuthKeychainConfiguration {
            val minimalRequiredKeychainProtection =
                getKeychainProtectionFromString(keychainMap.getString("minimalRequiredKeychainProtection"))
            return PowerAuthKeychainConfiguration.Builder()
                .minimalRequiredKeychainProtection(minimalRequiredKeychainProtection)
                .build()
        }

        private fun getPowerAuthBiometricConfigurationFromMap(
            map: ReadableMap
        ): PowerAuthBiometricConfiguration {
            val builder = PowerAuthBiometricConfiguration.Builder()
            if (map.hasKey("invalidateBiometricFactorAfterChange")) {
                builder.invalidateBiometricFactorAfterChange(map.getBoolean("invalidateBiometricFactorAfterChange"))
            } else if (map.hasKey("linkItemsToCurrentSet")) {
                builder.invalidateBiometricFactorAfterChange(map.getBoolean("linkItemsToCurrentSet"))
            }
            if (map.hasKey("confirmBiometricAuthentication")) {
                builder.confirmBiometricAuthentication(map.getBoolean("confirmBiometricAuthentication"))
            }
            if (map.hasKey("authenticateOnBiometricKeySetup")) {
                builder.authenticateOnBiometricKeySetup(map.getBoolean("authenticateOnBiometricKeySetup"))
            }
            if (map.hasKey("fallbackToSharedBiometryKey")) {
                builder.enableFallbackToSharedBiometryKey(map.getBoolean("fallbackToSharedBiometryKey"))
            }
            if (map.hasKey("useLegacySymmetricKey")) {
                builder.useLegacySymmetricKey(map.getBoolean("useLegacySymmetricKey"))
            }
            return builder.build()
        }

        // Helper methods
        /**
         * Translate readable map into {code Map<String></String>, String>}.
         * @param rm Readable map to translate.
         * @return {code Map<String></String>, String>} created from given map.
         */
        private fun getStringMap(rm: ReadableMap): Map<String, String> {
            val map: MutableMap<String, String> = HashMap()
            for ((key, value) in rm.toHashMap().entries) {
                if (value is String) {
                    map[key] = value
                }
            }
            return map
        }

        /** Translate [PowerAuthHttpHeader] into a JavaScript object. */
        private fun getHttpHeaderObject(header: PowerAuthHttpHeader): ReadableMap {
            val map: WritableMap = Arguments.createMap()
            map.putString("name", header.key)
            map.putString("value", header.value)
            return map
        }

        /**
         * Translate activation status code into string representation.
         * @param state State to convert.
         * @return String representation of activation state.
         */
        @SuppressLint("DefaultLocale")
        private fun getStatusCode(state: Int): String {
            return when (state) {
                PowerAuthActivationState.PENDING_COMMIT -> "PENDING_COMMIT"
                PowerAuthActivationState.ACTIVE -> "ACTIVE"
                PowerAuthActivationState.BLOCKED -> "BLOCKED"
                PowerAuthActivationState.REMOVED -> "REMOVED"
                PowerAuthActivationState.DEADLOCK -> "DEADLOCK"
                else -> "UNKNOWN"
            }
        }
    }
}
