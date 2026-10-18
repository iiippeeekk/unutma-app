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
    const listName = typeof req.body.listName === "string"
      ? req.body.listName.trim().slice(0, 80)
      : "";

    if (!listName) {
      return res.status(400).json({ error: "Liste adı gerekli." });
    }

    const apiKey = process.env.KEDY_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Sunucuda KEDY_API_KEY ayarlanmamış."
      });
    }

    const response = await fetch("https://api.kedy.dev/v1/chat/completions", {
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
            content: "You create practical packing/to-do list suggestions. Reply with at most 4 short items, one item per line, with no introduction."
          },
          {
            role: "user",
            content: `For a list named "${listName}", suggest up to 4 essential things to bring or prepare. Reply in Turkish, one item per line.`
          }
        ]
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Kedy API returned HTTP", response.status);
      return res.status(502).json({
        error: "Yapay zeka servisi şu anda yanıt veremedi."
      });
    }

    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      console.error("Kedy API response did not include choices[0].message.content");
      return res.status(502).json({
        error: "Yapay zeka yanıtı okunamadı."
      });
    }

    const items = content
      .split(/\r?\n/)
      .map(line => line.replace(/^[\s\-*•\d.)#]+/, "").trim())
      .filter(Boolean)
      .slice(0, 4);

    return res.json({ items });
  } catch (error) {
    console.error("Suggestion endpoint error:", error.message);
    return res.status(500).json({
      error: "Sunucuda bir hata oluştu."
    });
  }
});

app.get("*", (req, res, next) => {
  // Bilinmeyen API yolları dışındaki sayfa istekleri ana uygulamayı açar.
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Unutma! çalışıyor: http://localhost:${PORT}`);
});
