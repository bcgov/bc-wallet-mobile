package com.bcsccore.fileport.decryption;

public interface FileDecryptor {
    
    /**
     * Decrypt encrypted file content
     * @throws DecryptionException if decryption fails
     */
    String decrypt(byte[] encryptedContent) throws DecryptionException;
    
    /**
     * Check if decryption is available/initialized
     * @return true if decryptor is ready to use
     */
    boolean isAvailable();
}
