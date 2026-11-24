package com.bcsccore.fileport.encryption;

import javax.crypto.SecretKey;

public interface KeySource {
    /**
     * Get the secret key for encryption/decryption
     * @throws Exception if key cannot be retrieved or generated
     */
    SecretKey getSecretKey() throws Exception;
}
