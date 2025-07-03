package com.bcsccore.keypair.core.models;

import androidx.annotation.NonNull;

/**
 * Metadata information about a key pair stored in Android KeyStore.
 * Contains the alias (identifier) and creation timestamp for tracking
 * and managing multiple key pairs.
 */
public class KeyPairInfo {

  @NonNull
  private final String alias;

  @NonNull
  private final Long createdAt;

  /**
   * Create new key pair information.
   * @param alias the unique identifier for this key pair in the keystore
   * @param createdAt the timestamp when this key pair was created
   */
  public KeyPairInfo(@NonNull String alias, @NonNull Long createdAt) {
    this.alias = alias;
    this.createdAt = createdAt;
  }

  /**
   * Get the alias (identifier) for this key pair.
   * @return the alias string
   */
  @NonNull
  public String getAlias() {
    return alias;
  }

  /**
   * Get the creation timestamp for this key pair.
   * @return the creation time in milliseconds since epoch
   */
  @NonNull
  public Long getCreatedAt() {
    return createdAt;
  }

}
