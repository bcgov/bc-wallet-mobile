package com.bcsccore.fileport.encryption;

import androidx.annotation.NonNull;
import java.math.BigInteger;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * AES-GCM encryption/decryption implementation.
 * This is a self-contained copy of the original BCSC AESEncryptor class.
 */
public class AESEncryptor implements Encryption {

    private static final int T_LEN_SIZE = Integer.SIZE / 8;
    private static final int IV_LEN = 12;

    @NonNull
    private KeySource secretKeySource;

    public AESEncryptor(@NonNull KeySource keySource) {
        this.secretKeySource = keySource;
    }

    @Override
    public byte[] encrypt(String message) throws Exception {

        byte[] src = message.getBytes(StandardCharsets.UTF_8);

        SecretKey key = secretKeySource.getSecretKey();

        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key);
        GCMParameterSpec gcmParameterSpec = cipher.getParameters()
                .getParameterSpec(GCMParameterSpec.class);

        byte[] cipherBytes = cipher.doFinal(src);

        ByteBuffer byteBuffer = ByteBuffer.allocate(T_LEN_SIZE);
        byteBuffer.putInt(gcmParameterSpec.getTLen());
        byte[] tLen = byteBuffer.array();

        byte[] iv = gcmParameterSpec.getIV();

        byte[] encryptedBytes = new byte[tLen.length + iv.length + cipherBytes.length];
        System.arraycopy(tLen, 0, encryptedBytes, 0, tLen.length);
        System.arraycopy(iv, 0, encryptedBytes, tLen.length, iv.length);
        System.arraycopy(cipherBytes, 0, encryptedBytes, tLen.length + iv.length, cipherBytes.length);

        return encryptedBytes;
    }

    @Override
    public String decrypt(byte[] src) throws Exception {

        if (src == null || src.length <= T_LEN_SIZE + IV_LEN) {
            return "";
        }

        byte[] tLenBytes = new byte[T_LEN_SIZE];
        System.arraycopy(src, 0, tLenBytes, 0, T_LEN_SIZE);

        int tLen = new BigInteger(tLenBytes).intValue();
        if (tLen == 0) {
            return "";
        }

        byte[] ivBytes = new byte[IV_LEN];
        System.arraycopy(src, T_LEN_SIZE, ivBytes, 0, IV_LEN);

        GCMParameterSpec gcmParameterSpec = new GCMParameterSpec(tLen, ivBytes);

        SecretKey key = secretKeySource.getSecretKey();
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key, gcmParameterSpec);

        int headerLen = T_LEN_SIZE + IV_LEN;
        byte[] decryptedBytes = cipher.doFinal(src, headerLen, src.length - headerLen);

        return new String(decryptedBytes, StandardCharsets.UTF_8);
    }
}
