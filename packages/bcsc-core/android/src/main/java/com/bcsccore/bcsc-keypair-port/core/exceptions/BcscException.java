package com.bcsccore.keypair.core.exceptions;

import androidx.annotation.NonNull;

/**
 * Base exception class for BC Services Card operations.
 * This is a simplified version of the original BcscException that focuses
 * on the core functionality needed for key pair operations.
 */
public class BcscException extends Exception {

  private static final String NO_MESSAGE = "No dev message present.";

  @NonNull
  private final String devMessage;

  @NonNull
  private final AlertKey alertKey;

  public BcscException() {
    this.alertKey = AlertKey.GENERAL;
    this.devMessage = NO_MESSAGE;
  }

  public BcscException(@NonNull AlertKey key) {
    this.alertKey = key;
    this.devMessage = NO_MESSAGE;
  }

  public BcscException(@NonNull AlertKey key, String devMessage) {
    final String message = devMessage == null ? NO_MESSAGE : devMessage;
    this.alertKey = key;
    this.devMessage = message;
  }

  /**
   * Create an exception with an alert key, developer message, and cause.
   * Preserves the original exception for debugging and stack trace chaining.
   */
  public BcscException(@NonNull AlertKey key, String devMessage, Throwable cause) {
    super(cause);
    final String message = devMessage == null ? NO_MESSAGE : devMessage;
    this.alertKey = key;
    this.devMessage = message;
  }

  public BcscException(String devMessage) {
    final String message = devMessage == null ? NO_MESSAGE : devMessage;
    this.alertKey = AlertKey.GENERAL;
    this.devMessage = message;
  }

  @NonNull
  public AlertKey getAlertKey() {
    return alertKey;
  }

  @NonNull
  public String getDevMessage() {
    return devMessage;
  }

  @NonNull
  public String getKeyString() {
    return alertKey.getKeyString();
  }

  @Override
  public String getMessage() {
    return devMessage;
  }

}
