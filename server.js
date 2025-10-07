// --- VERSI NAIK TARAF ---
// Fallback statik kini lebih pintar:
// 1. Menjana 5-6 langkah aktiviti.
// 2. Memastikan aktiviti kumpulan untuk tahap Asas.
// 3. Memilih dan merotasi aktiviti PAK21 untuk tahap Sederhana & Tinggi.

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- PANGKALAN DATA AKTIVITI PAK21 (UNTUK FALLBACK STATIK) ---
const senaraiAktivitiPAK21 = [
    "Gallery Walk", "Hot Seat", "Think-Pair-Share", "Round Table", "Jigsaw Reading", "Fan-N-Pick", "Rally Robin"
];
let lastUsedPak21 = null; // Mengingati aktiviti terakhir yang digunakan

// Fungsi untuk membina prompt AI
const buildPrompt = (level, tajuk, sp) => {
    let complexity;
    let pak21Instruction = '';

    switch (level) {
        case 'Tinggi':
        case 'Sederhana':
            complexity = "kreatif dan berpusatkan murid";
            let availableActivities = senaraiAktivitiPAK21.filter(act => act !== lastUsedPak21);
            if (availableActivities.length === 0) availableActivities = senaraiAktivitiPAK21;
            const chosenActivity = availableActivities[Math.floor(Math.random() * availableActivities.length)];
            lastUsedPak21 = chosenActivity;
            pak21Instruction = `Gunakan kaedah Pembelajaran Abad ke-21 (PAK21) '${chosenActivity}' dalam salah satu langkah.`;
            break;
        default:
            complexity = "asas dan mudah difahami, tetapi pastikan ada sekurang-kurangnya satu aktiviti berkumpulan";
            break;
    }

    return `Anda adalah seorang Guru Cemerlang Bahasa Melayu di Malaysia. Reka BENTUK antara LIMA (5) hingga ENAM (6) langkah aktiviti pengajaran yang ${complexity}.

Topik Pengajaran: "${tajuk}"
Fokus Kemahiran (Standard Pembelajaran): "${sp}"

Syarat Penting:
- Hasilkan antara 5 hingga 6 langkah pengajaran.
- ${pak21Instruction}
- Gunakan Bahasa Melayu standard Malaysia sepenuhnya. Elakkan penggunaan istilah Indonesia.
- Langkah terakhir WAJIB "Guru dan murid membuat refleksi tentang pengajaran hari ini.".
- Jangan sertakan sebarang tajuk, pengenalan, atau penutup. Berikan senarai aktiviti sahaja dalam format senarai bernombor.`;
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
            if (activities && activities.length > 0) {
                console.log(`${provider.name} berjaya.`);
                return res.json({ activities, source: provider.name });
            }
            console.log(`${provider.name} tidak mengembalikan kandungan.`);
        } catch (error) {
            console.error(`Ralat pada ${provider.name}:`, error.message);
        }
    }
    
    // --- FALLBACK STATIK PINTAR DI SINI ---
    console.log("Semua penyedia AI gagal. Menggunakan fallback statik...");
    const staticActivities = generateStaticFallbackActivities(level, tajuk);
    res.json({ activities: staticActivities, source: 'Fallback Statik' });
});


// --- FUNGSI FALLBACK STATIK YANG TELAH DINAIK TARAF ---
const generateStaticFallbackActivities = (level, tajuk) => {
    const aktivitiUmum = `berkaitan topik ${tajuk}`;
    let langkahLangkah = [];

    // Pilih satu aktiviti PAK21 secara rawak untuk Sederhana/Tinggi
    let availableActivities = senaraiAktivitiPAK21.filter(act => act !== lastUsedPak21);
    if (availableActivities.length === 0) availableActivities = senaraiAktivitiPAK21; // Reset jika semua telah digunakan
    const chosenActivity = availableActivities[Math.floor(Math.random() * availableActivities.length)];
    lastUsedPak21 = chosenActivity; // Simpan aktiviti yang baru dipilih

    switch(level) {
        case 'Sederhana':
        case 'Tinggi':
            langkahLangkah = [
                `Guru memulakan perbincangan awal ${aktivitiUmum}.`,
                `Aktiviti PAK21: Murid menjalankan aktiviti <strong>${chosenActivity}</strong> secara berkumpulan untuk meneroka topik.`,
                `Setiap kumpulan membentangkan hasil dapatan mereka secara ringkas.`,
                `Murid menjawab beberapa soalan lisan dari guru untuk menguji pemahaman.`,
                `Guru memberikan lembaran kerja ringkas sebagai pengukuhan.`,
                `Guru dan murid membuat refleksi tentang pengajaran hari ini.`
            ];
            break;
        case 'Asas':
        default:
            langkahLangkah = [
                `Guru bersoal jawab dengan murid ${aktivitiUmum}.`,
                `Murid membaca petikan atau nota yang diberikan oleh guru secara berpasangan.`,
                `Guru memberi penerangan dan contoh tambahan di papan putih.`,
                `Secara berkumpulan, murid melengkapkan satu peta minda ringkas berdasarkan topik.`,
                `Guru dan murid membuat refleksi tentang pengajaran hari ini.`
            ];
            break;
    }
    return langkahLangkah;
};


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

