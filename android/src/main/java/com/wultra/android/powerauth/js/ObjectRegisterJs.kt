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


import com.wultra.android.powerauth.bridge.Arguments
import com.wultra.android.powerauth.bridge.Promise
import com.wultra.android.powerauth.bridge.ReadableArray
import com.wultra.android.powerauth.bridge.ReadableMap
import com.wultra.android.powerauth.bridge.WritableArray
import com.wultra.android.powerauth.bridge.WritableMap
import com.wultra.android.powerauth.bridge.JsApiMethod
import com.wultra.android.powerauth.bridge.BuildConfig

import android.os.SystemClock
import android.text.TextUtils
import android.util.Base64
import com.wultra.android.powerauth.js.ObjectRegisterJs.RemoveFilter
import com.wultra.android.powerauth.js.ObjectRegisterJs.ThreadSafeAction
import io.getlime.security.powerauth.core.Password
import java.nio.charset.StandardCharsets
import java.util.Random
import java.util.Timer
import java.util.TimerTask
import java.util.concurrent.locks.ReentrantLock

/**
 * Object register that allows us to expose native objects into JavaScript world.
 * The object is identified by an unique identifier created at the time of registration
 * or by application provided identifier.
 */
@Suppress("unused")
class ObjectRegisterJs : BaseJavaJsModule {
    private val lock = ReentrantLock(false)
    private val register: HashMap<String, RegisterEntry> = HashMap(16)
    private val randomGenerator: Random = Random()
    private var cleanupPeriod: Int = Constants.CLEANUP_PERIOD_DEFAULT
    private var cleanupTimer: Timer? = null

    // ---------------------------------------------------------------------------------------------
    // RN integration
    override fun getName(): String {
        return "PowerAuthObjectRegister"
    }

    fun invalidate() {
//        super.invalidate()
        synchronize {
            // Release all objects when invalidating this module.
            removeAllObjectsWithTag(null)
            // Schedule cleanup, this basically cancel the timer, because the register is empty.
            scheduleCleanup()
        }
    }

    // ---------------------------------------------------------------------------------------------
    // Native interface
    /**
     * Factory that create object on demand.
     */
    interface ObjectFactory<T> {
        /**
         * Create object instance on demand.
         * @return Instance of object.
         * @throws Throwable In case of failure.
         */
        @Throws(Throwable::class)
        fun createObject(): IManagedObject<T>
    }

    /**
     * Register object and return its unique identifier.
     * @param object Object to register.
     * @param tag Optional object's tag.
     * @param releasePolicies List with release policies.
     * @return Identifier that identify registered object in the register.
     */
    internal fun registerObject(
        `object`: IManagedObject<out Any>,
        tag: String?,
        releasePolicies: List<ReleasePolicy>
    ): String {
        return synchronize<String> {
            val identifier = generateIdentifier()
            register[identifier] = RegisterEntry(
                `object`,
                identifier,
                tag,
                releasePolicies
            )
            scheduleCleanup()
            identifier
        }
    }

    /**
     * Register object with application provided identifier.
     * @param object Object to register.
     * @param identifier Application provided identifier.
     * @param tag Optional object's tag.
     * @param releasePolicies List with release policies.
     * @return false if identifier is invalid or object with such identifier is already in the register, otherwise true.
     */
    internal fun registerObjectWithId(
        `object`: IManagedObject<Any>,
        identifier: String,
        tag: String?,
        releasePolicies: List<ReleasePolicy>
    ): Boolean {
        return try {
            registerObjectWithId(identifier, tag, releasePolicies, object : ObjectFactory<Any> {
                override fun createObject(): IManagedObject<Any> = `object`
            })
        } catch (t: Throwable) {
            false
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
    @Throws(Throwable::class)
    internal fun registerObjectWithId(
        identifier: String,
        tag: String?,
        releasePolicies: List<ReleasePolicy>,
        factory: ObjectFactory<Any>
    ): Boolean {
        if (!isValidObjectId(identifier)) {
            return false
        }
        return synchronizeThrow {
            val registrationId = translateObjectId(identifier) ?: return@synchronizeThrow false
            if (register.containsKey(registrationId)) {
                return@synchronizeThrow false
            }
            register[registrationId] = RegisterEntry(
                factory.createObject(),
                identifier,
                tag,
                releasePolicies
            )
            scheduleCleanup()
            true
        }
    }

    /**
     * Find object with given identifier and increase its usage counter.
     * @param objectId Object identifier.
     * @param expectedClass Expected class.
     * @param <T> Expected object's type.
     * @return instance of object with given identifier or null if there's no such object in the register.
    </T> */
    fun <T> useObject(objectId: String?, expectedClass: Class<T>?): T? {
        return synchronize(ThreadSafeAction {
            findManagedObject(
                objectId,
                expectedClass,
                OPT_SET_USE
            )
        })
    }

    /**
     * Find object with given identifier.
     * @param objectId Object identifier.
     * @param expectedClass Expected class.
     * @param <T> Expected object's type.
     * @return instance of object with given identifier or null if there's no such object in the register.
    </T> */
    fun <T> findObject(objectId: String?, expectedClass: Class<T>): T? {
        return synchronize(ThreadSafeAction {
            findManagedObject(
                objectId,
                expectedClass,
                OPT_NONE
            )
        })
    }

    /**
     * Touch object with given identifier and prolong its lifetime.
     * @param objectId Object identifier.
     * @param expectedClass Expected class.
     * @param <T> Expected object's type.
     * @return instance of object with given identifier or null if there's no such object in the register.
    </T> */
    fun <T> touchObject(objectId: String?, expectedClass: Class<T>): T? {
        return synchronize(ThreadSafeAction {
            findManagedObject(
                objectId,
                expectedClass,
                OPT_TOUCH
            )
        })
    }

    /**
     * Find object with given identifier.
     * @param objectId Object identifier.
     * @return true if register contains such object.
     */
    fun containsObject(objectId: String?): Boolean {
        return synchronize<Boolean> {
            findManagedObject(
                objectId,
                Any::class.java,
                OPT_NONE
            ) != null
        }
    }

    /**
     * Remove all objects with given tag from the register.
     * @param tag If provided, then only objects registered with given tag will be removed, otherwise all objects will be removed.
     */
    fun removeAllObjectsWithTag(tag: String?) {
        synchronize {
            findAndRemoveObjects { _: String?, managedObject: RegisterEntry -> tag == null || tag == managedObject.tag }
        }
    }

    /**
     * Remove object with given identifier.
     * @param objectId Object identifier.
     * @param expectedClass Expected class.
     * @param <T> Expected object's type.
     * @return instance of just removed object, or null if there's no such object in the register.
    </T> */
    fun <T> removeObject(objectId: String?, expectedClass: Class<T>?): T? {
        return synchronize(ThreadSafeAction {
            findManagedObject(
                objectId,
                expectedClass,
                OPT_REMOVE
            )
        })
    }

    /**
     * Validate application provided object identifier. It's recommended to use this method to validate
     * application provided identifier before it's used in `registerObjectWithId()` method.
     * @param objectId Application specific object identifier.
     * @return true if provided object identifier is valid and can be used in
     */
    fun isValidObjectId(objectId: String?): Boolean {
        return !objectId.isNullOrEmpty()
    }

    /**
     * Set interval for internal cleanup job that removes objects that are no longer valid.
     * Only the value in range 100 to 60000ms is accepted. if 0 is provided, then the register
     * sets interval to the default period.
     * @param period New period to set.
     */
    private fun setCleanupPeriod(period: Int) {
        synchronize {
            cleanupPeriod =
                if (period >= Constants.CLEANUP_PERIOD_MIN && period <= Constants.CLEANUP_PERIOD_MAX) {
                    period
                } else {
                    Constants.CLEANUP_PERIOD_DEFAULT
                }
            doCleanup()
        }
    }

    /**
     * Dump register's content into JavaScript array of objects. Note that method has implementation
     * only if library is compiled in DEBUG configuration.
     * @param tag If provided, then only objects with given tag are dumped, otherwise all.
     * @return JavaScript array with objects.
     */
    private fun debugDumpObjects(tag: String?): WritableArray {
        return synchronize(ThreadSafeAction {
            val array: WritableArray = Arguments.createArray()
            if (BuildConfig.DEBUG) {
                for ((_, value) in register) {
                    if (tag == null || tag == value.tag) {
                        array.pushMap(value.debugDump())
                    }
                }
            }
            array
        })
    }

    /**
     * Find object with given identifier and do an additional operation with the object.
     * @param objectId Object identifier.
     * @param expectedClass Expected class, or null if any object can be returned (in case of remove)
     * @param options Additional operation that should be performed with the object's entry. Use `OPT_*` constants.
     * @param <T> Expected object's type.
     * @return instance of object with given identifier or null if no such object exists in register.
    </T> */
    private fun <T> findManagedObject(
        objectId: String?,
        expectedClass: Class<T>?,
        options: Int
    ): T? {
        val registrationId = translateObjectId(objectId)
        if (registrationId != null) {
            val managedObject = register[registrationId]
            if (managedObject != null) {
                val instance = managedObject.`object`.managedInstance()
                if (expectedClass == null || expectedClass.isInstance(instance)) {
                    if (managedObject.isStillValid) {
                        // Object is still valid
                        if (options == OPT_SET_USE) {
                            // Set object as used
                            managedObject.setUsed()
                        } else if (options == OPT_TOUCH) {
                            // Prolong object's lifetime
                            managedObject.touch()
                        } else if (options == OPT_REMOVE) {
                            // Set object as removed.
                            if (managedObject.setRemoved()) {
                                // Object can be removed immediately
                                managedObject.`object`.cleanup()
                                register.remove(registrationId)
                            }
                        }
                        @Suppress("UNCHECKED_CAST")
                        return instance as T
                    }
                }
            }
        }
        return null
    }

    private fun interface RemoveFilter {
        /**
         * Determine whether object should be removed from the register.
         * @param key Object's key.
         * @param managedObject Managed object.
         * @return true if object should be removed from the register.
         */
        fun shouldRemove(key: String, managedObject: RegisterEntry): Boolean
    }

    /**
     * Find and remove objects. Which object is removed is determined by filter interface.
     * @param filter Interface that determine whether object should be removed.
     */
    private fun findAndRemoveObjects(filter: RemoveFilter) {
        val objectsToRemove = ArrayList<String>()
        for ((key, value) in register) {
            if (filter.shouldRemove(key, value)) {
                objectsToRemove.add(key)
                value.`object`.cleanup()
            }
        }
        for (key in objectsToRemove) {
            register.remove(key)
        }
    }

    private fun interface ThreadSafeAction<T> {
        fun run(): T
    }

    private fun interface ThreadSafeActionThrows<T> {
        @Throws(Throwable::class)
        fun run(): T
    }

    /**
     * Execute action when internal mutex is acquired. In this variant, action can throw an exception.
     * @param action Action to execute when mutex is acquired.
     * @param <T> Type of value returned from the action.
     * @return Value returned from the action.
    </T> */
    @Throws(Throwable::class)
    private fun <T> synchronizeThrow(action: ThreadSafeActionThrows<T>): T {
        try {
            lock.lock()
            return action.run()
        } finally {
            lock.unlock()
        }
    }

    /**
     * Execute action when internal mutex is acquired.
     * @param action Action to execute when mutex is acquired.
     * @param <T> Type of value returned from the action.
     * @return Value returned from the action.
    </T> */
    private fun <T> synchronize(action: ThreadSafeAction<T>): T {
        try {
            lock.lock()
            return action.run()
        } finally {
            lock.unlock()
        }
    }

    private fun interface ThreadSafeVoidActionThrows {
        @Throws(Throwable::class)
        fun run()
    }

    private fun interface ThreadSafeVoidAction {
        fun run()
    }

    /**
     * Execute action when internal mutex is acquired.
     * @param action Action to execute.
     */
    private fun synchronize(action: ThreadSafeVoidAction) {
        try {
            lock.lock()
            action.run()
        } finally {
            lock.unlock()
        }
    }

    /**
     * Generate new unique identifier for object.
     * @return New unique object identifier.
     */
    private fun generateIdentifier(): String {
        val numberOfBytes = 3 * (3 + randomGenerator.nextInt(6))
        val randomBytes = ByteArray(numberOfBytes)
        while (true) {
            randomGenerator.nextBytes(randomBytes)
            val identifier = Base64.encodeToString(randomBytes, Base64.NO_WRAP)
            if (!register.containsKey(identifier)) {
                return identifier
            }
        }
    }

    /**
     * Translate application provided, or generated object identifier into the key to the register.
     * @param identifier Application or generated object identifier.
     * @return Translated key.
     */
    private fun translateObjectId(identifier: String?): String? {
        if (identifier.isNullOrEmpty()) {
            return null
        }
        return identifier
    }

    // Objects cleanup
    /**
     * Schedule an object cleanup job.
     */
    private fun scheduleCleanup() {
        if (register.isNotEmpty()) {
            // Register is not empty
            if (cleanupTimer == null) {
                // Timer is not created, so create timer and schedule the task
                cleanupTimer = Timer()
            }
            // Schedule new job to timer.
            cleanupTimer!!.schedule(object : TimerTask() {
                override fun run() {
                    synchronize { doCleanup() }
                }
            }, cleanupPeriod.toLong())
        } else {
            // There's no object in register, so timer can be canceled.
            if (cleanupTimer != null) {
                cleanupTimer!!.cancel()
                cleanupTimer = null
            }
        }
    }

    /**
     * Function remove expired or no longer valid objects from the register.
     */
    private fun doCleanup() {
        // Remove all invalid objects
        findAndRemoveObjects((RemoveFilter { _, managedObject -> managedObject.isReadyForRemove }))
        // Schedule cleanup for the next round
        scheduleCleanup()
    }

    /**
     * Object that represents an entry in native objects register.
     */
    private class RegisterEntry(
        val `object`: IManagedObject<out Any>,
        val key: String,
        val tag: String?,
        policies: List<ReleasePolicy>
    ) {
        val policies: List<ReleasePolicy>? =
            if (policies.contains(ReleasePolicy.manual())) null else policies

        val createTime: Long = currentTime()
        var lastUseTime: Long = createTime
        var removedTime: Long = 0
        var usageCount: Int = 0

        /**
         * Mark object as used. The function update usageCount and lastUseTime properties.
         */
        fun setUsed() {
            lastUseTime = currentTime()
            usageCount++
        }

        /**
         * Prolong object's lifetime. The function update lastUseTime property.
         */
        fun touch() {
            lastUseTime = currentTime()
        }

        /**
         * Mark object as removed and return information whether object can be removed immediately.
         * @return true if object can be removed immediately, or false if should be removed later
         * in the cleanup job.
         */
        fun setRemoved(): Boolean {
            // The cleanup job will keep the object in memory for a while to prevent accidental
            // cleanup while it's still used i
            removedTime = currentTime()
            // If policies is null then the object is manually managed, so it should be removed
            // immediately.
            return policies == null
        }

        val isStillValid: Boolean
            /**
             * Determine whether this native object is still valid.
             * @return true if object is still valid and can be used.
             */
            get() {
                if (removedTime != 0L) {
                    // Object is marked as removed
                    return false
                }
                if (policies == null) {
                    // if policies is null then the object is managed by owner, so we don't need to
                    // evaluate policies.
                    return true
                }
                // Enumerate over all release policies
                val currentTime = currentTime()
                for (rp in policies) {
                    val param = rp.policyParam
                    when (rp.policyType) {
                        ReleasePolicy.AFTER_USE -> if (usageCount >= param) {
                            return false
                        }

                        ReleasePolicy.KEEP_ALIVE -> if (currentTime - lastUseTime >= param.toLong()) {
                            return false
                        }

                        ReleasePolicy.EXPIRE -> if (currentTime - createTime >= param.toLong()) {
                            return false
                        }

                        else -> {}
                    }
                }
                return true
            }

        val isReadyForRemove: Boolean
            /**
             * Determine whether object can be removed from the register and if yes, then cleanup the
             * stored object.
             * @return true if object can be removed from the register.
             */
            get() {
                if (isStillValid) {
                    // Object is still valid, so it's not ready for remove.
                    return false
                }
                // If removedTime is 0, then the object was not explicitly removed. This means that
                // object is expired or was used for a limited number of times.
                // On other side, if time is specified then the object was explicitly removed, so
                // it should be ready for remove after a short delay period.
                val readyForRemove = removedTime == 0L ||
                        currentTime() - removedTime >= Constants.CLEANUP_REMOVE_DELAY.toLong()
                if (readyForRemove) {
                    `object`.cleanup()
                }
                return readyForRemove
            }

        /**
         * Return map representing the debug information about this register's entry.
         * @return Map with debug information.
         */
        fun debugDump(): WritableMap {
            val map: WritableMap = Arguments.createMap()
            if (BuildConfig.DEBUG) {
                var printLastUseDate = false
                var printUsageCount = false
                // Enumerate policies
                val debugPolicies: WritableArray = Arguments.createArray()
                if (policies == null) {
                    debugPolicies.pushString("MANUAL")
                } else {
                    for (rp in policies) {
                        val sb = StringBuilder(32)
                        when (rp.policyType) {
                            ReleasePolicy.AFTER_USE -> {
                                printUsageCount = true
                                sb.append("AFTER_USE(")
                                    .append(usageCount)
                                    .append("/")
                                    .append(rp.policyParam)
                                    .append(")")
                            }

                            ReleasePolicy.KEEP_ALIVE -> {
                                printLastUseDate = true
                                sb.append("KEEP_ALIVE(")
                                    .append(rp.policyParam)
                                    .append(")")
                            }

                            ReleasePolicy.EXPIRE -> sb.append("EXPIRE(")
                                .append(rp.policyParam)
                                .append(")")

                            else -> {}
                        }
                        val policy = sb.toString()
                        if (policy.isNotEmpty()) {
                            debugPolicies.pushString(sb.toString())
                        }
                    }
                }
                // Note: This is not very accurate, but we're using this only for the debugging purposes
                val bootTime = System.currentTimeMillis() - currentTime()
                map.putString("id", key)
                map.putString("class", `object`.managedInstance()::class.java.simpleName)
                map.putArray("policies", debugPolicies)
                map.putBoolean("isValid", isStillValid)
                if (tag != null) {
                    map.putString("tag", tag)
                }
                map.putDouble("createDate", (bootTime + createTime) * 0.001)
                if (printLastUseDate) {
                    map.putDouble("lastUseDate", (bootTime + lastUseTime) * 0.001)
                }
                if (printUsageCount) {
                    map.putInt("usageCount", usageCount)
                }
            }
            return map
        }

        companion object {
            /**
             * @return Current time in milliseconds.
             */
            private fun currentTime(): Long {
                return SystemClock.elapsedRealtime()
            }
        }
    }

    // ---------------------------------------------------------------------------------------------
    // JavaScript interface
    @JsApiMethod
    fun isValidNativeObject(objectId: String?, promise: Promise) {
        promise.resolve(containsObject(objectId))
    }

    @JsApiMethod
    fun debugDump(instanceId: String?, promise: Promise) {
        promise.resolve(debugDumpObjects(instanceId))
    }

    @JsApiMethod
    fun debugCommand(command: String, options: ReadableMap, promise: Promise) {
        if (BuildConfig.DEBUG) {
            val objectId: String? =
                if (options.hasKey("objectId")) options.getString("objectId") else null
            val objectTag: String? =
                if (options.hasKey("objectTag")) options.getString("objectTag") else null
            val objectType: String? =
                if (options.hasKey("objectType")) options.getString("objectType") else null
            var objectClass: Class<*>? = null
            when (objectType) {
                "data", "secure-data" -> {
                    objectClass = ByteArray::class.java
                }
                "number" -> {
                    objectClass = Int::class.java
                }
                "password" -> {
                    objectClass = Password::class.java
                }
                "encryptor" -> {
                    objectClass = PowerAuthEncryptorJsModule.InstanceData::class.java
                }
            }
            if ("create" == command) {
                // The "create" command creates a new instance of managed object
                // and returns its ID to JavaScript.
                val createPolicies: ReadableArray? =
                    if (options.hasKey("releasePolicy")) options.getArray("releasePolicy") else null
                // Prepare release policies
                val policies = ArrayList<ReleasePolicy>()
                if (createPolicies != null) {
                    for (idx in 0 until createPolicies.size()) {
                        val policyString: String = createPolicies.getString(idx)
                        val components = TextUtils.split(policyString, " ")
                        val param =
                            if (components.size > 1) components[components.size - 1].toInt() else 0
                        if ("manual" == policyString) {
                            policies.add(ReleasePolicy.manual())
                        } else if (policyString.startsWith("afterUse")) {
                            policies.add(ReleasePolicy.afterUse(param))
                        } else if (policyString.startsWith("keepAlive")) {
                            policies.add(ReleasePolicy.keepAlive(param))
                        } else if (policyString.startsWith("expire")) {
                            policies.add(ReleasePolicy.expire(param))
                        }
                    }
                }
                if (policies.isNotEmpty()) {
                    // Create new object
                    var instance: IManagedObject<out Any>? = null
                    when (objectType) {
                        "data" -> {
                            instance =
                                ManagedAny.wrap("TEST-DATA".toByteArray(StandardCharsets.UTF_8), null)
                        }
                        "secure-data" -> {
                            instance =
                                ManagedAny.wrap("SECURE-DATA".toByteArray(StandardCharsets.UTF_8))
                        }
                        "number" -> {
                            instance = ManagedAny.wrap(42)
                        }
                        "password" -> {
                            instance = ManagedAny.wrap(Password(), object: ManagedAny.Cleanup<Password> {
                                override fun cleanup(instance: Password) {
                                    instance.destroy()
                                }
                            })
                        }
                    }
                    if (instance != null) {
                        promise.resolve(registerObject(instance, objectTag, policies))
                        return
                    }
                }
            } else if ("release" == command) {
                // The "release" command release object with given identifier and returns true / false whether object was removed.
                if (objectId != null) {
                    promise.resolve(removeObject(objectId, objectClass) != null)
                    return
                }
            } else if ("releaseAll" == command) {
                // The "releaseAll" command release all objects with a specified tag. If tag is nil, then releases all objects
                // from the register.
                removeAllObjectsWithTag(objectTag)
                promise.resolve(null)
                return
            } else if ("use" == command) {
                // The "use" command find object and mark it as used and returns true / false whether object was found.
                if (objectClass != null && objectId != null) {
                    promise.resolve(useObject(objectId, objectClass) != null)
                    return
                }
            } else if ("find" == command) {
                // The "find" command just find the object in the register and returns true / false if is still in register.
                if (objectClass != null && objectId != null) {
                    promise.resolve(findObject(objectId, objectClass) != null)
                    return
                }
            } else if ("touch" == command) {
                // The "touch" command extends object's lifetime in the register and returns true / false if is still in register.
                if (objectClass != null && objectId != null) {
                    promise.resolve(touchObject(objectId, objectClass) != null)
                    return
                }
            } else if ("setPeriod" == command) {
                // The "setPeriod" command sets cleanup period
                val param =
                    if (options.hasKey("cleanupPeriod")) options.getInt("cleanupPeriod") else 0
                setCleanupPeriod(param)
                promise.resolve(null)
                return
            }
            // Not handled at all...
            promise.reject(Errors.EC_WRONG_PARAMETER, "Wrong parameter for cmd $command")
        } else {
            // Not DEBUG build, resolve with null
            promise.resolve(null)
        }
    }

    companion object {
        // ---------------------------------------------------------------------------------------------
        // Private interface
        private const val OPT_NONE = 0 // no additional operation required
        private const val OPT_SET_USE = 1 // set object as used
        private const val OPT_TOUCH = 2 // prolong object's lifetime
        private const val OPT_REMOVE = 3 // remove object

        internal fun <T> objectFactory(fce: () -> IManagedObject<T>): ObjectFactory<T> {
            return object : ObjectFactory<T> {
                override fun createObject(): IManagedObject<T> {
                    return fce()
                }
            }
        }
    }
}
