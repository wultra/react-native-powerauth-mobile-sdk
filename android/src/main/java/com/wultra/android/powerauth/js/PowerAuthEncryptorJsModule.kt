/*
 * Copyright 2023 Wultra s.r.o.
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

import com.wultra.android.powerauth.bridge.JsApiMethod
import com.wultra.android.powerauth.bridge.Promise
import com.wultra.android.powerauth.bridge.ReadableMap
import com.wultra.android.powerauth.bridge.BuildConfig

import android.content.Context
import android.util.Base64
import android.util.Pair
import com.wultra.android.powerauth.bridge.Arguments
import com.wultra.android.powerauth.bridge.WritableMap
import com.wultra.android.powerauth.js.PowerAuthEncryptorJsModule.InstanceData
import io.getlime.security.powerauth.core.EciesCryptogram
import io.getlime.security.powerauth.core.EciesEncryptor
import io.getlime.security.powerauth.ecies.EciesMetadata
import io.getlime.security.powerauth.exception.PowerAuthErrorCodes
import io.getlime.security.powerauth.exception.PowerAuthErrorException
import io.getlime.security.powerauth.sdk.PowerAuthSDK
import java.util.Arrays
import kotlin.math.min


@Suppress("unused")
class PowerAuthEncryptorJsModule(
    private val context: Context,
    private val objectRegister: ObjectRegisterJs
) : BaseJavaJsModule {
    override fun getName(): String {
        return "PowerAuthEncryptor"
    }

    private fun action(fce: (InstanceData) -> Unit): Action {
        return object: Action {
            override fun action(instanceData: InstanceData) {
                fce(instanceData)
            }
        }
    }

    // JavaScript methods
    @JsApiMethod
    fun initialize(scope: String, ownerId: String, autoreleaseTime: Int, promise: Promise) {
        try {
            // Process inputs
            val activationScope = if ("APPLICATION" == scope) {
                false
            } else if ("ACTIVATION" == scope) {
                true
            } else {
                throw WrapperException(
                    Errors.EC_WRONG_PARAMETER,
                    "scope parameter is missing or contains invalid value"
                )
            }
            var releaseTime = Constants.ENCRYPTOR_KEY_KEEP_ALIVE_TIME
            if (BuildConfig.DEBUG) {
                if (autoreleaseTime != 0) {
                    releaseTime = min(
                        autoreleaseTime.toDouble(),
                        Constants.ENCRYPTOR_KEY_KEEP_ALIVE_TIME.toDouble()
                    )
                        .toInt()
                }
            }
            // Resolve PowerAuthSDK
            val sdk: PowerAuthSDK = resolveSdk(ownerId, promise) ?: return
            // Create ECIES encryptor
            val coreEncryptor: EciesEncryptor? =
                if (activationScope) sdk.getEciesEncryptorForActivationScope(context)
                else sdk.getEciesEncryptorForApplicationScope()
            if (coreEncryptor == null) {
                if (activationScope && !sdk.hasValidActivation()) {
                    throw PowerAuthErrorException(PowerAuthErrorCodes.MISSING_ACTIVATION)
                }
                throw WrapperException(Errors.EC_UNKNOWN_ERROR, "Failed to create ECIES encryptor")
            }
            // Create container with all required objects and register it to the register.
            val instanceData = InstanceData(coreEncryptor, ownerId, activationScope)
            val releasePolicy = listOf(ReleasePolicy.keepAlive(releaseTime))
            val objectId = objectRegister.registerObject(instanceData, ownerId, releasePolicy)
            // Resolve with native object identifier.
            promise.resolve(objectId)
        } catch (t: Throwable) {
            Errors.rejectPromise(promise, t)
        }
    }

    @JsApiMethod
    fun release(encryptorId: String) {
        objectRegister.removeObject(encryptorId, InstanceData::class.java)
    }

    // Encryption
    /**
     * Determine whether encryptor is able to encrypt the request data. The function also validate state of PowerAuthSDK if
     * encryptor is configured for an activation scope.
     * @param instanceData Instance data.
     * @param promise Promise to reject in case of failure.
     * @return true if encryptor can be used for an encryption.
     */
    private fun canEncrypt(instanceData: InstanceData, promise: Promise?): Boolean {
        val sdk: PowerAuthSDK =
            resolveSdk(instanceData.powerAuthInstanceId, promise) ?: return false
        if (instanceData.isActivationScoped) {
            if (!sdk.hasValidActivation()) {
                if (promise != null) {
                    promise.reject(
                        Errors.EC_MISSING_ACTIVATION,
                        "PowerAuth instance with no activation"
                    )
                }
                return false
            }
        }
        val result: Boolean = instanceData.coreEncryptor.canEncryptRequest()
        if (!result && promise != null) {
            promise.reject(
                Errors.EC_INVALID_ENCRYPTOR,
                "Encryptor is not constructed for request encryption"
            )
        }
        return result
    }

    @JsApiMethod
    fun canEncryptRequest(encryptorId: String, promise: Promise) {
        touchEncryptor(encryptorId, promise, action { instanceData: InstanceData ->
            promise.resolve(canEncrypt(instanceData, null))
        })
    }

    @JsApiMethod
    fun encryptRequest(encryptorId: String, body: String?, bodyFormat: String?, promise: Promise) {
        useEncryptor(encryptorId, promise, action { instanceData: InstanceData ->
            // Input validation
            val format = DataFormat.fromString(bodyFormat)
            val data = format.decodeBytes(body)
            // Test whether this is encryptor
            if (!canEncrypt(instanceData, promise)) {
                // If encryption is not available, then remove the object from the register.
                objectRegister.removeObject(encryptorId, InstanceData::class.java)
                return@action
            }
            // Encrypt
            val encryptionResult: Pair<EciesEncryptor, EciesCryptogram> =
                instanceData.coreEncryptor.encryptRequestSynchronized(data)
                    ?: throw WrapperException(
                        Errors.EC_ENCRYPTION_ERROR,
                        "Failed to encrypt request"
                    )
            val metadata: EciesMetadata = encryptionResult.first.getMetadata()
                ?: throw WrapperException(Errors.EC_INVALID_ENCRYPTOR, "Incompatible native SDK")
            //  Wrap decryptor and register it in the object register
            val decryptor = InstanceData(
                encryptionResult.first,
                instanceData.powerAuthInstanceId,
                instanceData.isActivationScoped
            )
            val releasePolicy = Arrays.asList(
                ReleasePolicy.afterUse(1), ReleasePolicy.keepAlive(
                    Constants.DECRYPTOR_KEY_KEEP_ALIVE_TIME
                )
            )
            val decryptorId = objectRegister.registerObject(
                decryptor,
                instanceData.powerAuthInstanceId,
                releasePolicy
            )
            // Resolve
            val cryptogram: WritableMap = Arguments.createMap()
            cryptogram.putString("ephemeralPublicKey", encryptionResult.second.getKeyBase64())
            cryptogram.putString("encryptedData", encryptionResult.second.getBodyBase64())
            cryptogram.putString("mac", encryptionResult.second.getMacBase64())
            cryptogram.putString("nonce", encryptionResult.second.getNonceBase64())
            val header: WritableMap = Arguments.createMap()
            header.putString("key", metadata.getHttpHeaderKey())
            header.putString("value", metadata.getHttpHeaderValue())
            val result: WritableMap = Arguments.createMap()
            result.putMap("cryptogram", cryptogram)
            result.putMap("header", header)
            result.putString("decryptorId", decryptorId)
            promise.resolve(result)
        })
    }

    // Decryption
    /**
     * Determine whether encryptor is able to decrypt the response cryptogram. The function also validate
     * state of PowerAuthSDK if encryptor is configured for an activation scope.
     * @param instanceData Instance data.
     * @param promise Optional promise to reject in case of failure.
     * @return true if this is decryptor.
     */
    private fun canDecrypt(instanceData: InstanceData, promise: Promise?): Boolean {
        val sdk: PowerAuthSDK =
            resolveSdk(instanceData.powerAuthInstanceId, promise) ?: return false
        if (instanceData.isActivationScoped) {
            if (!sdk.hasValidActivation()) {
                if (promise != null) {
                    promise.reject(
                        Errors.EC_MISSING_ACTIVATION,
                        "PowerAuth instance with no activation"
                    )
                }
                return false
            }
        }
        val result: Boolean = instanceData.coreEncryptor.canDecryptResponse()
        if (!result && promise != null) {
            promise.reject(
                Errors.EC_INVALID_ENCRYPTOR,
                "Encryptor is not constructed for response decryption"
            )
        }
        return result
    }

    @JsApiMethod
    fun canDecryptResponse(encryptorId: String?, promise: Promise) {
        touchEncryptor(encryptorId, promise, action { instanceData: InstanceData ->
            promise.resolve(canDecrypt(instanceData, null))
        })
    }

    @JsApiMethod
    fun decryptResponse(
        encryptorId: String?,
        cryptogram: ReadableMap,
        outputFormat: String?,
        promise: Promise
    ) {
        useEncryptor(encryptorId, promise, action { instanceData: InstanceData ->
            // Input validation
            val dataFormat = DataFormat.fromString(outputFormat)
            // Test whether this is decryptor
            if (!canDecrypt(instanceData, promise)) {
                // Remove object from the register if decryption is no longer available.
                objectRegister.removeObject(encryptorId, InstanceData::class.java)
                return@action
            }
            // Decrypt
            val coreCryptogram: EciesCryptogram = EciesCryptogram(
                if (cryptogram.hasKey("encryptedData")) cryptogram.getString("encryptedData") else null,
                if (cryptogram.hasKey("mac")) cryptogram.getString("mac") else null
            )
            val decryptedResponse: ByteArray =
                instanceData.coreEncryptor.decryptResponse(coreCryptogram)
                    ?: throw WrapperException(
                        Errors.EC_ENCRYPTION_ERROR,
                        "Failed to decrypt response"
                    )
            val result = dataFormat.encodeBytes(decryptedResponse)
            promise.resolve(result)
        })
    }

    // Private methods
    fun getBase64EncodedBytes(map: ReadableMap, key: String): ByteArray? {
        val value: String? = if (map.hasKey(key)) map.getString(key) else null
        if (value != null) {
            return Base64.decode(value, Base64.NO_WRAP)
        }
        return null
    }

    /**
     * Resolve PowerAuthSDK instance from given identifier.
     * @param powerAuthInstanceId PowerAuth instance identifier.
     * @param promise Optional promise to reject if resolve failed.
     * @return Resolved instance or null.
     */
    private fun resolveSdk(powerAuthInstanceId: String, promise: Promise?): PowerAuthSDK? {
        if (objectRegister.isValidObjectId(powerAuthInstanceId)) {
            val instance: PowerAuthSDK? = objectRegister.findObject(
                powerAuthInstanceId,
                PowerAuthSDK::class.java
            )
            if (instance != null) {
                return instance
            }
            promise?.reject(
                Errors.EC_INSTANCE_NOT_CONFIGURED,
                "PowerAuth instance is not configured"
            )
        }
        promise?.reject(
            Errors.EC_WRONG_PARAMETER,
            "PowerAuth instance identifier is missing or empty string"
        )
        return null
    }

    /**
     * Action to execute when password object is found in object register.
     */
    internal interface Action {
        @Throws(Throwable::class)
        fun action(instanceData: InstanceData)
    }


    /**
     * Object containing all encryptor's data required for the request encryption.
     */
    internal class InstanceData(
        coreEncryptor: EciesEncryptor,
        val powerAuthInstanceId: String,
        val isActivationScoped: Boolean
    ) : IManagedObject<Any> {
        val coreEncryptor: EciesEncryptor = coreEncryptor

        override fun cleanup() {
            coreEncryptor.destroy()
        }

        override fun managedInstance(): IManagedObject<Any> {
            return this
        }
    }

    /**
     * Execute action when encryptor is found in object register.
     * @param objectId Encryptor object identifier.
     * @param promise Promise to reject or resolve.
     * @param action Action to execute.
     */
    internal fun useEncryptor(objectId: String?, promise: Promise, action: Action) {
        withEncryptor(objectId, false, promise, action)
    }

    /**
     * Execute action when encryptor is found in object register. Unlike [.useEncryptor] this
     * method only touch object in the register.
     * @param objectId Encryptor object identifier.
     * @param promise Promise to reject or resolve.
     * @param action Action to execute.
     */
    internal fun touchEncryptor(objectId: String?, promise: Promise, action: Action) {
        withEncryptor(objectId, true, promise, action)
    }

    /**
     * Touch or use native encryptor object with given identifier and execute the action.
     * @param objectId Encryptor object identifier.
     * @param touch Touch or Use the native object.
     * @param promise Promise to reject or resolve.
     * @param action Action to execute.
     */
    private fun withEncryptor(objectId: String?, touch: Boolean, promise: Promise, action: Action) {
        val encryptor = if (touch
        ) objectRegister.touchObject(objectId, InstanceData::class.java)
        else objectRegister.useObject(objectId, InstanceData::class.java)
        if (encryptor != null) {
            try {
                action.action(encryptor)
            } catch (t: Throwable) {
                Errors.rejectPromise(promise, t)
            }
        } else {
            promise.reject(Errors.EC_INVALID_NATIVE_OBJECT, "Encryptor object is no longer valid")
        }
    }
}
