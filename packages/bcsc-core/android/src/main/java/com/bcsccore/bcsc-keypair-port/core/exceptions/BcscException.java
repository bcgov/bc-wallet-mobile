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

  /**
   * Create a general exception with no specific error key.
   */
  public BcscException() {
    this.alertKey = AlertKey.GENERAL;
    this.devMessage = NO_MESSAGE;
  }

  /**
   * Create an exception with a specific alert key.
   * @param key the alert key identifying the type of error
   */
  public BcscException(@NonNull AlertKey key) {
    this.alertKey = key;
    this.devMessage = NO_MESSAGE;
  }

  /**
   * Create an exception with an alert key and developer message.
   * @param key the alert key identifying the type of error
   * @param devMessage the developer message describing the error
   */
  public BcscException(@NonNull AlertKey key, String devMessage) {
    final String message = devMessage == null ? NO_MESSAGE : devMessage;
    this.alertKey = key;
    this.devMessage = message;
  }

  /**
   * Create an exception with just a developer message.
   * @param devMessage the developer message describing the error
   */
  public BcscException(String devMessage) {
    final String message = devMessage == null ? NO_MESSAGE : devMessage;
    this.alertKey = AlertKey.GENERAL;
    this.devMessage = message;
  }

  /**
   * Get the alert key for this exception.
   * @return the alert key
   */
  @NonNull
  public AlertKey getAlertKey() {
    return alertKey;
  }

  /**
   * Get the developer message.
   * @return the developer message
   */
  @NonNull
  public String getDevMessage() {
    return devMessage;
  }

  /**
   * Get a string representation of the alert key.
   * @return the alert key as a string
   */
  @NonNull
  public String getKeyString() {
    return alertKey.getKeyString();
  }

  @Override
  public String getMessage() {
    return devMessage;
  }

}
