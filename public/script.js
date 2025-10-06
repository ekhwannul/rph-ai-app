// --- LOGIK TELAH DIPERBAIKI ---
// VERSI TERKINI: 
// 1. Kriteria Kejayaan (KK) dikemas kini ke format "5 dari 5".
// 2. Paparan status AI kini menyokong semua penyedia (Groq, Hugging Face, OpenRouter).

document.addEventListener('DOMContentLoaded', function () {
    // Pastikan SEMUA_DATA wujud sebelum meneruskan
    if (typeof SEMUA_DATA === 'undefined') {
        alert("RALAT KRITIKAL: Fail data_semua_tahun.js gagal dimuatkan atau mempunyai ralat. Sila pastikan fail tersebut wujud dan tiada kesilapan sintaks.");
        return;
    }

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
        // Panggil serta-merta untuk mengisi dropdown semasa laman dimuatkan
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
                if (loadingDiv) loadingDiv.style.display = 'none';
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
    return tarikh.toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' });
}

function generateTiadaDataContent(minggu, tahun) {
    return `<div style="text-align: center; padding: 40px; background-color: #fff3cd; border-radius: 8px;">
            <h2 style="color: #856404;">📝 Tiada Data RPH Ditemui</h2>
            <p>Tiada data pengajaran formal ditemui untuk <strong>Minggu ${minggu} (Tahun ${tahun})</strong>.</p>
            <p style="margin-top: 20px; font-size: 0.9em;"><em>Sila semak semula data RPT anda atau rujuk takwim sekolah.</em></p>
        </div>`;
}

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
        return { activities: data.activities, source: data.source };
    } catch (error) {
        console.error('Gagal mendapatkan aktiviti dari AI:', error);
        return {
            activities: [
                "Guru bersoal jawab dengan murid berkaitan topik.",
                "Murid membuat latihan berdasarkan buku teks.",
                "Perbincangan jawapan bersama guru.",
                "Guru dan murid membuat refleksi tentang pengajaran hari ini."
            ],
            source: 'Fallback'
        };
    }
}

async function generateRPHContent(formData, rptData, bukuTeksData) {
    const pilihSKSPSesuaian = (skString, spString) => {
        if (!skString || !spString) return { sk: "Standard Kandungan tidak dinyatakan", sp: "Standard Pembelajaran tidak dinyatakan" };
        const skList = skString.split('\n').map(s => s.trim()).filter(Boolean);
        const spList = spString.split('\n').map(s => s.trim()).filter(Boolean);
        if (spList.length === 0) return { sk: skList.join('<br>'), sp: "Tiada Standard Pembelajaran spesifik" };
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
        if (!mukaSuratData || !mukaSuratData.includes('<br>')) return { mukaSurat: mukaSuratData || 'Rujuk buku teks', aktiviti: 'membaca petikan berkaitan tajuk pembelajaran' };
        const senaraiAktiviti = mukaSuratData.split('<br>').map(line => line.trim()).filter(line => line);
        let pilihanTerbaik = senaraiAktiviti[0]; 
        let skorTerbaik = 0;
        const kataKunci = `${tajuk} ${sp}`.toLowerCase().replace(/[^\w\s]/gi, '').split(' ').filter(k => k.length > 3 && !['unit', 'tema', 'dan', 'atau', 'pada', 'yang', 'dalam', 'untuk'].includes(k));
        for (const aktiviti of senaraiAktiviti) {
            let skorSemasa = 0;
            for (const kunci of kataKunci) { if (aktiviti.toLowerCase().includes(kunci)) skorSemasa++; }
            if (skorSemasa > skorTerbaik) { skorTerbaik = skorSemasa; pilihanTerbaik = aktiviti; }
        }
        let mukaSurat = 'Rujuk buku teks';
        const match = pilihanTerbaik.match(/mukasurat\s+(\d+)|m\/s\s+(\d+)|halaman\s+(\d+)|hlm\s+(\d+)/i);
        if (match) mukaSurat = match[1] || match[2] || match[3] || match[4];
        else { const nomborPertama = pilihanTerbaik.match(/\d+/); if (nomborPertama) mukaSurat = nomborPertama[0]; }
        let aktivitiTeks = pilihanTerbaik.replace(/mukasurat\s+\d+|m\/s\s+\d+|halaman\s+\d+|hlm\s+\d+/i, '').replace(/^\s*-\s*/, '').replace(/\(\)/g, '').trim();
        if (!aktivitiTeks) aktivitiTeks = 'membaca petikan berkaitan tajuk pembelajaran';
        return { mukaSurat: mukaSurat, aktiviti: aktivitiTeks };
    };

    const { sk: skTerpilih, sp: spTerpilih } = pilihSKSPSesuaian(rptData.standardKandungan, rptData.standardPembelajaran);
    const infoBukuTeks = pilihInfoBukuTeks(bukuTeksData.mukaSurat, rptData.tajuk, spTerpilih);
    const { mukaSurat: mukaSuratPilihan, aktiviti: aktivitiSpesifik } = infoBukuTeks;

    const hasilAI = await getAIActivities(formData.kreativiti, rptData.tajuk, spTerpilih);
    const { activities: rangkaAktivitiDinamik, source: sumberAktiviti } = hasilAI;

    let setInduksiBukuTeks = `Murid membuka buku teks muka surat ${mukaSuratPilihan}`;
    if (aktivitiSpesifik && aktivitiSpesifik !== 'membaca petikan berkaitan tajuk pembelajaran') {
        setInduksiBukuTeks += `, ${aktivitiSpesifik.charAt(0).toLowerCase() + aktivitiSpesifik.slice(1)}`;
    }
    setInduksiBukuTeks += `.`;

    const spTextClean = spTerpilih.replace(/^\d+\.\d+\.\d+\s*/, '').trim();
    const objektifDinamik = `Pada akhir pengajaran, murid dapat ${spTextClean} berdasarkan aktiviti yang dijalankan.`;

    // --- PEMBETULAN KRITERIA KEJAYAAN DI SINI ---
    return {
        tema: rptData.tema, unit: rptData.unit, tajuk: rptData.tajuk,
        standardKandungan: skTerpilih, standardPembelajaran: spTerpilih,
        mukaSurat: mukaSuratPilihan, objektif: objektifDinamik,
        kriteriaCemerlang: `Murid berjaya ${spTextClean} 5 dari 5 aktiviti dengan cemerlang dan menunjukkan kefahaman mendalam.`,
        kriteriaSederhana: `Murid berjaya ${spTextClean} 3 dari 5 aktiviti dengan baik dan memahami konsep asas.`,
        kriteriaBimbingan: `Murid berjaya ${spTextClean} 2 dari 5 aktiviti dengan bimbingan guru.`,
        rangkaSetInduksi: [`Guru mempamerkan gambar visual berkaitan ${rptData.tajuk} dan murid menyatakan pemerhatian awal.`, setInduksiBukuTeks],
        rangkaAktiviti: rangkaAktivitiDinamik,
        bahanBBM: `Buku teks muka surat ${mukaSuratPilihan}, bahan PAK21, alat multimedia, visual aids berkaitan ${rptData.tajuk}.`,
        pemulihan: "Bimbingan individu dan aktiviti alternatif yang lebih terstruktur.",
        pengayaan: "Tugasan kreatif lanjutan dan projek mini.",
        sumberAktiviti: sumberAktiviti
    };
}

function renderRPH(rphData, formData) {
    let aiStatusColor, aiStatusText;
    switch(rphData.sumberAktiviti) {
        case 'Groq': aiStatusColor = '#00C7B1'; aiStatusText = `Berjaya (${rphData.sumberAktiviti})`; break;
        case 'Hugging Face': aiStatusColor = '#FFD21E'; aiStatusText = `Berjaya (${rphData.sumberAktiviti})`; break;
        case 'OpenRouter': aiStatusColor = '#4F46E5'; aiStatusText = `Berjaya (${rphData.sumberAktiviti})`; break;
        default: aiStatusColor = '#dc3545'; aiStatusText = 'Gagal (Fallback)'; break;
    }

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
        <h3>📚 Objektif Pembelajaran</h3><p>${rphData.objektif}</p>
        <h3>🎯 Kriteria Kejayaan</h3>
        <div class="success-criteria">
            <div class="criteria-item">🏆 <strong>Cemerlang:</strong> ${rphData.kriteriaCemerlang}</div>
            <div class="criteria-item">✅ <strong>Sederhana:</strong> ${rphData.kriteriaSederhana}</div>
            <div class="criteria-item">💡 <strong>Perlu Bimbingan:</strong> ${rphData.kriteriaBimbingan}</div>
        </div>
        <h3>🔄 Rangka Pengajaran</h3>
        <div class="teaching-framework">
            <div class="framework-section">
                <h4>Set Induksi (5 minit)</h4><ol>${rphData.rangkaSetInduksi.map(item => `<li>${item}</li>`).join('')}</ol>
            </div>
            <div class="framework-section">
                <h4>Aktiviti (55 minit)</h4><ol>${rphData.rangkaAktiviti.map(item => `<li>${item}</li>`).join('')}</ol>
            </div>
        </div>
        <h3>📦 Bahan Bantu Mengajar</h3><p>${rphData.bahanBBM}</p>
        <h3>🔧 Pemulihan</h3><p>${rphData.pemulihan}</p>
        <h3>🚀 Pengayaan</h3><p>${rphData.pengayaan}</p>
        <div class="ai-notes">
            <h4>🎯 Nota Penjanaan AI</h4>
            <p><strong>Status Panggilan AI:</strong> <span style="color: ${aiStatusColor}; font-weight: bold;">${aiStatusText}</span></p>
            <p><strong>Tahap Kreativiti Dipilih:</strong> ${formData.kreativiti}</p>
        </div>
    `;
}

