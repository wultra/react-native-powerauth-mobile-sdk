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

package com.wultra.android.powerauth.reactnative;

import java.util.Arrays;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

/**
 * The {@code ManagedAny} class allows to store any object into ObjectRegister and allows
 * to specify optional cleanup procedure when the object is being removed from the register..
 *
 * @param <T> Type of object stored in this managed object.
 */
class ManagedAny<T> implements IManagedObject {

    /**
     * The cleanup interface.
     */
    interface Cleanup<T> {
        /**
         * Called when object is being removed from the register.
         * @param instance Instance of actual object stored in the register.
         */
        void cleanup(@NonNull T instance);
    }

    /**
     * Instance of object exposed to JavaScript.
     */
    final @NonNull T instance;
    /**
     * Optional cleanup procedure.
     */
    private final @Nullable Cleanup<T> cleanup;

    /**
     * Construct object with instance of object exposed to JavaScript and with optional cleanup
     * procedure.
     * @param instance Instance exposed to JavaScript.
     * @param cleanup Optional cleanup procedure.
     */
    ManagedAny(@NonNull T instance, @Nullable Cleanup<T> cleanup) {
        this.instance = instance;
        this.cleanup = cleanup;
    }

    @Override
    public void cleanup() {
        if (cleanup != null) {
            cleanup.cleanup(instance);
        }
    }

    @NonNull
    @Override
    public Object managedInstance() {
        return instance;
    }

    /**
     * Wrap any object into typed ManagedAny instance.
     * @param instance Object to expose to JavaScript.
     * @param <T> Type of object exposed to JavaScript.
     * @return New instance of ManagedAny class capturing the object exposed to JavaScript.
     */
    @NonNull
    static <T> ManagedAny<T> wrap(@NonNull T instance) {
        return new ManagedAny<>(instance, null);
    }

    /**
     * Wrap any object into typed ManagedAny instance.
     * @param instance Object to expose to JavaScript.
     * @param cleanup Cleanup routine called when object is removed from the register.
     * @param <T> of object exposed to JavaScript.
     * @return New instance of ManagedAny class capturing the object exposed to JavaScript.
     */
    @NonNull
    static <T> ManagedAny<T> wrap(@NonNull T instance, @Nullable Cleanup<T> cleanup) {
        return new ManagedAny<>(instance, cleanup);
    }

    /**
     * Wrap array of bytes into ManagedAny instance.
     * @param bytes Bytes to expose to JavaScript.
     * @return  New instance of ManagedAny class capturing the bytes exposed to JavaScript.
     */
    @NonNull
    static ManagedAny<byte[]> wrap(@NonNull byte[] bytes) {
        return new ManagedAny<>(bytes, instance -> Arrays.fill(instance, (byte) 0));
    }
}
