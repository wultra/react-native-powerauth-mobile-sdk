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

/**
 * Populate all method names defined in the provided object.
 * @param obj Input object.
 * @returns List of method names implemented in the object.
 */
export function getAllObjectMethods(obj: any) {
    let props: string[] = [];
    let parent: any;
    // Walk over the prototype chain, ignore `Object` methods (e.g. there's no parent prototype)
    while (obj && (parent = Object.getPrototypeOf(obj))) {
        // get all descriptors at once
        const allDescs = Object.getOwnPropertyDescriptors(obj);
        for (const prop in allDescs) {
            // Functions are writable unlike the getters. If we don't test for `writable`, then the next `obj[prop]`
            // statement will access the value of property via the getter function. In other words, it call the
            // getter function and that's not we want.
            if (allDescs[prop].writable === true && typeof obj[prop] === 'function' && prop !== 'constructor') {
                props.push(prop);
            }
        }
        obj = parent;
    }
    return props;
}
