// --- VERSI NAIK TARAF DENGAN FALLBACK PINTAR ---
// 1. Model Hugging Face & OpenRouter ditukar kepada yang lebih stabil.
// 2. Pembalakan ralat (error logging) ditambah baik untuk diagnosis yang lebih mudah.
// 3. Sistem fallback statik pintar ditambah untuk menjana aktiviti jika semua AI gagal.

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
// Pastikan folder 'public' digunakan untuk fail statik seperti index.html, script.js
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

// Fungsi untuk memproses respons mentah dari AI
function processAIResponse(rawContent) {
    if (!rawContent) {
        return {
            langkah: ["Tiada respons aktiviti dijana. Sila cuba lagi."],
            raw: "Kandungan kosong diterima daripada AI."
        };
    }
    const lines = rawContent.split('\n').filter(line => line.trim() !== '');
    const steps = lines.map(line => line.replace(/^\d+\.\s*/, '').trim());
    return {
        langkah: steps,
        raw: rawContent
    };
}

// ---- KOD BARU UNTUK FALLBACK PINTAR BERMULA DI SINI ----

// Fungsi Bantuan untuk memilih item rawak dari array
function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// BANK AKTIVITI PINTAR UNTUK FALLBACK
const activityBank = {
    setInduksi: [
        "Guru menayangkan gambar berkaitan dengan topik '[tajuk]' dan meminta murid memberikan pendapat secara berkumpulan.",
        "Setiap kumpulan diberi beberapa perkataan kunci berkaitan '[tajuk]'. Mereka perlu membina satu ayat lengkap menggunakan perkataan tersebut.",
        "Guru memainkan klip audio atau video pendek (jika ada) berkaitan topik dari halaman [mukasurat] dan meminta murid meneka apa yang akan dipelajari.",
        "Murid diminta menyenaraikan apa sahaja yang mereka tahu tentang '[tajuk]' dalam kumpulan menggunakan teknik peta minda."
    ],
    asas: [
        "Secara berkumpulan, murid membaca dan memahami maklumat mengenai '[tajuk]' dari buku teks halaman [mukasurat].",
        "Setiap kumpulan melengkapkan lembaran kerja mudah berdasarkan Standard Pembelajaran: '[sp]'.",
        "Guru memberikan beberapa soalan pemahaman. Murid berbincang dalam kumpulan dan menulis jawapan.",
        "Murid dalam kumpulan bergilir-gilir membaca petikan berkaitan '[tajuk]' dengan sebutan yang betul."
    ],
    sederhana: [
        "Dalam kumpulan, murid membuat ringkasan atau nota grafik (peta minda/peta i-THINK) berdasarkan topik '[tajuk]' (rujuk halaman [mukasurat]).",
        "Setiap kumpulan menyediakan 3 soalan berdasarkan Standard Pembelajaran: '[sp]'. Soalan ini akan diajukan kepada kumpulan lain.",
        "Murid secara berkumpulan membina ayat atau perenggan pendek menggunakan frasa utama daripada topik '[tajuk]'.",
        "Kumpulan membentangkan hasil perbincangan mereka mengenai '[tajuk]' di hadapan kelas."
    ],
    pak21: [
        {
            name: "Gallery Walk (Jalan Galeri)",
            description: "Murid bergerak dalam kumpulan dari satu stesen ke stesen lain untuk melihat dan memberi komen tentang hasil kerja kumpulan lain.",
            steps: [
                "Setiap kumpulan diberi sub-topik berbeza berkaitan '[tajuk]' untuk dibincangkan.",
                "Hasil perbincangan (cth: peta minda, poster) ditampal di dinding kelas (stesen).",
                "Semua murid bergerak dari stesen ke stesen untuk melihat hasil kerja kumpulan lain dan boleh meninggalkan komen menggunakan nota lekat.",
                "Selepas selesai, setiap kumpulan kembali ke stesen asal, membaca komen, dan membuat rumusan."
            ]
        },
        {
            name: "Think-Pair-Share (Fikir-Pasang-Kongsi)",
            description: "Satu strategi kolaboratif di mana murid berfikir secara individu, berbincang dengan pasangan, dan kemudian berkongsi dengan seluruh kelas.",
            steps: [
                "Guru mengemukakan satu soalan beraras tinggi berkaitan Standard Pembelajaran: '[sp]'.",
                "Murid diberi masa untuk berfikir secara individu (Fikir).",
                "Murid kemudian berbincang dengan pasangan mereka untuk membandingkan idea dan jawapan (Pasang).",
                "Guru memilih beberapa pasangan untuk berkongsi hasil perbincangan mereka dengan seluruh kelas (Kongsi)."
            ]
        },
        {
            name: "Jigsaw Reading (Bacaan Susun Suai)",
            description: "Setiap ahli kumpulan menjadi 'pakar' untuk satu bahagian teks dan kemudian mengajar ahli kumpulan yang lain.",
            steps: [
                "Murid dibahagikan kepada 'kumpulan rumah'. Petikan dari halaman [mukasurat] dibahagikan kepada beberapa bahagian.",
                "Setiap ahli dari 'kumpulan rumah' menyertai 'kumpulan pakar' untuk membincangkan bahagian petikan yang sama.",
                "Ahli tersebut kembali ke 'kumpulan rumah' mereka dan mengajar rakan-rakan lain tentang bahagian yang telah mereka pelajari.",
                "Secara kolektif, kumpulan menggabungkan pemahaman mereka untuk mendapatkan gambaran penuh tentang topik '[tajuk]'."
            ]
        }
    ]
};

// FUNGSI UTAMA UNTUK MENJANA AKTIVITI FALLBACK STATIK
function generateStaticFallbackActivities(level, tajuk, sp, mukaSurat) {
    const activities = [];
    
    // 1. Pilih Set Induksi secara rawak
    let setInduksi = getRandomItem(activityBank.setInduksi)
        .replace(/\[tajuk\]/g, tajuk)
        .replace(/\[mukasurat\]/g, mukaSurat || 'rujukan guru');
    activities.push(setInduksi);

    // 2. Rangka Aktiviti Utama berdasarkan aras
    if (level === 'Tinggi') {
        const pak21Method = getRandomItem(activityBank.pak21);
        activities.push(`Guru memperkenalkan kaedah PAK21: **${pak21Method.name}**. ${pak21Method.description}`);
        
        pak21Method.steps.forEach(step => {
            const formattedStep = step
                .replace(/\[tajuk\]/g, tajuk)
                .replace(/\[sp\]/g, sp)
                .replace(/\[mukasurat\]/g, mukaSurat || 'rujukan guru');
            activities.push(formattedStep);
        });
        
    } else {
        const mainActivities = level === 'Sederhana' ? activityBank.sederhana : activityBank.asas;
        const chosenActivities = new Set();
        while (chosenActivities.size < 3 && chosenActivities.size < mainActivities.length) {
            chosenActivities.add(getRandomItem(mainActivities));
        }

        chosenActivities.forEach(activity => {
            const formattedActivity = activity
                .replace(/\[tajuk\]/g, tajuk)
                .replace(/\[sp\]/g, sp)
                .replace(/\[mukasurat\]/g, mukaSurat || 'rujukan guru');
            activities.push(formattedActivity);
        });
    }

    // 3. Pastikan output mempunyai 5 langkah & langkah terakhir adalah refleksi
    const finalActivities = activities.slice(0, 4); 
    while (finalActivities.length < 4) {
        finalActivities.push("Guru memantau dan membimbing aktiviti perbincangan kumpulan.");
    }
    
    finalActivities.push("Guru dan murid membuat refleksi tentang pengajaran hari ini.");

    return finalActivities.map((act, index) => `${index + 1}. ${act}`).join('\n');
}

// ---- KOD BARU UNTUK FALLBACK PINTAR TAMAT DI SINI ----


// Fungsi untuk mencuba API Groq
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
            model: 'llama3-8b-8192'
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

// Fungsi untuk mencuba API Hugging Face
async function tryHuggingFace(prompt) {
    const apiToken = process.env.HF_API_TOKEN;
    if (!apiToken) throw new Error('HF_API_TOKEN tidak ditetapkan');

    const response = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2', {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
        },
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

// Fungsi untuk mencuba API OpenRouter
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

// Laluan API utama untuk menjana aktiviti
app.post('/api/generate-activities', async (req, res) => {
    const { level, tajuk, sp } = req.body;
    const prompt = buildPrompt(level, tajuk, sp);

    try {
        console.log("Mencuba Groq...");
        const result = await tryGroq(prompt);
        console.log("Berjaya dengan Groq.");
        return res.json({ ...result, aiProvider: 'Groq (Llama 3)' });
    } catch (e) {
        console.error("Groq gagal:", e.message);
    }

    try {
        console.log("Mencuba Hugging Face...");
        const result = await tryHuggingFace(prompt);
        console.log("Berjaya dengan Hugging Face.");
        return res.json({ ...result, aiProvider: 'Hugging Face (Mistral)' });
    } catch (e) {
        console.error("Hugging Face gagal:", e.message);
    }

    try {
        console.log("Mencuba OpenRouter...");
        const result = await tryOpenRouter(prompt);
        console.log("Berjaya dengan OpenRouter.");
        return res.json({ ...result, aiProvider: 'OpenRouter (Gemma)' });
    } catch (error) {
        // --- BLOK CATCH YANG TELAH DIKEMAS KINI ---
        console.error('Semua penyedia AI gagal. Menjana fallback statik pintar...', error.message);
        
        try {
            // Ambil data yang diperlukan dari request body
            const { level, tajuk, sp, mukaSurat } = req.body;
            
            // Panggil fungsi penjana fallback yang baru
            const fallbackContent = generateStaticFallbackActivities(level, tajuk, sp, mukaSurat);
            
            // Hantar respons yang telah diproses seolah-olah ia datang dari AI
            res.json({
                ...processAIResponse(fallbackContent), // Guna semula pemproses sedia ada
                aiProvider: 'Fallback Statik Pintar', // Tambah penanda bahawa ini dari fallback
                fallback: true 
            });

        } catch (fallbackError) {
            console.error('Gagal menjana fallback statik:', fallbackError.message);
            res.status(500).json({ 
                error: 'Maaf, semua perkhidmatan AI gagal dan pelan sandaran juga menghadapi masalah. Sila cuba lagi.',
                provider: 'None'
            });
        }
    }
});

app.listen(PORT, () => {
    console.log(`Server sedang berjalan di http://localhost:${PORT}`);
});
