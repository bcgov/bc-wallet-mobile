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
        val id = `in`.nextString()
        return if (id != null) TimeZone.getTimeZone(id) else null
    }
}
