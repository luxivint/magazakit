#!/usr/bin/env bash
# Refresh native Firebase SDK files. Does not invent SHA fingerprints.
# Requires: npx firebase-tools login  (or ADC)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT=magazam-app
ANDROID_APP=1:978990997665:android:a0510c36ba5e3a42ded0e0
IOS_APP=1:978990997665:ios:72116d978e2e238bded0e0

npx -y firebase-tools@latest apps:sdkconfig ANDROID "$ANDROID_APP" --project "$PROJECT" \
  > "$ROOT/google-services.json"
npx -y firebase-tools@latest apps:sdkconfig IOS "$IOS_APP" --project "$PROJECT" \
  > "$ROOT/GoogleService-Info.plist"

echo "Wrote $ROOT/google-services.json and $ROOT/GoogleService-Info.plist"
echo "SHA fingerprints are not added here. After the first EAS Android build, register the upload key SHA-1/256 from EAS credentials in Firebase; do not invent hashes."
