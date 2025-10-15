// --- LOGIK TELAH DIPERBAIKI ---
// VERSI TERKINI: Menambah format penomboran manual (1., 2., 3.) pada senarai aktiviti yang dijana.

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
    let lastGeneratedActivities = null;

    function populateMingguDropdown(selectedTahun) {
        if (!mingguSelect) return;
        mingguSelect.innerHTML = ''; 

        if (selectedTahun && SEMUA_DATA[selectedTahun]) {
            // Menggunakan data RPT untuk menentukan minggu yang ada
            const rptData = SEMUA_DATA[selectedTahun].RPT_DATA;
            Object.keys(rptData).forEach(mingguNum => {
                const option = document.createElement('option');
                option.value = mingguNum;
                option.textContent = `Minggu ${mingguNum}`;
                mingguSelect.appendChild(option);
            });
        }
    }
    
    tahunSelect.addEventListener('change', (e) => {
        populateMingguDropdown(e.target.value);
    });

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        
        const selectedTahun = document.getElementById('tahun').value;
        const selectedMinggu = document.getElementById('minggu').value;
        const selectedLevel = document.querySelector('input[name="level"]:checked').value;

        if (!SEMUA_DATA[selectedTahun] || !SEMUA_DATA[selectedTahun].RPT_DATA[selectedMinggu]) {
            showError("Data RPH tidak ditemui untuk tahun dan minggu yang dipilih.");
            return;
        }

        currentFormData = {
            tahun: selectedTahun,
            minggu: selectedMinggu,
            level: selectedLevel
        };
        
        lastGeneratedActivities = null; // Reset aktiviti untuk janaan baru
        await generateRPH(currentFormData, null);
    });

    async function generateRPH(formData, previousActivities) {
        showLoading(true);
        showError(false);
        resultDiv.style.display = 'none';

        const { tahun, minggu, level } = formData;
        const rptData = SEMUA_DATA[tahun].RPT_DATA[minggu];
        
        try {
            const response = await fetch('/generate-rph', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    level: level,
                    tajuk: rptData.tajuk,
                    sp: rptData.standardPembelajaran,
                    previousActivities: previousActivities
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ralat tidak diketahui dari pelayan.');
            }

            const data = await response.json();
            
            // Simpan aktiviti yang baru dijana
            if (Array.isArray(data.activities)) {
                 lastGeneratedActivities = data.activities;
            } else {
                // Jika format tidak dijangka, elakkan ralat
                lastGeneratedActivities = [];
                console.error("Format 'activities' yang diterima bukan array:", data.activities);
            }
           

            const fullRphData = {
                ...rptData,
                rangkaAktiviti: lastGeneratedActivities,
                sumberAi: data.source || 'Tidak diketahui'
            };

            const rphHtml = formatRPHContent(fullRphData);
            rphContentDiv.innerHTML = rphHtml;
            resultDiv.style.display = 'block';

        } catch (error) {
            showError(error.message);
        } finally {
            showLoading(false);
        }
    }

    function formatRPHContent(rphData) {
        // PERUBAHAN DI SINI: Menambah nombor secara manual (index + 1)
        const aktivitiHtml = rphData.rangkaAktiviti
            .map((item, index) => `<li>${index + 1}. ${item}</li>`)
            .join('');

        return `
            <div class="rph-header">
                <h2>Rancangan Pengajaran Harian (RPH)</h2>
                <p>Tahun ${currentFormData.tahun} | Minggu ${currentFormData.minggu}</p>
            </div>
            <table class="rph-table">
                <tr><td><strong>TEMA</strong></td><td>${rphData.tema}</td></tr>
                <tr><td><strong>UNIT</strong></td><td>${rphData.unit}</td></tr>
                <tr><td><strong>TAJUK</strong></td><td>${rphData.tajuk}</td></tr>
                <tr><td><strong>STANDARD KANDUNGAN</strong></td><td>${rphData.standardKandungan}</td></tr>
                <tr><td><strong>STANDARD PEMBELAJARAN</strong></td><td>${rphData.standardPembelajaran}</td></tr>
            </table>
            <h3>Rangka Aktiviti Pengajaran</h3>
            <ol class="activity-list">${aktivitiHtml}</ol>
            <div class="ai-notes">
                <h4>Nota Penjanaan AI</h4>
                <p>Dijana menggunakan: <strong>${rphData.sumberAi}</strong> | Aras Kerumitan: <strong>${currentFormData.level}</strong></p>
            </div>
        `;
    }

    window.copyToClipboard = function() {
        const content = rphContentDiv.innerText || rphContentDiv.textContent;
        navigator.clipboard.writeText(content).then(() => {
            alert('Teks RPH telah disalin ke papan klip!');
        }).catch(err => {
            console.error('Gagal menyalin teks: ', err);
        });
    };
    
    window.downloadDOCX = function() {
        const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' "+
            "xmlns:w='urn:schemas-microsoft-com:office:word' "+
            "xmlns='http://www.w3.org/TR/REC-html40'>"+
            "<head><meta charset='utf-8'><title>RPH</title></head><body>";
        const footer = "</body></html>";
        const sourceHTML = header + rphContentDiv.innerHTML + footer;
        
        const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
        const fileDownload = document.createElement("a");
        document.body.appendChild(fileDownload);
        fileDownload.href = source;
        fileDownload.download = `RPH_Tahun${currentFormData.tahun}_Minggu${currentFormData.minggu}.doc`;
        fileDownload.click();
        document.body.removeChild(fileDownload);
    };
    
    window.generateAgain = async function() {
        if (currentFormData) {
            // Hantar aktiviti lama untuk memastikan janaan baru adalah berbeza
            await generateRPH(currentFormData, lastGeneratedActivities); 
        }
    };

    function showLoading(isLoading) {
        loadingDiv.style.display = isLoading ? 'block' : 'none';
    }

    function showError(message) {
        if (message) {
            errorTextSpan.textContent = message;
            errorMessageDiv.style.display = 'block';
        } else {
            errorMessageDiv.style.display = 'none';
        }
    }
    
    // Panggil pada mulanya untuk mengisi dropdown minggu
    populateMingguDropdown(tahunSelect.value);
});
