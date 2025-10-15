// --- VERSI DI PERMUDAH ---
// Hanya menggunakan Groq sebagai penyedia AI tunggal untuk kelajuan dan kestabilan.
// Semua kod yang tidak berkaitan telah dibuang.

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// -----------------------------------------------------------------------------
// FUNGSI LOGIK (DIKEKALKAN SEPERTI ASAL)
// -----------------------------------------------------------------------------

// Fungsi untuk membina prompt AI (Tidak Diubah)
const buildPrompt = (level, tajuk, sp, previousActivities = null) => {
    let complexity;
    switch (level) {
        case 'Tinggi': complexity = "sangat kreatif dan berpusatkan murid menggunakan satu aktiviti PAK21 yang diringkaskan"; break;
        case 'Sederhana': complexity = "melibatkan perbincangan dan interaksi antara murid"; break;
        default: complexity = "asas dan berpandukan arahan guru"; break;
    }

    let variationInstruction = '';
    if (previousActivities && previousActivities.length > 0) {
        const previousList = previousActivities.map(act => `- ${act}`).join('\n');
        variationInstruction = `\nSyarat Tambahan: JANGAN ULANGI aktiviti terdahulu di bawah. Hasilkan set aktiviti yang mesti mempunyai aktiviti PAK21 yang baharu dan berbeza.\nAktiviti Terdahulu:\n${previousList}`;
    }

    return `Anda adalah seorang Guru Cemerlang Bahasa Melayu di Malaysia. Reka BENTUK TEPAT TUJUH (7) langkah aktiviti pengajaran yang ${complexity} dan mudah difahami.

Topik Pengajaran: "${tajuk}"
Fokus Kemahiran (Standard Pembelajaran): "${sp}"

Pastikan output adalah dalam format senarai bernombor sahaja (1., 2., 3., ...). Jangan tambah tajuk, pengenalan, atau penutup. Hanya senarai aktiviti.
${variationInstruction}`;
};

// Fungsi untuk memproses respons AI (Tidak Diubah)
function processAIResponse(content) {
    if (!content || content.trim() === '') {
        throw new Error("Respons AI kosong atau tidak sah.");
    }
    const activities = content.split('\n')
        .map(line => line.trim().replace(/^\d+\.\s*/, ''))
        .filter(line => line.length > 0);

    if (activities.length < 5) {
        throw new Error("AI tidak menjana aktiviti yang mencukupi.");
    }
    return activities.slice(0, 7);
}

// -----------------------------------------------------------------------------
// FUNGSI PANGGILAN API (HANYA GROQ)
// -----------------------------------------------------------------------------

async function tryGroq(prompt) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY tidak ditetapkan');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.1-8b-instant'
        })
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`Groq API returned ${response.status}: ${JSON.stringify(errorBody)}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    return processAIResponse(content);
}

// -----------------------------------------------------------------------------
// ROUTE UTAMA APLIKASI (DI PERMUDAH)
// -----------------------------------------------------------------------------

app.post('/generate-rph', async (req, res) => {
    const { level, tajuk, sp, previousActivities } = req.body;
    const prompt = buildPrompt(level, tajuk, sp, previousActivities);

    try {
        console.log("Menjana RPH menggunakan Groq...");
        const result = await tryGroq(prompt);
        res.json(result);
    } catch (e) {
        console.error("Ralat pada Groq:", e.message);
        res.status(500).json({ error: "Gagal menghubungi AI Groq. Sila cuba sebentar lagi." });
    }
});

// -----------------------------------------------------------------------------
// PENGENDALIAN LALUAN DAN SERVER
// -----------------------------------------------------------------------------

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server sedang berjalan di http://localhost:${PORT}`);
});
