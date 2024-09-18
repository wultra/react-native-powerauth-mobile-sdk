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

import com.wultra.android.powerauth.bridge.Arguments
import com.wultra.android.powerauth.bridge.Dynamic
import com.wultra.android.powerauth.bridge.ReadableArray
import com.wultra.android.powerauth.bridge.ReadableMap
import com.wultra.android.powerauth.bridge.JsApiMethod
import com.wultra.android.powerauth.bridge.Promise
import com.wultra.android.powerauth.bridge.WritableMap


import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.os.Build
import android.util.Base64
import android.util.Pair
import androidx.fragment.app.FragmentActivity
import io.getlime.security.powerauth.core.Password
import java.nio.charset.StandardCharsets
import javax.annotation.Nonnull

import io.getlime.security.powerauth.biometry.BiometricKeyData
import io.getlime.security.powerauth.biometry.BiometricAuthentication
import io.getlime.security.powerauth.biometry.BiometricStatus
import io.getlime.security.powerauth.biometry.BiometryType
import io.getlime.security.powerauth.biometry.IAddBiometryFactorListener
import io.getlime.security.powerauth.biometry.IBiometricAuthenticationCallback
import io.getlime.security.powerauth.biometry.ICommitActivationWithBiometryListener
import io.getlime.security.powerauth.keychain.KeychainProtection
import io.getlime.security.powerauth.networking.interceptors.BasicHttpAuthenticationRequestInterceptor
import io.getlime.security.powerauth.sdk.*
import io.getlime.security.powerauth.networking.ssl.HttpClientSslNoValidationStrategy
import io.getlime.security.powerauth.networking.interceptors.CustomHeaderRequestInterceptor
import io.getlime.security.powerauth.networking.response.*
import io.getlime.security.powerauth.core.*
import io.getlime.security.powerauth.exception.*
import io.getlime.security.powerauth.sdk.impl.MainThreadExecutor

class PowerAuthJsModule(
    private val context: Context,
    private val activityProvider: ActivityProvider,
    private val objectRegister: ObjectRegisterJs,
    private val passwordModule: PowerAuthPasswordJsModule
) : BaseJavaJsModule, ActivityAwareModule {

    // React integration
    override fun getName(): String {
        return "PowerAuth"
    }

    override fun getCurrentActivity(): Activity {
        return activityProvider.getActivity()
    }

    @JsApiMethod
    fun isConfigured(@Nonnull instanceId: String, promise: Promise) {
        try {
            promise.resolve(getPowerAuthInstance(instanceId) != null)
        } catch (e: PowerAuthErrorException) {
            Errors.rejectPromise(promise, e)
        }
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
        try {
            val result = registerPowerAuthInstance(instanceId, ObjectRegisterJs.objectFactory {
                // Create configurations from maps
                val paConfig: PowerAuthConfiguration = getPowerAuthConfigurationFromMap(instanceId, configuration)
                        ?: throw PowerAuthErrorException(PowerAuthErrorCodes.WRONG_PARAMETER, "Provided configuration is invalid")
                val paClientConfig: PowerAuthClientConfiguration = getPowerAuthClientConfigurationFromMap(clientConfiguration)
                val paKeychainConfig: PowerAuthKeychainConfiguration = getPowerAuthKeychainConfigurationFromMap(keychainConfiguration, biometryConfiguration)
                // Configure the instance
                val instance: PowerAuthSDK = PowerAuthSDK.Builder(paConfig)
                    .clientConfiguration(paClientConfig)
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

    @JsApiMethod
    fun deconfigure(instanceId: String, promise: Promise) {
        try {
            unregisterPowerAuthInstance(instanceId)
            promise.resolve(null)
        } catch (e: PowerAuthErrorException) {
            Errors.rejectPromise(promise, e)
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
                    override fun onActivationStatusSucceed(status: ActivationStatus) {
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
    fun createActivation(instanceId: String, activation: ReadableMap, promise: Promise) {
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            override fun run(sdk: PowerAuthSDK) {
                var paActivation: PowerAuthActivation.Builder? = null

                val name: String? = activation.getString("activationName")
                val activationCode: String? =
                    if (activation.hasKey("activationCode")) activation.getString("activationCode") else null
                val recoveryCode: String? =
                    if (activation.hasKey("recoveryCode")) activation.getString("recoveryCode") else null
                val recoveryPuk: String? =
                    if (activation.hasKey("recoveryPuk")) activation.getString("recoveryPuk") else null
                val identityAttributes: ReadableMap? =
                    if (activation.hasKey("identityAttributes")) activation.getMap("identityAttributes") else null
                val extras: String? =
                    if (activation.hasKey("extras")) activation.getString("extras") else null
                val customAttributes: ReadableMap? =
                    if (activation.hasKey("customAttributes")) activation.getMap("customAttributes") else null
                val additionalActivationOtp: String? =
                    if (activation.hasKey("additionalActivationOtp")) activation.getString("additionalActivationOtp") else null

                try {
                    if (activationCode != null) {
                        paActivation = PowerAuthActivation.Builder.activation(activationCode, name)
                    } else if (recoveryCode != null && recoveryPuk != null) {
                        paActivation = PowerAuthActivation.Builder.recoveryActivation(
                            recoveryCode,
                            recoveryPuk,
                            name
                        )
                    } else if (identityAttributes != null) {
                        paActivation = PowerAuthActivation.Builder.customActivation(
                            getStringMap(identityAttributes), name
                        )
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
                            val map: WritableMap = Arguments.createMap()
                            map.putString(
                                "activationFingerprint",
                                result.activationFingerprint
                            )
                            val rData: RecoveryData? = result.recoveryData
                            if (rData != null) {
                                val recoveryMap: WritableMap = Arguments.createMap()
                                recoveryMap.putString("recoveryCode", rData.recoveryCode)
                                recoveryMap.putString("puk", rData.puk)
                                map.putMap("activationRecovery", recoveryMap)
                            } else {
                                map.putMap("activationRecovery", null)
                            }
                            val customAttr: Map<String, Any>? = result.customActivationAttributes
                            map.putMap(
                                "customAttributes",
                                if (customAttr == null) null
                                else Arguments.makeNativeMap(customAttr)
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
    fun commitActivation(instanceId: String, authMap: ReadableMap, promise: Promise) {
        val context: Context = this.context
        this.usePowerAuthOnMainThread(instanceId, promise, powerAuthBlock { sdk: PowerAuthSDK ->
            val auth: PowerAuthAuthentication = constructAuthentication(authMap, true)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && authMap.getBoolean("isBiometry")) {
                val promptMap: ReadableMap? =
                    if (authMap.hasKey("biometricPrompt")) authMap.getMap("biometricPrompt") else null
                val titleDesc = extractPromptStrings(promptMap)
                try {
                    val fragmentActivity = getCurrentActivity() as FragmentActivity?
                        ?: throw WrapperException(
                            Errors.EC_REACT_NATIVE_ERROR,
                            "Current fragment activity is not available"
                        )
                    // This is handled in "constructAuthentication", so should never happen.
                    checkNotNull(auth.password)
                    sdk.commitActivation(
                        context,
                        fragmentActivity,
                        titleDesc.first,
                        titleDesc.second,
                        auth.password!!, // FIXME
                        object : ICommitActivationWithBiometryListener {
                            override fun onBiometricDialogCancelled() {
                                promise.reject(
                                    Errors.EC_BIOMETRY_CANCEL,
                                    "Biometry dialog was canceled"
                                )
                            }

                            override fun onBiometricDialogSuccess() {
                                promise.resolve(null)
                            }

                            override fun onBiometricDialogFailed(error: PowerAuthErrorException) {
                                promise.reject(Errors.EC_BIOMETRY_FAILED, "Biometry dialog failed")
                            }
                        })
                } catch (t: Throwable) {
                    Errors.rejectPromise(promise, t)
                }
            } else {
                val result: Int = sdk.commitActivationWithAuthentication(context, auth)
                if (result == PowerAuthErrorCodes.SUCCEED) {
                    promise.resolve(null)
                } else {
                    promise.reject(Errors.getErrorCodeFromError(result), "Commit failed.")
                }
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
                val auth: PowerAuthAuthentication = constructAuthentication(authMap, false)
                sdk.removeActivationWithAuthentication(
                    context,
                    auth,
                    object : IActivationRemoveListener {
                        override fun onActivationRemoveSucceed() {
                            promise.resolve(null)
                        }

                        override fun onActivationRemoveFailed(t: Throwable) {
                            Errors.rejectPromise(promise, t)
                        }
                    })
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
    fun requestGetSignature(
        instanceId: String,
        authMap: ReadableMap,
        uriId: String?,
        params: ReadableMap?,
        promise: Promise
    ) {
        val context: Context = this.context
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            @Throws(Exception::class)
            override fun run(sdk: PowerAuthSDK) {
                val auth: PowerAuthAuthentication = constructAuthentication(authMap, false)
                val paramMap = if (params == null) null else getStringMap(params)
                val header: PowerAuthAuthorizationHttpHeader =
                    sdk.requestGetSignatureWithAuthentication(context, auth, uriId, paramMap)
                val headerObject: ReadableMap? = getHttpHeaderObject(header)

                if (headerObject != null) {
                    promise.resolve(headerObject)
                } else {
                    promise.reject(
                        Errors.getErrorCodeFromError(header.powerAuthErrorCode),
                        "Signature calculation failed."
                    )
                }
            }
        })
    }

    @JsApiMethod
    fun requestSignature(
        instanceId: String,
        authMap: ReadableMap,
        method: String?,
        uriId: String?,
        body: String?,
        promise: Promise
    ) {
        val context: Context = this.context
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            @Throws(Exception::class)
            override fun run(sdk: PowerAuthSDK) {
                val auth: PowerAuthAuthentication = constructAuthentication(authMap, false)
                val decodedBody = body?.toByteArray(StandardCharsets.UTF_8)
                val header: PowerAuthAuthorizationHttpHeader =
                    sdk.requestSignatureWithAuthentication(
                        context,
                        auth,
                        method,
                        uriId,
                        decodedBody
                    )
                if (header.powerAuthErrorCode == PowerAuthErrorCodes.SUCCEED) {
                    val returnMap: WritableMap = Arguments.createMap()
                    returnMap.putString("key", header.key)
                    returnMap.putString("value", header.value)
                    promise.resolve(returnMap)
                } else {
                    promise.reject(
                        Errors.getErrorCodeFromError(header.powerAuthErrorCode),
                        "Signature calculation failed."
                    )
                }
            }
        })
    }

    @JsApiMethod
    fun offlineSignature(
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
                val auth: PowerAuthAuthentication = constructAuthentication(authMap, false)
                val decodedBody = body?.toByteArray(StandardCharsets.UTF_8)
                val signature: String? =
                    sdk.offlineSignatureWithAuthentication(context, auth, uriId, decodedBody, nonce)
                if (signature != null) {
                    promise.resolve(signature)
                } else {
                    promise.reject(Errors.EC_SIGNATURE_ERROR, "Signature calculation failed")
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
            val coreOldPassword: Password = passwordModule.usePassword(oldPassword)
            val coreNewPassword: Password = passwordModule.usePassword(newPassword)
            sdk.changePassword(
                context,
                coreOldPassword,
                coreNewPassword,
                object : IChangePasswordListener {
                    override fun onPasswordChangeSucceed() {
                        promise.resolve(null)
                    }

                    override fun onPasswordChangeFailed(t: Throwable) {
                        Errors.rejectPromise(promise, t)
                    }
                })
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
            val corePassword: Password = passwordModule.usePassword(password)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                try {
                    val fragmentActivity = getCurrentActivity() as FragmentActivity?
                        ?: throw IllegalStateException("Current fragment activity is not available")
                    val titleDesc = extractPromptStrings(prompt)
                    sdk.addBiometryFactor(
                        context,
                        fragmentActivity,
                        titleDesc.first,
                        titleDesc.second,
                        corePassword,
                        object : IAddBiometryFactorListener {
                            override fun onAddBiometryFactorSucceed() {
                                promise.resolve(null)
                            }

                            override fun onAddBiometryFactorFailed(error: PowerAuthErrorException) {
                                Errors.rejectPromise(promise, error)
                            }
                        })
                } catch (e: Exception) {
                    Errors.rejectPromise(promise, e)
                }
            } else {
                promise.reject(
                    Errors.EC_REACT_NATIVE_ERROR,
                    "Biometry not supported on this android version."
                )
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
                    promise.reject(
                        Errors.EC_REACT_NATIVE_ERROR,
                        "Biometry not supported on this android version."
                    )
                }
            }
        })
    }

    @JsApiMethod
    fun removeBiometryFactor(instanceId: String, promise: Promise) {
        val context: Context = this.context
        this.usePowerAuth(instanceId, promise, powerAuthBlock { sdk: PowerAuthSDK ->
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (sdk.removeBiometryFactor(context)) {
                    promise.resolve(null)
                } else {
                    if (!sdk.hasBiometryFactor(context)) {
                        promise.reject(
                            Errors.EC_BIOMETRY_NOT_CONFIGURED,
                            "Biometry not configured in this PowerAuth instance"
                        )
                    } else {
                        promise.reject(
                            Errors.EC_REACT_NATIVE_ERROR,
                            "Failed to remove biometry factor"
                        )
                    }
                }
            } else {
                promise.reject(
                    Errors.EC_BIOMETRY_NOT_SUPPORTED,
                    "Biometry not supported on this android version"
                )
            }
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
    fun fetchEncryptionKey(instanceId: String, authMap: ReadableMap, index: Int, promise: Promise) {
        val context: Context = this.context
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            @Throws(Exception::class)
            override fun run(sdk: PowerAuthSDK) {
                val auth: PowerAuthAuthentication = constructAuthentication(authMap, false)
                sdk.fetchEncryptionKey(
                    context,
                    auth,
                    index.toLong(),
                    object : IFetchEncryptionKeyListener {
                        override fun onFetchEncryptionKeySucceed(encryptedEncryptionKey: ByteArray) {
                            promise.resolve(
                                Base64.encodeToString(
                                    encryptedEncryptionKey,
                                    Base64.NO_WRAP
                                )
                            )
                        }

                        override fun onFetchEncryptionKeyFailed(t: Throwable) {
                            Errors.rejectPromise(promise, t)
                        }
                    })
            }
        })
    }

    @JsApiMethod
    fun signDataWithDevicePrivateKey(
        instanceId: String,
        authMap: ReadableMap,
        data: String,
        promise: Promise
    ) {
        val context: Context = this.context
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            @Throws(Exception::class)
            override fun run(sdk: PowerAuthSDK) {
                val auth: PowerAuthAuthentication = constructAuthentication(authMap, false)
                sdk.signDataWithDevicePrivateKey(
                    context,
                    auth,
                    data.toByteArray(StandardCharsets.UTF_8),
                    object : IDataSignatureListener {
                        override fun onDataSignedSucceed(signature: ByteArray) {
                            promise.resolve(Base64.encodeToString(signature, Base64.NO_WRAP))
                        }

                        override fun onDataSignedFailed(t: Throwable) {
                            Errors.rejectPromise(promise, t)
                        }
                    })
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
    fun hasActivationRecoveryData(instanceId: String, promise: Promise) {
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            override fun run(sdk: PowerAuthSDK) {
                promise.resolve(sdk.hasActivationRecoveryData())
            }
        })
    }

    @JsApiMethod
    fun activationRecoveryData(instanceId: String, authMap: ReadableMap, promise: Promise) {
        val context: Context = this.context
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            @Throws(Exception::class)
            override fun run(sdk: PowerAuthSDK) {
                val auth: PowerAuthAuthentication = constructAuthentication(authMap, false)
                sdk.getActivationRecoveryData(context, auth, object : IGetRecoveryDataListener {
                    override fun onGetRecoveryDataSucceeded(recoveryData: RecoveryData) {
                        val map: WritableMap = Arguments.createMap()
                        map.putString("recoveryCode", recoveryData.recoveryCode)
                        map.putString("puk", recoveryData.puk)
                        promise.resolve(map)
                    }

                    override fun onGetRecoveryDataFailed(t: Throwable) {
                        Errors.rejectPromise(promise, t)
                    }
                })
            }
        })
    }

    @JsApiMethod
    fun confirmRecoveryCode(
        instanceId: String,
        recoveryCode: String,
        authMap: ReadableMap,
        promise: Promise
    ) {
        val context: Context = this.context
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            @Throws(Exception::class)
            override fun run(sdk: PowerAuthSDK) {
                val auth: PowerAuthAuthentication = constructAuthentication(authMap, false)
                sdk.confirmRecoveryCode(
                    context,
                    auth,
                    recoveryCode,
                    object : IConfirmRecoveryCodeListener {
                        override fun onRecoveryCodeConfirmed(alreadyConfirmed: Boolean) {
                            promise.resolve(alreadyConfirmed)
                        }

                        override fun onRecoveryCodeConfirmFailed(t: Throwable) {
                            Errors.rejectPromise(promise, t)
                        }
                    })
            }
        })
    }

    /**
     * Validate biometric status before use.
     * @param sdk PowerAuthSDK instance
     * @throws WrapperException In case that biometry is not available for any reason.
     */
    @Throws(WrapperException::class)
    private fun validateBiometryBeforeUse(sdk: PowerAuthSDK) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            when (BiometricAuthentication.canAuthenticate(context)) {
                BiometricStatus.OK -> if (sdk.hasValidActivation() && !sdk.hasBiometryFactor(context)) {
                    // Has valid activation, but factor is not set
                    throw WrapperException(
                        Errors.EC_BIOMETRY_NOT_CONFIGURED,
                        "Biometry factor is not configured"
                    )
                }

                BiometricStatus.NOT_AVAILABLE -> throw WrapperException(
                    Errors.EC_BIOMETRY_NOT_AVAILABLE,
                    "Biometry is not available"
                )

                BiometricStatus.NOT_ENROLLED -> throw WrapperException(
                    Errors.EC_BIOMETRY_NOT_ENROLLED,
                    "Biometry is not enrolled on device"
                )

                BiometricStatus.NOT_SUPPORTED -> throw WrapperException(
                    Errors.EC_BIOMETRY_NOT_SUPPORTED,
                    "Biometry is not supported"
                )
            }
        } else {
            throw WrapperException(Errors.EC_BIOMETRY_NOT_SUPPORTED, "Biometry is not supported")
        }
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
                    validateBiometryBeforeUse(sdk)
                    val fragmentActivity = getCurrentActivity() as FragmentActivity?
                        ?: throw WrapperException(
                            Errors.EC_REACT_NATIVE_ERROR,
                            "Current fragment activity is not available"
                        )
                    val titleDesc = extractPromptStrings(prompt)
                    sdk.authenticateUsingBiometry(
                        context,
                        fragmentActivity,
                        titleDesc.first,
                        titleDesc.second,
                        object : IBiometricAuthenticationCallback {
                            override fun onBiometricDialogCancelled(userCancel: Boolean) {
                                promise.reject(
                                    Errors.EC_BIOMETRY_CANCEL,
                                    "Biometry dialog was canceled"
                                )
                            }

                            override fun onBiometricDialogSuccess(biometricKeyData: BiometricKeyData) {
                                // Allocate native managed object object
                                val managedBytes =
                                    ManagedAny.wrap(biometricKeyData.derivedData)
                                // If reusable authentication is going to be created, then "keep alive" release policy is applied.
                                // Basically, the data will be available up to 10 seconds from the last access.
                                // If authentication is not reusable, then dispose biometric key after its 1st use. We still need
                                // to combine it with "expire" policy to make sure that key don't remain in memory forever.
                                val releasePolicies =
                                    if (makeReusable) listOf(
                                        ReleasePolicy.keepAlive(Constants.BIOMETRY_KEY_KEEP_ALIVE_TIME)
                                    )
                                    else listOf(
                                        ReleasePolicy.afterUse(1),
                                        ReleasePolicy.expire(Constants.BIOMETRY_KEY_KEEP_ALIVE_TIME)
                                    )
                                val managedId = objectRegister.registerObject(
                                    managedBytes,
                                    instanceId,
                                    releasePolicies
                                )
                                promise.resolve(managedId)
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
                val auth: PowerAuthAuthentication = constructAuthentication(authMap, false)
                sdk.tokenStore
                    .requestAccessToken(context, tokenName, auth, object : IGetTokenListener {
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
    fun generateHeaderForToken(instanceId: String, tokenName: String, promise: Promise) {
        val context: Context = this.context
        this.usePowerAuth(instanceId, promise, object : PowerAuthBlock {
            override fun run(sdk: PowerAuthSDK) {
                val token: PowerAuthToken? = sdk.tokenStore.getLocalToken(context, tokenName)
                if (token == null) {
                    promise.reject(
                        Errors.EC_LOCAL_TOKEN_NOT_AVAILABLE,
                        "This token is no longer available in the local store."
                    )
                } else if (token.canGenerateHeader()) {
                    promise.resolve(getHttpHeaderObject(token.generateHeader()))
                } else {
                    promise.reject(
                        Errors.EC_CANNOT_GENERATE_TOKEN,
                        "Cannot generate header for this token."
                    )
                }
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
    fun parseRecoveryCode(recoveryCode: String, promise: Promise) {
        val ac: ActivationCode? = ActivationCodeUtil.parseFromRecoveryCode(recoveryCode)
        if (ac != null) {
            val response: WritableMap = Arguments.createMap()
            response.putString("activationCode", ac.activationCode)
            if (ac.activationSignature != null) {
                response.putString("activationSignature", ac.activationSignature)
            }
            promise.resolve(response)
        } else {
            promise.reject(Errors.EC_INVALID_RECOVERY_CODE, "Invalid recovery code.")
        }
    }

    @JsApiMethod
    fun validateRecoveryCode(recoveryCode: String, promise: Promise) {
        promise.resolve(ActivationCodeUtil.validateRecoveryCode(recoveryCode))
    }

    @JsApiMethod
    fun validateRecoveryPuk(puk: String, promise: Promise) {
        promise.resolve(ActivationCodeUtil.validateRecoveryPuk(puk))
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


    /**
     * Helper function converts input readable map to PowerAuthAuthentication object.
     * @param map Map with authentication data.
     * @param forCommit Set true if authentication is required for activation commit.
     * @return [PowerAuthAuthentication] instance.
     */
    @Throws(WrapperException::class)
    private fun constructAuthentication(
        map: ReadableMap,
        forCommit: Boolean
    ): PowerAuthAuthentication {
        val biometryKeyId: String? = map.getString("biometryKeyId")
        val biometryKey: ByteArray?
        if (biometryKeyId != null) {
            biometryKey = objectRegister.useObject(biometryKeyId, ByteArray::class.java)
            if (biometryKey == null) {
                throw WrapperException(
                    Errors.EC_INVALID_NATIVE_OBJECT,
                    "Biometric key in PowerAuthAuthentication object is no longer valid."
                )
            }
        } else {
            biometryKey = null
        }
        val password: Password? = if (map.hasKey("password")) {
            passwordModule.usePassword(map.getDynamic("password"))
        } else {
            null
        }
        if (forCommit) {
            // Authentication for activation commit
            if (password == null) {
                throw WrapperException(
                    Errors.EC_WRONG_PARAMETER,
                    "PowerAuthPassword or string is required"
                )
            }
            return if (biometryKey == null) {
                PowerAuthAuthentication.commitWithPassword(password)
            } else {
                // This is currently not supported in RN wrapper. Application has no way to create
                // commit authentication object prepared with valid biometry key. This is supported
                // in native SDK, but application has to create its own biometry-supporting infrastructure.
                //
                // We can still use this option in tests, to simulate biometry-related operations
                // with no user's interaction.
                PowerAuthAuthentication.commitWithPasswordAndBiometry(password, biometryKey)
            }
        } else {
            // Authentication for data signing
            return if (biometryKey != null) {
                PowerAuthAuthentication.possessionWithBiometry(biometryKey)
            } else if (password != null) {
                PowerAuthAuthentication.commitWithPassword(password)
            } else {
                PowerAuthAuthentication.possession()
            }
        }
    }

    /**
     * Extract strings from biometric prompt.
     * @param prompt Map with prompt data.
     * @return Pair where first item is title and second description for biometric dialog.
     */
    private fun extractPromptStrings(prompt: ReadableMap?): Pair<String, String> {
        var title: String? = prompt?.getString("promptTitle")
        var description: String? = prompt?.getString("promptMessage")
        if (title == null) {
            title = Constants.MISSING_REQUIRED_STRING
        }
        if (description == null) {
            description = Constants.MISSING_REQUIRED_STRING
        }
        return Pair.create(title, description)
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
    private fun usePowerAuth(@Nonnull instanceId: String, promise: Promise, block: PowerAuthBlock) {
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
        @Nonnull instanceId: String,
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
            val appKey: String? = map.getString("applicationKey")
            val appSecret: String? = map.getString("applicationSecret")
            val masterServerPublicKey: String? = map.getString("masterServerPublicKey")
            if (baseEndpointUrl == null || appKey == null || appSecret == null || masterServerPublicKey == null) {
                return null
            }
            return PowerAuthConfiguration.Builder(
                instanceId,
                baseEndpointUrl,
                appKey,
                appSecret,
                masterServerPublicKey
            ).build()
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
                if (map.hasKey("connectionTimeout")) map.getInt("connectionTimeout") * 1000 else PowerAuthClientConfiguration.DEFAULT_CONNECTION_TIMEOUT
            val readTimeout: Int =
                if (map.hasKey("readTimeout")) map.getInt("readTimeout") * 1000 else PowerAuthClientConfiguration.DEFAULT_READ_TIMEOUT
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
                    val `object`: ReadableMap = customHeaders.getMap(i)
                    val name: String? = `object`.getString("name")
                    val value: String? = `object`.getString("value")
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
         * @param biometryMap Map with biometry configuration.
         * @return [PowerAuthKeychainConfiguration] created from given maps.
         */
        private fun getPowerAuthKeychainConfigurationFromMap(
            keychainMap: ReadableMap,
            biometryMap: ReadableMap
        ): PowerAuthKeychainConfiguration {
            // Biometry configuration
            val linkItemsToCurrentSet: Boolean =
                if (biometryMap.hasKey("linkItemsToCurrentSet")) biometryMap.getBoolean("linkItemsToCurrentSet") else PowerAuthKeychainConfiguration.DEFAULT_LINK_BIOMETRY_ITEMS_TO_CURRENT_SET
            val confirmBiometricAuthentication: Boolean =
                if (biometryMap.hasKey("confirmBiometricAuthentication")) biometryMap.getBoolean("confirmBiometricAuthentication") else PowerAuthKeychainConfiguration.DEFAULT_CONFIRM_BIOMETRIC_AUTHENTICATION
            val authenticateOnBiometricKeySetup: Boolean =
                if (biometryMap.hasKey("authenticateOnBiometricKeySetup")) biometryMap.getBoolean("authenticateOnBiometricKeySetup") else PowerAuthKeychainConfiguration.DEFAULT_AUTHENTICATE_ON_BIOMETRIC_KEY_SETUP
            // Keychain configuration
            val minimalRequiredKeychainProtection =
                getKeychainProtectionFromString(keychainMap.getString("minimalRequiredKeychainProtection"))
            return PowerAuthKeychainConfiguration.Builder()
                .linkBiometricItemsToCurrentSet(linkItemsToCurrentSet)
                .confirmBiometricAuthentication(confirmBiometricAuthentication)
                .authenticateOnBiometricKeySetup(authenticateOnBiometricKeySetup)
                .minimalRequiredKeychainProtection(minimalRequiredKeychainProtection)
                .build()
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

        /**
         * Translate [PowerAuthAuthorizationHttpHeader] into readable map.
         * @param header Header to convert.
         * @return Readable map with header values.
         */
        private fun getHttpHeaderObject(header: PowerAuthAuthorizationHttpHeader): ReadableMap? {
            if (header.powerAuthErrorCode == PowerAuthErrorCodes.SUCCEED) {
                val map: WritableMap = Arguments.createMap()
                map.putString("key", header.key)
                map.putString("value", header.value)
                return map
            } else {
                return null
            }
        }

        /**
         * Translate activation status code into string representation.
         * @param state State to convert.
         * @return String representation of activation state.
         */
        @SuppressLint("DefaultLocale")
        private fun getStatusCode(state: Int): String {
            return when (state) {
                ActivationStatus.State_Created -> "CREATED"
                ActivationStatus.State_Pending_Commit -> "PENDING_COMMIT"
                ActivationStatus.State_Active -> "ACTIVE"
                ActivationStatus.State_Blocked -> "BLOCKED"
                ActivationStatus.State_Removed -> "REMOVED"
                ActivationStatus.State_Deadlock -> "DEADLOCK"
                else -> String.format("STATE_UNKNOWN_%d", state)
            }
        }
    }
}