/*
 * Copyright 2025 Wultra s.r.o.
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

package com.wultra.android.powerauth.cordova.plugin

import com.wultra.android.powerauth.cdv.util.Promise
import com.wultra.android.powerauth.js.PowerAuthStorageUtilsJsModule
import org.apache.cordova.CallbackContext
import org.apache.cordova.CordovaInterface
import org.apache.cordova.CordovaPlugin
import org.apache.cordova.CordovaWebView
import org.json.JSONArray
import org.json.JSONException

class PowerAuthStorageUtilsModule : CordovaPlugin() {

    private lateinit var powerAuthStorageUtilsJsModule: PowerAuthStorageUtilsJsModule

    override fun initialize(cordova: CordovaInterface, webView: CordovaWebView) {
        super.initialize(cordova, webView)
        powerAuthStorageUtilsJsModule = PowerAuthStorageUtilsJsModule(cordova.context.applicationContext)
    }

    @Throws(JSONException::class)
    override fun execute(action: String, args: JSONArray, callbackContext: CallbackContext): Boolean {
        val promise = Promise(callbackContext)
        when (action) {
            "setString" -> {
                setString(args, promise)
                return true
            }
            "getString" -> {
                getString(args, promise)
                return true
            }
            "exists" -> {
                exists(args, promise)
                return true
            }
            "remove" -> {
                remove(args, promise)
                return true
            }
        }
        return false
    }

    private fun setString(args: JSONArray, promise: Promise) {
        val key = args.getString(0)
        val value = args.getString(1)
        val storageType = args.getString(2)
        powerAuthStorageUtilsJsModule.setString(key, value, storageType, promise)
    }

    private fun getString(args: JSONArray, promise: Promise) {
        val key = args.getString(0)
        val storageType = args.getString(1)
        powerAuthStorageUtilsJsModule.getString(key, storageType, promise)
    }

    private fun exists(args: JSONArray, promise: Promise) {
        val key = args.getString(0)
        val storageType = args.getString(1)
        powerAuthStorageUtilsJsModule.exists(key, storageType, promise)
    }

    private fun remove(args: JSONArray, promise: Promise) {
        val key = args.getString(0)
        val storageType = args.getString(1)
        powerAuthStorageUtilsJsModule.remove(key, storageType, promise)
    }
}
