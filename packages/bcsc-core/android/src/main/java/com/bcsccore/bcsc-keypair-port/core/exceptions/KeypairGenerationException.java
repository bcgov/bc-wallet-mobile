package com.bcsccore.keypair.core.exceptions;

/**
 * Specific exception for key pair generation failures.
 * This exception is thrown when Android KeyStore operations fail
 * during key pair generation or retrieval.
 */
public class KeypairGenerationException extends BcscException {
  
  /**
   * Create a keypair generation exception with a developer message.
   * @param devMessage the message describing what went wrong during key generation
   */
  public KeypairGenerationException(String devMessage) {
    super(AlertKey.ADD_CARD_KEYPAIR_GENERATION, devMessage);
  }
  
}
