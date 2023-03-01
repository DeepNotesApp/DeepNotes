zipalign -f -v 4 ./dist/capacitor/android/apk/release/app-release-unsigned.apk ./dist/capacitor/android/apk/release/app-release-aligned.apk
apksigner sign --ks ./deepnotes.keystore ./dist/capacitor/android/apk/release/app-release-aligned.apk
