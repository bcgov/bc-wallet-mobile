package com.bcsccore.keypair.repos.keypairinfo;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.bcsccore.keypair.core.exceptions.BcscException;
import com.bcsccore.keypair.core.models.KeyPairInfo;
import com.bcsccore.keypair.core.interfaces.KeyPairInfoSource;
import com.bcsccore.keypair.core.utils.SimpleLog;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import java.lang.reflect.Type;
import java.util.HashMap;

/**
 * Simple implementation of KeyPairInfoSource using SharedPreferences for storage.
 * This is a simplified version that stores key pair metadata as JSON in SharedPreferences.
 * 
 * For production use, consider:
 * - Encrypting the stored data
 * - Using more secure storage mechanisms
 * - Adding backup/restore functionality
 */
public class SimpleKeyPairInfoSource implements KeyPairInfoSource {

  private static final String TAG = "SimpleKeyPairInfoSource";
  private static final String PREFS_NAME = "bcsc_keypair_info";
  private static final String KEY_PAIR_INFO_KEY = "keypair_info_map";

  private final SharedPreferences sharedPreferences;
  private final Gson gson;

  /**
   * Create a new SimpleKeyPairInfoSource.
   * @param context the Android context for accessing SharedPreferences
   */
  public SimpleKeyPairInfoSource(@NonNull Context context) {
    this.sharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    this.gson = new Gson();
  }

  @Nullable
  @Override
  public KeyPairInfo getKeyPairInfo(String kid) {
    try {
      HashMap<String, KeyPairInfo> infoMap = getKeyPairInfo();
      return infoMap.get(kid);
    } catch (Exception e) {
      SimpleLog.e(TAG, "Failed to get key pair info for " + kid, e);
      return null;
    }
  }

  @NonNull
  @Override
  public HashMap<String, KeyPairInfo> getKeyPairInfo() throws BcscException {
    try {
      String json = sharedPreferences.getString(KEY_PAIR_INFO_KEY, "{}");
      Type type = new TypeToken<HashMap<String, KeyPairInfoData>>(){}.getType();
      HashMap<String, KeyPairInfoData> dataMap = gson.fromJson(json, type);
      
      HashMap<String, KeyPairInfo> infoMap = new HashMap<>();
      if (dataMap != null) {
        for (String key : dataMap.keySet()) {
          KeyPairInfoData data = dataMap.get(key);
          if (data != null) {
            infoMap.put(key, new KeyPairInfo(data.alias, data.createdAt));
          }
        }
      }
      
      SimpleLog.d(TAG, "Loaded key pairs: " + infoMap.keySet());
      return infoMap;
    } catch (Exception e) {
      SimpleLog.e(TAG, "Failed to load key pair info", e);
      throw new BcscException("Failed to load key pair information: " + e.getMessage());
    }
  }

  @Override
  public void saveKeyPairInfo(KeyPairInfo info) throws BcscException {
    try {
      HashMap<String, KeyPairInfo> infoMap = getKeyPairInfo();
      infoMap.put(info.getAlias(), info);
      
      HashMap<String, KeyPairInfoData> dataMap = new HashMap<>();
      for (String key : infoMap.keySet()) {
        KeyPairInfo keyInfo = infoMap.get(key);
        if (keyInfo != null) {
          dataMap.put(key, new KeyPairInfoData(keyInfo.getAlias(), keyInfo.getCreatedAt()));
        }
      }
      
      String json = gson.toJson(dataMap);
      sharedPreferences.edit().putString(KEY_PAIR_INFO_KEY, json).apply();
      
      SimpleLog.d(TAG, "Saved key pair info for " + info.getAlias());
    } catch (Exception e) {
      SimpleLog.e(TAG, "Failed to save key pair info", e);
      throw new BcscException("Failed to save key pair information: " + e.getMessage());
    }
  }

  @Override
  public void deleteKeyPairInfo(String alias) throws BcscException {
    try {
      HashMap<String, KeyPairInfo> infoMap = getKeyPairInfo();
      infoMap.remove(alias);
      
      HashMap<String, KeyPairInfoData> dataMap = new HashMap<>();
      for (String key : infoMap.keySet()) {
        KeyPairInfo keyInfo = infoMap.get(key);
        if (keyInfo != null) {
          dataMap.put(key, new KeyPairInfoData(keyInfo.getAlias(), keyInfo.getCreatedAt()));
        }
      }
      
      String json = gson.toJson(dataMap);
      sharedPreferences.edit().putString(KEY_PAIR_INFO_KEY, json).apply();
      
      SimpleLog.d(TAG, "Deleted key pair info for " + alias);
    } catch (Exception e) {
      SimpleLog.e(TAG, "Failed to delete key pair info", e);
      throw new BcscException("Failed to delete key pair information: " + e.getMessage());
    }
  }

  /**
   * Simple data class for JSON serialization.
   * This avoids issues with serializing the KeyPairInfo class directly.
   */
  private static class KeyPairInfoData {
    public String alias;
    public Long createdAt;

    public KeyPairInfoData(String alias, Long createdAt) {
      this.alias = alias;
      this.createdAt = createdAt;
    }
  }

}
