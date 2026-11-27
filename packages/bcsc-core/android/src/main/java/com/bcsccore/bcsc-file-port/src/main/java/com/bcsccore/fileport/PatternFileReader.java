package com.bcsccore.fileport;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

public interface PatternFileReader extends FileReader {
    
    /**
     * Read files matching a specific pattern
     * @param pattern the pattern to match (supports wildcards)
     */
    @NonNull
    FileData[] readFilesMatching(@NonNull String pattern);
    
    /**
     * Get list of files matching a pattern
     * @param pattern the pattern to match (supports wildcards)
     */
    @NonNull
    String[] listFilesMatching(@NonNull String pattern);
    
    @NonNull
    FileData[] readFilesWithPrefix(@NonNull String prefix);
    
    @NonNull
    FileData[] readFilesWithSuffix(@NonNull String suffix);
}
