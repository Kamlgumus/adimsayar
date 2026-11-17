@echo off
echo.
echo 👟 AdımSayar APK Kurulum Scripti (Windows)
echo ==========================================
echo.

REM Node.js kontrolü
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js bulunamadi! Lutfen Node.js 18+ yukleyin.
    echo    https://nodejs.org
    pause
    exit /b 1
)
echo ✅ Node.js bulundu

REM Java kontrolü
where java >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Java bulunamadi! JDK 17 yukleyin.
    echo    https://adoptium.net/
    pause
    exit /b 1
)
echo ✅ Java bulundu

echo.
echo 📦 Bagimliliklar yukleniyor...
call npm install

echo.
echo 🔨 Web uygulamsi build ediliyor...
call npm run build

echo.
echo 📱 Android platformu ekleniyor...
call npx cap add android 2>nul

echo.
echo 🔄 Capacitor senkronize ediliyor...
call npx cap sync android

echo.
echo 🏗️  APK build ediliyor...
cd android
call gradlew assembleDebug

echo.
echo ✅ APK hazir!
echo 📍 Konum: android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo 📲 Bu dosyayi telefonunuza gonderin ve kurun.
pause
