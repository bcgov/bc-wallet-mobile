package com.bcsccore.keypair.core.interfaces;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.bcsccore.keypair.core.models.BcscKeyPair;
import com.bcsccore.keypair.core.models.KeyPairInfo;
import com.bcsccore.keypair.core.exceptions.BcscException;
import com.nimbusds.jose.jwk.JWK;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.util.List;

/**
 * Interface for BC Services Card key pair operations.
 * Provides methods for generating, retrieving, and managing RSA key pairs
 * stored in Android KeyStore for secure JWT signing operations.
 */
public interface BcscKeyPairSource {

  /**
   * Check if the key store is available and functional.
   * @return true if key store operations are available
   */
  boolean isAvailable();

  /**
   * Get the current (newest) key pair for signing operations.
   * Creates a new key pair if none exists.
   * @return the current key pair
   * @throws BcscException if key generation or retrieval fails
   */
  @NonNull
  BcscKeyPair getCurrentBcscKeyPair() throws BcscException;

  /**
   * Get a specific key pair by its identifier.
   * @param kid the key identifier (alias)
   * @return the key pair, or null if not found
   * @throws BcscException if an error occurs during retrieval
   */
  @Nullable
  BcscKeyPair getBcscKeyPair(@NonNull String kid) throws BcscException;

  /**
   * Generate a new key pair.
   * @return the newly generated key pair
   * @throws BcscException if key generation fails
   */
  @NonNull
  BcscKeyPair getNewBcscKeyPair() throws BcscException;

  /**
   * Delete a specific key pair.
   * @param alias the alias of the key pair to delete
   * @throws BcscException if deletion fails
   */
  void deleteBcscKeyPair(@NonNull String alias) throws BcscException;

  /**
   * Enumerate every key pair backed by an entry in the platform keystore.
   * The createdAt on each result reflects metadata when present, or 0 when
   * the alias exists in the keystore but has no metadata entry yet.
   * Used by the recovery flow to match local keys against the server jwks.
   * @return list of KeyPairInfo entries; empty list if the keystore is empty.
   * @throws BcscException if the keystore cannot be read
   */
  @NonNull
  List<KeyPairInfo> getAllBcscKeyPairInfos() throws BcscException;

  /**
   * Mark the given alias as the active (newest) key by stamping its
   * createdAt to now. Creates a metadata entry if none exists. Does not
   * touch the keystore.
   * @param alias the alias to mark active
   * @throws BcscException if metadata cannot be written
   */
  void markActiveBcscKeyPair(@NonNull String alias) throws BcscException;

  /**
   * Clean up old key pairs to manage storage.
   * Typically removes the oldest key pair if more than 3 exist.
   * @throws BcscException if cleanup fails
   */
  void cleanUpBcscKeyPairs() throws BcscException;

  /**
   * Convert a key pair to JWK format for public key sharing.
   * @param bcscKeyPair the key pair to convert
   * @return the public key in JWK format
   */
  @NonNull
  JWK convertBcscKeyPairToJWK(@NonNull BcscKeyPair bcscKeyPair);

  /**
   * Sign a JWT claims set and return the serialized JWT string.
   * @param claimsSet the claims to sign
   * @return the signed JWT as a string
   * @throws BcscException if signing fails
   */
  @NonNull
  String signAndSerializeClaimsSet(@NonNull JWTClaimsSet claimsSet) throws BcscException;

  /**
   * Sign a JWT claims set and return the SignedJWT object.
   * @param claimsSet the claims to sign
   * @return the signed JWT object
   * @throws BcscException if signing fails
   */
  @NonNull
  SignedJWT signClaimsSet(@NonNull JWTClaimsSet claimsSet) throws BcscException;

}
