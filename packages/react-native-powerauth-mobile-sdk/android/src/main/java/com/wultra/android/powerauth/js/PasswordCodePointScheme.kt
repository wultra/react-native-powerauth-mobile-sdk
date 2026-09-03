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
import android.content.SharedPreferences
import io.getlime.security.powerauth.sdk.PowerAuthSDK
import androidx.core.content.edit
import java.text.Normalizer

/**
 * Determines how many code points from an `addCharacter`/`insertCharacter` call actually get stored:
 *
 * - legacy (marker missing) - only the 1st. code point is stored, the rest dropped. Kept for every
 *   activation that existed before this scheme was introduced, so derived password bytes never change.
 * - corrected (marker present, or no valid activation yet) - every code point is stored, so multi-code-
 *   point graphemes (decomposed diacritics, ZWJ/flag/skin-tone emoji) are preserved in full.
 */
private const val PREFS_NAME = "com.wultra.powerauth.passwordCodePointScheme"
private const val KEY_PREFIX = "activation."

private fun prefs(context: Context): SharedPreferences =
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

private fun findSdk(instanceId: String?, objectRegister: ObjectRegisterJs): PowerAuthSDK? {
    if (instanceId == null || !objectRegister.isValidObjectId(instanceId)) {
        return null
    }
    return objectRegister.findObject(instanceId, PowerAuthSDK::class.java)
}

/**
 * Marks the activation currently associated with the given PowerAuth instance (if any) as using the
 * corrected scheme. Must be called right after a new activation is persisted.
 */
fun markActivationWithCorrectedPasswordScheme(context: Context, instanceId: String, objectRegister: ObjectRegisterJs) {
    val sdk = findSdk(instanceId, objectRegister) ?: return
    val activationId = sdk.activationIdentifier ?: return
    prefs(context).edit { putBoolean(KEY_PREFIX + activationId, true) }
}

/**
 * Clears the scheme marker for the given (already captured) activation identifier. No-op if null.
 */
fun clearPasswordCodePointScheme(context: Context, activationId: String?) {
    if (activationId == null) return
    prefs(context).edit { remove(KEY_PREFIX + activationId) }
}

/**
 * Returns true if password characters typed for the given PowerAuth instance should use the corrected
 * scheme, false for legacy.
 */
fun shouldUseCorrectedPasswordScheme(context: Context, instanceId: String?, objectRegister: ObjectRegisterJs): Boolean {
    val sdk = findSdk(instanceId, objectRegister) ?: return false
    if (!sdk.hasValidActivation()) {
        // No valid (persisted) activation yet - nothing can break, safe to use the corrected scheme.
        return true
    }
    val activationId = sdk.activationIdentifier ?: return false
    return prefs(context).getBoolean(KEY_PREFIX + activationId, false)
}

/**
 * Returns the NFC-normalized form of the given raw Unicode code points (e.g. composing a base letter +
 * combining mark into one code point where possible; sequences with no NFC rule, like ZWJ emoji, are
 * unchanged). Only used for the corrected scheme - legacy always stores the raw 1st. code point as-is.
 */
fun nfcNormalizeCodePoints(codePoints: List<Int>): List<Int> {
    val string = String(codePoints.toIntArray(), 0, codePoints.size)
    val normalized = Normalizer.normalize(string, Normalizer.Form.NFC)
    // Manual code point iteration (not `.codePoints()`, which needs API 24+) to stay compatible with
    // this library's minSdkVersion 21.
    val result = ArrayList<Int>(normalized.length)
    var i = 0
    while (i < normalized.length) {
        val codePoint = normalized.codePointAt(i)
        result.add(codePoint)
        i += Character.charCount(codePoint)
    }
    return result
}
