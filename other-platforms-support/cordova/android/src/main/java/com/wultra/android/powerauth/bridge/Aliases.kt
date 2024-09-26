package com.wultra.android.powerauth.bridge

// bridge to concrete platform implementation
typealias BuildConfig = DummyBuildConfig

// point to React bridge
typealias Arguments = com.wultra.android.powerauth.cdv.util.Arguments
typealias Dynamic = com.wultra.android.powerauth.cdv.util.Dynamic
typealias Promise = com.wultra.android.powerauth.cdv.util.Promise
typealias ReadableArray = com.wultra.android.powerauth.cdv.util.ReadableArray
typealias ReadableMap = com.wultra.android.powerauth.cdv.util.ReadableMap
typealias ReadableType = com.wultra.android.powerauth.cdv.util.ReadableType
typealias WritableArray = com.wultra.android.powerauth.cdv.util.WritableArray
typealias WritableMap = com.wultra.android.powerauth.cdv.util.WritableMap


// hack before we figure out Cordova solution
object DummyBuildConfig {
    val DEBUG = true
}