package com.bcsccore.storage

import com.google.gson.TypeAdapter
import com.google.gson.stream.JsonReader
import com.google.gson.stream.JsonWriter
import java.util.TimeZone

/**
 * Gson TypeAdapter for TimeZone serialization.
 * Matches the native ias-android TimeZoneTypeAdapter for compatibility.
 */
class TimeZoneTypeAdapter : TypeAdapter<TimeZone>() {
    override fun write(
        out: JsonWriter,
        value: TimeZone?,
    ) {
        if (value == null) {
            out.nullValue()
        } else {
            out.value(value.id)
        }
    }

    override fun read(`in`: JsonReader): TimeZone? {
        if (`in`.peek() == com.google.gson.stream.JsonToken.NULL) {
            `in`.nextNull()
            return null
        }
        val id = `in`.nextString()
        return TimeZone.getTimeZone(id)
    }
}
