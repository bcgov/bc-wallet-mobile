package com.bcsccore.keypair.example.simplified;

import android.content.Context;
import androidx.annotation.NonNull;
import com.bcsccore.keypair.core.interfaces.BcscKeyPairSource;
import com.bcsccore.keypair.core.interfaces.KeyPairInfoSource;
import com.bcsccore.keypair.core.models.BcscKeyPair;
import com.bcsccore.keypair.core.exceptions.BcscException;
import com.bcsccore.keypair.core.utils.SimpleLog;
import com.bcsccore.keypair.repos.key.BcscKeyPairRepo;
import com.bcsccore.keypair.repos.keypairinfo.SimpleKeyPairInfoSource;
import com.nimbusds.jose.jwk.JWK;
import com.nimbusds.jwt.JWTClaimsSet;
import java.util.Date;
import java.util.UUID;

/**
 * Example usage of the BC Services Card KeyPair functionality.
 * 
 * This example demonstrates:
 * 1. Setting up the key pair repository
 * 2. Generating and retrieving key pairs
 * 3. Signing JWT claims sets (the core attestation signing functionality)
 * 4. Converting key pairs to JWK format for public key sharing
 * 5. Proper error handling
 */
public class KeyPairExample {

  private static final String TAG = "KeyPairExample";

  private final BcscKeyPairSource keyPairSource;

  /**
   * Initialize the KeyPair example with Android context.
   * @param context the Android application context
   */
  public KeyPairExample(@NonNull Context context) {
    // Set up the key pair info storage
    KeyPairInfoSource keyPairInfoSource = new SimpleKeyPairInfoSource(context);
    
    // Create the main key pair repository
    this.keyPairSource = new BcscKeyPairRepo(keyPairInfoSource);
  }

  /**
   * Demonstrate basic key pair operations.
   */
  public void demonstrateKeyPairOperations() {
    try {
      SimpleLog.i(TAG, "=== BC Services Card KeyPair Demo ===");
      
      // Check if Android KeyStore is available
      if (!keyPairSource.isAvailable()) {
        SimpleLog.e(TAG, "Android KeyStore is not available on this device");
        return;
      }
      
      SimpleLog.i(TAG, "Android KeyStore is available");
      
      // Get or create the current key pair
      BcscKeyPair currentKeyPair = keyPairSource.getCurrentBcscKeyPair();
      SimpleLog.i(TAG, "Current key pair alias: " + currentKeyPair.getKeyInfo().getAlias());
      SimpleLog.i(TAG, "Key pair created at: " + new Date(currentKeyPair.getKeyInfo().getCreatedAt()));
      
      // Demonstrate JWT signing (this is where attestation signing happens)
      demonstrateJWTSigning(currentKeyPair);
      
      // Demonstrate JWK conversion for public key sharing
      demonstrateJWKConversion(currentKeyPair);
      
      // Demonstrate creating a new key pair
      demonstrateNewKeyPair();
      
      // Demonstrate key pair cleanup
      demonstrateKeyPairCleanup();
      
    } catch (BcscException e) {
      SimpleLog.e(TAG, "KeyPair operation failed: " + e.getDevMessage(), e);
    }
  }

  /**
   * Demonstrate JWT signing - this is the core attestation signing functionality.
   */
  private void demonstrateJWTSigning(@NonNull BcscKeyPair keyPair) throws BcscException {
    SimpleLog.i(TAG, "\n=== JWT Signing Demo ===");
    
    // Create sample JWT claims (this would be your actual attestation data)
    JWTClaimsSet claimsSet = new JWTClaimsSet.Builder()
        .subject("user123")
        .issuer("your-app")
        .audience("target-service")
        .expirationTime(new Date(System.currentTimeMillis() + 300000)) // 5 minutes
        .issueTime(new Date())
        .jwtID(UUID.randomUUID().toString())
        .claim("custom_claim", "attestation_data")
        .claim("device_id", "device123")
        .build();
    
    // Sign the JWT using the private key (THIS IS WHERE ATTESTATION IS SIGNED)
    String signedJWT = keyPairSource.signAndSerializeClaimsSet(claimsSet);
    
    SimpleLog.i(TAG, "Successfully signed JWT!");
    SimpleLog.d(TAG, "Signed JWT (first 100 chars): " + signedJWT.substring(0, Math.min(100, signedJWT.length())) + "...");
    
    // In a real application, you would now send this signed JWT to your server
    // The server can verify the signature using the public key
  }

  /**
   * Demonstrate converting key pair to JWK format for public key sharing.
   */
  private void demonstrateJWKConversion(@NonNull BcscKeyPair keyPair) {
    SimpleLog.i(TAG, "\n=== JWK Conversion Demo ===");
    
    // Convert the public key to JWK format
    JWK publicKeyJWK = keyPairSource.convertBcscKeyPairToJWK(keyPair);
    
    SimpleLog.i(TAG, "Public key in JWK format:");
    SimpleLog.d(TAG, publicKeyJWK.toJSONString());
    
    // In a real application, you would share this JWK with servers that need to verify your signatures
  }

  /**
   * Demonstrate creating a new key pair (key rotation).
   */
  private void demonstrateNewKeyPair() throws BcscException {
    SimpleLog.i(TAG, "\n=== New KeyPair Generation Demo ===");
    
    // Generate a new key pair (this rotates keys)
    BcscKeyPair newKeyPair = keyPairSource.getNewBcscKeyPair();
    
    SimpleLog.i(TAG, "Generated new key pair: " + newKeyPair.getKeyInfo().getAlias());
    SimpleLog.i(TAG, "New key pair created at: " + new Date(newKeyPair.getKeyInfo().getCreatedAt()));
  }

  /**
   * Demonstrate key pair cleanup (removing old keys).
   */
  private void demonstrateKeyPairCleanup() throws BcscException {
    SimpleLog.i(TAG, "\n=== KeyPair Cleanup Demo ===");
    
    // Clean up old key pairs (keeps only the newest ones)
    keyPairSource.cleanUpBcscKeyPairs();
    
    SimpleLog.i(TAG, "Key pair cleanup completed");
  }

  /**
   * Demonstrate error handling.
   */
  public void demonstrateErrorHandling() {
    SimpleLog.i(TAG, "\n=== Error Handling Demo ===");
    
    try {
      // Try to get a non-existent key pair
      BcscKeyPair nonExistent = keyPairSource.getBcscKeyPair("non-existent-alias");
      if (nonExistent == null) {
        SimpleLog.i(TAG, "Correctly returned null for non-existent key pair");
      }
      
      // Try to delete a non-existent key pair (this will throw an exception)
      keyPairSource.deleteBcscKeyPair("non-existent-alias");
      
    } catch (BcscException e) {
      SimpleLog.i(TAG, "Caught expected exception: " + e.getAlertKey() + " - " + e.getDevMessage());
    }
  }

  /**
   * Example of how to create a client assertion JWT for OAuth flows.
   * This is one of the main use cases for the key pair signing functionality.
   */
  public String createClientAssertionJWT(@NonNull String clientId, @NonNull String audience) throws BcscException {
    SimpleLog.i(TAG, "\n=== Client Assertion JWT Demo ===");
    
    // Get current key pair for signing
    BcscKeyPair keyPair = keyPairSource.getCurrentBcscKeyPair();
    
    // Create client assertion claims
    JWTClaimsSet claimsSet = new JWTClaimsSet.Builder()
        .issuer(clientId)
        .subject(clientId)
        .audience(audience)
        .expirationTime(new Date(System.currentTimeMillis() + 300000)) // 5 minutes
        .issueTime(new Date())
        .jwtID(UUID.randomUUID().toString())
        .build();
    
    // Sign and return the client assertion
    String clientAssertion = keyPairSource.signAndSerializeClaimsSet(claimsSet);
    
    SimpleLog.i(TAG, "Created client assertion JWT for OAuth flow");
    return clientAssertion;
  }

}
