package com.wultra.android.powerauth.cdv.util


class ReadableMapKeySetIteratorImpl(val iterator: Iterator<String>) : ReadableMapKeySetIterator {

    override fun hasNextKey(): Boolean {
        return iterator.hasNext()
    }

    override fun nextKey(): String {
        return iterator.next()
    }
}