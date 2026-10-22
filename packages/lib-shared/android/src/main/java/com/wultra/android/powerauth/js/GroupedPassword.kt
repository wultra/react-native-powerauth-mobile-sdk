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

import io.getlime.security.powerauth.core.Password

/**
 * Mutable password where each character added from JavaScript is a group of one or more
 * Unicode code points.
 *
 * The class keeps two native passwords:
 * - `full` contains all code points of every group.
 * - `legacy` contains only the first code point of every group, which is how versions
 *   before the fix for issue #310 encoded multi-code-point characters. Activations created
 *   by such versions must keep using this encoding (see [PasswordEncoding]).
 *
 * The password length and positions are expressed in groups.
 */
class GroupedPassword {

    /**
     * Immutable copies of the password, owned by the caller.
     * @property full Copy with all code points.
     * @property legacy Copy with the legacy encoding, or `null` when it equals [full].
     */
    class Copies(val full: Password, val legacy: Password?) {
        /**
         * Return the copy in the required encoding and destroy the other one.
         * @param useLegacyEncoding Evaluated only when the encodings differ.
         */
        fun select(useLegacyEncoding: () -> Boolean): Password {
            val legacy = this.legacy ?: return full
            val useLegacy = try {
                useLegacyEncoding()
            } catch (t: Throwable) {
                full.destroy()
                legacy.destroy()
                throw t
            }
            return if (useLegacy) {
                full.destroy()
                legacy
            } else {
                legacy.destroy()
                full
            }
        }
    }

    private val full = Password()
    private val legacy = Password()
    private val groupSizes = ArrayList<Int>()
    private var destroyed = false

    @Synchronized
    fun length(): Int {
        ensureValid()
        return groupSizes.size
    }

    @Synchronized
    fun clear() {
        ensureValid()
        full.clear()
        legacy.clear()
        groupSizes.clear()
    }

    /**
     * Append one character composed of valid code points.
     * @return Number of characters in the password.
     */
    @Synchronized
    fun addCharacter(codePoints: IntArray): Int {
        return insertCharacter(codePoints, groupSizes.size)
    }

    /**
     * Insert one character composed of valid code points.
     * @return Number of characters in the password.
     */
    @Synchronized
    fun insertCharacter(codePoints: IntArray, position: Int): Int {
        ensureValid()
        // Valid code points guarantee that the native insertions below cannot fail.
        require(codePoints.isNotEmpty() && codePoints.all { it in 0..Constants.CODEPOINT_MAX })
        checkPosition(position, groupSizes.size)
        var offset = fullOffset(position)
        for (codePoint in codePoints) {
            full.insertCharacter(codePoint, offset++)
        }
        legacy.insertCharacter(codePoints[0], position)
        groupSizes.add(position, codePoints.size)
        return groupSizes.size
    }

    /**
     * Remove character at given position.
     * @return Number of characters in the password.
     */
    @Synchronized
    fun removeCharacter(position: Int): Int {
        ensureValid()
        checkPosition(position, groupSizes.size - 1)
        val offset = fullOffset(position)
        repeat(groupSizes[position]) {
            full.removeCharacter(offset)
        }
        legacy.removeCharacter(position)
        groupSizes.removeAt(position)
        return groupSizes.size
    }

    /**
     * Remove the last character, if any.
     * @return Number of characters in the password.
     */
    @Synchronized
    fun removeLastCharacter(): Int {
        ensureValid()
        return if (groupSizes.isEmpty()) 0 else removeCharacter(groupSizes.size - 1)
    }

    /**
     * Compare all code points of both passwords.
     */
    fun isEqualTo(other: GroupedPassword): Boolean {
        val otherFull = other.copyFull()
        try {
            synchronized(this) {
                ensureValid()
                return full.isEqualToPassword(otherFull)
            }
        } finally {
            otherFull.destroy()
        }
    }

    /**
     * Return an immutable copy with all code points, owned by the caller.
     */
    @Synchronized
    fun copyFull(): Password {
        ensureValid()
        return full.copyToImmutable()
    }

    /**
     * Return immutable copies in both encodings, owned by the caller.
     */
    @Synchronized
    fun copies(): Copies {
        ensureValid()
        val fullCopy = full.copyToImmutable()
        if (full.length() == legacy.length()) {
            return Copies(fullCopy, null)
        }
        return try {
            Copies(fullCopy, legacy.copyToImmutable())
        } catch (t: Throwable) {
            fullCopy.destroy()
            throw t
        }
    }

    @Synchronized
    fun destroy() {
        if (!destroyed) {
            destroyed = true
            groupSizes.clear()
            full.destroy()
            legacy.destroy()
        }
    }

    private fun ensureValid() {
        if (destroyed) {
            throw WrapperException(Errors.EC_INVALID_NATIVE_OBJECT, "Password object is no longer valid")
        }
    }

    private fun checkPosition(position: Int, maxPosition: Int) {
        if (position < 0 || position > maxPosition) {
            throw WrapperException(Errors.EC_WRONG_PARAMETER, "Position is out of range")
        }
    }

    private fun fullOffset(position: Int): Int {
        var offset = 0
        for (i in 0 until position) {
            offset += groupSizes[i]
        }
        return offset
    }
}
