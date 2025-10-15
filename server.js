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
    return responseText.split('\n')
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(line => line.length > 0)
        .slice(0, 5); // Potong paksa untuk memastikan hanya 7 langkah diambil
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
            // Log ralat yang lebih terperinci
            console.error(`Ralat pada ${provider.name}:`, error.message);
        }
    }

    console.log("Semua penyedia AI gagal. Menghantar mesej ralat.");
    res.status(500).json({ error: 'Semua perkhidmatan AI gagal dihubungi pada masa ini. Sila cuba lagi sebentar lagi.' });
});

// -----------------------------------------------------------------------------
// FUNGSI PANGGILAN API UNTUK SETIAP PENYEDIA AI
// -----------------------------------------------------------------------------

// 1. Panggilan ke Groq (Pilihan Utama)
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
            model: 'llama-3.1-8b-instant' // Model pantas dan cekap
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

// 2. Panggilan ke OpenRouter (Sandaran Pertama)
async function tryOpenRouter(prompt) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY tidak ditetapkan');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${apiKey}`, 
            'Content-Type': 'application/json',
            // Header ini disyorkan oleh OpenRouter
            'HTTP-Referer': 'https://rph-ai-generator.onrender.com', // Gantikan dengan URL aplikasi anda
            'X-Title': 'RPH AI Generator' // Gantikan dengan nama aplikasi anda
        },
        body: JSON.stringify({
            // MODEL DIUBAH: Menggunakan Llama 3.1 yang jauh lebih baik dalam Bahasa Melayu
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
    
    if (!content || content.trim() === '') {
        throw new Error("OpenRouter mengembalikan kandungan kosong.");
    }
    
    return processAIResponse(content);
}

// 3. Panggilan ke Hugging Face (Sandaran Kedua)
async function tryHuggingFace(prompt) {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) throw new Error('HUGGINGFACE_API_KEY tidak ditetapkan');

    // MODEL DIUBAH: Menggunakan model 'distilgpt2'. 
    // Ini adalah model asas yang sangat stabil dan sentiasa tersedia di API percuma.
    // Tujuannya adalah untuk mengesahkan sambungan API anda berfungsi.
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
                max_new_tokens: 512, // Kurangkan sedikit token untuk model yang lebih kecil
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
    
    if (!content || content.trim() === '') {
        throw new Error("Hugging Face mengembalikan kandungan kosong.");
    }
    
    return processAIResponse(content);
}

// -----------------------------------------------------------------------------
// ROUTE UTAMA APLIKASI
// -----------------------------------------------------------------------------

app.post('/generate-rph', async (req, res) => {
    const { level, tajuk, sp, previousActivities } = req.body;
    const prompt = buildPrompt(level, tajuk, sp, previousActivities);

    // Rantaian sandaran: Groq -> OpenRouter -> Hugging Face
    try {
        console.log("Mencuba Groq (Pilihan 1)...");
        const result = await tryGroq(prompt);
        res.json(result);
    } catch (e1) {
        console.error("Ralat pada Groq:", e1.message);
        console.log("Groq gagal. Mencuba OpenRouter (Pilihan 2)...");
        try {
            const result = await tryOpenRouter(prompt);
            res.json(result);
        } catch (e2) {
            console.error("Ralat pada OpenRouter:", e2.message);
            console.log("OpenRouter gagal. Mencuba Hugging Face (Pilihan 3)...");
            try {
                const result = await tryHuggingFace(prompt);
                res.json(result);
            } catch (e3) {
                console.error("Ralat pada Hugging Face:", e3.message);
                res.status(500).json({ error: "Semua penyedia AI (Groq, OpenRouter, Hugging Face) gagal. Sila cuba sebentar lagi." });
            }
        }
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
