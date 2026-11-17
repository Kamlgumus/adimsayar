#!/bin/bash

echo "👟 AdımSayar APK Kurulum Scripti"
echo "================================"
echo ""

# Node.js kontrolü
if ! command -v node &> /dev/null; then
    echo "❌ Node.js bulunamadı! Lütfen Node.js 18+ yükleyin."
    echo "   https://nodejs.org"
    exit 1
fi

echo "✅ Node.js bulundu: $(node -v)"

# npm kontrolü
if ! command -v npm &> /dev/null; then
    echo "❌ npm bulunamadı!"
    exit 1
fi

echo "✅ npm bulundu: $(npm -v)"

# Java kontrolü
if ! command -v java &> /dev/null; then
    echo "❌ Java bulunamadı! JDK 17 yükleyin."
    echo "   https://adoptium.net/"
    exit 1
fi

echo "✅ Java bulundu: $(java -version 2>&1 | head -1)"

# Android SDK kontrolü
if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
    echo "⚠️  ANDROID_HOME ayarlanmamış. Android Studio yükleyin."
    echo "   https://developer.android.com/studio"
    echo ""
    echo "   Kurduktan sonra:"
    echo "   export ANDROID_HOME=\$HOME/Android/Sdk"
    echo "   export PATH=\$PATH:\$ANDROID_HOME/tools:\$ANDROID_HOME/platform-tools"
    exit 1
fi

echo "✅ Android SDK bulundu: $ANDROID_HOME"

echo ""
echo "📦 Bağımlılıklar yükleniyor..."
npm install

echo ""
echo "🔨 Web uygulaması build ediliyor..."
npm run build

echo ""
echo "📱 Android platformu ekleniyor..."
npx cap add android 2>/dev/null || echo "Android platformu zaten eklenmiş."

echo ""
echo "🔄 Capacitor senkronize ediliyor..."
npx cap sync android

echo ""
echo "🏗️  APK build ediliyor..."
cd android
chmod +x gradlew
./gradlew assembleDebug

echo ""
echo "✅ APK hazır!"
echo "📍 Konum: android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "📲 Bu dosyayı telefonunuza gönderin ve kurun."
echo "   (Ayarlar > Güvenlik > Bilinmeyen Kaynaklar'ı açmanız gerekebilir)"
