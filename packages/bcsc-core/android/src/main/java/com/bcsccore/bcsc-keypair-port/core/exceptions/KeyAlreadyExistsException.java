package com.bcsccore.keypair.core.exceptions;

/**d
 * Exception thrown when a key pair generation is attempted but the alias
 * already exists in the Android KeyStore.
 *
 * Mirrors iOS's {@code KeychainError.keyAlreadyExists} / {@code errSecDuplicateItem}.
 */
public class KeyAlreadyExistsException extends KeypairGenerationException {

  public KeyAlreadyExistsException(String devMessage) {
    super(devMessage);
  }

  public KeyAlreadyExistsException(String devMessage, Throwable cause) {
    super(devMessage, cause);
  }
}
