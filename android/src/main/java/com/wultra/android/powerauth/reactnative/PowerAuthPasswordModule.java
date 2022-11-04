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

import com.facebook.react.bridge.BaseJavaModule;
import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.module.annotations.ReactModule;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import javax.annotation.Nonnull;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import io.getlime.security.powerauth.core.Password;

@SuppressWarnings("unused")
@ReactModule(name = "PowerAuthPassword")
public class PowerAuthPasswordModule extends BaseJavaModule {

    private final ObjectRegister objectRegister;

    public PowerAuthPasswordModule(@NonNull ObjectRegister objectRegister) {
        super();
        this.objectRegister = objectRegister;
    }

    @NonNull
    @Override
    public String getName() {
        return "PowerAuthPassword";
    }

    // JavaScript methods

    @ReactMethod
    public void initialize(boolean destroyOnUse, @Nullable String ownerId, int autoreleaseTime, Promise promise) {
        if (ownerId != null && !objectRegister.containsObject(ownerId)) {
            promise.reject(Errors.EC_INSTANCE_NOT_CONFIGURED, "PowerAuth instance is not configured");
            return;
        }
        int releaseTime = Constants.PASSWORD_KEY_KEEP_ALIVE_TIME;
        if (BuildConfig.DEBUG) {
            if (autoreleaseTime != 0) {
                releaseTime = Math.min(autoreleaseTime, Constants.PASSWORD_KEY_KEEP_ALIVE_TIME);
            }
        }
        final ManagedAny<Password> instance = ManagedAny.wrap(new Password(), Password::destroy);
        final List<ReleasePolicy> releasePolicies = destroyOnUse
                ? Arrays.asList(ReleasePolicy.afterUse(1), ReleasePolicy.keepAlive(releaseTime))
                : Collections.singletonList(ReleasePolicy.keepAlive(releaseTime));
        promise.resolve(objectRegister.registerObject(instance, ownerId, releasePolicies));
    }

    @ReactMethod
    public void release(String objectId, Promise promise) {
        objectRegister.removeObject(objectId, Password.class);
        promise.resolve(null);
    }

    @ReactMethod
    public void clear(String objectId, Promise promise) {
        withPassword(objectId, promise, password -> {
            password.clear();
            promise.resolve(null);
        });
    }

    @ReactMethod
    public void length(String objectId, Promise promise) {
        withPassword(objectId, promise, password -> {
            promise.resolve(password.length());
        });
    }

    @ReactMethod
    public void isEqual(String id1, String id2, Promise promise) {
        withPassword(id1, promise, p1 -> {
            withPassword(id2, promise, p2 -> {
                promise.resolve(p1.isEqualToPassword(p2));
            });
        });
    }

    @ReactMethod
    public void addCharacter(String objectId, int character, Promise promise) {
        withPassword(objectId, character, promise, (password, codePoint) -> {
            password.addCharacter(codePoint);
            promise.resolve(password.length());
        });
    }

    @ReactMethod
    public void insertCharacter(String objectId, int character, int position, Promise promise) {
        withPassword(objectId, character, promise, (password, codePoint) -> {
            if (position >= 0 && position <= password.length()) {
                password.insertCharacter(codePoint, position);
                promise.resolve(password.length());
            } else {
                promise.reject(Errors.EC_WRONG_PARAMETER, "Position is out of range");
            }
        });
    }

    @ReactMethod
    public void removeCharacter(String objectId, int position, Promise promise) {
        withPassword(objectId, promise, password -> {
            if (position >= 0 && position < password.length()) {
                password.removeCharacter(position);
                promise.resolve(password.length());
            } else {
                promise.reject(Errors.EC_WRONG_PARAMETER, "Position is out of range");
            }
        });
    }

    @ReactMethod
    public void removeLastCharacter(String objectId, Promise promise) {
        withPassword(objectId, promise, password -> {
            password.removeLastCharacter();
            promise.resolve(password.length());
        });
    }

    // Native methods

    /**
     * Function translate dynamic object type into core Password object. The password object is
     * marked as used or touched depending on required action.
     * @param anyPassword Dynamic object representing a password.
     * @param use If true then password is marked as used, otherwise just is touched.
     * @return Resolved core password.
     * @throws WrapperException In case that Password cannot be created.
     */
    @Nonnull
    private Password findPassword(Dynamic anyPassword, boolean use) throws WrapperException {
        if (anyPassword != null) {
            if (anyPassword.getType() == ReadableType.String) {
                // Direct string was provided
                return new Password(anyPassword.asString());
            }
            if (anyPassword.getType() == ReadableType.Map) {
                // Object is provided
                final ReadableMap map = anyPassword.asMap();
                final String passwordObjectId = map.getString("passwordObjectId");
                if (passwordObjectId == null) {
                    throw new WrapperException(Errors.EC_INVALID_NATIVE_OBJECT, "PowerAuthPassword is not initialized");
                }
                Password password = use
                        ? objectRegister.useObject(passwordObjectId, Password.class)
                        : objectRegister.touchObject(passwordObjectId, Password.class);
                if (password == null) {
                    throw new WrapperException(Errors.EC_INVALID_NATIVE_OBJECT, "PowerAuthPassword object is no longer valid");
                }
                return password;
            }
        }
        throw new WrapperException(Errors.EC_WRONG_PARAMETER, "PowerAuthPassword or string is required");
    }

    /**
     * Function translate dynamic object type into core Password object. The password object is
     * marked as used in the object register if exists.
     * @param anyPassword Dynamic object representing a password.
     * @return Resolved core password.
     * @throws WrapperException In case that Password cannot be created.
     */
    @Nonnull
    Password usePassword(Dynamic anyPassword) throws WrapperException {
        return findPassword(anyPassword, true);
    }

    /**
     * Function translate dynamic object type into core Password object. The password object is
     * marked as touched in the object register if exists.
     * @param anyPassword Dynamic object representing a password.
     * @return Resolved core password.
     * @throws WrapperException In case that Password cannot be created.
     */
    @Nonnull
    Password touchPassword(Dynamic anyPassword) throws WrapperException {
        return findPassword(anyPassword, false);
    }
    // Private methods

    /**
     * Action to execute when password object is found in object register.
     */
    private interface Action {
        void action(@NonNull Password password);
    }

    /**
     * Execute action when Password is found in object register.
     * @param objectId Password object identifier.
     * @param promise Promise to reject or resolve.
     * @param action Action to execute.
     */
    private void withPassword(String objectId, final Promise promise, final @NonNull Action action) {
        final Password password = objectRegister.touchObject(objectId, Password.class);
        if (password != null) {
            action.action(password);
        } else {
            promise.reject(Errors.EC_INVALID_NATIVE_OBJECT, "Password object is no longer valid");
        }
    }

    /**
     * Action to execute with valid code point, when password object is found in object register.
     */
    private interface CharacterAction {
        void action(@NonNull Password password, int codePoint);
    }

    /**
     * Execute action when Password is found in object register.
     * @param objectId Password object identifier.
     * @param character Character that represents an unicode code point.
     * @param promise Promise to reject or resolve.
     * @param action Action to execute.
     */
    private void withPassword(String objectId, int character, final Promise promise, final @NonNull CharacterAction action) {
        if (character < 0 || character > Constants.CODEPOINT_MAX) {
            promise.reject(Errors.EC_WRONG_PARAMETER, "Invalid CodePoint");
            return;
        }
        final Password password = objectRegister.touchObject(objectId, Password.class);
        if (password != null) {
            action.action(password, character);
        } else {
            promise.reject(Errors.EC_INVALID_NATIVE_OBJECT, "Password object is no longer valid");
        }
    }
}
