# How to Re-Trust Your iOS Signing Certificate

Occasionally, you may encounter a build issue on iOS that requires you to re-trust your signing certificate. Follow these steps to resolve the issue:

1. Open **Xcode**.
2. Go to the **Signing & Capabilities** tab of your project.
3. In the iOS section, locate the problematic certificate (it should be marked with an error). Note the certificate’s identifier or number.
4. Press `Cmd + Spacebar` to open Spotlight Search.
5. Search for and open **Keychain Access**.
6. In Keychain Access, select **My Certificates** under the **login** keychain.
7. Find the certificate matching the identifier or number from step 3.
8. Double-click the certificate to open its details.
9. Expand the **Trust** section.
10. Set **When using this certificate** to **Always Trust**.
11. Close the certificate details window.
12. Reopen **Xcode**.
13. Return to the **Signing & Capabilities** tab and click the **Repair Trust** button if available.

Your signing certificate should now be trusted and the build issue resolved.
