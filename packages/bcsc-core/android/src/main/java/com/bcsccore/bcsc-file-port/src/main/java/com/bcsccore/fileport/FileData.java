package com.bcsccore.fileport;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

/**
 * Data class representing a file and its contents
 */
public class FileData {
    
    @NonNull
    private final String filename;
    
    @Nullable
    private final byte[] data;
    
    private final long fileSize;
    
    /**
     * Constructor
     * @param filename the name of the file
     * @param data the file contents (can be null if file couldn't be read)
     * @param fileSize the size of the file in bytes
     */
    public FileData(@NonNull String filename, @Nullable byte[] data, long fileSize) {
        this.filename = filename;
        this.data = data;
        this.fileSize = fileSize;
    }
    
    /**
     * Get the filename
     * @return filename
     */
    @NonNull
    public String getFilename() {
        return filename;
    }
    
    /**
     * Get the file data
     * @return file contents as byte array, or null if file couldn't be read
     */
    @Nullable
    public byte[] getData() {
        return data;
    }
    
    /**
     * Get the file size
     * @return file size in bytes
     */
    public long getFileSize() {
        return fileSize;
    }
    
    /**
     * Check if the file data was successfully read
     * @return true if data is available, false otherwise
     */
    public boolean hasData() {
        return data != null;
    }
    
    /**
     * Get the file data as a string (assuming UTF-8 encoding)
     * @return string representation of the file, or null if no data or encoding fails
     */
    @Nullable
    public String getDataAsString() {
        if (data == null) {
            return null;
        }
        
        try {
            return new String(data, "UTF-8");
        } catch (Exception e) {
            return null;
        }
    }
    
    @Override
    public String toString() {
        return "FileData{" +
                "filename='" + filename + '\'' +
                ", fileSize=" + fileSize +
                ", hasData=" + hasData() +
                '}';
    }
}
