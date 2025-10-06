// --- VERSI NAIK TARAF ---
// 1. Prompt AI dikemas kini (Maks 5 langkah, Bahasa Melayu Malaysia).
// 2. Melaksanakan sistem fallback: Groq -> Hugging Face -> OpenRouter.

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

    // --- PROMPT TELAH DIUBAH SUAI DI SINI ---
    return `Anda adalah seorang Guru Cemerlang Bahasa Melayu di Malaysia. Reka BENTUK TEPAT LIMA (5) langkah aktiviti pengajaran yang ${complexity}.

Topik Pengajaran: "${tajuk}"
Fokus Kemahiran (Standard Pembelajaran): "${sp}"

Syarat Penting:
- Hasilkan TEPAT 5 langkah pengajaran. Tidak boleh kurang, tidak boleh lebih.
- Gunakan Bahasa Melayu standard Malaysia sepenuhnya. Elakkan penggunaan istilah Indonesia.
- Langkah terakhir WAJIB "Guru dan murid membuat refleksi tentang pengajaran hari ini.".
- Jangan sertakan "Set Induksi".
- Berikan jawapan dalam format senarai bernombor (1., 2., 3., 4., 5.).
- Jangan gunakan sebarang format Markdown atau tajuk. Berikan senarai aktiviti sahaja.`;
};

// Fungsi untuk memproses jawapan dari API
const processAIResponse = (responseText) => {
    if (!responseText) return [];
    return responseText.split('\n')
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(line => line.length > 0);
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
            // Jika berjaya dan ada kandungan, hantar respons
            if (activities && activities.length > 0) {
                console.log(`${provider.name} berjaya.`);
                return res.json({ activities, source: provider.name });
            }
            console.log(`${provider.name} tidak mengembalikan kandungan.`);
        } catch (error) {
            console.error(`Ralat pada ${provider.name}:`, error.message);
        }
    }

    // Jika semua gagal
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
    if (!response.ok) throw new Error(`Groq API returned ${response.status}`);
    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    return processAIResponse(content);
}

async function tryHuggingFace(prompt) {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) throw new Error('HUGGINGFACE_API_KEY tidak ditetapkan');

    const response = await fetch('https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 250 } })
    });
    if (!response.ok) throw new Error(`Hugging Face API returned ${response.status}`);
    const data = await response.json();
    // Hugging Face kadang-kadang mengembalikan prompt bersama jawapan
    const content = data[0]?.generated_text.replace(prompt, '').trim(); 
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
            'HTTP-Referer': 'https://rph-ai-app.onrender.com', // Sesetengah model memerlukan ini
            'X-Title': 'RPH AI App'
        },
        body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            model: 'mistralai/mistral-7b-instruct-free' 
        })
    });
    if (!response.ok) throw new Error(`OpenRouter API returned ${response.status}`);
    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    return processAIResponse(content);
}


app.listen(PORT, () => {
    console.log(`Server sedang berjalan di port ${PORT}`);
});

