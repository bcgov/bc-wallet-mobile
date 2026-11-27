package com.bcsccore.keypair.core.exceptions;

/**
 * Specific exception for key pair generation failures.
 * This exception is thrown when Android KeyStore operations fail
 * during key pair generation or retrieval.
 */
public class KeypairGenerationException extends BcscException {
  
  public KeypairGenerationException(String devMessage) {
    super(AlertKey.ADD_CARD_KEYPAIR_GENERATION, devMessage);
  }

  /**
   * Create a keypair generation exception with a developer message and cause.
   * Preserves the original exception for debugging and stack trace chaining.
   */
  public KeypairGenerationException(String devMessage, Throwable cause) {
    super(AlertKey.ADD_CARD_KEYPAIR_GENERATION, devMessage, cause);
  }
  
}
