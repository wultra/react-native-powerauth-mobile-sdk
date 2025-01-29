package com.wultra.android.powerauth.js

import android.app.Activity

/**
 * Module aware of the activity.
 */
interface ActivityAwareModule {

    fun getCurrentActivity(): Activity
}

/**
 * Provider of activity.
 */
interface ActivityProvider {
    fun getActivity(): Activity
}