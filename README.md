# 👟 AdımSayar - Akıllı Adım Takip Uygulaması

Gerçek telefon sensörlerini kullanan, kalori/mesafe/hedef takibi yapan adımsayar uygulaması.

## 📱 APK Oluşturma (GitHub Actions ile)

### Yöntem 1: Otomatik (Önerilen)

1. Bu projeyi GitHub'a yükleyin:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/KULLANICI/adimsayar.git
git push -u origin main
```

2. GitHub'da **Actions** sekmesine gidin
3. **"Build Android APK"** workflow'unu seçin
4. **"Run workflow"** butonuna tıklayın
5. Build bitince **Artifacts** bölümünden APK'yı indirin

### Yöntem 2: Manuel (Bilgisayarınızda)

#### Gereksinimler:
- Node.js 18+
- Android Studio
- Java JDK 17

#### Adımlar:
```bash
# 1. Bağımlılıkları yükle
npm install

# 2. Web uygulamasını build et
npm run build

# 3. Android projesini oluştur (ilk sefer)
npx cap add android

# 4. Capacitor senkronize et
npx cap sync android

# 5. Android Studio'da aç
npx cap open android

# 6. Android Studio'da: Build > Build Bundle(s) / APK(s) > Build APK(s)
```

## 🚀 Özellikler

- ✅ **Gerçek Adım Sayımı** - Telefonun ivmeölçer sensörünü kullanır
- ✅ **Kalori Hesabı** - Boy, kilo, yaş, cinsiyete göre hesaplama
- ✅ **Mesafe Ölçümü** - Adım uzunluğuna göre km/metre hesabı
- ✅ **Hız ve Tempo** - Anlık yürüyüş hızı
- ✅ **Hedef Belirleme** - Günlük adım hedefi koyma
- ✅ **Kalıcı Bildirim** - Adım sayısını bildirim çubuğunda gösterme
- ✅ **Haftalık/Aylık Raporlar** - Grafiklerle ilerleme takibi
- ✅ **Aikela Akıllı Saat** - Bluetooth bağlantı desteği
- ✅ **Eski Android Uyumlu** - Android 6.0+ destekler

## 📲 Telefona Kurulum (PWA Olarak)

APK oluşturmadan da kullanabilirsiniz:

1. Uygulamayı Chrome'da açın
2. Adres çubuğundaki "Ana Ekrana Ekle" simgesi
3. Uygulama telefona kurulur ve tam ekran çalışır

## 🔧 Teknik Detaylar

- **Framework:** React + TypeScript + Vite
- **Stil:** Tailwind CSS
- **Mobil:** Capacitor
- **Grafikler:** Recharts
- **Sensör:** DeviceMotion API (ivmeölçer)
- **Bildirim:** Web Notifications API + Local Notifications

## 📝 Notlar

- İlk açılışta sensör izni istenir
- Veriler sadece cihazınızda saklanır (localStorage)
- İnternet bağlantısı gerekmez (PWA olarak)
- Pil tasarrufu için 30 saniyede bir veri kaydeder

## 📄 Lisans

MIT License
