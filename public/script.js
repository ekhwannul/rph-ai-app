// --- LOGIK TELAH DIPERBAIKI ---
// VERSI TERKINI: AI kini memilih satu pasangan SK/SP dan mereka bentuk aktiviti yang sesuai.

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

    // Fungsi untuk mengisi dropdown minggu berdasarkan tahun yang dipilih
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
        form.addEventListener('submit', function (e) {
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

            setTimeout(() => {
                try {
                    if (!rphContentDiv) {
                        throw new Error("Elemen HTML dengan id='rphContent' tidak ditemui. Sila pastikan struktur fail index.html anda betul.");
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
                        const rphData = generateRPHContent(formData, rptData, bukuTeksData);
                        rphContentDiv.innerHTML = renderRPH(rphData, formData);
                    }

                    if (resultDiv) resultDiv.style.display = 'block';

                } catch (error) {
                    showError(error.message);
                    console.error("Ralat semasa menjana RPH:", error);
                } finally {
                    if (loadingDiv) loadingDiv.style.display = 'none';
                }
            }, 500);
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

// --- FUNGSI "AI" YANG TELAH DIUBAH SUAI SECARA MENYELURUH ---
function generateRPHContent(formData, rptData, bukuTeksData) {
    
    // Fungsi 1: Memilih satu pasangan SK dan SP yang sesuai secara "pintar"
    const pilihSKSPSesuaian = (skString, spString) => {
        if (!skString || !spString) {
            return { sk: "Standard Kandungan tidak dinyatakan", sp: "Standard Pembelajaran tidak dinyatakan" };
        }

        const skList = skString.split('\n').map(s => s.trim()).filter(Boolean);
        const spList = spString.split('\n').map(s => s.trim()).filter(Boolean);

        if (spList.length === 0) {
            return { sk: skList.join('<br>'), sp: "Tiada Standard Pembelajaran spesifik" };
        }

        // Pilih satu SP secara rawak dari senarai yang ada untuk minggu tersebut
        const spTerpilih = spList[Math.floor(Math.random() * spList.length)];

        // Cari SK yang sepadan berdasarkan nombor utama (cth: SP 2.1.1 sepadan dengan SK 2.1)
        const spCodeMatch = spTerpilih.match(/^(\d+\.\d+)/);
        let skSepadan = skList.length > 0 ? skList[0] : "Standard Kandungan tidak dinyatakan"; // Fallback

        if (spCodeMatch) {
            const spBaseCode = spCodeMatch[1];
            const foundSk = skList.find(sk => sk.trim().startsWith(spBaseCode));
            if (foundSk) {
                skSepadan = foundSk;
            }
        }
        
        return { sk: skSepadan, sp: spTerpilih };
    };
    
    // Fungsi 2: Memilih info buku teks (sedia ada, tidak perlu ubah)
    const pilihInfoBukuTeks = (mukaSuratData, tajuk, sp) => {
        if (!mukaSuratData) return { mukaSurat: 'Rujuk buku teks', aktiviti: 'membaca petikan berkaitan tajuk pembelajaran' };
        if (!mukaSuratData.includes('<br>')) {
            return { mukaSurat: mukaSuratData, aktiviti: 'membaca petikan berkaitan tajuk pembelajaran' };
        }
        
        const senaraiAktiviti = mukaSuratData.split('<br>').map(line => line.trim()).filter(line => line);
        let pilihanTerbaik = senaraiAktiviti[0]; 
        let skorTerbaik = 0;

        const kataKunci = `${tajuk} ${sp}`.toLowerCase()
            .replace(/[^\w\s]/gi, '')
            .split(' ')
            .filter(k => k.length > 3 && !['unit', 'tema', 'dan', 'atau', 'pada', 'yang', 'dalam', 'untuk'].includes(k));

        for (const aktiviti of senaraiAktiviti) {
            let skorSemasa = 0;
            for (const kunci of kataKunci) {
                if (aktiviti.toLowerCase().includes(kunci)) {
                    skorSemasa++;
                }
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

        let aktivitiTeks = pilihanTerbaik
            .replace(/mukasurat\s+\d+|m\/s\s+\d+|halaman\s+\d+|hlm\s+\d+/i, '')
            .replace(/^\s*-\s*/, '')
            .replace(/\(\)/g, '')
            .trim();

        if (!aktivitiTeks) {
            aktivitiTeks = 'membaca petikan berkaitan tajuk pembelajaran';
        }

        return { mukaSurat: mukaSurat, aktiviti: aktivitiTeks };
    };

    // Fungsi 3: Menjana aktiviti kreatif berdasarkan SK/SP dan tahap kreativiti
    const generateCreativeActivities = (level, tajuk, sp) => {
        const aktivitiUmum = `berkaitan topik ${tajuk}`;
        let langkahLangkah;
        const kemahiran = sp.toLowerCase();
        let aktivitiPilihanPAK21;

        // Tentukan jenis aktiviti PAK21 yang sesuai berdasarkan kemahiran dalam SP
        if (kemahiran.includes('bertutur') || kemahiran.includes('respons') || kemahiran.includes('bercerita') || kemahiran.includes('bersoal jawab')) {
            aktivitiPilihanPAK21 = ["Hot Seat", "Think-Pair-Share", "Rally Robin"];
        } else if (kemahiran.includes('menulis') || kemahiran.includes('membina ayat') || kemahiran.includes('penulisan')) {
            aktivitiPilihanPAK21 = ["Round Table", "Gallery Walk"];
        } else if (kemahiran.includes('membaca') || kemahiran.includes('memahami')) {
            aktivitiPilihanPAK21 = ["Jigsaw Reading", "Think-Pair-Share"];
        } else {
            // Fallback untuk kemahiran lain (cth: tatabahasa, seni bahasa)
            aktivitiPilihanPAK21 = ["Fan-N-Pick", "Gallery Walk", "Think-Pair-Share"];
        }
        
        if (level === 'Asas') {
            langkahLangkah = [
                `Guru bersoal jawab dengan murid ${aktivitiUmum}.`,
                `Murid membaca petikan atau nota yang diberikan oleh guru secara kelas.`,
                `Guru memberi penerangan dan contoh tambahan berdasarkan Standard Pembelajaran hari ini.`,
                `Murid menjawab soalan pemahaman atau membuat latihan bertulis secara individu.`
            ];
        } else {
            // Pilih satu aktiviti PAK21 secara rawak dari senarai yang sesuai
            const namaAktiviti = aktivitiPilihanPAK21[Math.floor(Math.random() * aktivitiPilihanPAK21.length)];
            const pak21Obj = senaraiAktivitiPAK21.find(a => a.nama === namaAktiviti);
            
            // Bina penerangan aktiviti
            langkahLangkah = [`Aktiviti PAK21: Murid menjalankan aktiviti <strong>${pak21Obj.nama}</strong>.`];
            langkahLangkah = langkahLangkah.concat(pak21Obj.langkah);
        }

        // Tambah langkah refleksi sebagai langkah terakhir yang wajib
        langkahLangkah.push("Guru dan murid membuat refleksi tentang pengajaran hari ini.");
        return langkahLangkah;
    };
    
    // --- PROSES UTAMA PENJANAAN RPH ---

    // 1. Pilih sepasang SK dan SP yang menjadi fokus
    const { sk: skTerpilih, sp: spTerpilih } = pilihSKSPSesuaian(rptData.standardKandungan, rptData.standardPembelajaran);

    // 2. Pilih info buku teks yang relevan
    const infoBukuTeks = pilihInfoBukuTeks(bukuTeksData.mukaSurat, rptData.tajuk, spTerpilih);
    const mukaSuratPilihan = infoBukuTeks.mukaSurat;
    const aktivitiSpesifik = infoBukuTeks.aktiviti;

    // 3. Menjana aktiviti pengajaran berdasarkan tahap kreativiti dan SP yang dipilih
    const rangkaAktivitiDinamik = generateCreativeActivities(formData.kreativiti, rptData.tajuk, spTerpilih);

    // 4. Bina ayat Set Induksi yang lebih kemas dan terperinci
    let setInduksiBukuTeks = `Murid membuka buku teks muka surat ${mukaSuratPilihan}`;
    if (aktivitiSpesifik && aktivitiSpesifik !== 'membaca petikan berkaitan tajuk pembelajaran') {
        setInduksiBukuTeks += `, ${aktivitiSpesifik.charAt(0).toLowerCase() + aktivitiSpesifik.slice(1)}`;
    }
    setInduksiBukuTeks += `.`;

    // 5. Bina Objektif Pembelajaran dan Kriteria Kejayaan yang lebih spesifik
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
        bahanBBM: `Buku teks muka surat ${mukaSuratPilihan}, bahan PAK21 (kad aktiviti, kertas mahjong, pen marker), alat multimedia, visual aids berkaitan ${rptData.tajuk}.`,
        pemulihan: "Bimbingan individu dan aktiviti alternatif yang lebih terstruktur. Guru memberikan panduan langkah demi langkah.",
        pengayaan: "Tugasan kreatif lanjutan dan projek mini untuk murid yang telah menguasai kemahiran asas. Aktiviti cabaran tinggi."
    };
}


function renderRPH(rphData, formData) {
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
            <h4>🎯 Enhanced Fallback Mode - TAHUN ${formData.tahun}</h4>
            <p><strong>Format KK:</strong> 2 dari 3 aktiviti berjaya diselesaikan</p>
            <p><strong>Aktiviti:</strong> Detail dengan penerangan lengkap</p>
            <p><strong>Kreativiti Level:</strong> ${formData.kreativiti}</p>
            <p><strong>Tahap:</strong> Disesuaikan untuk murid TAHUN ${formData.tahun}</p>
        </div>
    `;
}

