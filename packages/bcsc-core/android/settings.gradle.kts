// Settings file for standalone IDE support
// This allows VS Code to properly resolve dependencies when editing this module

rootProject.name = "react-native-bcsc-core"

pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
    
    // Define plugin versions for standalone builds
    plugins {
        id("com.android.library") version "8.6.1"
        id("org.jetbrains.kotlin.android") version "1.9.20"
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.PREFER_PROJECT)
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://www.jitpack.io") }
        // React Native maven repository
        maven { url = uri("https://oss.sonatype.org/content/repositories/snapshots/") }
        mavenLocal()
    }
}
