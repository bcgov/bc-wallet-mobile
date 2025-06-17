package com.bcsccore.keypair.core.models;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import java.security.KeyPair;

/**
 * Wrapper class that combines a Java KeyPair with its associated metadata.
 * This provides a convenient way to pass both the cryptographic key pair
 * and its information (alias, creation time) together.
 */
public class BcscKeyPair {

  @Nullable
  private final KeyPair keyPair;

  @NonNull
  private final KeyPairInfo keyInfo;

  /**
   * Create a new BcscKeyPair.
   * @param keyPair the cryptographic key pair (can be null if key retrieval failed)
   * @param keyInfo the metadata about this key pair
   */
  public BcscKeyPair(@Nullable KeyPair keyPair, @NonNull KeyPairInfo keyInfo) {
    this.keyPair = keyPair;
    this.keyInfo = keyInfo;
  }

  /**
   * Get the cryptographic key pair.
   * @return the key pair, or null if not available
   */
  @Nullable
  public KeyPair getKeyPair() {
    return keyPair;
  }

  /**
   * Get the metadata about this key pair.
   * @return the key pair information
   */
  @NonNull
  public KeyPairInfo getKeyInfo() {
    return keyInfo;
  }

}
