/*
 * Copyright 2026 Wultra s.r.o.
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
import io.getlime.security.powerauth.keychain.Keychain
import io.getlime.security.powerauth.keychain.KeychainFactory
import io.getlime.security.powerauth.sdk.PowerAuthSDK

/**
 * Determines how [GroupedPassword] characters are encoded for an activation.
 *
 * Activations persisted by this version of the wrapper are marked with their activation
 * identifier and use all code points of each character. Activations without a matching
 * marker were created by an older version and keep the legacy encoding that used only the
 * first code point of each character. The marker is not secret and is stored in the
 * PowerAuth SDK's status keychain, so it shares the lifetime of the activation data.
 */
class PasswordEncoding(private val context: Context) {

    /**
     * Return `true` if the current activation requires the legacy password encoding.
     * @throws WrapperException If the stored marker cannot be read.
     */
    fun useLegacyEncoding(sdk: PowerAuthSDK): Boolean {
        if (!sdk.hasValidActivation()) {
            return false
        }
        val activationId = sdk.activationIdentifier ?: return true
        val key = markerKey(sdk)
        val marker = statusKeychain(sdk).getString(key)
        if (marker == null && isMarkerStored(sdk, key)) {
            // The keychain returns null also when the value cannot be decrypted.
            throw WrapperException(Errors.EC_UNKNOWN_ERROR, "Failed to determine password encoding")
        }
        return marker != activationId
    }

    /**
     * Mark the pending activation to use the full password encoding. Must be called before
     * the activation is persisted.
     * @throws WrapperException If the marker cannot be stored.
     */
    fun markPendingActivation(sdk: PowerAuthSDK) {
        if (!sdk.hasPendingActivation()) {
            // Let the SDK report the missing pending activation.
            return
        }
        val activationId = sdk.activationIdentifier
            ?: throw WrapperException(Errors.EC_UNKNOWN_ERROR, "Pending activation has no identifier")
        val keychain = statusKeychain(sdk)
        val key = markerKey(sdk)
        keychain.putString(activationId, key)
        if (keychain.getString(key) != activationId) {
            throw WrapperException(Errors.EC_UNKNOWN_ERROR, "Failed to store password encoding")
        }
    }

    /**
     * Remove the marker. Intended only for testing the legacy encoding in DEBUG builds.
     */
    fun removeMarker(sdk: PowerAuthSDK) {
        statusKeychain(sdk).remove(markerKey(sdk))
    }

    private fun statusKeychain(sdk: PowerAuthSDK): Keychain {
        val configuration = sdk.keychainConfiguration
        return KeychainFactory.getKeychain(
            context,
            configuration.keychainStatusId,
            configuration.minimalRequiredKeychainProtection
        )
    }

    private fun markerKey(sdk: PowerAuthSDK): String {
        return MARKER_KEY_PREFIX + sdk.configuration.instanceId
    }

    /**
     * Test whether the marker is physically present, regardless of whether it can be decrypted.
     * The PowerAuth keychain implementations store each key in shared preferences named
     * after the keychain identifier.
     */
    private fun isMarkerStored(sdk: PowerAuthSDK, key: String): Boolean {
        return context.getSharedPreferences(sdk.keychainConfiguration.keychainStatusId, Context.MODE_PRIVATE)
            .contains(key)
    }

    companion object {
        private const val MARKER_KEY_PREFIX = "com.wultra.powerauth.js.passwordEncoding."
    }
}
