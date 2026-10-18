
 // Unutma! güvenli sunucu tarafı
// API anahtarı Render ortam değişkenlerinde KEDY_API_KEY olarak tutulur.

require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "20kb" }));
app.use(express.static(__dirname));

app.post("/api/suggest", async (req, res) => {
  try {
    const listName =
      typeof req.body.listName === "string"
        ? req.body.listName.trim().slice(0, 80)
        : "";

    if (!listName) {
      return res.status(400).json({
        error: "Liste adı gerekli."
      });
    }

    const apiKey = process.env.KEDY_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Sunucuda KEDY_API_KEY ayarlanmamış."
      });
    }

    const response = await fetch(
      "https://api.kedy.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "novaq",
          messages: [
            {
              role: "system",
              content:
                "Sen Unutma! uygulamasının eşya listesi asistanısın. " +
                "Kullanıcının verdiği liste adına göre yanında götürmesi gereken TAM 4 farklı, somut ve gerçek eşya öner. " +
                "En önemli kural: Aktiviteyi veya kategoriyi değil, o aktivite için gereken EŞYALARI yaz. " +
                "Örneğin 'spor' için spor ayakkabısı, spor kıyafeti, su matarası ve havlu yaz. " +
                "'kamp' için çadır, uyku tulumu, el feneri ve mat yaz. " +
                "'plaj' için plaj havlusu, güneş kremi, mayo ve güneş gözlüğü yaz. " +
                "Futbol, tenis, basketbol, yüzme, kamp, spor gibi etkinlik veya kategori adlarını madde olarak ASLA yazma. " +
                "Liste adını veya aynı kelimeyi öneri diye tekrar etme. " +
                "Başlık, giriş cümlesi, açıklama, numaralandırma veya sonuç yazma. " +
                "Yalnızca 4 eşya adı yaz; her eşya ayrı satırda olsun."
            },
            {
              role: "user",
              content:
                `Liste adı: "${listName}".\n` +
                "Bu yere veya etkinliğe giderken çantama koymam gereken 4 farklı fiziksel eşyayı yaz. " +
                "Etkinlik isimleri, spor dalları, kategori adları veya yapılacak işler istemiyorum. " +
                "Yalnızca yanımda götüreceğim eşyaları, her biri ayrı satırda yaz."
            }
          ],
          temperature: 0.3
        })
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Kedy API HTTP hatası:", response.status);
      return res.status(502).json({
        error: "Yapay zeka servisi yanıt veremedi."
      });
    }

    const content = data?.choices?.[0]?.message?.content;

    if (typeof content !== "string" || !content.trim()) {
      return res.status(502).json({
        error: "Yapay zeka yanıtı okunamadı."
      });
    }

    // Kod bloğu işaretlerini ve gereksiz boşlukları temizle.
    const cleanedContent = content
      .replace(/```[a-z]*\s*/gi, "")
      .replace(/```/g, "")
      .trim();

    // Yanıtı satırlara ayır.
    let items = cleanedContent
      .split(/\r?\n/)
      .map(line => {
        let item = line.trim();

        // Madde numaralarını ve işaretlerini kaldır.
        item = item.replace(/^\s*(?:(?:[-*•])\s*|\d+[.)]\s*)/, "");
        item = item.replace(/^["'“”]+|["'“”]+$/g, "").trim();

        // Başlık veya açıklama cümlelerini tamamen atla.
        if (
          !item ||
          /^(sadece\s+)?(işte|tabii|elbette|aşağıda|öneriler|önerilen maddeler)\b/i.test(item) ||
          /^sadece\b.*\b(madde|öneri|eşya|malzeme)\b.*:?\s*$/i.test(item) ||
          /^.{0,100}\b(listesi|listem|önerileri|öneriler)\s*:\s*$/i.test(item) ||
          /^liste adı\s*:/i.test(item) ||
          /^```/.test(item)
        ) {
          return "";
        }

        // İki nokta ile yazılmış açıklama başlıklarını atla.
        if (/:\s*$/.test(item)) {
          return "";
        }

        return item.trim();
      })
      .filter(Boolean);

    // Spor listesinde spor dallarını eşya olarak kabul etme.
    const isSportsList =
      /\b(spor|fitness|gym|egzersiz|antrenman)\b/i.test(listName);

    if (isSportsList) {
      const sportNames =
        /^(futbol|basketbol|tenis|voleybol|yüzme|koşu|bisiklet|yoga|pilates|badminton|hentbol|golf|boks|jimnastik|atletizm|masa tenisi)$/i;

      items = items.filter(item => !sportNames.test(item));
    }

    // Tekrarlanan maddeleri kaldır.
    items = items.filter(
      (item, index, arr) =>
        arr.findIndex(
          other => other.toLocaleLowerCase("tr") ===
                   item.toLocaleLowerCase("tr")
        ) === index
    );

    // Dört gerçek eşya bulunamazsa HTML tarafındaki
    // hazır önerilerin devreye girmesi için hata döndür.
    if (items.length < 4) {
      console.error(
        "Dört geçerli eşya bulunamadı. Bulunan madde sayısı:",
        items.length
      );

      return res.status(502).json({
        error: "Dört uygun eşya önerisi alınamadı."
      });
    }

    return res.json({
      items: items.slice(0, 4)
    });

  } catch (error) {
    console.error("Suggestion endpoint error:", error.message);

    return res.status(500).json({
      error: "Sunucuda bir hata oluştu."
    });
  }
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }

  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Unutma! çalışıyor: http://localhost:${PORT}`);
});
