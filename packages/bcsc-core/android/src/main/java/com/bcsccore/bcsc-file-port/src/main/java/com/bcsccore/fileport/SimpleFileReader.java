package com.bcsccore.fileport;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;

/**
 * Simple file reader implementation for reading files from app's private directory
 */
public class SimpleFileReader implements FileReader {
    
    @NonNull
    private final Context context;
    
    /**
     * Constructor
     * @param context Android application context
     */
    public SimpleFileReader(@NonNull Context context) {
        this.context = context;
    }
    
    @Override
    @Nullable
    public byte[] readFile(@NonNull String filename) {
        File file = new File(context.getFilesDir(), filename);
        
        if (!file.exists() || !file.isFile()) {
            return null;
        }
        
        try (FileInputStream fis = new FileInputStream(file)) {
            byte[] data = new byte[(int) file.length()];
            int bytesRead = fis.read(data);
            
            if (bytesRead != data.length) {
                // Partial read, return what we got
                byte[] partialData = new byte[bytesRead];
                System.arraycopy(data, 0, partialData, 0, bytesRead);
                return partialData;
            }
            
            return data;
            
        } catch (IOException e) {
            return null;
        }
    }
    
    @Override
    public boolean fileExists(@NonNull String filename) {
        File file = new File(context.getFilesDir(), filename);
        return file.exists() && file.isFile() && file.length() > 0;
    }
    
    @Override
    public long getFileSize(@NonNull String filename) {
        File file = new File(context.getFilesDir(), filename);
        
        if (!file.exists() || !file.isFile()) {
            return 0;
        }
        
        return file.length();
    }
    
    @Override
    @NonNull
    public String[] listFiles() {
        File filesDir = context.getFilesDir();
        String[] fileNames = filesDir.list();
        
        if (fileNames == null) {
            return new String[0];
        }
        
        return fileNames;
    }
    
    @Override
    @NonNull
    public File getStorageDirectory() {
        return context.getFilesDir();
    }
    
    /**
     * Read file as string (assuming UTF-8 encoding)
     * @param filename the name of the file to read
     * @return string content of the file, or null if file doesn't exist
     */
    @Nullable
    public String readFileAsString(@NonNull String filename) {
        byte[] data = readFile(filename);
        
        if (data == null) {
            return null;
        }
        
        try {
            return new String(data, "UTF-8");
        } catch (Exception e) {
            return null;
        }
    }
}
