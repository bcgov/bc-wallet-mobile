package com.bcsccore.fileport.decryption;

public class DecryptionException extends Exception {
    
    public DecryptionException(String message) {
        super(message);
    }
    
    public DecryptionException(String message, Throwable cause) {
        super(message, cause);
    }
    
    public DecryptionException(Throwable cause) {
        super(cause);
    }
}
