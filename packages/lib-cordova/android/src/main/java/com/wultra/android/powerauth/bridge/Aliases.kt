package com.wultra.android.powerauth.bridge

import android.content.Context
import android.content.pm.ApplicationInfo



// point to React bridge
typealias Arguments = com.wultra.android.powerauth.cdv.util.Arguments
typealias Dynamic = com.wultra.android.powerauth.cdv.util.Dynamic
typealias Promise = com.wultra.android.powerauth.cdv.util.Promise
typealias ReadableArray = com.wultra.android.powerauth.cdv.util.ReadableArray
typealias ReadableMap = com.wultra.android.powerauth.cdv.util.ReadableMap
typealias ReadableType = com.wultra.android.powerauth.cdv.util.ReadableType
typealias WritableArray = com.wultra.android.powerauth.cdv.util.WritableArray
typealias WritableMap = com.wultra.android.powerauth.cdv.util.WritableMap


// bridge to concrete platform implementation
typealias BuildConfig = com.wultra.android.powerauth.bridge.DummyBuildConfig
typealias PwBuildConfig = com.wultra.android.powerauth.bridge.CordovaPwBuildConfig

object DummyBuildConfig {
    val DEBUG = false // unused in the lib
}

object CordovaPwBuildConfig {
    fun isDebuggable(context: Context): Boolean {
        return 0 != context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE
    }
}