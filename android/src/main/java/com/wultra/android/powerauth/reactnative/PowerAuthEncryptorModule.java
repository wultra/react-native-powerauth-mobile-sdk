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

package com.wultra.android.powerauth.reactnative;

import android.util.Base64;
import android.util.Pair;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.BaseJavaModule;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.module.annotations.ReactModule;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import io.getlime.security.powerauth.core.EciesCryptogram;
import io.getlime.security.powerauth.core.EciesEncryptor;
import io.getlime.security.powerauth.ecies.EciesMetadata;
import io.getlime.security.powerauth.exception.PowerAuthErrorCodes;
import io.getlime.security.powerauth.exception.PowerAuthErrorException;
import io.getlime.security.powerauth.sdk.PowerAuthSDK;

@SuppressWarnings("unused")
@ReactModule(name = "PowerAuthEncryptor")
public class PowerAuthEncryptorModule extends BaseJavaModule {

    private final ReactApplicationContext context;
    private final ObjectRegister objectRegister;

    public PowerAuthEncryptorModule(@NonNull ReactApplicationContext context, @NonNull ObjectRegister objectRegister) {
        super();
        this.context = context;
        this.objectRegister = objectRegister;
    }

    @NonNull
    @Override
    public String getName() {
        return "PowerAuthEncryptor";
    }

    // JavaScript methods

    @ReactMethod
    void initialize(@NonNull String scope, @NonNull String ownerId, int autoreleaseTime, Promise promise) {
        try {
            // Process inputs
            final boolean activationScope;
            if ("APPLICATION".equals(scope)) {
                activationScope = false;
            } else if ("ACTIVATION".equals(scope)) {
                activationScope = true;
            } else {
                throw new WrapperException(Errors.EC_WRONG_PARAMETER, "scope parameter is missing or contains invalid value");
            }
            int releaseTime = Constants.ENCRYPTOR_KEY_KEEP_ALIVE_TIME;
            if (BuildConfig.DEBUG) {
                if (autoreleaseTime != 0) {
                    releaseTime = Math.min(autoreleaseTime, Constants.ENCRYPTOR_KEY_KEEP_ALIVE_TIME);
                }
            }
            // Resolve PowerAuthSDK
            final PowerAuthSDK sdk = resolveSdk(ownerId, promise);
            if (sdk == null) {
                return;
            }
            // Create ECIES encryptor
            final EciesEncryptor coreEncryptor = activationScope
                    ? sdk.getEciesEncryptorForActivationScope(context)
                    : sdk.getEciesEncryptorForApplicationScope();
            if (coreEncryptor == null) {
                if (activationScope && !sdk.hasValidActivation()) {
                    throw new PowerAuthErrorException(PowerAuthErrorCodes.MISSING_ACTIVATION);
                }
                throw new WrapperException(Errors.EC_UNKNOWN_ERROR, "Failed to create ECIES encryptor");
            }
            // Create container with all required objects and register it to the register.
            final InstanceData instanceData = new InstanceData(coreEncryptor, ownerId, activationScope);
            final List<ReleasePolicy> releasePolicy = Collections.singletonList(ReleasePolicy.keepAlive(releaseTime));
            final String objectId = objectRegister.registerObject(instanceData, ownerId, releasePolicy);
            // Resolve with native object identifier.
            promise.resolve(objectId);
        } catch (Throwable t) {
            Errors.rejectPromise(promise, t);
        }
    }

    @ReactMethod
    void release(@NonNull String encryptorId) {
        objectRegister.removeObject(encryptorId, InstanceData.class);
    }

    // Encryption

    /**
     * Determine whether encryptor is able to encrypt the request data. The function also validate state of PowerAuthSDK if
     * encryptor is configured for an activation scope.
     * @param instanceData Instance data.
     * @param promise Promise to reject in case of failure.
     * @return true if encryptor can be used for an encryption.
     */
    private boolean canEncrypt(@NonNull InstanceData instanceData, @Nullable Promise promise) {
        final PowerAuthSDK sdk = resolveSdk(instanceData.powerAuthInstanceId, promise);
        if (sdk == null) {
            return false;
        }
        if (instanceData.isActivationScoped) {
            if (!sdk.hasValidActivation()) {
                if (promise != null) {
                    promise.reject(Errors.EC_MISSING_ACTIVATION, "PowerAuth instance with no activation");
                }
                return false;
            }
        }
        final boolean result = instanceData.coreEncryptor.canEncryptRequest();
        if (!result && promise != null) {
            promise.reject(Errors.EC_INVALID_ENCRYPTOR, "Encryptor is not constructed for request encryption");
        }
        return result;
    }

    @ReactMethod
    void canEncryptRequest(@NonNull String encryptorId, Promise promise) {
        touchEncryptor(encryptorId, promise, instanceData -> {
            promise.resolve(canEncrypt(instanceData, null));
        });
    }

    @ReactMethod
    void encryptRequest(@NonNull String encryptorId, @Nullable String body, @Nullable String bodyFormat, Promise promise) {
        useEncryptor(encryptorId, promise, instanceData -> {
            // Input validation
            final DataFormat format = DataFormat.fromString(bodyFormat);
            final byte[] data = format.decodeBytes(body);
            // Test whether this is encryptor
            if (!canEncrypt(instanceData, promise)) {
                return;
            }
            // Encrypt
            final Pair<EciesEncryptor, EciesCryptogram> encryptionResult = instanceData.coreEncryptor.encryptRequestSynchronized(data);
            if (encryptionResult == null) {
                throw new WrapperException(Errors.EC_ENCRYPTION_ERROR, "Failed to encrypt request");
            }
            final EciesMetadata metadata = encryptionResult.first.getMetadata();
            if (metadata == null) {
                throw new WrapperException(Errors.EC_INVALID_ENCRYPTOR, "Incompatible native SDK");
            }
            //  Wrap decryptor and register it in the object register
            final InstanceData decryptor = new InstanceData(encryptionResult.first, instanceData.powerAuthInstanceId, instanceData.isActivationScoped);
            final List<ReleasePolicy> releasePolicy = Arrays.asList(ReleasePolicy.afterUse(1), ReleasePolicy.keepAlive(Constants.DECRYPTOR_KEY_KEEP_ALIVE_TIME));
            final String decryptorId = objectRegister.registerObject(decryptor, instanceData.powerAuthInstanceId, releasePolicy);
            // Resolve
            final WritableMap cryptogram = Arguments.createMap();
            cryptogram.putString("ephemeralPublicKey", encryptionResult.second.getKeyBase64());
            cryptogram.putString("encryptedData", encryptionResult.second.getBodyBase64());
            cryptogram.putString("mac", encryptionResult.second.getMacBase64());
            cryptogram.putString("nonce", encryptionResult.second.getNonceBase64());
            final WritableMap header = Arguments.createMap();
            header.putString("key", metadata.getHttpHeaderKey());
            header.putString("value", metadata.getHttpHeaderValue());
            final WritableMap result = Arguments.createMap();
            result.putMap("cryptogram", cryptogram);
            result.putMap("header", header);
            result.putString("decryptorId", decryptorId);
            promise.resolve(result);
        });
    }

    // Decryption

    /**
     * Determine whether encryptor is able to decrypt the response cryptogram. The function also validate
     * state of PowerAuthSDK if encryptor is configured for an activation scope.
     * @param instanceData Instance data.
     * @param promise Optional promise to reject in case of failure.
     * @return true if this is decryptor.
     */
    private boolean canDecrypt(@NonNull InstanceData instanceData, @Nullable Promise promise) {
        final PowerAuthSDK sdk = resolveSdk(instanceData.powerAuthInstanceId, promise);
        if (sdk == null) {
            return false;
        }
        if (instanceData.isActivationScoped) {
            if (!sdk.hasValidActivation()) {
                if (promise != null) {
                    promise.reject(Errors.EC_MISSING_ACTIVATION, "PowerAuth instance with no activation");
                }
                return false;
            }
        }
        final boolean result = instanceData.coreEncryptor.canDecryptResponse();
        if (!result && promise != null) {
            promise.reject(Errors.EC_INVALID_ENCRYPTOR, "Encryptor is not constructed for response decryption");
        }
        return result;
    }

    @ReactMethod
    void canDecryptResponse(String encryptorId, Promise promise) {
        touchEncryptor(encryptorId, promise, instanceData -> {
            promise.resolve(canDecrypt(instanceData, null));
        });
    }

    @ReactMethod
    void decryptResponse(String encryptorId, ReadableMap cryptogram, String outputFormat, Promise promise) {
        useEncryptor(encryptorId, promise, instanceData -> {
            // Input validation
            final DataFormat dataFormat = DataFormat.fromString(outputFormat);
            // Test whether this is decryptor
            if (!canDecrypt(instanceData, promise)) {
                return;
            }
            // Decrypt
            final EciesCryptogram coreCryptogram = new EciesCryptogram(
                    cryptogram.hasKey("encryptedData") ? cryptogram.getString("encryptedData") : null,
                    cryptogram.hasKey("mac") ? cryptogram.getString("mac") : null);
            final byte[] decryptedResponse = instanceData.coreEncryptor.decryptResponse(coreCryptogram);
            if (decryptedResponse == null) {
                throw new WrapperException(Errors.EC_ENCRYPTION_ERROR, "Failed to decrypt response");
            }
            final String result = dataFormat.encodeBytes(decryptedResponse);
            promise.resolve(result);
        });
    }

    // Private methods

    byte[] getBase64EncodedBytes(ReadableMap map, String key) {
        String value = map.hasKey(key) ? map.getString(key) : null;
        if (value != null) {
            return Base64.decode(value, Base64.NO_WRAP);
        }
        return null;
    }

    /**
     * Resolve PowerAuthSDK instance from given identifier.
     * @param powerAuthInstanceId PowerAuth instance identifier.
     * @param promise Optional promise to reject if resolve failed.
     * @return Resolved instance or null.
     */
    @Nullable
    private PowerAuthSDK resolveSdk(String powerAuthInstanceId, @Nullable Promise promise) {
        if (objectRegister.isValidObjectId(powerAuthInstanceId)) {
            PowerAuthSDK instance = objectRegister.findObject(powerAuthInstanceId, PowerAuthSDK.class);
            if (instance != null) {
                return instance;
            }
            if (promise != null) {
                promise.reject(Errors.EC_INSTANCE_NOT_CONFIGURED, "PowerAuth instance is not configured");
            }
        }
        if (promise != null) {
            promise.reject(Errors.EC_WRONG_PARAMETER, "PowerAuth instance identifier is missing or empty string");
        }
        return null;
    }

    /**
     * Action to execute when password object is found in object register.
     */
    interface Action {
        void action(@NonNull InstanceData instanceData) throws Throwable;
    }

    /**
     * Object containing all encryptor's data required for the request encryption.
     */
    static class InstanceData implements IManagedObject {
        final @NonNull EciesEncryptor coreEncryptor;
        final @NonNull String powerAuthInstanceId;
        final boolean isActivationScoped;
        InstanceData(@NonNull EciesEncryptor coreEncryptor, @NonNull String powerAuthInstanceId, boolean isActivationScoped) {
            this.coreEncryptor = coreEncryptor;
            this.powerAuthInstanceId = powerAuthInstanceId;
            this.isActivationScoped = isActivationScoped;
        }

        @Override
        public void cleanup() {
            coreEncryptor.destroy();
        }

        @NonNull
        @Override
        public Object managedInstance() {
            return this;
        }
    }

    /**
     * Execute action when encryptor is found in object register.
     * @param objectId Encryptor object identifier.
     * @param promise Promise to reject or resolve.
     * @param action Action to execute.
     */
    void useEncryptor(String objectId, final Promise promise, final @NonNull Action action) {
        withEncryptor(objectId, false, promise, action);
    }

    /**
     * Execute action when encryptor is found in object register. Unlike {@link #useEncryptor(String, Promise, Action)} this
     * method only touch object in the register.
     * @param objectId Encryptor object identifier.
     * @param promise Promise to reject or resolve.
     * @param action Action to execute.
     */
    void touchEncryptor(String objectId, final Promise promise, final @NonNull Action action) {
        withEncryptor(objectId, true, promise, action);
    }

    /**
     * Touch or use native encryptor object with given identifier and execute the action.
     * @param objectId Encryptor object identifier.
     * @param touch Touch or Use the native object.
     * @param promise Promise to reject or resolve.
     * @param action Action to execute.
     */
    private void withEncryptor(String objectId, boolean touch, final Promise promise, final @NonNull Action action) {
        final InstanceData encryptor = touch
                ? objectRegister.touchObject(objectId, InstanceData.class)
                : objectRegister.useObject(objectId, InstanceData.class);
        if (encryptor != null) {
            try {
                action.action(encryptor);
            } catch (Throwable t) {
                Errors.rejectPromise(promise, t);
            }
        } else {
            promise.reject(Errors.EC_INVALID_NATIVE_OBJECT, "Encryptor object is no longer valid");
        }
    }
}
