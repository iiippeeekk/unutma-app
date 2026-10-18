
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
                "You generate practical suggestions for a to-do or packing list. Reply in Turkish with exactly 4 short, useful items. Put each item on a separate line. Do not add a heading, introduction, explanation, or numbering. Do not combine the items into one sentence."
            },
            {
              role: "user",
              content:
                `Liste adı: "${listName}". ` +
                "Bu liste için 4 kısa ve somut öneri ver. " +
                "Her öneriyi ayrı bir satıra yaz. " +
                "Başlık veya açıklama ekleme."
            }
          ]
        })
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Kedy API returned HTTP", response.status);

      return res.status(502).json({
        error: "Yapay zeka servisi şu anda yanıt veremedi."
      });
    }

    const content = data?.choices?.[0]?.message?.content;

    if (typeof content !== "string" || !content.trim()) {
      console.error(
        "Kedy API response did not include choices[0].message.content"
      );

      return res.status(502).json({
        error: "Yapay zeka yanıtı okunamadı."
      });
    }

    // Yapay zekânın ekleyebileceği kod bloklarını temizle.
    let cleanedContent = content
      .replace(/```(?:text|json)?/gi, "")
      .trim();

    // "Kamp için gerekli 4 şey: su, çadır..." gibi
    // başlangıç başlıklarını temizle.
    cleanedContent = cleanedContent.replace(
      /^.*?\b(?:işte\s+)?(?:öneriler|gerekli\s+(?:\d+\s+)?(?:şey|şeyler|eşya|eşyalar|malzeme|malzemeler))\s*:\s*/i,
      ""
    );

    // Satırları, virgülleri ve noktalı virgülleri ayırıcı kabul et.
    const items = cleanedContent
      .split(/\r?\n|[,;]+/)
      .map((line) =>
        line
          .replace(/^[\s\-*•\d.)#]+/, "")
          .replace(/[.!]+$/, "")
          .trim()
      )
      .filter(Boolean)
      .slice(0, 4);

    if (items.length === 0) {
      return res.status(502).json({
        error: "Yapay zekâdan geçerli öneriler alınamadı."
      });
    }

    return res.json({ items });
  } catch (error) {
    console.error("Suggestion endpoint error:", error.message);

    return res.status(500).json({
      error: "Sunucuda bir hata oluştu."
    });
  }
});

app.get("*", (req, res, next) => {
  // API isteklerinde hata yönetiminin devam etmesini sağla.
  if (req.path.startsWith("/api/")) {
    return next();
  }

  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Unutma! çalışıyor: http://localhost:${PORT}`);
});
