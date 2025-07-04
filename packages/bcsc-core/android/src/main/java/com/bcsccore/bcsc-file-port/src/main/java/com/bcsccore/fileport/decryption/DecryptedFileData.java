package com.bcsccore.fileport.decryption;

import androidx.annotation.NonNull;

import com.bcsccore.fileport.FileData;

/**
 * Data class that combines raw file data with decrypted content
 */
public class DecryptedFileData {
    
    private final FileData rawFileData;
    private final String decryptedContent;
    
    public DecryptedFileData(@NonNull FileData rawFileData, @NonNull String decryptedContent) {
        this.rawFileData = rawFileData;
        this.decryptedContent = decryptedContent;
    }
    
    /**
     * Get the original raw file data
     * @return FileData containing encrypted content
     */
    @NonNull
    public FileData getRawFileData() {
        return rawFileData;
    }
    
    /**
     * Get the decrypted content as string
     * @return decrypted content
     */
    @NonNull
    public String getDecryptedContent() {
        return decryptedContent;
    }
    
    /**
     * Get the file name
     * @return file name
     */
    @NonNull
    public String getFileName() {
        return rawFileData.getFilename();
    }
    
    /**
     * Get the raw encrypted content
     * @return encrypted byte array
     */
    @NonNull
    public byte[] getRawContent() {
        byte[] data = rawFileData.getData();
        return data != null ? data : new byte[0];
    }
    
    /**
     * Get the size of the encrypted file
     * @return file size in bytes
     */
    public long getSize() {
        return rawFileData.getFileSize();
    }
    
    /**
     * Get the size of the decrypted content
     * @return decrypted content size in bytes
     */
    public long getDecryptedSize() {
        return decryptedContent.getBytes().length;
    }
    
    /**
     * Check if the content appears to be JSON
     * @return true if content starts with '{' or '['
     */
    public boolean isJson() {
        String trimmed = decryptedContent.trim();
        return trimmed.startsWith("{") || trimmed.startsWith("[");
    }
    
    /**
     * Check if the file appears to be empty after decryption
     * @return true if decrypted content is empty or whitespace only
     */
    public boolean isEmpty() {
        return decryptedContent.trim().isEmpty();
    }
    
    @Override
    public String toString() {
        return "DecryptedFileData{" +
                "fileName='" + getFileName() + '\'' +
                ", rawSize=" + getSize() +
                ", decryptedSize=" + getDecryptedSize() +
                ", isJson=" + isJson() +
                ", isEmpty=" + isEmpty() +
                '}';
    }
}
