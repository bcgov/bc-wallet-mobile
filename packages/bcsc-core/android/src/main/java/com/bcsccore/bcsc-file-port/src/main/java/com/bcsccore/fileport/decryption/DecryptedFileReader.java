package com.bcsccore.fileport.decryption;

import android.content.Context;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.bcsccore.fileport.FileData;
import com.bcsccore.fileport.FileReaderFactory;
import com.bcsccore.fileport.PatternFileReader;

import java.util.ArrayList;
import java.util.List;

/**
 * Helper class that combines file reading with decryption for BCSC files
 */
public class DecryptedFileReader {
    
    private final PatternFileReader fileReader;
    private final FileDecryptor decryptor;
    
    public DecryptedFileReader(@NonNull Context context) {
        this.fileReader = FileReaderFactory.createEnhancedFileReader(context);
        this.decryptor = new BcscFileDecryptor(context);
    }
    
    public DecryptedFileReader(@NonNull Context context, @NonNull String customDirectory) {
        // Note: customDirectory parameter is currently ignored as FileReaderFactory 
        // only supports reading from the app's private files directory
        this.fileReader = FileReaderFactory.createEnhancedFileReader(context);
        this.decryptor = new BcscFileDecryptor(context);
    }
    
    /**
     * Read and decrypt a specific file
     * @param fileName the name of the file to read
     * @return DecryptedFileData containing both raw and decrypted content, or null if file not found
     * @throws DecryptionException if decryption fails
     */
    @Nullable
    public DecryptedFileData readDecryptedFile(@NonNull String fileName) throws DecryptionException {
        byte[] fileData = fileReader.readFile(fileName);
        if (fileData == null) {
            return null;
        }
        
        long fileSize = fileReader.getFileSize(fileName);
        FileData fileDataObj = new FileData(fileName, fileData, fileSize);
        String decryptedContent = decryptor.decrypt(fileData);
        return new DecryptedFileData(fileDataObj, decryptedContent);
    }
    
    /**
     * Find and decrypt files matching a pattern
     * @param pattern wildcard pattern (e.g., "token_*.dat")
     * @return list of DecryptedFileData
     * @throws DecryptionException if any decryption fails
     */
    @NonNull
    public List<DecryptedFileData> findDecryptedFilesByPattern(@NonNull String pattern) throws DecryptionException {
        FileData[] files = fileReader.readFilesMatching(pattern);
        return decryptMultipleFiles(java.util.Arrays.asList(files));
    }
    
    /**
     * Find and decrypt files with specific prefix
     * @param prefix file name prefix
     * @return list of DecryptedFileData
     * @throws DecryptionException if any decryption fails
     */
    @NonNull
    public List<DecryptedFileData> findDecryptedFilesByPrefix(@NonNull String prefix) throws DecryptionException {
        FileData[] files = fileReader.readFilesWithPrefix(prefix);
        return decryptMultipleFiles(java.util.Arrays.asList(files));
    }
    
    /**
     * Find and decrypt files with specific suffix
     * @param suffix file name suffix
     * @return list of DecryptedFileData
     * @throws DecryptionException if any decryption fails
     */
    @NonNull
    public List<DecryptedFileData> findDecryptedFilesBySuffix(@NonNull String suffix) throws DecryptionException {
        FileData[] files = fileReader.readFilesWithSuffix(suffix);
        return decryptMultipleFiles(java.util.Arrays.asList(files));
    }
    
    /**
     * List all files in the directory (without decrypting)
     * @return list of file names
     */
    @NonNull
    public List<String> listFiles() {
        return java.util.Arrays.asList(fileReader.listFiles());
    }
    
    /**
     * Check if a file exists
     * @param fileName the file name to check
     * @return true if file exists
     */
    public boolean fileExists(@NonNull String fileName) {
        return fileReader.fileExists(fileName);
    }
    
    /**
     * Check if decryption is available
     * @return true if decryptor is ready
     */
    public boolean isDecryptionAvailable() {
        return decryptor.isAvailable();
    }
    
    /**
     * Get the underlying file reader for raw file operations
     * @return the PatternFileReader instance
     */
    @NonNull
    public PatternFileReader getFileReader() {
        return fileReader;
    }
    
    /**
     * Get the underlying decryptor
     * @return the FileDecryptor instance
     */
    @NonNull
    public FileDecryptor getDecryptor() {
        return decryptor;
    }
    
    private List<DecryptedFileData> decryptMultipleFiles(List<FileData> files) throws DecryptionException {
        List<DecryptedFileData> decryptedFiles = new ArrayList<>();
        
        for (FileData fileData : files) {
            try {
                String decryptedContent = decryptor.decrypt(fileData.getData());
                decryptedFiles.add(new DecryptedFileData(fileData, decryptedContent));
            } catch (DecryptionException e) {
                // Re-throw with file context
                throw new DecryptionException("Failed to decrypt file: " + fileData.getFilename(), e);
            }
        }
        
        return decryptedFiles;
    }
}
