package com.wultra.android.powerauth.bridge

@Retention(AnnotationRetention.RUNTIME)
public annotation class JsApiMethod(
    public val isBlockingSynchronousMethod: Boolean = false
)