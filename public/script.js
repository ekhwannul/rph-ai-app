// --- FAIL INI TELAH DIBAIKI UNTUK MENGURUSKAN SEMUA RALAT 'REPLACE' & 'MAP' ---
// 1. [PEMBAIKAN KEDUA] Logik displayRPH kini turut menyemak kewujudan 'formData.mukaSurat' sebelum menggunakan .replace().
// 2. Logik updateFormFields dan displayRPH kini kedua-duanya tahan lasak.

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
        
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "Pilih Minggu";
        mingguSelect.appendChild(defaultOption);

        if (selectedTahun && SEMUA_DATA[selectedTahun]) {
            const rptData = SEMUA_DATA[selectedTahun].RPT_DATA;
            const weeks = Object.keys(rptData).sort((a, b) => parseInt(a) - parseInt(b));
            
            weeks.forEach(weekNumber => {
                const option = document.createElement('option');
                option.value = weekNumber;
                option.textContent = `Minggu ${weekNumber}`;
                mingguSelect.appendChild(option);
            });
        }
    }

    function updateFormFields(tahun, minggu) {
        const data = SEMUA_DATA[tahun]?.RPT_DATA[minggu];
        document.getElementById('tema').value = data?.tema || '';
        document.getElementById('unit').value = data?.unit || '';
        document.getElementById('tajuk').value = data?.tajuk || '';
        document.getElementById('sk').value = data?.standardKandungan || '';
        document.getElementById('sp').value = data?.standardPembelajaran || '';
        
        const mukaSuratValue = data?.mukaSurat ? data.mukaSurat.replace(/<br>/g, '\n') : '';
        document.getElementById('mukaSurat').value = mukaSuratValue;
    }

    tahunSelect?.addEventListener('change', function () {
        populateMingguDropdown(this.value);
        updateFormFields(this.value, mingguSelect.value);
    });

    mingguSelect?.addEventListener('change', function () {
        updateFormFields(tahunSelect.value, this.value);
    });

    form?.addEventListener('submit', function (event) {
        event.preventDefault();
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        currentFormData = data;

        loadingDiv.style.display = 'block';
        resultDiv.style.display = 'none';
        errorMessageDiv.style.display = 'none';

        fetch('/api/generate-activities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.error || 'Ralat server tidak diketahui'); });
            }
            return response.json();
        })
        .then(data => {
            loadingDiv.style.display = 'none';
            currentFormData.aiResponse = data;
            displayRPH(currentFormData);
            resultDiv.style.display = 'block';
        })
        .catch(error => {
            console.error("Ralat semasa menjana RPH:", error);
            showError(error.message);
        });
    });

    function showError(message) {
        loadingDiv.style.display = 'none';
        resultDiv.style.display = 'none';
        errorTextSpan.textContent = message;
        errorMessageDiv.style.display = 'block';
    }

    function displayRPH(formData) {
        const aiData = formData.aiResponse;
        const aiSteps = aiData.langkah || [];

        const spText = formData.sp || "";
        const matchOp = spText.match(/(\d+\.\d+\.\d+)\s*(.*)/);
        const op = matchOp ? matchOp[2] : "melengkapkan aktiviti berdasarkan arahan";

        const extractKK = (text) => {
            const keywords = ["menulis", "membaca", "menyenaraikan", "menyatakan", "mengenal pasti", "menjelaskan", "membandingkan", "membezakan"];
            for (const keyword of keywords) {
                if (text.toLowerCase().startsWith(keyword)) {
                    return text;
                }
            }
            return `melengkapkan tugasan ${text.split(' ')[0]}`;
        };
        
        const kk = extractKK(op);
        const kataKunci = op.split(' ').slice(1).join(' ').split(',')[0];

        const rphData = {
            tahun: formData.tahun,
            minggu: formData.minggu,
            tema: formData.tema,
            unit: formData.unit,
            tajuk: formData.tajuk,
            sk: formData.sk,
            sp: formData.sp,
            // [PEMBAIKAN KEDUA] Semak jika formData.mukaSurat wujud sebelum .replace()
            mukaSurat: (formData.mukaSurat || '').replace(/\n/g, '<br>'),
            objektif: `Pada akhir pengajaran, murid dapat ${op} dengan baik.`,
            kriteriaCemerlang: `Murid dapat ${kk} 5 daripada 5 ${kataKunci} dengan betul.`,
            kriteriaSederhana: `Murid dapat ${kk} 3 hingga 4 daripada 5 ${kataKunci} dengan bimbingan.`,
            kriteriaBimbingan: `Murid dapat ${kk} 1 hingga 2 daripada 5 ${kataKunci} dengan bimbingan guru.`,
            rangkaSetInduksi: aiSteps.slice(0, 1),
            rangkaAktiviti: aiSteps.slice(1),
            bahanBBM: "Buku Teks, Buku Aktiviti, Paparan Slaid, Lembaran Kerja",
            pemulihan: "Murid melengkapkan latihan asas dengan bimbingan guru.",
            pengayaan: "Murid membina ayat tambahan berdasarkan topik.",
            aiProvider: aiData.aiProvider || 'Tidak Diketahui',
            rawResponse: aiData.raw || 'Tiada respons mentah.',
            isFallback: aiData.fallback || false
        };

        const rphContentHTML = `
            <h2>Rancangan Pengajaran Harian (RPH)</h2>
            <p><strong>Tarikh:</strong> ${new Date().toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            <table>
                <tr><td><strong>Tahun</strong></td><td>${rphData.tahun}</td></tr>
                <tr><td><strong>Minggu</strong></td><td>${rphData.minggu}</td></tr>
                <tr><td><strong>Tema</strong></td><td>${rphData.tema}</td></tr>
                <tr><td><strong>Unit</strong></td><td>${rphData.unit}</td></tr>
                <tr><td><strong>Tajuk</strong></td><td>${rphData.tajuk}</td></tr>
                <tr><td><strong>Standard Kandungan (SK)</strong></td><td>${rphData.sk}</td></tr>
                <tr><td><strong>Standard Pembelajaran (SP)</strong></td><td>${rphData.sp}</td></tr>
                <tr><td><strong>Buku Teks</strong></td><td>${rphData.mukaSurat}</td></tr>
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
                    <h4>Set Induksi (5 minit)</h4>
                    <ol>${rphData.rangkaSetInduksi.map(item => `<li>${item}</li>`).join('')}</ol>
                </div>
                <div class="framework-section">
                    <h4>Aktiviti (55 minit)</h4>
                    <ol>${rphData.rangkaAktiviti.map(item => `<li>${item}</li>`).join('')}</ol>
                </div>
            </div>
            <h3>📦 Bahan Bantu Mengajar</h3><p>${rphData.bahanBBM}</p>
            <h3>🔧 Pemulihan</h3><p>${rphData.pemulihan}</p>
            <h3>🚀 Pengayaan</h3><p>${rphData.pengayaan}</p>
            <div class="ai-notes">
                <h4>🎯 Nota Penjanaan AI</h4>
                <p><strong>Status Panggilan AI:</strong> ${rphData.isFallback ? 
                    '<span class="fallback-pill">Berjaya (Fallback)</span>' : 
                    '<span class="success-pill">Berjaya</span>'}
                </p>
                <p><strong>Dijana oleh:</strong> ${rphData.aiProvider}</p>
                <details>
                    <summary>Lihat Respons Mentah AI</summary>
                    <pre><code>${rphData.rawResponse}</code></pre>
                </details>
            </div>
        `;
        rphContentDiv.innerHTML = rphContentHTML;
    }

    // Inisialisasi awal
    if (tahunSelect) {
        populateMingguDropdown(tahunSelect.value);
        if (mingguSelect) {
            updateFormFields(tahunSelect.value, mingguSelect.value);
        }
    }
});
