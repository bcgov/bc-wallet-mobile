package com.bcsccore.fileport.encryption;

import javax.crypto.SecretKey;

/**
 * Interface for providing secret keys for encryption/decryption
 */
public interface KeySource {
    /**
     * Get the secret key for encryption/decryption
     * @return SecretKey instance
     * @throws Exception if key cannot be retrieved or generated
     */
    SecretKey getSecretKey() throws Exception;
}
