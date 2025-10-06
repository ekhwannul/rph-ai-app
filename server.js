// --- VERSI NAIK TARAF ---
// 1. Model Hugging Face & OpenRouter ditukar kepada yang lebih stabil.
// 2. Pembalakan ralat (error logging) ditambah baik untuk diagnosis yang lebih mudah.

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Fungsi untuk membina prompt AI
const buildPrompt = (level, tajuk, sp) => {
    let complexity;
    switch (level) {
        case 'Tinggi': complexity = "sangat kreatif dan berpusatkan murid (PAK21)"; break;
        case 'Sederhana': complexity = "melibatkan perbincangan dan interaksi antara murid"; break;
        default: complexity = "asas dan berpandukan arahan guru"; break;
    }

    return `Anda adalah seorang Guru Cemerlang Bahasa Melayu di Malaysia. Reka BENTUK TEPAT LIMA (5) langkah aktiviti pengajaran yang ${complexity}.

Topik Pengajaran: "${tajuk}"
Fokus Kemahiran (Standard Pembelajaran): "${sp}"

Syarat Penting:
- Hasilkan TEPAT 5 langkah pengajaran dalam format senarai bernombor (1., 2., 3., 4., 5.). Jangan hasilkan lebih dari 5 langkah.
- Gunakan Bahasa Melayu standard Malaysia sepenuhnya. Elakkan penggunaan istilah Indonesia.
- Langkah ke-5 WAJIB "Guru dan murid membuat refleksi tentang pengajaran hari ini.".
- Jangan sertakan sebarang tajuk, pengenalan, atau penutup. Berikan senarai aktiviti sahaja.`;
};

// Fungsi untuk memproses jawapan dari API
const processAIResponse = (responseText) => {
    if (!responseText) return [];
    return responseText.split('\n')
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(line => line.length > 0)
        .slice(0, 5); // Potong paksa untuk memastikan hanya 5 langkah diambil
};

// API Endpoint Utama
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
                if (activities.length === 5 && !activities[4].includes("refleksi")) {
                    activities[4] = "Guru dan murid membuat refleksi tentang pengajaran hari ini.";
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

// --- Fungsi untuk setiap penyedia AI ---

async function tryGroq(prompt) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY tidak ditetapkan');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
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

async function tryHuggingFace(prompt) {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) throw new Error('HUGGINGFACE_API_KEY tidak ditetapkan');

    // MODEL DIKEMAS KINI: Menggunakan model yang lebih stabil untuk API percuma
    const response = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 300, return_full_text: false } })
    });
    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`Hugging Face API returned ${response.status}: ${JSON.stringify(errorBody)}`);
    }
    const data = await response.json();
    const content = data[0]?.generated_text; 
    return processAIResponse(content);
}

async function tryOpenRouter(prompt) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY tidak ditetapkan');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${apiKey}`, 
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://rph-ai-app.onrender.com', 
            'X-Title': 'RPH AI App'
        },
        body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            // MODEL DIKEMAS KINI: Menggunakan model percuma yang lebih konsisten
            model: 'google/gemma-7b-it:free' 
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


app.listen(PORT, () => {
    console.log(`Server sedang berjalan di port ${PORT}`);
});



