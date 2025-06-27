package com.bcsccore.fileport.decryption;

import android.content.Context;

import androidx.annotation.NonNull;

import com.bcsccore.fileport.encryption.AESEncryptor;
import com.bcsccore.fileport.encryption.Encryption;
import com.bcsccore.fileport.encryption.AndroidKeyStoreSource;
import com.bcsccore.fileport.encryption.KeySource;

/**
 * BCSC-compatible file decryptor using self-contained encryption logic.
 * This ensures compatibility with existing encrypted files in the BCSC system
 * without requiring dependencies on the original storage module.
 */
public class BcscFileDecryptor implements FileDecryptor {
    
    private final Encryption encryption;
    
    public BcscFileDecryptor(@NonNull Context context) {
        KeySource keySource = new AndroidKeyStoreSource();
        this.encryption = new AESEncryptor(keySource);
    }
    
    @Override
    public String decrypt(byte[] encryptedContent) throws DecryptionException {
        if (!isAvailable()) {
            throw new DecryptionException("Decryptor not available - key initialization failed");
        }
        
        if (encryptedContent == null || encryptedContent.length == 0) {
            return "";
        }
        
        try {
            return encryption.decrypt(encryptedContent);
        } catch (Exception e) {
            throw new DecryptionException("Failed to decrypt content", e);
        }
    }
    
    @Override
    public boolean isAvailable() {
        try {
            // Test if we can get the secret key
            KeySource keySource = new AndroidKeyStoreSource();
            keySource.getSecretKey();
            return true;
        } catch (Exception e) {
            return false;
        }
    }
    
    /**
     * Get information about the decryptor state
     * @return debug information string
     */
    public String getDebugInfo() {
        return "BcscFileDecryptor{" +
                "available=" + isAvailable() +
                ", encryptionType='AESEncryptor'" +
                ", keySource='AndroidKeyStoreSource'" +
                ", keyAlias='enc1'" +
                '}';
    }
}
