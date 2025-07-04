package com.bcsccore.fileport.encryption;

import android.os.Build.VERSION;
import android.os.Build.VERSION_CODES;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import androidx.annotation.NonNull;
import java.security.KeyStore;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;

/**
 * Android KeyStore implementation for providing secret keys.
 * This uses the same key alias and configuration as the original BCSC system.
 */
public class AndroidKeyStoreSource implements KeySource {

    private static final String ALIAS_ENC = "enc1";
    private static final String KEYSTORE_TYPE = "AndroidKeyStore";

    @NonNull
    @Override
    public SecretKey getSecretKey() throws Exception {
        KeyStore keyStore = loadAndroidKeyStore();

        if (!keyStore.containsAlias(ALIAS_ENC)) {
            generateSecretKey(ALIAS_ENC);
        }

        return (SecretKey) keyStore.getKey(ALIAS_ENC, null);
    }

    @NonNull
    private KeyStore loadAndroidKeyStore() throws Exception {
        KeyStore keyStore = KeyStore.getInstance(KEYSTORE_TYPE);
        keyStore.load(null);
        return keyStore;
    }

    private void generateSecretKey(String alias) throws Exception {
        final KeyGenParameterSpec.Builder builder = new KeyGenParameterSpec.Builder(
            alias,
            KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
        );

        builder.setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256);

        if (VERSION.SDK_INT >= VERSION_CODES.N) {
            builder.setInvalidatedByBiometricEnrollment(false);
        }

        final KeyGenParameterSpec spec = builder.build();

        final KeyGenerator generator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES,
            KEYSTORE_TYPE
        );

        generator.init(spec);
        generator.generateKey();
    }
}
