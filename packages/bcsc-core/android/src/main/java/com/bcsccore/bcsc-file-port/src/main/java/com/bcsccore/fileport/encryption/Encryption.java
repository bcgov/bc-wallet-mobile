package com.bcsccore.fileport.encryption;

/**
 * Interface for encryption/decryption operations.
 * This is a self-contained copy of the original BCSC Encryption interface.
 */
public interface Encryption {
    /**
     * Encrypt a message string into bytes
     * @param message The string to encrypt
     * @return Encrypted bytes
     * @throws Exception if encryption fails
     */
    byte[] encrypt(String message) throws Exception;

    /**
     * Decrypt bytes back to a string
     * @param bytes The encrypted bytes to decrypt
     * @return Decrypted string
     * @throws Exception if decryption fails
     */
    String decrypt(byte[] bytes) throws Exception;
}
