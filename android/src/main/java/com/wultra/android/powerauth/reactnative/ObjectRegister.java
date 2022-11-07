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

import android.os.SystemClock;
import android.text.TextUtils;
import android.util.Base64;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.BaseJavaModule;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.module.annotations.ReactModule;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Timer;
import java.util.TimerTask;
import java.util.concurrent.locks.ReentrantLock;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import io.getlime.security.powerauth.core.Password;
import io.getlime.security.powerauth.exception.PowerAuthErrorException;

/**
 * Object register that allows us to expose native objects into JavaScript world.
 * The object is identified by an unique identifier created at the time of registration
 * or by application provided identifier.
 */
@SuppressWarnings("unused")
@ReactModule(name = "PowerAuthObjectRegister")
public class ObjectRegister extends BaseJavaModule {

    private final ReentrantLock lock;
    private final HashMap<String, RegisterEntry> register;
    private final Random randomGenerator;
    private int cleanupPeriod;
    private Timer cleanupTimer;

    public ObjectRegister() {
        this.lock = new ReentrantLock(false);
        this.register = new HashMap<>(16);
        this.randomGenerator = new Random();
        this.cleanupPeriod = Constants.CLEANUP_PERIOD_DEFAULT;
        this.cleanupTimer = null;
    }

    // ---------------------------------------------------------------------------------------------
    // RN integration

    @NonNull
    @Override
    public String getName() {
        return "PowerAuthObjectRegister";
    }

    @Override
    public void invalidate() {
        super.invalidate();
        synchronize(() -> {
            // Release all objects when invalidating this module.
            removeAllObjectsWithTag(null);
            // Schedule cleanup, this basically cancel the timer, because the register is empty.
            scheduleCleanup();
        });
    }

    // ---------------------------------------------------------------------------------------------
    // Native interface

    /**
     * Factory that create object on demand.
     */
    interface ObjectFactory {
        /**
         * Create object instance on demand.
         * @return Instance of object.
         * @throws Throwable In case of failure.
         */
        @NonNull
        IManagedObject createObject() throws Throwable;
    }

    /**
     * Register object and return its unique identifier.
     * @param object Object to register.
     * @param tag Optional object's tag.
     * @param releasePolicies List with release policies.
     * @return Identifier that identify registered object in the register.
     */
    @NonNull
    String registerObject(@NonNull IManagedObject object, @Nullable String tag, @NonNull List<ReleasePolicy> releasePolicies) {
        return synchronize(() -> {
            final String identifier = generateIdentifier();
            register.put(identifier, new RegisterEntry(object, identifier, tag, releasePolicies));
            scheduleCleanup();
            return identifier;
        });
    }

    /**
     * Register object with application provided identifier.
     * @param object Object to register.
     * @param identifier Application provided identifier.
     * @param tag Optional object's tag.
     * @param releasePolicies List with release policies.
     * @return false if identifier is invalid or object with such identifier is already in the register, otherwise true.
     */
    boolean registerObjectWithId(@NonNull IManagedObject object, @NonNull String identifier, @Nullable String tag, @NonNull List<ReleasePolicy> releasePolicies) {
        try {
            return registerObjectWithId(identifier, tag, releasePolicies, () -> object);
        } catch (Throwable t) {
            return false;
        }
    }

    /**
     * Register object provided by the object factory with an application provided identifier.
     * @param identifier Application provided identifier.
     * @param tag Optional object's tag.
     * @param releasePolicies List with release policies.
     * @param factory Factory that instantiate object in case that can be registered.
     * @return false if identifier is invalid or object with such identifier is already in the register, otherwise true.
     */
    boolean registerObjectWithId(@NonNull String identifier, @Nullable String tag, @NonNull List<ReleasePolicy> releasePolicies, @NonNull ObjectFactory factory) throws Throwable {
        if (!isValidObjectId(identifier)) {
            return false;
        }
        return synchronizeThrow(() -> {
            final String registrationId = translateObjectId(identifier);
            if (registrationId == null) {
                return false;
            }
            if (register.containsKey(registrationId)) {
                return false;
            }
            register.put(registrationId, new RegisterEntry(factory.createObject(), identifier, tag, releasePolicies));
            scheduleCleanup();
            return true;
        });
    }

    /**
     * Find object with given identifier and increase its usage counter.
     * @param objectId Object identifier.
     * @param expectedClass Expected class.
     * @param <T> Expected object's type.
     * @return instance of object with given identifier or null if there's no such object in the register.
     */
    @Nullable
    <T> T useObject(@Nullable String objectId, Class<T> expectedClass) {
        return synchronize(() -> findManagedObject(objectId, expectedClass, OPT_SET_USE));
    }

    /**
     * Find object with given identifier.
     * @param objectId Object identifier.
     * @param expectedClass Expected class.
     * @param <T> Expected object's type.
     * @return instance of object with given identifier or null if there's no such object in the register.
     */
    @Nullable
    <T> T findObject(@Nullable String objectId, @NonNull Class<T> expectedClass) {
        return synchronize(() -> findManagedObject(objectId, expectedClass, OPT_NONE));
    }

    /**
     * Touch object with given identifier and prolong its lifetime.
     * @param objectId Object identifier.
     * @param expectedClass Expected class.
     * @param <T> Expected object's type.
     * @return instance of object with given identifier or null if there's no such object in the register.
     */
    @Nullable
    <T> T touchObject(@Nullable String objectId, @NonNull Class<T> expectedClass) {
        return synchronize(() -> findManagedObject(objectId, expectedClass, OPT_TOUCH));
    }

    /**
     * Find object with given identifier.
     * @param objectId Object identifier.
     * @return true if register contains such object.
     */
    boolean containsObject(@Nullable String objectId) {
        return synchronize(() -> findManagedObject(objectId, Object.class, OPT_NONE) != null);
    }

    /**
     * Remove all objects with given tag from the register.
     * @param tag If provided, then only objects registered with given tag will be removed, otherwise all objects will be removed.
     */
    void removeAllObjectsWithTag(@Nullable String tag) {
        synchronize(() -> findAndRemoveObjects((key, managedObject) -> tag == null || tag.equals(managedObject.tag)));
    }

    /**
     * Remove object with given identifier.
     * @param objectId Object identifier.
     * @param expectedClass Expected class.
     * @param <T> Expected object's type.
     * @return instance of just removed object, or null if there's no such object in the register.
     */
    @Nullable
    <T> T removeObject(@Nullable String objectId, Class<T> expectedClass) {
        return synchronize(() -> findManagedObject(objectId, expectedClass, OPT_REMOVE));
    }

    /**
     * Validate application provided object identifier. It's recommended to use this method to validate
     * application provided identifier before it's used in {@code registerObjectWithId()} method.
     * @param objectId Application specific object identifier.
     * @return true if provided object identifier is valid and can be used in
     */
    boolean isValidObjectId(@Nullable String objectId) {
        return objectId != null && objectId.length() != 0;
    }

    /**
     * Set interval for internal cleanup job that removes objects that are no longer valid.
     * Only the value in range 100 to 60000ms is accepted. if 0 is provided, then the register
     * sets interval to the default period.
     * @param period New period to set.
     */
    void setCleanupPeriod(int period) {
        synchronize(() -> {
            if (period >= Constants.CLEANUP_PERIOD_MIN && period <= Constants.CLEANUP_PERIOD_MAX) {
                cleanupPeriod = period;
            } else {
                cleanupPeriod = Constants.CLEANUP_PERIOD_DEFAULT;
            }
            doCleanup();
        });
    }

    /**
     * Dump register's content into JavaScript array of objects. Note that method has implementation
     * only if library is compiled in DEBUG configuration.
     * @param tag If provided, then only objects with given tag are dumped, otherwise all.
     * @return JavaScript array with objects.
     */
    @NonNull
    WritableArray debugDumpObjects(@Nullable String tag) {
        return synchronize(() -> {
            final WritableArray array = Arguments.createArray();
            if (BuildConfig.DEBUG) {
                for (Map.Entry<String, RegisterEntry> entry : register.entrySet()) {
                    if (tag == null || tag.equals(entry.getValue().tag)) {
                        array.pushMap(entry.getValue().debugDump());
                    }
                }
            }
            return array;
        });
    }

    // ---------------------------------------------------------------------------------------------
    // Private interface

    private static final int OPT_NONE       = 0;    // no additional operation required
    private static final int OPT_SET_USE    = 1;    // set object as used
    private static final int OPT_TOUCH      = 2;    // prolong object's lifetime
    private static final int OPT_REMOVE     = 3;    // remove object

    /**
     * Finc object with given identifier and do an additional operation with the object.
     * @param objectId Object identifier.
     * @param expectedClass Expected class.
     * @param options Additional operation that should be performed with the object's entry. Use {@code OPT_*} constants.
     * @param <T> Expected object's type.
     * @return instance of object with given identifier or null if no such object exists in register.
     */
    @SuppressWarnings("unchecked")
    @Nullable
    private <T> T findManagedObject(@Nullable String objectId, Class<T> expectedClass, int options) {
        final String registrationId = translateObjectId(objectId);
        if (registrationId != null) {
            RegisterEntry managedObject = register.get(registrationId);
            if (managedObject != null) {
                final Object instance = managedObject.object.managedInstance();
                if (expectedClass.isInstance(instance)) {
                    if (managedObject.isStillValid()) {
                        // Object is still valid
                        if (options == OPT_SET_USE) {
                            // Set object as used
                            managedObject.setUsed();
                        } else if (options == OPT_TOUCH) {
                            // Prolong object's lifetime
                            managedObject.touch();
                        } else if (options == OPT_REMOVE) {
                            // Set object as removed.
                            if (managedObject.setRemoved()) {
                                // Object can be removed immediately
                                managedObject.object.cleanup();
                                register.remove(registrationId);
                            }
                        }
                        return (T) instance;
                    }
                }
            }
        }
        return null;
    }

    @FunctionalInterface
    private interface RemoveFilter {
        /**
         * Determine whether object should be removed from the register.
         * @param key Object's key.
         * @param managedObject Managed object.
         * @return true if object should be removed from the register.
         */
        boolean shouldRemove(@NonNull String key, @NonNull RegisterEntry managedObject);
    }

    /**
     * Find and remove objects. Which object is removed is determined by filter interface.
     * @param filter Interface that determine whether object should be removed.
     */
    private void findAndRemoveObjects(@NonNull RemoveFilter filter) {
        ArrayList<String> objectsToRemove = new ArrayList<>();
        for (Map.Entry<String, RegisterEntry> entry : register.entrySet()) {
            if (filter.shouldRemove(entry.getKey(), entry.getValue())) {
                objectsToRemove.add(entry.getKey());
                entry.getValue().object.cleanup();
            }
        }
        for (String key : objectsToRemove) {
            register.remove(key);
        }
    }

    @FunctionalInterface
    private interface ThreadSafeAction<T> {
        T run();
    }

    @FunctionalInterface
    private interface ThreadSafeActionThrows<T> {
        T run() throws Throwable;
    }

    /**
     * Execute action when internal mutex is acquired. In this variant, action can throw an exception.
     * @param action Action to execute when mutex is acquired.
     * @param <T> Type of value returned from the action.
     * @return Value returned from the action.
     */
    private <T> T synchronizeThrow(@NonNull ThreadSafeActionThrows<T> action) throws Throwable {
        try {
            lock.lock();
            return action.run();
        } finally {
            lock.unlock();
        }
    }

    /**
     * Execute action when internal mutex is acquired.
     * @param action Action to execute when mutex is acquired.
     * @param <T> Type of value returned from the action.
     * @return Value returned from the action.
     */
    private <T> T synchronize(@NonNull ThreadSafeAction<T> action) {
        try {
            lock.lock();
            return action.run();
        } finally {
            lock.unlock();
        }
    }

    @FunctionalInterface
    private interface ThreadSafeVoidActionThrows {
        void run() throws Throwable;
    }

    @FunctionalInterface
    private interface ThreadSafeVoidAction {
        void run();
    }

    /**
     * Execute action when internal mutex is acquired.
     * @param action Action to execute.
     */
    private void synchronize(@NonNull ThreadSafeVoidAction action) {
        try {
            lock.lock();
            action.run();
        } finally {
            lock.unlock();
        }
    }

    /**
     * Generate new unique identifier for object.
     * @return New unique object identifier.
     */
    private @NonNull String generateIdentifier() {
        final int numberOfBytes = 3 * (3 + randomGenerator.nextInt(6));
        final byte[] randomBytes = new byte[numberOfBytes];
        while (true) {
            randomGenerator.nextBytes(randomBytes);
            final String identifier = Base64.encodeToString(randomBytes, Base64.NO_WRAP);
            if (!register.containsKey(identifier)) {
                return identifier;
            }
        }
    }

    /**
     * Translate application provided, or generated object identifier into the key to the register.
     * @param identifier Application or generated object identifier.
     * @return Translated key.
     */
    private @Nullable String translateObjectId(@Nullable String identifier) {
        if (identifier == null || identifier.length() == 0) {
            return null;
        }
        return identifier;
    }

    // Objects cleanup

    /**
     * Schedule an object cleanup job.
     */
    private void scheduleCleanup() {
        if (!register.isEmpty()) {
            // Register is not empty
            if (cleanupTimer == null) {
                // Timer is not created, so create timer and schedule the task
                cleanupTimer = new Timer();
            }
            // Schedule new job to timer.
            cleanupTimer.schedule(new TimerTask() {
                @Override
                public void run() {
                    synchronize(() -> doCleanup());
                }
            }, cleanupPeriod);
        } else {
            // There's no object in register, so timer can be canceled.
            if (cleanupTimer != null) {
                cleanupTimer.cancel();
                cleanupTimer = null;
            }
        }
    }

    /**
     * Function remove expired or no longer valid objects from the register.
     */
    private void doCleanup() {
        // Remove all invalid objects
        findAndRemoveObjects(((key, managedObject) -> managedObject.isReadyForRemove()));
        // Schedule cleanup for the next round
        scheduleCleanup();
    }

    /**
     * Object that represents an entry in native objects register.
     */
    private static class RegisterEntry {

        final @NonNull
        IManagedObject object;
        final @NonNull String key;
        final @Nullable String tag;
        final @Nullable List<ReleasePolicy> policies;

        final long createTime;
        long lastUseTime;
        long removedTime;
        int usageCount;

        RegisterEntry(@NonNull IManagedObject object, @NonNull String key, @Nullable String tag, @NonNull List<ReleasePolicy> policies) {
            this.object = object;
            this.key = key;
            this.tag = tag;
            this.policies = policies.contains(ReleasePolicy.manual()) ? null : policies;
            
            this.createTime = currentTime();
            this.lastUseTime = createTime;
            this.removedTime = 0;
            this.usageCount = 0;
        }

        /**
         * Mark object as used. The function update usageCount and lastUseTime properties.
         */
        void setUsed() {
            lastUseTime = currentTime();
            usageCount++;
        }

        /**
         * Prolong object's lifetime. The function update lastUseTime property.
         */
        void touch() {
            lastUseTime = currentTime();
        }

        /**
         * Mark object as removed and return information whether object can be removed immediately.
         * @return true if object can be removed immediately, or false if should be removed later
         *         in the cleanup job.
         */
        boolean setRemoved() {
            // The cleanup job will keep the object in memory for a while to prevent accidental
            // cleanup while it's still used i
            removedTime = currentTime();
            // If policies is null then the object is manually managed, so it should be removed
            // immediately.
            return policies == null;
        }

        /**
         * Determine whether this native object is still valid.
         * @return true if object is still valid and can be used.
         */
        boolean isStillValid() {
            if (removedTime != 0) {
                // Object is marked as removed
                return false;
            }
            if (policies == null) {
                // if policies is null then the object is managed by owner, so we don't need to
                // evaluate policies.
                return true;
            }
            // Enumerate over all release policies
            final long currentTime = currentTime();
            for (ReleasePolicy rp : policies) {
                final int param = rp.getPolicyParam();
                switch (rp.getPolicyType()) {
                    case ReleasePolicy.AFTER_USE:
                        if (usageCount >= param) {
                            return false;
                        }
                        break;
                    case ReleasePolicy.KEEP_ALIVE:
                        if (currentTime - lastUseTime >= (long) param) {
                            return false;
                        }
                        break;
                    case ReleasePolicy.EXPIRE:
                        if (currentTime - createTime >= (long) param) {
                            return false;
                        }
                        break;
                    default:
                        break;
                }
            }
            return true;
        }

        /**
         * Determine whether object can be removed from the register and if yes, then cleanup the
         * stored object.
         * @return true if object can be removed from the register.
         */
        boolean isReadyForRemove() {
            if (isStillValid()) {
                // Object is still valid, so it's not ready for remove.
                return false;
            }
            // If removedTime is 0, then the object was not explicitly removed. This means that
            // object is expired or was used for a limited number of times.
            // On other side, if time is specified then the object was explicitly removed, so
            // it should be ready for remove after a short delay period.
            boolean readyForRemove = removedTime == 0 ||
                    currentTime() - removedTime >= (long) Constants.CLEANUP_REMOVE_DELAY;
            if (readyForRemove) {
                object.cleanup();
            }
            return readyForRemove;
        }

        /**
         * @return Current time in milliseconds.
         */
        private static long currentTime() {
            return SystemClock.elapsedRealtime();
        }

        /**
         * Return map representing the debug information about this register's entry.
         * @return Map with debug information.
         */
        WritableMap debugDump() {
            WritableMap map = Arguments.createMap();
            if (BuildConfig.DEBUG) {
                boolean printLastUseDate = false;
                boolean printUsageCount = false;
                // Enumerate policies
                final WritableArray debugPolicies = Arguments.createArray();
                if (policies == null) {
                    debugPolicies.pushString("MANUAL");
                } else {
                    for (ReleasePolicy rp : policies) {
                        final StringBuilder sb = new StringBuilder(32);
                        switch (rp.getPolicyType()) {
                            case ReleasePolicy.AFTER_USE:
                                printUsageCount = true;
                                sb.append("AFTER_USE(")
                                    .append(usageCount)
                                    .append("/")
                                    .append(rp.getPolicyParam())
                                    .append(")");
                                break;
                            case ReleasePolicy.KEEP_ALIVE:
                                printLastUseDate = true;
                                sb.append("KEEP_ALIVE(")
                                    .append(rp.getPolicyParam())
                                    .append(")");
                                break;
                            case ReleasePolicy.EXPIRE:
                                sb.append("EXPIRE(")
                                    .append(rp.getPolicyParam())
                                    .append(")");
                                break;
                            default:
                                break;
                        }
                        final String policy = sb.toString();
                        if (!policy.isEmpty()) {
                            debugPolicies.pushString(sb.toString());
                        }
                    }
                }
                // Note: This is not very accurate, but we're using this only for the debugging purposes
                final long bootTime = System.currentTimeMillis() - currentTime();
                map.putString("id", key);
                map.putString("class", object.managedInstance().getClass().getSimpleName());
                map.putArray("policies", debugPolicies);
                map.putBoolean("isValid", isStillValid());
                if (tag != null) {
                    map.putString("tag", tag);
                }
                map.putDouble("createDate", (bootTime + createTime) * 0.001);
                if (printLastUseDate) {
                    map.putDouble("lastUseDate", (bootTime + lastUseTime) * 0.001);
                }
                if (printUsageCount) {
                    map.putInt("usageCount", usageCount);
                }
            }
            return map;
        }
    }

    // ---------------------------------------------------------------------------------------------
    // JavaScript interface

    @ReactMethod
    void isValidNativeObject(String objectId, Promise promise) {
        promise.resolve(containsObject(objectId));
    }

    @ReactMethod
    void debugDump(String instanceId, Promise promise) {
        promise.resolve(debugDumpObjects(instanceId));
    }

    @ReactMethod
    void debugCommand(String command, ReadableMap options, Promise promise) {
        if (BuildConfig.DEBUG) {
            final String objectId   = options.hasKey("objectId") ? options.getString("objectId") : null;
            final String objectTag  = options.hasKey("objectTag") ? options.getString("objectTag") : null;
            final String objectType = options.hasKey("objectType") ? options.getString("objectType") : null;
            Class<?> objectClass = null;
            if ("data".equals(objectType) || "secure-data".equals(objectType)) {
                objectClass = byte[].class;
            } else if ("number".equals(objectType)) {
                objectClass = Integer.class;
            } else if ("password".equals(objectType)) {
                objectClass = Password.class;
            }
            if ("create".equals(command)) {
                // The "create" command creates a new instance of managed object
                // and returns its ID to JavaScript.
                final ReadableArray createPolicies = options.hasKey("releasePolicy") ? options.getArray("releasePolicy") : null;
                // Prepare release policies
                final ArrayList<ReleasePolicy> policies = new ArrayList<>();
                if (createPolicies != null) {
                    for (int idx = 0; idx < createPolicies.size(); idx++) {
                        final String policyString = createPolicies.getString(idx);
                        final String[] components = TextUtils.split(policyString, " ");
                        final int param = components.length > 1 ? Integer.parseInt(components[components.length - 1]) : 0;
                        if ("manual".equals(policyString)) {
                            policies.add(ReleasePolicy.manual());
                        } else if (policyString.startsWith("afterUse")) {
                            policies.add(ReleasePolicy.afterUse(param));
                        } else if (policyString.startsWith("keepAlive")) {
                            policies.add(ReleasePolicy.keepAlive(param));
                        } else if (policyString.startsWith("expire")) {
                            policies.add(ReleasePolicy.expire(param));
                        }
                    }
                }
                if (!policies.isEmpty()) {
                    // Create new object
                    IManagedObject instance = null;
                    if ("data".equals(objectType)) {
                        instance = ManagedAny.wrap("TEST-DATA".getBytes(StandardCharsets.UTF_8), null);
                    } else if ("secure-data".equals(objectType)) {
                        instance = ManagedAny.wrap("SECURE-DATA".getBytes(StandardCharsets.UTF_8));
                    } else if ("number".equals(objectType)) {
                        instance = ManagedAny.wrap(42);
                    } else if ("password".equals(objectType)) {
                        instance = ManagedAny.wrap(new Password(), Password::destroy);
                    }
                    if (instance != null) {
                        promise.resolve(registerObject(instance, objectTag, policies));
                        return;
                    }
                }
            } else if ("release".equals(command)) {
                // The "release" command release object with given identifier and returns true / false whether object was removed.
                if (objectClass != null && objectId != null) {
                    promise.resolve(removeObject(objectId, objectClass) != null);
                    return;
                }
            } else if ("releaseAll".equals(command)) {
                // The "releaseAll" command release all objects with a specified tag. If tag is nil, then releases all objects
                // from the register.
                removeAllObjectsWithTag(objectTag);
                promise.resolve(null);
                return;
            } else if ("use".equals(command)) {
                // The "use" command find object and mark it as used and returns true / false whether object was found.
                if (objectClass != null && objectId != null) {
                    promise.resolve(useObject(objectId, objectClass) != null);
                    return;
                }
            } else if ("find".equals(command)) {
                // The "find" command just find the object in the register and returns true / false if is still in register.
                if (objectClass != null && objectId != null) {
                    promise.resolve(findObject(objectId, objectClass) != null);
                    return;
                }
            } else if ("touch".equals(command)) {
                // The "touch" command extends object's lifetime in the register and returns true / false if is still in register.
                if (objectClass != null && objectId != null) {
                    promise.resolve(touchObject(objectId, objectClass) != null);
                    return;
                }
            } else if ("setPeriod".equals(command)) {
                // The "setPeriod" command sets cleanup period
                final int param = options.hasKey("cleanupPeriod") ? options.getInt("cleanupPeriod") : 0;
                setCleanupPeriod(param);
                promise.resolve(null);
                return;
            }
            // Not handled at all...
            promise.reject(Errors.EC_WRONG_PARAMETER, "Wrong parameter for cmd " + command);
        } else {
            // Not DEBUG build, resolve with null
            promise.resolve(null);
        }
    }
}
