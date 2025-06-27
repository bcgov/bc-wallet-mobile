package com.bcsccore.fileport.decryption;

/**
 * Interface for decrypting file content
 */
public interface FileDecryptor {
    
    /**
     * Decrypt encrypted file content
     * @param encryptedContent the encrypted byte array
     * @return decrypted content as string
     * @throws DecryptionException if decryption fails
     */
    String decrypt(byte[] encryptedContent) throws DecryptionException;
    
    /**
     * Check if decryption is available/initialized
     * @return true if decryptor is ready to use
     */
    boolean isAvailable();
}
