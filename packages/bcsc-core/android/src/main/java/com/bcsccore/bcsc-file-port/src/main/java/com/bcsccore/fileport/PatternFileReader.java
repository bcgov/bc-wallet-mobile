package com.bcsccore.fileport;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

/**
 * Interface for pattern-based file operations
 */
public interface PatternFileReader extends FileReader {
    
    /**
     * Read files matching a specific pattern
     * @param pattern the pattern to match (supports wildcards)
     * @return array of FileData objects containing filename and content
     */
    @NonNull
    FileData[] readFilesMatching(@NonNull String pattern);
    
    /**
     * Get list of files matching a pattern
     * @param pattern the pattern to match (supports wildcards)
     * @return array of filenames matching the pattern
     */
    @NonNull
    String[] listFilesMatching(@NonNull String pattern);
    
    /**
     * Read all files with a specific prefix
     * @param prefix the filename prefix to match
     * @return array of FileData objects
     */
    @NonNull
    FileData[] readFilesWithPrefix(@NonNull String prefix);
    
    /**
     * Read all files with a specific suffix
     * @param suffix the filename suffix to match
     * @return array of FileData objects
     */
    @NonNull
    FileData[] readFilesWithSuffix(@NonNull String suffix);
}
