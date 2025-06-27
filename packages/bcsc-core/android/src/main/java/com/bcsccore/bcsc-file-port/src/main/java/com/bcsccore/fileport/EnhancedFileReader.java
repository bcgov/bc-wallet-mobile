package com.bcsccore.fileport;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Enhanced file reader with pattern matching capabilities
 */
public class EnhancedFileReader extends SimpleFileReader implements PatternFileReader {
    
    /**
     * Constructor
     * @param context Android application context
     */
    public EnhancedFileReader(@NonNull Context context) {
        super(context);
    }
    
    @Override
    @NonNull
    public FileData[] readFilesMatching(@NonNull String pattern) {
        String[] matchingFiles = listFilesMatching(pattern);
        List<FileData> fileDataList = new ArrayList<>();
        
        for (String filename : matchingFiles) {
            byte[] data = readFile(filename);
            long fileSize = getFileSize(filename);
            fileDataList.add(new FileData(filename, data, fileSize));
        }
        
        return fileDataList.toArray(new FileData[0]);
    }
    
    @Override
    @NonNull
    public String[] listFilesMatching(@NonNull String pattern) {
        String[] allFiles = listFiles();
        List<String> matchingFiles = new ArrayList<>();
        
        // Convert wildcard pattern to regex
        String regexPattern = wildcardToRegex(pattern);
        Pattern compiledPattern = Pattern.compile(regexPattern);
        
        for (String filename : allFiles) {
            if (compiledPattern.matcher(filename).matches()) {
                matchingFiles.add(filename);
            }
        }
        
        return matchingFiles.toArray(new String[0]);
    }
    
    @Override
    @NonNull
    public FileData[] readFilesWithPrefix(@NonNull String prefix) {
        String[] allFiles = listFiles();
        List<FileData> fileDataList = new ArrayList<>();
        
        for (String filename : allFiles) {
            if (filename.startsWith(prefix)) {
                byte[] data = readFile(filename);
                long fileSize = getFileSize(filename);
                fileDataList.add(new FileData(filename, data, fileSize));
            }
        }
        
        return fileDataList.toArray(new FileData[0]);
    }
    
    @Override
    @NonNull
    public FileData[] readFilesWithSuffix(@NonNull String suffix) {
        String[] allFiles = listFiles();
        List<FileData> fileDataList = new ArrayList<>();
        
        for (String filename : allFiles) {
            if (filename.endsWith(suffix)) {
                byte[] data = readFile(filename);
                long fileSize = getFileSize(filename);
                fileDataList.add(new FileData(filename, data, fileSize));
            }
        }
        
        return fileDataList.toArray(new FileData[0]);
    }
    
    /**
     * Read all token files (files starting with "tokens")
     * @return array of FileData objects for all token files
     */
    @NonNull
    public FileData[] readAllTokenFiles() {
        return readFilesWithPrefix("tokens");
    }
    
    /**
     * Read files matching common BCSC patterns
     * @return array of FileData objects for BCSC-related files
     */
    @NonNull
    public FileData[] readBcscFiles() {
        List<FileData> allBcscFiles = new ArrayList<>();
        
        // Add token files
        FileData[] tokenFiles = readFilesWithPrefix("tokens");
        for (FileData fileData : tokenFiles) {
            allBcscFiles.add(fileData);
        }
        
        // Add other common BCSC files
        String[] commonPrefixes = {"accounts", "providers", "keypair", "credentials"};
        for (String prefix : commonPrefixes) {
            FileData[] files = readFilesWithPrefix(prefix);
            for (FileData fileData : files) {
                allBcscFiles.add(fileData);
            }
        }
        
        return allBcscFiles.toArray(new FileData[0]);
    }
    
    /**
     * Convert wildcard pattern to regex
     * @param wildcardPattern pattern with * and ? wildcards
     * @return regex pattern
     */
    private String wildcardToRegex(String wildcardPattern) {
        StringBuilder sb = new StringBuilder(wildcardPattern.length());
        sb.append('^');
        
        for (int i = 0; i < wildcardPattern.length(); ++i) {
            char c = wildcardPattern.charAt(i);
            switch (c) {
                case '*':
                    sb.append(".*");
                    break;
                case '?':
                    sb.append('.');
                    break;
                case '(':
                case ')':
                case '[':
                case ']':
                case '$':
                case '^':
                case '.':
                case '{':
                case '}':
                case '|':
                case '\\':
                    sb.append("\\");
                    sb.append(c);
                    break;
                default:
                    sb.append(c);
                    break;
            }
        }
        
        sb.append('$');
        return sb.toString();
    }
}
