# BCSC File Port

A lightweight, reusable Android file reading utility extracted from the BCSC token storage system. This package provides simple file access capabilities without any encryption or decryption logic, making it suitable for copying to other projects that need basic file reading functionality.

## Features

- **Simple file reading**: Read files from Android's private app directory
- **Pattern-based file access**: Find files using wildcards, prefixes, and suffixes
- **File metadata access**: Get file size, existence, and modification time
- **Raw byte access**: Access file contents as byte arrays for further processing
- **Zero dependencies**: Pure Android/Java implementation with no external dependencies
- **No encryption logic**: Deliberately excludes encryption/decryption for portability

## Package Structure

```
com.bcsccore.fileport/
├── FileReader.java              # Basic file reading interface
├── SimpleFileReader.java        # Implementation for simple file operations
├── PatternFileReader.java       # Interface for pattern-based file access
├── EnhancedFileReader.java      # Implementation with pattern support
├── FileData.java               # Data class for file information
├── FileReaderFactory.java      # Factory for creating file readers
├── utils/
│   └── FileUtils.java          # Utility methods for file operations
└── example/
    └── FilePortExample.java    # Usage examples
```

## Quick Start

### Basic File Reading

```java
import com.bcsccore.fileport.*;

// Create a file reader for the app's private directory
FileReader fileReader = FileReaderFactory.createSimpleFileReader(context);

// Read a file
FileData fileData = fileReader.readFile("example.txt");
if (fileData != null) {
    String content = fileData.getContentAsString();
    long size = fileData.getSize();
}

// List all files
List<String> allFiles = fileReader.listFiles();
```

### Pattern-Based File Access

```java
// Create an enhanced file reader with pattern support
PatternFileReader patternReader = FileReaderFactory.createEnhancedFileReader(context);

// Find files matching patterns
List<FileData> tokenFiles = patternReader.findFilesByPattern("token_*.dat");
List<FileData> configFiles = patternReader.findFilesByPrefix("config_");
List<FileData> dataFiles = patternReader.findFilesBySuffix(".dat");
```

### Custom Directory

```java
// Read from a custom directory
String customPath = context.getFilesDir().getAbsolutePath() + "/custom_data";
FileReader customReader = FileReaderFactory.createSimpleFileReader(customPath);
```

## API Reference

### FileReader Interface

- `FileData readFile(String fileName)` - Read a specific file
- `List<String> listFiles()` - List all files in the directory
- `boolean fileExists(String fileName)` - Check if a file exists

### PatternFileReader Interface

Extends `FileReader` with additional methods:

- `List<FileData> findFilesByPattern(String pattern)` - Find files using wildcards
- `List<FileData> findFilesByPrefix(String prefix)` - Find files with specific prefix
- `List<FileData> findFilesBySuffix(String suffix)` - Find files with specific suffix

### FileData Class

- `String getFileName()` - Get the file name
- `byte[] getContent()` - Get raw file content as bytes
- `String getContentAsString()` - Get content as UTF-8 string
- `long getSize()` - Get file size in bytes

### FileUtils Utility Methods

- `boolean fileExists(File directory, String fileName)`
- `long getFileSize(File directory, String fileName)`
- `long getLastModified(File directory, String fileName)`
- `String bytesToString(byte[] bytes)`
- `String bytesToHex(byte[] bytes)`

## Usage Examples

See `FilePortExample.java` for comprehensive usage examples including:

- Basic file reading operations
- Pattern-based file searching
- Utility operations
- Custom directory access
- Token file management (without decryption)

## Integration

### As a Module

1. Copy the `bcsc-file-port` directory to your Android project
2. Add to `settings.gradle`:
   ```gradle
   include ':bcsc-file-port'
   ```
3. Add dependency in your app's `build.gradle`:
   ```gradle
   implementation project(':bcsc-file-port')
   ```

### As Source Code

Simply copy the Java files from `src/main/java/com/bcsccore/fileport/` to your project and adjust the package name as needed.

## Important Notes

- **No Encryption**: This package deliberately excludes all encryption/decryption logic for portability
- **Raw Access Only**: Files are read as raw bytes - any decryption must be handled separately
- **Private Directory**: Designed for Android's private app directory access
- **Exception Handling**: Most methods return null or empty lists on error - check for exceptions in production code

## License

This package is extracted from the BC Services Card Android application and follows the same licensing terms.
