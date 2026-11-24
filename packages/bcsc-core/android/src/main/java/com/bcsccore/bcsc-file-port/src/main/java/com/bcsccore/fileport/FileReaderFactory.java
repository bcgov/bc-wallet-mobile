package com.bcsccore.fileport;

import android.content.Context;
import androidx.annotation.NonNull;

public class FileReaderFactory {
    
    private FileReaderFactory() {
        // Private constructor to prevent instantiation
    }
    
    @NonNull
    public static SimpleFileReader createSimpleFileReader(@NonNull Context context) {
        return new SimpleFileReader(context);
    }
    
    @NonNull
    public static EnhancedFileReader createEnhancedFileReader(@NonNull Context context) {
        return new EnhancedFileReader(context);
    }
    
    /**
     * Create the default file reader (enhanced version)
     */
    @NonNull
    public static EnhancedFileReader createDefaultFileReader(@NonNull Context context) {
        return createEnhancedFileReader(context);
    }
}
