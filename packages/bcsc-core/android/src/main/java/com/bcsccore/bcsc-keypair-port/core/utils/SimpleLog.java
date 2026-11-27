package com.bcsccore.keypair.core.utils;

import android.util.Log;

/**
 * Simple logging utility class.
 * This is a simplified replacement for the complex Log class in the original project.
 * Uses standard Android Log for output.
 */
public class SimpleLog {

  private static final boolean DEBUG_ENABLED = true; // Set to false for production

  public static void d(String tag, String message) {
    if (DEBUG_ENABLED) {
      Log.d(tag, message);
    }
  }

  public static void i(String tag, String message) {
    if (DEBUG_ENABLED) {
      Log.i(tag, message);
    }
  }

  public static void w(String tag, String message) {
    if (DEBUG_ENABLED) {
      Log.w(tag, message);
    }
  }

  public static void e(String tag, String message) {
    if (DEBUG_ENABLED) {
      Log.e(tag, message);
    }
  }

  public static void e(String tag, String message, Throwable throwable) {
    if (DEBUG_ENABLED) {
      Log.e(tag, message, throwable);
    }
  }

}
