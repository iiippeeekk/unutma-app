# Unutma! — düzeltilmiş sürüm

## Önemli güvenlik notu
Önceki HTML dosyasında API anahtarı açıkça bulunuyordu. O anahtarı Kedy panelinden iptal edip yenisini oluştur. Yeni anahtarı HTML dosyasına, GitHub'a veya sohbet mesajına koyma.

## Bu klasörde neler var?
- `index.html`: uygulamanın arayüzü; listeler, madde ekleme/silme, işaretleme ve ilerleme çubuğu korunmuştur.
- `server.js`: API anahtarını sunucuda tutar ve Kedy'ye doğru `model` + `messages` formatında istek gönderir.
- `package.json`: sunucunun ihtiyaç duyduğu paketler.
- `.env.example`: ortam değişkeni örneği; gerçek anahtar içermez.

## Render gibi bir sunucuda çalıştırma
1. Bu klasördeki dosyaları bir GitHub deposuna yükle.
2. Render'da yeni bir **Web Service** oluşturup GitHub deposunu bağla.
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Render servisinin **Environment Variables** bölümünde `KEDY_API_KEY` adında bir değişken oluştur ve değerine Kedy'de oluşturduğun yeni API anahtarını gir.
6. Deploy tamamlanınca Render'ın verdiği site adresini aç.

## Bilmen gereken
- `index.html` dosyasını bilgisayarda çift tıklayarak açmak, sunucuyu çalıştırmaz. Uygulama API destekli olarak sunucu adresinden açılmalı.
- Sunucu/API bağlantısı başarısız olursa uygulama, önceki davranış korunarak konuya göre hazır 4 öneri ekler.
- API anahtarı `.env` dosyasında yerel kullanım için tutulacaksa `.env` dosyası GitHub'a yüklenmemelidir. `.gitignore` bunu engellemek için eklendi.
