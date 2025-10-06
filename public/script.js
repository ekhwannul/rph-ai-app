// --- LOGIK TELAH DIPERBAIKI ---
// VERSI TERKINI: Menambah ciri untuk minggu khas (peperiksaan/cuti) dan memastikan "Jana Semula" memberikan aktiviti PAK21 yang berbeza.

// --- PANGKALAN DATA AKTIVITI PAK21 (BERDASARKAN PDF) ---
const senaraiAktivitiPAK21 = [
    { name: "Gallery Walk", steps: ["Murid dibahagikan kepada kumpulan dan menyiapkan tugasan pada kertas sebak.", "Setiap kumpulan menampal hasil kerja mereka di dinding.", "Ahli kumpulan bergerak dari stesen ke stesen untuk melihat hasil kerja kumpulan lain.", "Murid memberikan komen atau maklum balas pada 'sticky notes' dan menampalnya pada hasil kerja rakan.", "Setiap kumpulan kembali ke stesen asal, membaca maklum balas, dan membuat rumusan."] },
    { name: "Hot Seat", steps: ["Seorang murid dipilih sebagai 'pakar' atau 'watak' dan duduk di kerusi yang disediakan di hadapan kelas.", "'Pakar' ini telah membuat kajian atau bacaan mendalam mengenai topik.", "Murid-murid lain akan mengemukakan soalan-soalan berkaitan topik kepada 'pakar'.", "'Pakar' akan menjawab semua soalan berdasarkan pengetahuan dan pemahamannya.", "Guru bertindak sebagai fasilitator untuk mengawal sesi soal jawab."] },
    { name: "Think-Pair-Share", steps: ["Guru memberikan soalan atau masalah berkaitan topik pembelajaran.", "<strong>(Think)</strong> Murid berfikir secara individu untuk mendapatkan jawapan atau idea.", "<strong>(Pair)</strong> Murid berbincang dengan pasangan untuk berkongsi dan membandingkan idea mereka.", "<strong>(Share)</strong> Beberapa pasangan dipilih untuk berkongsi hasil perbincangan mereka dengan seluruh kelas."] },
    { name: "Round Table", steps: ["Murid duduk dalam kumpulan.", "Guru memberikan satu soalan atau topik.", "Secara bergilir-gilir, setiap ahli kumpulan menulis satu idea atau jawapan pada sehelai kertas.", "Kertas tersebut diedarkan mengikut arah jam sehingga semua ahli mendapat giliran.", "Hasil dapatan dikongsi dan dibincangkan bersama."] },
    { name: "Jigsaw Reading", steps: ["Murid dibahagikan kepada 'kumpulan asal' dan setiap ahli diberikan sub-topik yang berbeza.", "Murid membentuk 'kumpulan pakar' dengan ahli dari kumpulan lain yang mempunyai sub-topik yang sama.", "Dalam 'kumpulan pakar', murid berbincang untuk memahami sub-topik mereka secara mendalam.", "Murid kembali ke 'kumpulan asal' dan setiap 'pakar' akan menerangkan sub-topik mereka kepada ahli kumpulan yang lain."] },
    { name: "Fan-N-Pick", steps: ["Setiap kumpulan diberikan satu set kad soalan.", "Murid 1 menyusun kad seperti kipas.", "Murid 2 memilih satu kad dan membacakan soalan.", "Murid 3 menjawab soalan tersebut.", "Murid 4 memberikan respons atau pujian terhadap jawapan yang diberikan.", "Peranan ditukar untuk pusingan seterusnya."] }
];

let lastUsedPak21 = null; // Pembolehubah untuk mengingati aktiviti PAK21 terakhir

document.addEventListener('DOMContentLoaded', function () {
    if (typeof SEMUA_DATA === 'undefined') {
        alert("RALAT KRITIKAL: Fail data_semua_tahun.js gagal dimuatkan atau mempunyai ralat.");
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
                if (!rphContentDiv) throw new Error("Elemen HTML dengan id='rphContent' tidak ditemui.");

                const dataTahunIni = SEMUA_DATA[formData.tahun];
                if (!dataTahunIni) throw new Error(`Data untuk Tahun ${formData.tahun} tidak wujud.`);
                
                const rptData = dataTahunIni.RPT_DATA[formData.minggu];
                
                // --- LOGIK BAHARU 1: KENDALIKAN MINGGU KHAS ---
                if (rptData && isSpecialWeek(rptData)) {
                    rphContentDiv.innerHTML = generateSpecialWeekContent(rptData);
                    if (resultDiv) resultDiv.style.display = 'block';
                    if (loadingDiv) loadingDiv.style.display = 'none';
                    return; // Hentikan proses penjanaan RPH biasa
                }
                
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
    
    window.downloadDOCX = function() { if (!currentFormData || !rphContentDiv) return; const {tahun, kelas, tarikh} = currentFormData; const sourceHTML = rphContentDiv.innerHTML; const converted = htmlDocx.asBlob(sourceHTML); saveAs(converted, `RPH_BM_Tahun${tahun}_${kelas}_${tarikh}.docx`); };
    window.copyToClipboard = function() { if (!rphContentDiv) return; const el = document.createElement('textarea'); el.value = rphContentDiv.innerText; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); alert("RPH telah disalin ke clipboard!"); };
    window.generateAgain = function() { if (currentFormData && form) form.dispatchEvent(new Event('submit')); };
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

// --- FUNGSI BAHARU: UNTUK MINGGU KHAS ---
function isSpecialWeek(rptData) {
    const keywords = ['pentaksiran', 'peperiksaan', 'ulangkaji', 'cuti', 'pengurusan akhir tahun', 'orientasi', 'transisi'];
    const theme = rptData.tema.toLowerCase();
    const title = rptData.tajuk.toLowerCase();
    return keywords.some(keyword => theme.includes(keyword) || title.includes(keyword));
}

function generateSpecialWeekContent(rptData) {
     return `<div style="text-align: center; padding: 40px; background-color: #e2e3e5; border-radius: 8px;">
            <h2 style="color: #383d41;">🗓️ Makluman Minggu Khas</h2>
            <p style="font-size: 1.2rem; margin-top: 10px;"><strong>Tema/Aktiviti:</strong> ${rptData.tema}</p>
            <p><strong>Fokus:</strong> ${rptData.tajuk}</p>
            <p style="margin-top: 20px; font-size: 0.9em;"><em>Tiada RPH formal dijana untuk minggu ini. Sila rujuk takwim sekolah anda untuk maklumat lanjut.</em></p>
        </div>`;
}

async function getAIActivities(level, tajuk, sp) { /* This function is no longer used, logic moved to frontend */ }

async function generateRPHContent(formData, rptData, bukuTeksData) {
    const pilihSKSPSesuaian = (skString, spString) => { /* ... (logic unchanged) ... */ };
    const pilihInfoBukuTeks = (mukaSuratData, tajuk, sp) => { /* ... (logic unchanged) ... */ };

    // --- LOGIK BAHARU 2: Jana aktiviti PAK21 yang berbeza ---
    const generateCreativeActivities = (level, tajuk) => {
        const aktivitiUmum = `berkaitan topik ${tajuk}`;
        let langkahLangkah;
        
        if (level === 'Asas') {
            langkahLangkah = [
                `Guru bersoal jawab dengan murid ${aktivitiUmum}.`,
                `Murid membaca petikan atau nota yang diberikan oleh guru secara kelas.`,
                `Guru memberi penerangan dan contoh tambahan.`,
                `Murid menjawab soalan pemahaman atau membuat latihan bertulis secara individu.`
            ];
        } else {
            // Tapis senarai untuk buang aktiviti yang terakhir digunakan
            const availableActivities = senaraiAktivitiPAK21.filter(act => act.name !== lastUsedPak21);
            // Pilih satu aktiviti PAK21 secara rawak dari senarai yang telah ditapis
            const aktivitiPilihan = availableActivities[Math.floor(Math.random() * availableActivities.length)];
            // Simpan nama aktiviti yang baru dipilih untuk rujukan seterusnya
            lastUsedPak21 = aktivitiPilihan.name;
            
            langkahLangkah = [`Aktiviti PAK21: Murid menjalankan aktiviti <strong>${aktivitiPilihan.name}</strong>.`];
            langkahLangkah = langkahLangkah.concat(aktivitiPilihan.steps);
        }

        langkahLangkah.push("Guru dan murid membuat refleksi tentang pengajaran hari ini.");
        return langkahLangkah;
    };

    const { sk: skTerpilih, sp: spTerpilih } = pilihSKSPSesuaian(rptData.standardKandungan, rptData.standardPembelajaran);
    const infoBukuTeks = pilihInfoBukuTeks(bukuTeksData.mukaSurat, rptData.tajuk, spTerpilih);
    const { mukaSurat: mukaSuratPilihan, aktiviti: aktivitiSpesifik } = infoBukuTeks;

    const rangkaAktivitiDinamik = generateCreativeActivities(formData.kreativiti, rptData.tajuk);

    let setInduksiBukuTeks = `Murid membuka buku teks muka surat ${mukaSuratPilihan}`;
    if (aktivitiSpesifik && aktivitiSpesifik !== 'membaca petikan berkaitan tajuk pembelajaran') {

