package com.bcsccore.keypair.core.exceptions;

/**
 * Exception thrown when a key pair cannot be found in the Android KeyStore
 * during retrieval.
 *
 * Mirrors iOS's {@code KeychainError.keyNotExists}.
 */
public class KeyNotFoundException extends KeypairGenerationException {

  public KeyNotFoundException(String devMessage) {
    super(devMessage);
  }

  public KeyNotFoundException(String devMessage, Throwable cause) {
    super(devMessage, cause);
  }
}
