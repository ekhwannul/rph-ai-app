// server.js - Ini adalah backend kita.
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware untuk membenarkan server menerima data JSON
app.use(express.json());

// Hidangkan fail-fail statik dari folder 'public'
app.use(express.static(path.join(__dirname, 'public')));

// API Endpoint untuk berhubung dengan Groq
app.post('/api/generate-activities', async (req, res) => {
    // Dapatkan kunci API dari environment variable di Render.com
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_API_KEY) {
        return res.status(500).json({ error: 'Kunci API Groq tidak ditetapkan di server.' });
    }

    const { level, tajuk, sp } = req.body;

    if (!level || !tajuk || !sp) {
        return res.status(400).json({ error: 'Maklumat tidak lengkap dihantar ke server.' });
    }

    const prompt = `Anda seorang guru pakar Bahasa Melayu di Malaysia. Reka 5 langkah aktiviti pengajaran (PdP) untuk topik "${tajuk}" dengan fokus pada standard pembelajaran "${sp}". Tahap kreativiti yang dikehendaki adalah "${level}". 
- Jika tahap 'Asas', fokus pada aktiviti berpusatkan guru.
- Jika tahap 'Sederhana', guna aktiviti berpasangan (cth: Think-Pair-Share).
- Jika tahap 'Tinggi', guna satu aktiviti PAK21 yang kolaboratif (cth: Gallery Walk, Jigsaw Reading).
Hasilkan senarai bernombor. Jangan tambah sebarang pengenalan atau penutup, hanya senarai itu. Akhiri dengan langkah refleksi "Guru dan murid membuat refleksi tentang pengajaran hari ini.".`;

    try {
        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama3-8b-8192",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.8,
            })
        });

        if (!groqResponse.ok) {
            const errorData = await groqResponse.json();
            throw new Error(`Ralat API Groq: ${errorData.error.message}`);
        }

        const data = await groqResponse.json();
        const content = data.choices[0].message.content;
        const activities = content.split('\n').map(line => line.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
        
        res.json({ activities });

    } catch (error) {
        console.error("Gagal memanggil API Groq:", error);
        res.status(500).json({ error: "Gagal menghubungi AI Groq. Sila cuba sebentar lagi." });
    }
});

app.listen(PORT, () => {
    console.log(`Server sedang berjalan di port ${PORT}`);
});

