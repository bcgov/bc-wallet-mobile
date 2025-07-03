package com.bcsccore.fileport;

import android.content.Context;
import androidx.annotation.NonNull;

/**
 * Factory class for creating file readers
 */
public class FileReaderFactory {
    
    private FileReaderFactory() {
        // Private constructor to prevent instantiation
    }
    
    /**
     * Create a simple file reader
     * @param context Android application context
     * @return SimpleFileReader instance
     */
    @NonNull
    public static SimpleFileReader createSimpleFileReader(@NonNull Context context) {
        return new SimpleFileReader(context);
    }
    
    /**
     * Create an enhanced file reader with pattern matching capabilities
     * @param context Android application context
     * @return EnhancedFileReader instance
     */
    @NonNull
    public static EnhancedFileReader createEnhancedFileReader(@NonNull Context context) {
        return new EnhancedFileReader(context);
    }
    
    /**
     * Create the default file reader (enhanced version)
     * @param context Android application context
     * @return EnhancedFileReader instance
     */
    @NonNull
    public static EnhancedFileReader createDefaultFileReader(@NonNull Context context) {
        return createEnhancedFileReader(context);
    }
}
