// --- VERSI NAIK TARAF ---
// Laluan (path) fail statik dan index.html telah diperbetulkan untuk sepadan dengan struktur fail anda.

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// =============================================================================
// PENGENDALIAN FAIL STATIK (TELAH DIPERBAIKI)
// =============================================================================
// DIUBAH SUAI: Menetapkan folder 'public' sebagai direktori untuk fail statik (script.js, style.css, dll.)
app.use(express.static(path.join(__dirname, 'public')));


// =============================================================================
// FUNGSI PEMBINA PROMPT AI (KEKAL SAMA)
// =============================================================================
const buildPrompt = (level, tajuk, sp, previousActivities = null) => {
    let complexity;
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
// FUNGSI PEMPROSESAN RESPON (KEKAL SAMA)
// =============================================================================
const processAIResponse = (responseText) => {
    if (!responseText) return [];
    return responseText.split('\\n')
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(line => line.length > 0)
        .slice(0, 7);
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
// FUNGSI PANGGILAN API (KEKAL SAMA)
// =============================================================================

async function tryGroq(prompt) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY tidak ditetapkan');
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], model: 'llama-3.1-8b-instant' })
    });
    if (!response.ok) { const errorBody = await response.json(); throw new Error(`Groq API returned ${response.status}: ${JSON.stringify(errorBody)}`); }
    const data = await response.json();
    return processAIResponse(data.choices[0]?.message?.content);
}

async function tryOpenRouter(prompt) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY tidak ditetapkan');
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://rph-ai-app.onrender.com', 'X-Title': 'RPH AI App' },
        body: JSON.stringify({ model: 'meta-llama/llama-3.1-8b-instruct', messages: [{ role: 'user', content: prompt }] })
    });
    if (!response.ok) { const errorBody = await response.json(); throw new Error(`OpenRouter API returned ${response.status}: ${JSON.stringify(errorBody)}`); }
    const data = await response.json();
    return processAIResponse(data.choices[0]?.message?.content);
}

async function tryHuggingFace(prompt) {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) throw new Error('HUGGINGFACE_API_KEY tidak ditetapkan');
    const response = await fetch(`https://api-inference.huggingface.co/models/distilgpt2`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 512, return_full_text: false } })
    });
    if (!response.ok) { const errorBody = await response.text(); throw new Error(`Hugging Face API returned ${response.status}: ${errorBody}`); }
    const data = await response.json();
    return processAIResponse(data[0]?.generated_text);
}

// =============================================================================
// PENGENDALIAN LALUAN DAN SERVER (KEKAL SAMA)
// =============================================================================

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
                return res.json({ activities, source: provider.name });
            }
            console.log(`${provider.name} tidak mengembalikan kandungan.`);
        } catch (error) {
            console.error(`Ralat pada ${provider.name}:`, error.message);
        }
    }
     res.status(500).json({ error: "Semua penyedia AI gagal. Sila cuba sebentar lagi." });
});

// DIUBAH SUAI: Menghantar fail index.html dari dalam folder 'public'
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server sedang berjalan di http://localhost:${PORT}`);
});

