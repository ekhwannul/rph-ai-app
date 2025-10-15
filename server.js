// --- VERSI NAIK TARAF ---
// 1. Logik 'buildPrompt' diperhalusi untuk menjana PAK21 yang berbeza mengikut aras.
// 2. Ralat kritikal dalam 'processAIResponse' yang memotong hasil kepada 5 langkah telah diperbaiki kepada 7.

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
// Pastikan folder 'public' wujud untuk fail statik seperti index.html, script.js, dll.
// Jika fail anda berada di root, baris ini boleh dibuang atau diubah kepada app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname)));


// =============================================================================
// FUNGSI PEMBINA PROMPT AI (TELAH DIUBAHSUAI)
// =============================================================================
const buildPrompt = (level, tajuk, sp, previousActivities = null) => {
    let complexity;
    // PERUBAHAN 1: Arahan 'complexity' kini lebih spesifik untuk setiap aras
    // Ini "mengajar" AI jenis PAK21 yang diharapkan untuk setiap tahap.
    switch (level) {
        case 'Tinggi':
            complexity = "sangat kreatif dan berpusatkan murid, menggunakan satu aktiviti PAK21 yang kompleks dan berimpak tinggi seperti 'Simulasi' atau 'Pembentangan Kumpulan Kreatif'";
            break;
        case 'Sederhana':
            complexity = "melibatkan perbincangan dan interaksi antara murid, menggunakan satu aktiviti PAK21 yang kolaboratif seperti 'Round Table' atau 'Gallery Walk'";
            break;
        default: // Asas
            complexity = "asas dan berpandukan arahan guru, tetapi WAJIB menyertakan satu aktiviti PAK21 yang mudah dan berstruktur seperti 'Think-Pair-Share' atau 'Peta Minda'";
            break;
    }

    let variationInstruction = '';
    if (previousActivities && previousActivities.length > 0) {
        const previousList = previousActivities.map(act => `- ${act}`).join('\\n');
        variationInstruction = `\\nSyarat Tambahan: JANGAN ULANGI aktiviti terdahulu di bawah. WAJIB hasilkan set aktiviti dengan aktiviti PAK21 yang baharu dan berbeza setiap kali janaan.\\nAktiviti Terdahulu:\\n${previousList}`;
    }

    return `Anda adalah seorang Guru Cemerlang Bahasa Melayu di Malaysia. Reka BENTUK TEPAT TUJUH (7) langkah aktiviti pengajaran yang ${complexity} dan mudah difahami.

Topik Pengajaran: "${tajuk}"
Fokus Kemahiran (Standard Pembelajaran): "${sp}"

Syarat Paling Penting:
1. Hasilkan TEPAT 7 langkah pengajaran dalam format senarai bernombor.
2. WAJIB sertakan SATU aktiviti Pembelajaran Abad Ke-21 (PAK21) dan ringkaskan penerangannya dalam SATU langkah sahaja.
3. Gunakan Bahasa Melayu standard Malaysia sepenuhnya. Elakkan istilah Indonesia.
4. Langkah ke-7 WAJIB "Guru dan murid membuat refleksi tentang pengajaran hari ini.".
5. Jangan sertakan sebarang tajuk atau pengenalan. Berikan senarai aktiviti sahaja.
${variationInstruction}`;
};

// =============================================================================
// FUNGSI PEMPROSESAN RESPON (TELAH DIPERBAIKI)
// =============================================================================
const processAIResponse = (responseText) => {
    if (!responseText) return [];
    // PERUBAHAN 2: Ralat kritikal diperbaiki.
    // .slice(0, 5) telah ditukar kepada .slice(0, 7) untuk memastikan 7 langkah dipaparkan.
    return responseText.split('\\n')
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(line => line.length > 0)
        .slice(0, 7); // Potong untuk memastikan TEPAT 7 langkah diambil
};

// =============================================================================
// API ENDPOINT UTAMA (KEKAL SAMA)
// =============================================================================
app.post('/api/generate-activities', async (req, res) => {
    const { level, tajuk, sp } = req.body;
    const prompt = buildPrompt(level, tajuk, sp);

    const providers = [
        { name: 'Groq', try: tryGroq },
        { name: 'Hugging Face', try: tryHuggingFace },
        { name: 'OpenRouter', try: tryOpenRouter }
    ];

    for (const provider of providers) {
        try {
            console.log(`Mencuba ${provider.name}...`);
            const activities = await provider.try(prompt);
            if (activities && activities.length > 0) {
                console.log(`${provider.name} berjaya.`);
                // Logik tambahan untuk memastikan langkah ke-7 adalah refleksi jika AI terlupa
                if (activities.length === 7 && !activities[6].toLowerCase().includes("refleksi")) {
                    activities[6] = "Guru dan murid membuat refleksi tentang pengajaran hari ini.";
                }
                return res.json({ activities, source: provider.name });
            }
            console.log(`${provider.name} tidak mengembalikan kandungan.`);
        } catch (error) {
            console.error(`Ralat pada ${provider.name}:`, error.message);
        }
    }

    console.log("Semua penyedia AI gagal. Menghantar mesej ralat.");
    res.status(500).json({ error: 'Semua perkhidmatan AI gagal dihubungi pada masa ini. Sila cuba lagi sebentar lagi.' });
});

// =============================================================================
// FUNGSI PANGGILAN API UNTUK SETIAP PENYEDIA (KEKAL SAMA)
// =============================================================================

// 1. Panggilan ke Groq
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

// 2. Panggilan ke OpenRouter
async function tryOpenRouter(prompt) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY tidak ditetapkan');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://rph-ai-app.onrender.com', // Gantikan dengan URL aplikasi anda
            'X-Title': 'RPH AI App' // Gantikan dengan nama aplikasi anda
        },
        body: JSON.stringify({
            model: 'meta-llama/llama-3.1-8b-instruct',
            messages: [{ role: 'user', content: prompt }]
        })
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`OpenRouter API returned ${response.status}: ${JSON.stringify(errorBody)}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    return processAIResponse(content);
}

// 3. Panggilan ke Hugging Face
async function tryHuggingFace(prompt) {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) throw new Error('HUGGINGFACE_API_KEY tidak ditetapkan');
    const modelId = 'distilgpt2';

    const response = await fetch(`https://api-inference.huggingface.co/models/${modelId}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            inputs: prompt,
            parameters: {
                max_new_tokens: 512,
                return_full_text: false
            }
        })
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Hugging Face API returned ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    const content = data[0]?.generated_text;
    return processAIResponse(content);
}


// =============================================================================
// PENGENDALIAN LALUAN DAN SERVER (DIUBAHSUAI SEDIKIT)
// =============================================================================

// Route untuk API yang dipanggil dari script.js
// Nama endpoint diselaraskan dengan kod lama anda: /generate-rph
app.post('/generate-rph', async (req, res) => {
    const { level, tajuk, sp, previousActivities } = req.body;
    const prompt = buildPrompt(level, tajuk, sp, previousActivities);
    const providers = [
        { name: 'Groq', try: tryGroq },
        { name: 'OpenRouter', try: tryOpenRouter },
        { name: 'Hugging Face', try: tryHuggingFace }
    ];

    for (const provider of providers) {
        try {
            console.log(`Mencuba ${provider.name}...`);
            const activities = await provider.try(prompt);
             if (activities && activities.length > 0) {
                console.log(`${provider.name} berjaya.`);
                if (activities.length === 7 && !activities[6].toLowerCase().includes("refleksi")) {
                    activities[6] = "Guru dan murid membuat refleksi tentang pengajaran hari ini.";
                }
                // Respon sepatutnya dalam format objek, bukan array terus
                return res.json({ activities, source: provider.name });
            }
            console.log(`${provider.name} tidak mengembalikan kandungan.`);
        } catch (error) {
            console.error(`Ralat pada ${provider.name}:`, error.message);
        }
    }
     res.status(500).json({ error: "Semua penyedia AI gagal. Sila cuba sebentar lagi." });
});


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server sedang berjalan di http://localhost:${PORT}`);
});
