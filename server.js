
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
                "Tam olarak 4 somut eşya veya görev öner. " +
                "Her maddeyi ayrı satıra yaz. " +
                "Başlık, giriş, açıklama veya sonuç cümlesi yazma. " +
                "Numaralandırma kullanma. " +
                "Yalnızca dört madde döndür."
            },
            {
              role: "user",
              content:
                `Liste adı: "${listName}".\n` +
                "Bu liste için gerekli 4 farklı madde öner. " +
                "Yalnızca madde isimlerini, her biri ayrı satırda yaz."
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
    const cleanedContent = content
      .replace(/```[a-z]*\s*/gi, "")
      .replace(/```/g, "")
      .trim();

    // Satırları ayır ve başlıkları temizle.
    let items = cleanedContent
      .split(/\r?\n/)
      .map(line => {
        let item = line.trim();

        // Madde işaretlerini ve numaralandırmayı kaldır.
        item = item.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "");

        // Açıklama veya başlık cümlelerini tamamen atla.
        if (
          /^(sadece\s+)?(kamp\s+yapmaya\s+uygun|liste|öneriler|önerilen\s+maddeler|bu\s+listeye|işte\s)/i.test(item) ||
          /^(sadece\s+)?\d+\s+(farklı\s+ve\s+)?(gerekli\s+)?(madde|öneri|eşya|malzeme)/i.test(item) ||
          /^(işte|tabii|elbette|örneğin|aşağıda)\b/i.test(item) ||
          /:\s*$/.test(item)
        ) {
          return "";
        }

        // İki nokta öncesi başlık varsa kaldır.
        item = item.replace(
          /^.*?\b(?:listesi|listem|öneriler|önerileri)\s*:\s*/i,
          ""
        );

        return item.trim();
      })
      .filter(Boolean);

    // Aynı satırda virgül veya noktalı virgülle yazılanları ayır.
    items = items
      .flatMap(item => item.split(/[,;]+/))
      .map(item => item.trim().replace(/^["'“”]+|["'“”]+$/g, ""))
      .filter(Boolean);

    // Yinelenen maddeleri kaldır.
    items = [...new Set(items)];

    // Yeterli sayıda gerçek madde yoksa hata döndür.
    // Böylece açıklama cümlesini madde olarak göndermeyiz.
    if (items.length < 4) {
      console.error(
        "Yapay zeka dört geçerli madde döndürmedi. Bulunan:",
        items.length
      );

      return res.status(502).json({
        error: "Yapay zekadan dört geçerli madde alınamadı."
      });
    }

    // Yalnızca ilk dört maddeyi gönder.
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
