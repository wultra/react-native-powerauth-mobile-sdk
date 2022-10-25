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

/**
 * The {@code ReleasePolicy} class defines how object is released automatically from the register.
 */
class ReleasePolicy {

    static final int MANUAL = 0;
    static final int AFTER_USE = 1;
    static final int KEEP_ALIVE = 2;
    static final int EXPIRE = 3;

    private final int value;

    private ReleasePolicy(int type, int param) {
        this.value = (type & 0xF) | (param << 4);
    }

    /**
     * Return policy type (e.g. MANUAL, EXPIRE...)
     * @return Policy type.
     */
    int getPolicyType() {
        return (int)(value & 0xF);
    }

    /**
     * Return policy parameter.
     * @return Parameter for policy.
     */
    int getPolicyParam() {
        return value >> 4;
    }

    /**
     * Creates a new release policy configured to a manual release. This type of policy
     * cannot be combined with other policy types, because the object owner manages the object's
     * lifetime.
     * @return policy for manual object release.
     */
    static ReleasePolicy manual() {
        return new ReleasePolicy(MANUAL, 0);
    }

    /**
     * Creates a new release policy configured to release object after expected amount of use.
     * It's recommended to combine this type of policy with {@code RP_EXPIRE()} to make sure
     * that object is always released from the memory.
     * @param count Maximum number of object use allowed.
     * @return policy to release object after number of use attempts.
     */
    static ReleasePolicy afterUse(int count) {
        return new ReleasePolicy(AFTER_USE, count);
    }

    /**
     * Creates a new release policy configured to release object after a required time of inactivity.
     * The inactivity means that no JavaScript call interacted with the object in the defined
     * time window.
     *
     * @param timeIntervalMs Time interval in milliseconds to keep object alive from last use attempt.
     * @return policy to release object after defined inactivity time.
     */
    static ReleasePolicy keepAlive(int timeIntervalMs) {
        return new ReleasePolicy(KEEP_ALIVE, timeIntervalMs);
    }

    /**
     * Creates a new release policy configured to release object after a required time.
     * @param timeIntervalMs Time interval in milliseconds to keep object alive.
     * @return policy to release object after expiration time.
     */
    static ReleasePolicy expire(int timeIntervalMs) {
        return new ReleasePolicy(EXPIRE, timeIntervalMs);
    }

    public boolean equals(Object anObject) {
        if (this == anObject) {
            return true;
        }
        if (anObject instanceof ReleasePolicy) {
            return value == ((ReleasePolicy) anObject).value;
        }
        return false;
    }
}
