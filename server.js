
 // Unutma! uygulamasının güvenli sunucu tarafı
// API anahtarını KEDY_API_KEY ortam değişkeninden okur; HTML'e koymayın.

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
                "Sen Türkçe liste hazırlama asistanısın. " +
                "Verilen liste adına uygun tam 4 somut eşya veya görev öner. " +
                "Her öneriyi ayrı bir satıra yaz. " +
                "Başlık, giriş cümlesi, açıklama veya numara ekleme. " +
                "Önerileri tek satırda birleştirme."
            },
            {
              role: "user",
              content:
                `Liste adı: "${listName}". ` +
                "Bu listeye uygun 4 farklı ve gerekli madde öner. " +
                "Yalnızca maddeleri, her biri ayrı satırda olacak şekilde döndür."
            }
          ]
        })
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Kedy API HTTP hatası:", response.status);
      return res.status(502).json({
        error: "Yapay zeka servisi şu anda yanıt veremedi."
      });
    }

    const content = data?.choices?.[0]?.message?.content;

    if (typeof content !== "string" || !content.trim()) {
      console.error("Kedy API geçerli metin döndürmedi.");
      return res.status(502).json({
        error: "Yapay zeka yanıtı okunamadı."
      });
    }

    // Kod bloğu işaretlerini kaldır.
    let cleanedContent = content
      .replace(/```[a-z]*\s*/gi, "")
      .replace(/```/g, "")
      .trim();

    // Yanıtı satırlara ayır ve her satırı temizle.
    let items = cleanedContent
      .split(/\r?\n/)
      .map(line => {
        let item = line.trim();

        // Madde numaralarını ve işaretlerini kaldır.
        item = item.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "");

        // "Kamp Listesi:" veya "Kamp için gerekli 4 şey:"
        // gibi başlıkları kaldır.
        item = item.replace(
          /^.*?\b(?:listesi|listem|öneriler|önerileri|gerekli\s+(?:\d+\s+)?(?:şey|şeyler|eşya|eşyalar|malzeme|malzemeler))\s*:\s*/i,
          ""
        );

        return item.trim();
      })
      .filter(Boolean);

    // Birden fazla eşya aynı satırda ve virgülle yazılmışsa ayır.
    items = items
      .flatMap(item => item.split(/[,;]+/))
      .map(item => item.trim().replace(/^["'“”]+|["'“”]+$/g, ""))
      .filter(Boolean);

    // Yinelenen önerileri kaldır.
    items = [...new Set(items)];

    // Tek başlık veya yetersiz yanıtı geçerli liste olarak kabul etme.
    // HTML tarafındaki hazır öneriler bu durumda devreye girer.
    if (items.length < 2) {
      console.error("Yapay zeka yeterli sayıda madde döndürmedi.");
      return res.status(502).json({
        error: "Yeterli sayıda öneri alınamadı."
      });
    }

    // En fazla 4 madde gönder.
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
  // API isteklerini normal hata yönetimine bırak.
  if (req.path.startsWith("/api/")) {
    return next();
  }

  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Unutma! çalışıyor: http://localhost:${PORT}`);
});
