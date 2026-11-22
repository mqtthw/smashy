# Smashy mobile apps

A Capacitor shell that opens https://smashy.gg full-screen, with native push notifications.
The plan and store steps are in `docs/store-apps-plan.md` (working notes, not in the public copy).

- App IDs (permanent): Android `gg.smashy.app`; iPhone `gg.smashy.ios` (`gg.smashy.app` was taken by a test team on the iPhone side). Signing details are in `MAC-SETUP.md` (not in the public copy).
- Android project: `android/` (open with `npm run android`, needs Android Studio)
- iPhone project: `ios/` (made on the Mac with `npx cap add ios`, open with `npm run ios`, needs Xcode)
- After changing `capacitor.config.json`: `npx cap sync`

Site changes reach the apps right away (they load the live site); only changes to this folder
need a new app version.

## Building the Android test app on Windows

Gradle 8.14 can't run on Android Studio's own Java (25), so build with Java 22:

```bash
cd apps/mobile/android
JAVA_HOME="/c/Program Files/Java/jdk-22" ./gradlew.bat assembleDebug
```

The test app lands in `android/app/build/outputs/apk/debug/app-debug.apk`. `android/local.properties`
(not saved in git) points at the Android SDK: `sdk.dir=C:/Users/<you>/AppData/Local/Android/Sdk`.
