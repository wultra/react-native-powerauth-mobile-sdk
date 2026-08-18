package com.wultra.android.powerauth.bridge

import android.content.Context

// point to React bridge
typealias Arguments = com.facebook.react.bridge.Arguments
typealias Dynamic = com.facebook.react.bridge.Dynamic
typealias Promise = com.facebook.react.bridge.Promise
typealias ReactMethod = com.facebook.react.bridge.ReactMethod
typealias ReadableArray = com.facebook.react.bridge.ReadableArray
typealias ReadableMap = com.facebook.react.bridge.ReadableMap
typealias ReadableType = com.facebook.react.bridge.ReadableType
typealias WritableArray = com.facebook.react.bridge.WritableArray
typealias WritableMap = com.facebook.react.bridge.WritableMap



// bridge to concrete platform implementation
typealias BuildConfig = com.wultra.android.powerauth.reactnative.BuildConfig
typealias PwBuildConfig = com.wultra.android.powerauth.bridge.ReactPwBuildConfig

object ReactPwBuildConfig {
    fun isDebuggable(context: Context) = BuildConfig.DEBUG
}