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

import Foundation

/// Defines how a managed object is released. Time intervals are in milliseconds.
enum PAJSReleasePolicy {
    /// Object is manually released. Overrides all other possible policies.
    case manual
    /// Object is released after the specified number of uses.
    case afterUse(Int)
    /// Object is kept alive for the specified time interval since the last use.
    case keepAlive(Int)
    /// Object is released after the specified time interval.
    case expire(Int)
}

/// Object register that allows us to expose native objects into JavaScript world.
/// The object is identified by an unique identifier created at the time of registration
/// or by application provided identifier.
@objc(PowerAuthObjectRegister)
final class PowerAuthObjectRegister: PAJSModule {

    private let lock = NSLock()
    // Keys and tags are NSString to compare identifiers literally, like the JavaScript side does.
    // Swift String compares canonically equivalent Unicode sequences as equal.
    private var objects = [NSString: PAJSManagedObject]()
    private var scheduledCleanup = false
    private var cleanupPeriod = PAJSConstants.cleanupPeriodDefault

    override func setUpModule() {
        // The register doesn't depend on other modules.
    }

    override func tearDownModule() {
        // Invoked when the bridge is reloaded or disposed, so remove all objects from the register.
        removeAllObjects(withTag: nil)
    }

    // MARK: - Native interface

    /// Register object and return auto generated object identifier.
    func register(_ object: AnyObject, tag: String?, policies: [PAJSReleasePolicy]) -> String {
        return synchronized {
            let identifier = generateIdentifier()
            objects[identifier] = PAJSManagedObject(object: object, key: identifier, tag: tag as NSString?, policies: policies)
            scheduleCleanup()
            return identifier as String
        }
    }

    /// Register a child object only if the expected owner is still registered under `ownerId`.
    /// The identity check and insertion are atomic.
    func register(_ object: AnyObject, ifOwnerMatches expectedOwner: AnyObject, ownerId: String, policies: [PAJSReleasePolicy]) -> String? {
        return synchronized {
            guard isOwner(expectedOwner, registeredWithId: ownerId) else {
                return nil
            }
            let identifier = generateIdentifier()
            objects[identifier] = PAJSManagedObject(object: object, key: identifier, tag: ownerId as NSString, policies: policies)
            scheduleCleanup()
            return identifier as String
        }
    }

    /// Atomically transfer a child object to the caller only if its owner still matches.
    /// The returned object is removed without cleanup.
    func takeObject<T: AnyObject>(withId objectId: Any?, as type: T.Type, ifOwnerMatches expectedOwner: AnyObject, ownerId: String) -> T? {
        return synchronized {
            guard isOwner(expectedOwner, registeredWithId: ownerId),
                  let registeredId = translateObjectId(objectId),
                  let managedObject = objects[registeredId],
                  managedObject.tag == ownerId as NSString,
                  let object = managedObject.object as? T else {
                return nil
            }
            objects[registeredId] = nil
            scheduleCleanup()
            return managedObject.isStillValid ? object : nil
        }
    }

    /// Register object returned from object factory with application specific identifier. Returns `false` if such
    /// object is already registered or if the factory returns `nil`.
    func register(withId objectId: Any?, tag: String?, policies: [PAJSReleasePolicy], objectFactory: () -> AnyObject?) -> Bool {
        guard let registeredId = translateObjectId(objectId) else {
            return false
        }
        return synchronized {
            guard objects[registeredId] == nil, let object = objectFactory() else {
                return false
            }
            objects[registeredId] = PAJSManagedObject(object: object, key: registeredId, tag: tag as NSString?, policies: policies)
            scheduleCleanup()
            return true
        }
    }

    /// Find object with given identifier. The identifier may be auto-generated or application specific.
    /// This method doesn't increase object's usage count, so it will not cause an object release.
    func findObject<T: AnyObject>(withId objectId: Any?, as type: T.Type) -> T? {
        return synchronized { accessObject(objectId, as: type, access: .find) }
    }

    /// Find object with given identifier and prolong its lifetime if `keepAlive` policy is specified.
    /// This method doesn't increase object's usage count, so it will not cause an object release.
    func touchObject<T: AnyObject>(withId objectId: Any?, as type: T.Type) -> T? {
        return synchronized { accessObject(objectId, as: type, access: .touch) }
    }

    /// Find object with given identifier and increase its usage counter.
    func useObject<T: AnyObject>(withId objectId: Any?, as type: T.Type) -> T? {
        return synchronized { accessObject(objectId, as: type, access: .use) }
    }

    /// Transform a valid object while holding the register lock, then increase its usage counter.
    /// This allows an owned copy of sensitive single-use data to be created before cleanup is eligible.
    func useObject<T: AnyObject, R>(withId objectId: Any?, as type: T.Type, transform: (T) -> R?) -> R? {
        return synchronized {
            guard let registeredId = translateObjectId(objectId),
                  let managedObject = objects[registeredId],
                  managedObject.isStillValid,
                  let object = managedObject.object as? T else {
                return nil
            }
            let result = transform(object)
            managedObject.setUsed()
            return result
        }
    }

    /// Returns `true` if object with given identifier is still valid.
    func containsObject(withId objectId: Any?) -> Bool {
        return findObject(withId: objectId, as: AnyObject.self) != nil
    }

    /// Remove all object with given tag. If tag is not specified, then remove all objects.
    func removeAllObjects(withTag tag: String?) {
        synchronized {
            removeObjects { tag == nil || $0.tag == tag as NSString? }
        }
    }

    /// Immediately release an object of the expected type, regardless of expiration policy.
    @discardableResult
    func releaseObject<T: AnyObject>(withId objectId: Any?, as type: T.Type = AnyObject.self) -> T? {
        return synchronized {
            guard let registeredId = translateObjectId(objectId),
                  let object = objects[registeredId]?.object as? T else {
                return nil
            }
            objects[registeredId] = nil
            scheduleCleanup()
            return object
        }
    }

    /// Validate whether provided object is a valid application specific object identifier. The object ID can be invalid
    /// in case that it's not provided or is empty string.
    func isValidObjectId(_ objectId: Any?) -> Bool {
        return translateObjectId(objectId) != nil
    }

    /// Returns array with debug information about objects stored in the register. The method is available only
    /// if library is compiled in DEBUG configuration.
    func debugDumpObjects(withTag tag: String?) -> [[String: Any]] {
        #if DEBUG
        return synchronized {
            objects.values
                .filter { tag == nil || $0.tag == tag as NSString? }
                .map { $0.debugDump() }
        }
        #else
        return []
        #endif
    }

    /// Set interval for internal cleanup job that removes objects that are not valid.
    /// Only the value in range 100 to 60000ms is accepted, otherwise the default period is used.
    func setCleanupPeriod(_ period: Int) {
        synchronized {
            if period >= PAJSConstants.cleanupPeriodMin && period <= PAJSConstants.cleanupPeriodMax {
                cleanupPeriod = period
            } else {
                cleanupPeriod = PAJSConstants.cleanupPeriodDefault
            }
            // Kick the cleanup now, because we don't want to wait for the next tick if period is shorter.
            doCleanup()
        }
    }

    // MARK: - Private

    private enum Access {
        case find, use, touch
    }

    private func synchronized<R>(_ block: () -> R) -> R {
        lock.lock()
        defer { lock.unlock() }
        return block()
    }

    /// Translate object ID into key to register. Returns `nil` for invalid IDs passed from JavaScript.
    private func translateObjectId(_ objectId: Any?) -> NSString? {
        guard let stringId = objectId as? NSString, stringId.length > 0 else {
            return nil
        }
        return stringId
    }

    private func isOwner(_ expectedOwner: AnyObject, registeredWithId ownerId: String) -> Bool {
        guard let owner = objects[ownerId as NSString], owner.isStillValid else {
            return false
        }
        return owner.object === expectedOwner
    }

    private func accessObject<T: AnyObject>(_ objectId: Any?, as type: T.Type, access: Access) -> T? {
        guard let registeredId = translateObjectId(objectId),
              let managedObject = objects[registeredId],
              let object = managedObject.object as? T,
              managedObject.isStillValid else {
            return nil
        }
        switch access {
        case .find: break
        case .use: managedObject.setUsed()
        case .touch: managedObject.touch()
        }
        return object
    }

    private func scheduleCleanup() {
        guard !scheduledCleanup && !objects.isEmpty else {
            return
        }
        scheduledCleanup = true
        DispatchQueue.global().asyncAfter(deadline: .now() + .milliseconds(cleanupPeriod)) {
            self.synchronized {
                self.doCleanup()
            }
        }
    }

    private func doCleanup() {
        scheduledCleanup = false
        removeObjects { !$0.isStillValid }
        scheduleCleanup()
    }

    private func removeObjects(where predicate: (PAJSManagedObject) -> Bool) {
        objects = objects.filter { !predicate($0.value) }
    }

    private func generateIdentifier() -> NSString {
        while true {
            var bytes = [UInt8](repeating: 0, count: 3 * (3 + Int(arc4random_uniform(6))))
            arc4random_buf(&bytes, bytes.count)
            let identifier = Data(bytes).base64EncodedString() as NSString
            if objects[identifier] == nil {
                return identifier
            }
        }
    }
}

/// Object stored in the object register.
private final class PAJSManagedObject {

    let object: AnyObject
    let key: NSString
    let tag: NSString?
    private let policies: [PAJSReleasePolicy]
    private let managedByOwner: Bool
    private let createDate = Date()
    private var lastUseDate: Date
    private var usageCount = 0

    init(object: AnyObject, key: NSString, tag: NSString?, policies: [PAJSReleasePolicy]) {
        self.object = object
        self.key = key
        self.tag = tag
        // Only the first four policies are applied, like in the original implementation.
        self.policies = Array(policies.prefix(4))
        self.managedByOwner = self.policies.contains {
            if case .manual = $0 { return true }
            return false
        }
        self.lastUseDate = createDate
    }

    func setUsed() {
        usageCount += 1
        lastUseDate = Date()
    }

    func touch() {
        lastUseDate = Date()
    }

    var isStillValid: Bool {
        // In case that object is manually managed, then don't iterate over the policies.
        if managedByOwner {
            return true
        }
        for policy in policies {
            switch policy {
            case .afterUse(let maxUsageCount):
                if usageCount >= maxUsageCount { return false }
            case .expire(let timeInterval):
                if isExpired(createDate, timeInterval) { return false }
            case .keepAlive(let timeInterval):
                if isExpired(lastUseDate, timeInterval) { return false }
            case .manual:
                break
            }
        }
        return true
    }

    func debugDump() -> [String: Any] {
        var printLastUseDate = false
        var printUsageCount = false
        let policyNames: [String]
        if managedByOwner {
            policyNames = ["MANUAL"]
        } else {
            policyNames = policies.compactMap { policy in
                switch policy {
                case .afterUse(let maxUsageCount):
                    printUsageCount = true
                    return "AFTER_USE(\(usageCount)/\(maxUsageCount))"
                case .keepAlive(let timeInterval):
                    printLastUseDate = true
                    return "KEEP_ALIVE(\(timeInterval))"
                case .expire(let timeInterval):
                    return "EXPIRE(\(timeInterval))"
                case .manual:
                    return nil
                }
            }
        }
        return [
            "id": key,
            "class": NSStringFromClass(type(of: object)),
            "tag": PAJS.nullable(tag),
            "createDate": createDate.timeIntervalSince1970,
            "lastUseDate": PAJS.nullable(printLastUseDate ? lastUseDate.timeIntervalSince1970 : nil),
            "usageCount": PAJS.nullable(printUsageCount ? usageCount : nil),
            "policies": policyNames,
            "isValid": isStillValid,
        ]
    }

    /// Evaluate whether time interval between now and reference date is greater or equal than time interval in milliseconds.
    private func isExpired(_ refDate: Date, _ timeInterval: Int) -> Bool {
        return Int(-refDate.timeIntervalSinceNow * 1000.0) >= timeInterval
    }
}
