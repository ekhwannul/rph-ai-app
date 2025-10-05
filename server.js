// --- VERSI LENGKAP & TERKINI ---
// Fail ini mengandungi logik backend untuk:
// 1. Menjalankan pelayan web.
// 2. Berhubung dengan Groq AI secara selamat menggunakan kunci API dari environment variable.
// 3. Menjana aktiviti pengajaran berdasarkan permintaan dari frontend.

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware untuk membenarkan parsing JSON
app.use(express.json());

// Menghidangkan fail statik dari folder 'public'
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint untuk menjana aktiviti
app.post('/api/generate-activities', async (req, res) => {
    const { level, tajuk, sp } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Kunci API Groq tidak ditetapkan di server.' });
    }

    // Tentukan tahap kerumitan aktiviti berdasarkan input
    let complexity;
    switch (level) {
        case 'Tinggi':
            complexity = "sangat kreatif dan berpusatkan murid (PAK21)";
            break;
        case 'Sederhana':
            complexity = "melibatkan perbincangan dan interaksi antara murid";
            break;
        default:
            complexity = "asas dan berpandukan arahan guru";
            break;
    }

    // --- PEMBETULAN PROMPT AI DI SINI ---
    const prompt = `Anda adalah seorang Guru Cemerlang Bahasa Melayu. Reka BENTUK antara LIMA (5) hingga TUJUH (7) (jangan lebih dari 7 langkah aktiviti) langkah aktiviti pengajaran yang ${complexity}.

Topik Pengajaran: "${tajuk}"
Fokus Kemahiran (Standard Pembelajaran): "${sp}"

Syarat:
- Hasilkan antara 5 hingga 7 langkah pengajaran yang logik, bergantung pada kesesuaian aktiviti. jangan lebih dari 7 langkah aktiviti, 7 paling banyak. 
- Ayat aktiviti yang dijana jangan ayat yang panjang dan kompleks sangat tetapi jangan ringkas sangat, ringkas tapi padat.
- Langkah terakhir WAJIB "Guru dan murid membuat refleksi tentang pengajaran hari ini.".
- Jangan sertakan "Set Induksi".
- Berikan jawapan dalam format senarai bernombor.
- Jangan gunakan sebarang format Markdown atau tajuk. Berikan senarai aktiviti sahaja.`;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: 'system',
                        content: 'Anda adalah pembantu pakar dalam merangka aktiviti pengajaran Bahasa Melayu.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                model: 'llama-3.1-8b-instant' // Model AI yang telah dikemas kini
            })
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error('Ralat API Groq:', errorBody);
            throw new Error(`Ralat API Groq: ${errorBody.error.message}`);
        }

        const data = await response.json();
        const aiResponse = data.choices[0]?.message?.content || '';
        
        // Memproses jawapan AI untuk dijadikan format senarai (array)
        const activities = aiResponse.split('\n')
            .map(line => line.replace(/^\d+\.\s*/, '').trim()) // Buang nombor di hadapan
            .filter(line => line.length > 0); // Buang baris kosong

        res.json({ activities });

    } catch (error) {
        console.error('Gagal memanggil API Groq:', error);
        res.status(500).json({ error: 'Gagal menjana aktiviti dari AI. Sila semak log server.' });
    }
});

// Jalankan server
app.listen(PORT, () => {
    console.log(`Server sedang berjalan di port ${PORT}`);
});

