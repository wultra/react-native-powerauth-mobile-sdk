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
import com.wultra.android.powerauth.bridge.Arguments
import com.wultra.android.powerauth.bridge.JsApiMethod
import com.wultra.android.powerauth.bridge.Promise
import io.getlime.security.powerauth.core.CoreEncryptedResponse
import io.getlime.security.powerauth.core.CoreEncryptor
import io.getlime.security.powerauth.networking.response.IGetEncryptorListener
import io.getlime.security.powerauth.sdk.PowerAuthSDK

@Suppress("unused", "UNUSED_PARAMETER")
class PowerAuthEncryptorJsModule(
    context: Context,
    private val objectRegister: ObjectRegisterJs
) : BaseJavaJsModule {

    override fun getName(): String = "PowerAuthEncryptor"

    @JsApiMethod
    fun initialize(scope: String, ownerId: String, promise: Promise) {
        try {
            val activationScope = when (scope) {
                "APPLICATION" -> false
                "ACTIVATION" -> true
                else -> throw WrapperException(
                    Errors.EC_WRONG_PARAMETER,
                    "scope parameter is missing or contains invalid value"
                )
            }
            val sdk = resolveSdk(ownerId, promise) ?: return
            val listener = object : IGetEncryptorListener {
                override fun onGetEncryptorSuccess(encryptor: CoreEncryptor) {
                    val objectId = try {
                        objectRegister.registerObjectIfOwnerMatches(
                            ownerId,
                            sdk,
                            ManagedAny.wrap(encryptor, cleanup { it.destroy() }),
                            listOf(ReleasePolicy.keepAlive(Constants.ENCRYPTOR_KEY_KEEP_ALIVE_TIME))
                        )
                    } catch (t: Throwable) {
                        encryptor.destroy()
                        Errors.rejectPromise(promise, t)
                        return
                    }
                    if (objectId == null) {
                        encryptor.destroy()
                        promise.reject(
                            Errors.EC_INSTANCE_NOT_CONFIGURED,
                            "PowerAuth instance is no longer configured"
                        )
                        return
                    }
                    promise.resolve(objectId)
                }

                override fun onGetEncryptorFailed(t: Throwable) {
                    Errors.rejectPromise(promise, t)
                }
            }

            if (activationScope) {
                sdk.getEncryptorForActivationScope(listener)
            } else {
                sdk.getEncryptorForApplicationScope(listener)
            }
        } catch (t: Throwable) {
            Errors.rejectPromise(promise, t)
        }
    }

    @JsApiMethod
    fun canEncryptRequest(encryptorId: String, promise: Promise) {
        withEncryptor(encryptorId, promise) { it.canEncryptRequest() }
    }

    @JsApiMethod
    fun canDecryptResponse(encryptorId: String, promise: Promise) {
        withEncryptor(encryptorId, promise) { it.canDecryptResponse() }
    }

    @JsApiMethod
    fun encryptRequest(encryptorId: String, requestBodyBase64: String?, promise: Promise) {
        val clearBody = try {
            requestBodyBase64?.let { DataFormat.BASE64.decodeBytes(it) }
        } catch (t: Throwable) {
            Errors.rejectPromise(promise, t)
            return
        }
        withEncryptor(encryptorId, promise) { encryptor ->
            val encryptedRequest = encryptor.encryptRequest(clearBody)
            Arguments.makeNativeMap(
                mapOf(
                    "requestBody" to DataFormat.BASE64.encodeBytes(encryptedRequest.requestBody),
                    "requestHeaders" to encryptedRequest.requestHeaders.map { header ->
                        mapOf("name" to header.key, "value" to header.value)
                    }
                )
            )
        }
    }

    @JsApiMethod
    fun decryptResponse(encryptorId: String, responseBodyBase64: String, promise: Promise) {
        val bodyData = try {
            DataFormat.BASE64.decodeBytes(responseBodyBase64) ?: ByteArray(0)
        } catch (t: Throwable) {
            Errors.rejectPromise(promise, t)
            return
        }
        withEncryptor(encryptorId, promise, destroyAfter = true) { encryptor ->
            DataFormat.BASE64.encodeBytes(
                encryptor.decryptResponse(CoreEncryptedResponse(bodyData))
            )
        }
    }

    private fun <T : Any> withEncryptor(
        encryptorId: String,
        promise: Promise,
        destroyAfter: Boolean = false,
        action: (CoreEncryptor) -> T
    ) {
        try {
            val result = objectRegister.useObjectAndTransform(
                encryptorId,
                CoreEncryptor::class.java,
                action
            ) ?: throw invalidEncryptor(encryptorId)
            promise.resolve(result)
        } catch (t: Throwable) {
            Errors.rejectPromise(promise, t)
        } finally {
            if (destroyAfter) {
                // A native encryptor can decrypt only the matching response. Consume the handle
                // after the attempt regardless of whether native decryption succeeds.
                objectRegister.removeObject(encryptorId, CoreEncryptor::class.java)
            }
        }
    }

    private fun invalidEncryptor(encryptorId: String) = WrapperException(
        Errors.EC_INVALID_NATIVE_OBJECT,
        "Encryptor object '$encryptorId' is no longer valid"
    )

    private fun resolveSdk(powerAuthInstanceId: String, promise: Promise): PowerAuthSDK? {
        if (!objectRegister.isValidObjectId(powerAuthInstanceId)) {
            promise.reject(
                Errors.EC_WRONG_PARAMETER,
                "PowerAuth instance identifier is missing or empty string"
            )
            return null
        }
        return objectRegister.findObject(powerAuthInstanceId, PowerAuthSDK::class.java)
            ?: run {
                promise.reject(
                    Errors.EC_INSTANCE_NOT_CONFIGURED,
                    "PowerAuth instance is not configured"
                )
                null
            }
    }
}
