package com.wultra.android.powerauth.cdv.util

/**
 *
 */
abstract class DefaultDynamic : Dynamic {
    override val isNull: Boolean
        get() = false

    override fun asArray(): ReadableArray {
        TODO("Not yet implemented")
    }

    override fun asBoolean(): Boolean {
        TODO("Not yet implemented")
    }

    override fun asDouble(): Double {
        TODO("Not yet implemented")
    }

    override fun asInt(): Int {
        TODO("Not yet implemented")
    }

    override fun asMap(): ReadableMap {
        TODO("Not yet implemented")
    }

    override fun asString(): String {
        TODO("Not yet implemented")
    }

    override fun recycle() {
        TODO("Not yet implemented")
    }
}