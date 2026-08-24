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

import android.content.Context
import com.wultra.android.powerauth.bridge.*
import io.getlime.security.powerauth.core.CoreEncryptedResponse
import io.getlime.security.powerauth.core.CoreEncryptor
import io.getlime.security.powerauth.exception.PowerAuthErrorCodes
import io.getlime.security.powerauth.exception.PowerAuthErrorException
import io.getlime.security.powerauth.networking.response.IGetEncryptorListener
import io.getlime.security.powerauth.sdk.PowerAuthSDK
import org.json.JSONObject
import java.nio.charset.StandardCharsets
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
            if (objectRegister.DEBUG) {
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

            val encryptorListener = object : IGetEncryptorListener {

                override fun onGetEncryptorSuccess(encryptor: CoreEncryptor) {
                    // Create container with all required objects and register it to the register.
                    val instanceData = InstanceData(encryptor, ownerId, activationScope)
                    val releasePolicy = listOf(ReleasePolicy.keepAlive(releaseTime))
                    val objectId = objectRegister.registerObject(instanceData, ownerId, releasePolicy)
                    // Resolve with native object identifier.
                    promise.resolve(objectId)
                }

                override fun onGetEncryptorFailed(t: Throwable) {
                    if (activationScope && !sdk.hasValidActivation()) {
                        @Suppress("ThrowableNotThrown")
                        Errors.rejectPromise(promise, PowerAuthErrorException(PowerAuthErrorCodes.MISSING_ACTIVATION))
                    }
                    Errors.rejectPromise(promise, t)
                }
            }

            // Get encryptor
            if (activationScope) {
                sdk.getEncryptorForActivationScope(encryptorListener)
            } else {
                sdk.getEncryptorForApplicationScope(encryptorListener)
            }

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
        val result: Boolean = instanceData.coreEncryptor?.canEncryptRequest() == true
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
            val coreEncryptor = instanceData.coreEncryptor
                ?: throw WrapperException(Errors.EC_INVALID_ENCRYPTOR, "Encryptor is no longer available")
            val encryptionResult = try {
                coreEncryptor.encryptRequest(data)
            } catch (t: Throwable) {
                objectRegister.removeObject(encryptorId, InstanceData::class.java)
                throw t
            }
            val requestBody: JSONObject
            val requestHeaders = encryptionResult.requestHeaders
            try {
                requestBody = JSONObject(String(encryptionResult.requestBody, StandardCharsets.UTF_8))
                if (requestHeaders.isEmpty()) {
                    throw WrapperException(Errors.EC_INVALID_ENCRYPTOR, "Encrypted request contains no HTTP header")
                }
            } catch (t: Throwable) {
                objectRegister.removeObject(encryptorId, InstanceData::class.java)
                throw t
            }
            // PowerAuth 2.0 encryptors are one-shot. Transfer the native object to the
            // decryptor and invalidate the original handle; BaseNativeObject recreates it
            // transparently when the reusable JavaScript encryptor is used again.
            val decryptor = InstanceData(
                instanceData.takeCoreEncryptor(),
                instanceData.powerAuthInstanceId,
                instanceData.isActivationScoped
            )
            objectRegister.removeObject(encryptorId, InstanceData::class.java)
            val releasePolicy = listOf(
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
            putOptionalString(cryptogram, requestBody, "temporaryKeyId")
            putOptionalString(cryptogram, requestBody, "ephemeralPublicKey")
            putOptionalString(cryptogram, requestBody, "encryptedData")
            putOptionalString(cryptogram, requestBody, "mac")
            putOptionalString(cryptogram, requestBody, "nonce")
            if (requestBody.has("timestamp") && !requestBody.isNull("timestamp")) {
                cryptogram.putDouble("timestamp", requestBody.getDouble("timestamp"))
            }
            val header: WritableMap = Arguments.createMap()
            header.putString("key", requestHeaders[0].key)
            header.putString("value", requestHeaders[0].value)
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
        val result: Boolean = instanceData.coreEncryptor?.canDecryptResponse() == true
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
            val responseBody = JSONObject()
            copyOptionalString(cryptogram, responseBody, "temporaryKeyId")
            copyOptionalString(cryptogram, responseBody, "ephemeralPublicKey")
            copyOptionalString(cryptogram, responseBody, "encryptedData")
            copyOptionalString(cryptogram, responseBody, "mac")
            copyOptionalString(cryptogram, responseBody, "nonce")
            if (cryptogram.hasKey("timestamp") && !cryptogram.isNull("timestamp")) {
                responseBody.put("timestamp", cryptogram.getDouble("timestamp").toLong())
            }
            val coreEncryptor = instanceData.coreEncryptor
                ?: throw WrapperException(Errors.EC_INVALID_ENCRYPTOR, "Decryptor is no longer available")
            val decryptedResponse = coreEncryptor.decryptResponse(
                CoreEncryptedResponse(responseBody.toString().toByteArray(StandardCharsets.UTF_8))
            )
            val result = dataFormat.encodeBytes(decryptedResponse)
            promise.resolve(result)
        })
    }

    // Private methods
    private fun putOptionalString(map: WritableMap, json: JSONObject, key: String) {
        if (json.has(key) && !json.isNull(key)) {
            map.putString(key, json.getString(key))
        }
    }

    private fun copyOptionalString(map: ReadableMap, json: JSONObject, key: String) {
        if (map.hasKey(key) && !map.isNull(key)) {
            json.put(key, map.getString(key))
        }
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
        coreEncryptor: CoreEncryptor,
        val powerAuthInstanceId: String,
        val isActivationScoped: Boolean
    ) : IManagedObject<Any> {
        var coreEncryptor: CoreEncryptor? = coreEncryptor
            private set

        fun takeCoreEncryptor(): CoreEncryptor {
            val result = coreEncryptor
                ?: throw WrapperException(Errors.EC_INVALID_ENCRYPTOR, "Encryptor is no longer available")
            coreEncryptor = null
            return result
        }

        override fun cleanup() {
            coreEncryptor?.destroy()
            coreEncryptor = null
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
