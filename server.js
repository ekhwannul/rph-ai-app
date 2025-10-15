// --- VERSI NAIK TARAF ---
// 1. Sistem fallback AI dikembalikan kepada: Groq -> Hugging Face -> OpenRouter.
// 2. Google Gemini telah dibuang.

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Fungsi untuk membina prompt AI
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
        variationInstruction = `\nSyarat Tambahan: JANGAN ULANGI aktiviti terdahulu di bawah. WAJIB hasilkan set aktiviti dengan aktiviti PAK21 yang baharu dan berbeza setiap kali janaan.\nAktiviti Terdahulu:\n${previousList}`;
    }

    return `Anda adalah seorang Guru Cemerlang Bahasa Melayu di Malaysia. Reka BENTUK TEPAT TUJUH (7) langkah aktiviti pengajaran yang ${complexity} dan mudah difahami.

Topik Pengajaran: "${tajuk}"
Fokus Kemahiran (Standard Pembelajaran): "${sp}"

Syarat Paling Penting:
1. Hasilkan TEPAT 7 langkah pengajaran dalam format senarai bernombor.
2. Jika menggunakan aktiviti PAK21, ringkaskan penerangannya ke dalam SATU langkah sahaja.
3. Gunakan Bahasa Melayu standard Malaysia sepenuhnya. Elakkan istilah Indonesia.
4. Langkah ke-7 WAJIB "Guru dan murid membuat refleksi tentang pengajaran hari ini.".
5. Jangan sertakan sebarang tajuk atau pengenalan. Berikan senarai aktiviti sahaja.
${variationInstruction}`;
};

// Fungsi untuk memproses jawapan dari API
const processAIResponse = (responseText) => {
    if (!responseText) return [];
    const activities = responseText.split('\n')
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(line => line.length > 0)
        .slice(0, 5);
    
    if (activities.length > 0 && !activities[activities.length - 1].includes("refleksi")) {
         activities[activities.length - 1] = "Guru dan murid membuat refleksi tentang pengajaran hari ini.";
    }
    return activities;
};

// API Endpoint Utama
app.post('/api/generate-activities', async (req, res) => {
    const { level, tajuk, sp, previousActivities } = req.body;
    const prompt = buildPrompt(level, tajuk, sp, previousActivities);

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
                return res.json({ activities, source: provider.name });
            }
        } catch (error) {
            console.error(`Ralat pada ${provider.name}:`, error.message);
        }
    }
    
    console.log("Semua penyedia AI gagal. Menggunakan fallback statik...");
    const staticActivities = [ "Maaf, semua perkhidmatan AI sedang sibuk. Sila cuba jana semula sebentar lagi." ];
    res.json({ activities: staticActivities, source: 'Fallback Gagal' });
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

