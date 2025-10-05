// --- LOGIK TELAH DIPERBAIKI ---
// VERSI TERKINI: Menambah penunjuk status untuk mengesahkan jika Groq AI digunakan.

// --- PANGKALAN DATA AKTIVITI PAK21 (BERDASARKAN PDF) ---
const senaraiAktivitiPAK21 = [
    {
        nama: "Gallery Walk",
        langkah: [
            "Murid dibahagikan kepada kumpulan dan menyiapkan tugasan pada kertas sebak.",
            "Setiap kumpulan menampal hasil kerja mereka di dinding.",
            "Ahli kumpulan bergerak dari stesen ke stesen untuk melihat hasil kerja kumpulan lain.",
            "Murid memberikan komen atau maklum balas pada 'sticky notes' dan menampalnya pada hasil kerja rakan.",
            "Setiap kumpulan kembali ke stesen asal, membaca maklum balas, dan membuat rumusan."
        ]
    },
    {
        nama: "Hot Seat",
        langkah: [
            "Seorang murid dipilih sebagai 'pakar' atau 'watak' dan duduk di kerusi yang disediakan di hadapan kelas.",
            "'Pakar' ini telah membuat kajian atau bacaan mendalam mengenai topik.",
            "Murid-murid lain akan mengemukakan soalan-soalan berkaitan topik kepada 'pakar'.",
            "'Pakar' akan menjawab semua soalan berdasarkan pengetahuan dan pemahamannya.",
            "Guru bertindak sebagai fasilitator untuk mengawal sesi soal jawab."
        ]
    },
    {
        nama: "Think-Pair-Share",
        langkah: [
            "Guru memberikan soalan atau masalah berkaitan topik pembelajaran.",
            "<strong>(Think)</strong> Murid berfikir secara individu untuk mendapatkan jawapan atau idea.",
            "<strong>(Pair)</strong> Murid berbincang dengan pasangan untuk berkongsi dan membandingkan idea mereka.",
            "<strong>(Share)</strong> Beberapa pasangan dipilih untuk berkongsi hasil perbincangan mereka dengan seluruh kelas.",
            "Guru membuat rumusan berdasarkan perkongsian murid."
        ]
    },
    {
        nama: "Round Table",
        langkah: [
            "Murid duduk dalam kumpulan.",
            "Guru memberikan satu soalan atau topik.",
            "Secara bergilir-gilir, setiap ahli kumpulan menulis satu idea atau jawapan pada sehelai kertas.",
            "Kertas tersebut diedarkan mengikut arah jam sehingga semua ahli mendapat giliran.",
            "Hasil dapatan dikongsi dan dibincangkan bersama."
        ]
    },
    {
        nama: "Jigsaw Reading",
        langkah: [
            "Murid dibahagikan kepada 'kumpulan asal'.",
            "Setiap ahli dalam 'kumpulan asal' diberikan satu bahagian petikan atau sub-topik yang berbeza.",
            "Murid kemudian membentuk 'kumpulan pakar' dengan ahli dari kumpulan lain yang mempunyai bahagian petikan yang sama.",
            "Dalam 'kumpulan pakar', murid berbincang untuk memahami bahagian petikan mereka secara mendalam.",
            "Murid kembali ke 'kumpulan asal' dan setiap 'pakar' akan menerangkan bahagian petikan mereka kepada ahli kumpulan yang lain sehingga semua ahli memahami keseluruhan topik."
        ]
    },
    {
        nama: "Fan-N-Pick",
        langkah: [
            "Setiap kumpulan diberikan satu set kad soalan.",
            "Murid 1 menyusun kad seperti kipas.",
            "Murid 2 memilih satu kad dan membacakan soalan.",
            "Murid 3 menjawab soalan tersebut.",
            "Murid 4 memberikan respons atau pujian kepada jawapan yang diberikan.",
            "Peranan ditukar untuk pusingan seterusnya."
        ]
    }
];


document.addEventListener('DOMContentLoaded', function () {
    const tahunSelect = document.getElementById('tahun');
    const mingguSelect = document.getElementById('minggu');
    const form = document.getElementById('rphForm');
    const resultDiv = document.getElementById('result');
    const rphContentDiv = document.getElementById('rphContent');
    const loadingDiv = document.getElementById('loading');
    const errorMessageDiv = document.getElementById('errorMessage');
    const errorTextSpan = document.getElementById('errorText');

    let currentFormData = null;

    function populateMingguDropdown(selectedTahun) {
        if (!mingguSelect) return;
        mingguSelect.innerHTML = ''; 

        if (selectedTahun && SEMUA_DATA[selectedTahun]) {
            for (let i = 1; i <= 42; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `Minggu ${i}`;
                mingguSelect.appendChild(option);
            }
        }
    }

    if (tahunSelect) {
        tahunSelect.addEventListener('change', (e) => {
            const selectedTahun = e.target.value;
            populateMingguDropdown(selectedTahun);
        });
        populateMingguDropdown(tahunSelect.value);
    }

    if (form) {
        form.addEventListener('submit', async function (e) { 
            e.preventDefault();
            
            if (loadingDiv) loadingDiv.style.display = 'block';
            if (resultDiv) resultDiv.style.display = 'none';
            if (errorMessageDiv) errorMessageDiv.style.display = 'none';

            const formData = {
                tahun: document.getElementById('tahun').value,
                kelas: document.getElementById('kelas').value,
                tarikh: document.getElementById('tarikh').value,
                minggu: document.getElementById('minggu').value,
                kreativiti: document.getElementById('kreativiti').value
            };
            currentFormData = formData;

            if (!formData.minggu || isNaN(formData.minggu)) {
                showError("Sila pilih minggu yang sah.");
                return;
            }

            try {
                if (!rphContentDiv) {
                    throw new Error("Elemen HTML dengan id='rphContent' tidak ditemui.");
                }

                const dataTahunIni = SEMUA_DATA[formData.tahun];
                if (!dataTahunIni) {
                    throw new Error(`Data untuk Tahun ${formData.tahun} tidak wujud.`);
                }

                const rptData = dataTahunIni.RPT_DATA[formData.minggu];
                 const bukuTeksData = (dataTahunIni.BUKU_TEKS_DATA && dataTahunIni.BUKU_TEKS_DATA[formData.minggu]) 
                                     ? dataTahunIni.BUKU_TEKS_DATA[formData.minggu] 
                                     : { mukaSurat: "Rujuk buku teks" };

                if (!rptData) {
                    rphContentDiv.innerHTML = generateTiadaDataContent(formData.minggu, formData.tahun);
                } else {
                    const rphData = await generateRPHContent(formData, rptData, bukuTeksData);
                    rphContentDiv.innerHTML = renderRPH(rphData, formData);
                }

                if (resultDiv) resultDiv.style.display = 'block';

            } catch (error) {
                showError(error.message);
                console.error("Ralat semasa menjana RPH:", error);
            } finally {
                if (loadingDiv) loadingDiv.style.display = 'none';
            }
        });
    }

    function showError(message) {
        if (errorTextSpan && errorMessageDiv) {
            errorTextSpan.textContent = message;
            errorMessageDiv.style.display = 'block';
        } else {
            alert("RALAT APLIKASI:\n\n" + message);
        }
        
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (resultDiv) resultDiv.style.display = 'none';
    }
    
    window.downloadDOCX = function() {
        if (!currentFormData || !rphContentDiv) return;
        const tahun = currentFormData.tahun;
        const kelas = currentFormData.kelas;
        const tarikh = currentFormData.tarikh;
        const sourceHTML = rphContentDiv.innerHTML;
        const converted = htmlDocx.asBlob(sourceHTML);
        
        saveAs(converted, `RPH_BM_Tahun${tahun}_${kelas}_${tarikh}.docx`);
    };

    window.copyToClipboard = function() {
        if (!rphContentDiv) return;
        const el = document.createElement('textarea');
        el.value = rphContentDiv.innerText;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        alert("RPH telah disalin ke clipboard!");
    };

    window.generateAgain = function() {
        if (currentFormData && form) {
            form.dispatchEvent(new Event('submit'));
        }
    };
});

function formatTarikh(tarikhISO) {
    if (!tarikhISO) return 'Tarikh tidak ditetapkan';
    const tarikh = new Date(tarikhISO);
    return tarikh.toLocaleDateString('ms-MY', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
}

function generateTiadaDataContent(minggu, tahun) {
    return `
        <div style="text-align: center; padding: 40px; background-color: #fff3cd; border-radius: 8px;">
            <h2 style="color: #856404;">📝 Tiada Data RPH Ditemui</h2>
            <p style="margin-top: 10px;">Tiada data pengajaran formal ditemui untuk <strong>Minggu ${minggu} (Tahun ${tahun})</strong>.</p>
            <p>Ini mungkin merupakan minggu cuti penggal, peperiksaan, atau aktiviti khas sekolah.</p>
            <p style="margin-top: 20px; font-size: 0.9em;"><em>Sila rujuk takwim sekolah anda untuk maklumat lanjut.</em></p>
        </div>
    `;
}

async function generateRPHContent(formData, rptData, bukuTeksData) {
    
    const pilihSKSPSesuaian = (skString, spString) => {
        if (!skString || !spString) {
            return { sk: "Standard Kandungan tidak dinyatakan", sp: "Standard Pembelajaran tidak dinyatakan" };
        }
        const skList = skString.split('\n').map(s => s.trim()).filter(Boolean);
        const spList = spString.split('\n').map(s => s.trim()).filter(Boolean);
        if (spList.length === 0) {
            return { sk: skList.join('<br>'), sp: "Tiada Standard Pembelajaran spesifik" };
        }
        const spTerpilih = spList[Math.floor(Math.random() * spList.length)];
        const spCodeMatch = spTerpilih.match(/^(\d+\.\d+)/);
        let skSepadan = skList.length > 0 ? skList[0] : "Standard Kandungan tidak dinyatakan";
        if (spCodeMatch) {
            const spBaseCode = spCodeMatch[1];
            const foundSk = skList.find(sk => sk.trim().startsWith(spBaseCode));
            if (foundSk) skSepadan = foundSk;
        }
        return { sk: skSepadan, sp: spTerpilih };
    };
    
    const pilihInfoBukuTeks = (mukaSuratData, tajuk, sp) => {
        if (!mukaSuratData) return { mukaSurat: 'Rujuk buku teks', aktiviti: 'membaca petikan berkaitan tajuk pembelajaran' };
        if (!mukaSuratData.includes('<br>')) {
            return { mukaSurat: mukaSuratData, aktiviti: 'membaca petikan berkaitan tajuk pembelajaran' };
        }
        const senaraiAktiviti = mukaSuratData.split('<br>').map(line => line.trim()).filter(line => line);
        let pilihanTerbaik = senaraiAktiviti[0]; 
        let skorTerbaik = 0;
        const kataKunci = `${tajuk} ${sp}`.toLowerCase().replace(/[^\w\s]/gi, '').split(' ').filter(k => k.length > 3 && !['unit', 'tema', 'dan', 'atau', 'pada', 'yang', 'dalam', 'untuk'].includes(k));
        for (const aktiviti of senaraiAktiviti) {
            let skorSemasa = 0;
            for (const kunci of kataKunci) {
                if (aktiviti.toLowerCase().includes(kunci)) skorSemasa++;
            }
            if (skorSemasa > skorTerbaik) {
                skorTerbaik = skorSemasa;
                pilihanTerbaik = aktiviti;
            }
        }
        let mukaSurat = 'Rujuk buku teks';
        const match = pilihanTerbaik.match(/mukasurat\s+(\d+)|m\/s\s+(\d+)|halaman\s+(\d+)|hlm\s+(\d+)/i);
        if (match) {
            mukaSurat = match[1] || match[2] || match[3] || match[4];
        } else {
            const nomborPertama = pilihanTerbaik.match(/\d+/);
            if (nomborPertama) mukaSurat = nomborPertama[0];
        }
        let aktivitiTeks = pilihanTerbaik.replace(/mukasurat\s+\d+|m\/s\s+\d+|halaman\s+\d+|hlm\s+\d+/i, '').replace(/^\s*-\s*/, '').replace(/\(\)/g, '').trim();
        if (!aktivitiTeks) aktivitiTeks = 'membaca petikan berkaitan tajuk pembelajaran';
        return { mukaSurat: mukaSurat, aktiviti: aktivitiTeks };
    };

    // --- FUNGSI BARU: Memanggil backend untuk mendapatkan aktiviti AI ---
    async function getAIActivities(level, tajuk, sp) {
        try {
            const response = await fetch('/api/generate-activities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ level, tajuk, sp })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ralat tidak diketahui dari server.');
            }
            const data = await response.json();
            return { activities: data.activities, source: 'Groq AI' }; // Berjaya
        } catch (error) {
            console.error('Gagal mendapatkan aktiviti dari AI:', error);
            // Fallback kepada aktiviti statik jika AI gagal
            return {
                activities: [
                    "Guru bersoal jawab dengan murid berkaitan topik.",
                    "Murid membuat latihan berdasarkan buku teks.",
                    "Perbincangan jawapan bersama guru.",
                    "Guru dan murid membuat refleksi tentang pengajaran hari ini."
                ],
                source: 'Fallback' // Gagal
            };
        }
    }

    const { sk: skTerpilih, sp: spTerpilih } = pilihSKSPSesuaian(rptData.standardKandungan, rptData.standardPembelajaran);
    const infoBukuTeks = pilihInfoBukuTeks(bukuTeksData.mukaSurat, rptData.tajuk, spTerpilih);
    const mukaSuratPilihan = infoBukuTeks.mukaSurat;
    const aktivitiSpesifik = infoBukuTeks.aktiviti;

    // Panggil backend untuk menjana aktiviti
    const hasilAI = await getAIActivities(formData.kreativiti, rptData.tajuk, spTerpilih);
    const rangkaAktivitiDinamik = hasilAI.activities;
    const sumberAktiviti = hasilAI.source;

    let setInduksiBukuTeks = `Murid membuka buku teks muka surat ${mukaSuratPilihan}`;
    if (aktivitiSpesifik && aktivitiSpesifik !== 'membaca petikan berkaitan tajuk pembelajaran') {
        setInduksiBukuTeks += `, ${aktivitiSpesifik.charAt(0).toLowerCase() + aktivitiSpesifik.slice(1)}`;
    }
    setInduksiBukuTeks += `.`;

    const spTextClean = spTerpilih.replace(/^\d+\.\d+\.\d+\s*/, '').trim();
    const objektifDinamik = `Pada akhir pengajaran, murid dapat ${spTextClean} berdasarkan aktiviti yang dijalankan.`;

    return {
        tema: rptData.tema,
        unit: rptData.unit,
        tajuk: rptData.tajuk,
        standardKandungan: skTerpilih,
        standardPembelajaran: spTerpilih,
        mukaSurat: mukaSuratPilihan,
        objektif: objektifDinamik,
        kriteriaCemerlang: `Murid berjaya ${spTextClean} dengan cemerlang dan menunjukkan kefahaman mendalam.`,
        kriteriaSederhana: `Murid berjaya ${spTextClean} dengan baik dan memahami konsep asas.`,
        kriteriaBimbingan: `Murid berjaya ${spTextClean} dengan bimbingan guru.`,
        rangkaSetInduksi: [
            `Guru mempamerkan gambar visual berkaitan ${rptData.tajuk} dan murid menyatakan pemerhatian awal.`,
            setInduksiBukuTeks
        ],
        rangkaAktiviti: rangkaAktivitiDinamik,
        bahanBBM: `Buku teks muka surat ${mukaSuratPilihan}, bahan PAK21, alat multimedia, visual aids berkaitan ${rptData.tajuk}.`,
        pemulihan: "Bimbingan individu dan aktiviti alternatif yang lebih terstruktur.",
        pengayaan: "Tugasan kreatif lanjutan dan projek mini.",
        sumberAktiviti: sumberAktiviti // Tambah status sumber AI
    };
}

function renderRPH(rphData, formData) {
    // Tentukan warna dan teks status berdasarkan sumber aktiviti
    const aiStatusColor = rphData.sumberAktiviti === 'Groq AI' ? '#28a745' : '#dc3545';
    const aiStatusText = rphData.sumberAktiviti === 'Groq AI' ? 'Berjaya (Groq AI)' : 'Gagal (Fallback)';

    return `
        <h2 class="rph-title">RANCANGAN PENGAJARAN HARIAN - TAHUN ${formData.tahun}</h2>
        <table class="rph-table">
            <tr><td><strong>Mata Pelajaran:</strong></td><td>BAHASA MELAYU TAHUN ${formData.tahun}</td></tr>
            <tr><td><strong>Kelas:</strong></td><td>${formData.kelas}</td></tr>
            <tr><td><strong>Tarikh:</strong></td><td>${formatTarikh(formData.tarikh)}</td></tr>
            <tr><td><strong>Minggu:</strong></td><td>Minggu ${formData.minggu}</td></tr>
            <tr><td><strong>Tema/Unit:</strong></td><td>${rphData.tema} / ${rphData.unit}</td></tr>
            <tr><td><strong>Tajuk:</strong></td><td>${rphData.tajuk}</td></tr>
            <tr><td><strong>Standard Kandungan:</strong></td><td>${rphData.standardKandungan.replace(/\n/g, '<br>')}</td></tr>
            <tr><td><strong>Standard Pembelajaran:</strong></td><td>${rphData.standardPembelajaran.replace(/\n/g, '<br>')}</td></tr>
            <tr><td><strong>Muka Surat Buku Teks:</strong></td><td>${rphData.mukaSurat}</td></tr>
        </table>
        <h3>📚 Objektif Pembelajaran</h3>
        <p>${rphData.objektif}</p>
        <h3>🎯 Kriteria Kejayaan</h3>
        <div class="success-criteria">
            <div class="criteria-item">🏆 <strong>Cemerlang:</strong> ${rphData.kriteriaCemerlang}</div>
            <div class="criteria-item">✅ <strong>Sederhana:</strong> ${rphData.kriteriaSederhana}</div>
            <div class="criteria-item">💡 <strong>Perlu Bimbingan:</strong> ${rphData.kriteriaBimbingan}</div>
        </div>
        <h3>🔄 Rangka Pengajaran</h3>
        <div class="teaching-framework">
            <div class="framework-section">
                <h4>Set Induksi (5 minit)</h4>
                <ol>${rphData.rangkaSetInduksi.map(item => `<li>${item}</li>`).join('')}</ol>
            </div>
            <div class="framework-section">
                <h4>Aktiviti (55 minit)</h4>
                <ol>${rphData.rangkaAktiviti.map(item => `<li>${item}</li>`).join('')}</ol>
            </div>
        </div>
        <h3>📦 Bahan Bantu Mengajar</h3>
        <p>${rphData.bahanBBM}</p>
        <h3>🔧 Pemulihan</h3>
        <p>${rphData.pemulihan}</p>
        <h3>🚀 Pengayaan</h3>
        <p>${rphData.pengayaan}</p>
        <div class="ai-notes">
            <h4>🎯 Nota Penjanaan AI</h4>
            <p><strong>Status Panggilan AI:</strong> <span style="color: ${aiStatusColor}; font-weight: bold;">${aiStatusText}</span></p>
            <p><strong>Tahap Kreativiti Dipilih:</strong> ${formData.kreativiti}</p>
        </div>
    `;
}
```

---

### Fasa 2: Muat Naik Perubahan ke GitHub

1.  **Buka Terminal/Command Prompt** dan navigasi ke folder projek anda.
2.  Laksanakan arahan-arahan ini satu per satu:
    ```bash
    git add .
    git commit -m "Tambah penunjuk status AI pada RPH"
    git push
    

