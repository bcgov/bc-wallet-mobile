package com.bcsccore.fileport.utils;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

/**
 * Utility class for file operations
 */
public class FileUtils {
    
    private FileUtils() {
        // Private constructor to prevent instantiation
    }
    
    /**
     * Read all bytes from an InputStream
     * @param inputStream the input stream to read from
     * @return byte array containing all data from the stream
     * @throws IOException if an error occurs reading the stream
     */
    @NonNull
    public static byte[] readBytesFromStream(@NonNull InputStream inputStream) throws IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        byte[] data = new byte[8192]; // 8KB buffer
        int bytesRead;
        
        while ((bytesRead = inputStream.read(data, 0, data.length)) != -1) {
            buffer.write(data, 0, bytesRead);
        }
        
        buffer.flush();
        return buffer.toByteArray();
    }
    
    /**
     * Convert byte array to hex string
     * @param bytes byte array to convert
     * @return hex string representation
     */
    @NonNull
    public static String bytesToHex(@Nullable byte[] bytes) {
        if (bytes == null) {
            return "";
        }
        
        StringBuilder result = new StringBuilder();
        for (byte b : bytes) {
            result.append(String.format("%02x", b));
        }
        return result.toString();
    }
    
    /**
     * Get file extension from filename
     * @param filename the filename
     * @return file extension (without dot), or empty string if no extension
     */
    @NonNull
    public static String getFileExtension(@NonNull String filename) {
        int lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex == -1 || lastDotIndex == filename.length() - 1) {
            return "";
        }
        return filename.substring(lastDotIndex + 1);
    }
    
    /**
     * Get filename without extension
     * @param filename the filename
     * @return filename without extension
     */
    @NonNull
    public static String getFilenameWithoutExtension(@NonNull String filename) {
        int lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex == -1) {
            return filename;
        }
        return filename.substring(0, lastDotIndex);
    }
    
    /**
     * Format file size in human-readable format
     * @param sizeInBytes file size in bytes
     * @return formatted size string (e.g., "1.5 KB", "2.3 MB")
     */
    @NonNull
    public static String formatFileSize(long sizeInBytes) {
        if (sizeInBytes < 1024) {
            return sizeInBytes + " B";
        }
        
        int unit = 1024;
        int exp = (int) (Math.log(sizeInBytes) / Math.log(unit));
        String pre = "KMGTPE".charAt(exp - 1) + "";
        
        return String.format("%.1f %sB", sizeInBytes / Math.pow(unit, exp), pre);
    }
    
    /**
     * Check if filename appears to be a token file
     * @param filename the filename to check
     * @return true if filename suggests it's a token file
     */
    public static boolean isTokenFile(@NonNull String filename) {
        String lowerFilename = filename.toLowerCase();
        return lowerFilename.startsWith("tokens") || 
               lowerFilename.contains("token") ||
               lowerFilename.contains("auth") ||
               lowerFilename.contains("credential");
    }
    
    /**
     * Check if filename appears to be a BCSC-related file
     * @param filename the filename to check
     * @return true if filename suggests it's BCSC-related
     */
    public static boolean isBcscFile(@NonNull String filename) {
        String lowerFilename = filename.toLowerCase();
        return lowerFilename.contains("bcsc") ||
               lowerFilename.contains("token") ||
               lowerFilename.contains("account") ||
               lowerFilename.contains("provider") ||
               lowerFilename.contains("keypair") ||
               lowerFilename.contains("credential");
    }
}
