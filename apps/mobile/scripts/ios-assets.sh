#!/bin/sh
# Puts Smashy's icon and launch screen into the iPhone project (run from apps/mobile after `npx cap add ios`).
set -e
for f in ios/App/App/Assets.xcassets/AppIcon.appiconset/*.png; do cp resources/ios-icon-1024.png "$f"; done
for f in ios/App/App/Assets.xcassets/Splash.imageset/*.png; do cp resources/ios-splash-2732.png "$f"; done
echo "Smashy icon and launch screen copied."
