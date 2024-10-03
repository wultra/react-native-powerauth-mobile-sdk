/*
 * Copyright 2022 Wultra s.r.o.
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

import java.util.Arrays

/**
 * The `ManagedAny` class allows to store any object into ObjectRegister and allows
 * to specify optional cleanup procedure when the object is being removed from the register..
 *
 * @param <T> Type of object stored in this managed object.
</T> */
internal class ManagedAny<T>
/**
 * Construct object with instance of object exposed to JavaScript and with optional cleanup
 * procedure.
 * @param instance Instance exposed to JavaScript.
 * @param cleanup Optional cleanup procedure.
 */(
    /**
     * Instance of object exposed to JavaScript.
     */
    val instance: T,
    /**
     * Optional cleanup procedure.
     */
    private val cleanup: Cleanup<T>?
) : IManagedObject<T> {
    /**
     * The cleanup interface.
     */
    internal interface Cleanup<T> {
        /**
         * Called when object is being removed from the register.
         * @param instance Instance of actual object stored in the register.
         */
        fun cleanup(instance: T)
    }

    override fun cleanup() {
        cleanup?.cleanup(instance)
    }

    override fun managedInstance(): T {
        return instance
    }

    companion object {
        /**
         * Wrap any object into typed ManagedAny instance.
         * @param instance Object to expose to JavaScript.
         * @param <T> Type of object exposed to JavaScript.
         * @return New instance of ManagedAny class capturing the object exposed to JavaScript.
        </T> */
        fun <T> wrap(instance: T): ManagedAny<T> {
            return ManagedAny(instance, null)
        }

        /**
         * Wrap any object into typed ManagedAny instance.
         * @param instance Object to expose to JavaScript.
         * @param cleanup Cleanup routine called when object is removed from the register.
         * @param <T> of object exposed to JavaScript.
         * @return New instance of ManagedAny class capturing the object exposed to JavaScript.
        </T> */
        fun <T> wrap(instance: T, cleanup: Cleanup<T>?): ManagedAny<T> {
            return ManagedAny(instance, cleanup)
        }

        /**
         * Wrap array of bytes into ManagedAny instance.
         * @param bytes Bytes to expose to JavaScript.
         * @return  New instance of ManagedAny class capturing the bytes exposed to JavaScript.
         */
        fun wrap(bytes: ByteArray): ManagedAny<ByteArray> {
            return ManagedAny(
                bytes,
                object: Cleanup<ByteArray> {
                    override fun cleanup(instance: ByteArray) {
                        Arrays.fill(instance, 0.toByte())
                    }    
                }
            )
        }
    }
}

internal fun <T> cleanup(fce: (T) -> Unit): ManagedAny.Cleanup<T> {
    return object: ManagedAny.Cleanup<T> {
        override fun cleanup(instance: T) {
            fce(instance)
        }
    }
}
