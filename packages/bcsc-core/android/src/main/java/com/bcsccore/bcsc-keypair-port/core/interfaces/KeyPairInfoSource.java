package com.bcsccore.keypair.core.interfaces;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.bcsccore.keypair.core.exceptions.BcscException;
import com.bcsccore.keypair.core.models.KeyPairInfo;
import java.util.HashMap;

/**
 * Interface for managing key pair metadata information.
 * Handles storage and retrieval of key pair information such as aliases and creation times.
 */
public interface KeyPairInfoSource {

  /**
   * Get information for a specific key pair.
   * @param kid the key identifier (alias)
   * @return the key pair information, or null if not found
   */
  @Nullable
  KeyPairInfo getKeyPairInfo(String kid);

  /**
   * Get all stored key pair information.
   * @throws BcscException if retrieval fails
   */
  @NonNull
  HashMap<String, KeyPairInfo> getKeyPairInfo() throws BcscException;

  /**
   * Save key pair information.
   * @throws BcscException if saving fails
   */
  void saveKeyPairInfo(KeyPairInfo info) throws BcscException;

  /**
   * Delete key pair information.
   * @throws BcscException if deletion fails
   */
  void deleteKeyPairInfo(String alias) throws BcscException;

}
