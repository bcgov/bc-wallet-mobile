package com.bcsccore.keypair.core.exceptions;

/**
 * Enumeration of error keys used for identifying different types of exceptions.
 * This is a simplified version of the original AlertKey enum with only the
 * keys needed for key pair operations.
 */
public enum AlertKey {
  
  // General error
  GENERAL,
  
  // Key pair related errors
  ADD_CARD_KEYPAIR_GENERATION,
  ERR_108_UNABLE_TO_DELETE_KEY_PAIR,
  ERR_207_UNABLE_TO_SIGN_CLAIMS_SET,
  
  // Server and network errors
  SERVER_ERROR,
  NO_INTERNET,
  SERVER_TIMEOUT,
  
  // Token related errors
  INVALID_TOKEN,
  NO_TOKENS_RETURNED;
  
  public String getKeyString() {
    return this.name();
  }
  
}
