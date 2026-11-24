package com.bcsccore.fileport;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import java.io.File;

public interface FileReader {
    
    /**
     * Read raw bytes from a file
     * @return byte array containing file contents, or null if file doesn't exist
     */
    @Nullable
    byte[] readFile(@NonNull String filename);
    
    /**
     * Check if a file exists
     * @return true if file exists and has content, false otherwise
     */
    boolean fileExists(@NonNull String filename);
    
    /**
     * Get the size of a file in bytes
     * @return file size in bytes, or 0 if file doesn't exist
     */
    long getFileSize(@NonNull String filename);
    
    /**
     * List all files in the directory
     * @return array of file names, or empty array if no files
     */
    @NonNull
    String[] listFiles();
    
    @NonNull
    File getStorageDirectory();
}
