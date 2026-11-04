/**
 * AI & Internet Question Generator
 * Mengintegrasikan Google Gemini API, live internet endpoints,
 * dan Smart Algorithmic Generator untuk variasi tak terbatas tanpa duplikasi.
 */

let curriculumDataRef = typeof CURRICULUM_DATA !== 'undefined' ? CURRICULUM_DATA : null;
if (!curriculumDataRef && typeof require !== 'undefined') {
  try {
    curriculumDataRef = require('./curriculum.js').CURRICULUM_DATA;
  } catch (e) {}
}

const AIGenerator = {
  // Model defaults
  defaultModel: 'gemini-1.5-pro',

  // Get saved API key from localStorage
  getApiKey() {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('pintar_quiz_gemini_key') || '';
    }
    return '';
  },

  setApiKey(key) {
    if (typeof localStorage !== 'undefined') {
      if (key) {
        localStorage.setItem('pintar_quiz_gemini_key', key.trim());
      } else {
        localStorage.removeItem('pintar_quiz_gemini_key');
      }
    }
  },

  getModel() {
    let saved = this.defaultModel;
    if (typeof localStorage !== 'undefined') {
      saved = localStorage.getItem('pintar_quiz_model') || this.defaultModel;
    }
    return saved;
  },

  setModel(model) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('pintar_quiz_model', model);
    }
  },

  /**
   * Mengambil daftar model resmi yang aktif di Google AI Studio untuk API key pengguna
   */
  async fetchLiveModels(apiKey) {
    if (!apiKey) throw new Error('API key belum dimasukkan.');
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(endpoint);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    const models = (data.models || [])
      .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
      .map(m => ({
        id: m.name.replace(/^models\//, ''),
        displayName: m.displayName || m.name,
        description: m.description || ''
      }));
    return models;
  },

  /**
   * Main entry point to generate questions (Anti-Duplicate Guaranteed)
   */
  async generateQuestions({ level, grade = null, subjectId, count = 30, onProgress = null }) {
    const data = curriculumDataRef || (typeof CURRICULUM_DATA !== 'undefined' ? CURRICULUM_DATA : null);
    if (!data) throw new Error('Data kurikulum tidak terdefinisi.');
    const levelData = data.levels[level];
    if (!levelData) throw new Error(`Level ${level} tidak ditemukan.`);

    const targetGrade = grade || levelData.defaultGrade || (level === 'SD' ? 6 : level === 'SMP' ? 9 : 12);
    const allSubjects = [...levelData.subjects, ...levelData.tkaSubjects];
    const subject = allSubjects.find(s => s.id === subjectId) || allSubjects[0];
    const optionCount = levelData.optionCount || (level === 'SMA' ? 5 : 4);
    const apiKey = this.getApiKey();

    if (onProgress) onProgress({ status: 'generating', message: `Menyiapkan ${count} soal Kelas ${targetGrade}...` });

    // 1. If user provided a Gemini API Key, use real AI via Gemini API
    if (apiKey) {
      try {
        if (onProgress) onProgress({ status: 'gemini', message: `Menghubungi AI Gemini (${this.getModel()}) untuk membuat ${count} soal baru...` });
        const aiQuestions = await this.fetchFromGemini({
          apiKey,
          level,
          grade: targetGrade,
          subject,
          count,
          optionCount
        });

        // Deduplicate Gemini questions
        const uniqueAi = [];
        const seenAi = new Set();
        for (const q of (aiQuestions || [])) {
          const key = (q.question || '').trim().toLowerCase();
          if (key && !seenAi.has(key)) {
            seenAi.add(key);
            uniqueAi.push(q);
          }
        }

        if (uniqueAi.length >= count) {
          return uniqueAi.slice(0, count).map((q, idx) => ({ ...q, id: idx + 1 }));
        } else if (uniqueAi.length > 0) {
          // Tambal kekurangan dengan soal unik dari generator dinamis
          const needed = count - uniqueAi.length;
          const supplement = this.generateDynamicQuestions(level, targetGrade, subject, needed, optionCount, seenAi);
          return [...uniqueAi, ...supplement].map((q, idx) => ({ ...q, id: idx + 1 }));
        }
      } catch (err) {
        console.warn('Gagal memanggil Gemini API, beralih ke generator dinamis internet/offline:', err);
        if (onProgress) onProgress({ status: 'warning', message: `AI Gemini: ${err.message}. Menggunakan generator edukasi terpadu...` });
      }
    }

    // 2. Try fetching from local server proxy if running in browser
    if (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http')) {
      try {
        if (onProgress) onProgress({ status: 'server', message: `Memeriksa engine soal terintegrasi...` });
        const serverResponse = await fetch('/api/generate-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ level, grade: targetGrade, subjectId: subject.id, count, optionCount, apiKey })
        }).catch(() => null);

        if (serverResponse && serverResponse.ok) {
          const data = await serverResponse.json();
          if (data.questions && data.questions.length >= count) {
            // Deduplicate server questions
            const uniqueServ = [];
            const seenServ = new Set();
            for (const q of data.questions) {
              const k = (q.question || '').trim().toLowerCase();
              if (k && !seenServ.has(k)) {
                seenServ.add(k);
                uniqueServ.push(q);
              }
            }
            if (uniqueServ.length >= count) {
              return uniqueServ.slice(0, count).map((q, idx) => ({ ...q, id: idx + 1 }));
            }
          }
        }
      } catch (e) {}
    }

    // 3. Smart Procedural Dynamic Generator (100% Unik & Anti-Duplikasi)
    if (onProgress) onProgress({ status: 'procedural', message: `Menghasilkan ${count} soal Kelas ${targetGrade} secara unik & acak...` });
    await new Promise(r => setTimeout(r, 200));

    return this.generateDynamicQuestions(level, targetGrade, subject, count, optionCount);
  },

  /**
   * Calls Google Gemini API directly with strict anti-duplicate prompt
   */
  async fetchFromGemini({ apiKey, level, grade, subject, count, optionCount }) {
    let model = this.getModel();
    let endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const optionLetters = optionCount === 5 ? 'A, B, C, D, E' : 'A, B, C, D';

    const prompt = `
Kamu adalah pakar penyusun soal ujian kurikulum pendidikan Indonesia (Kurikulum Merdeka dan Kurikulum 2013).
Tugasmu adalah membuat ${count} butir soal pilihan ganda baru, segar, acak (random), bervariasi, dan mendidik.

Detail Permintaan:
- Jenjang Pendidikan: ${level} (Tingkat: ${(curriculumDataRef || CURRICULUM_DATA).levels[level].name})
- Tingkat Kelas: Kelas ${grade || (level === 'SD' ? 6 : level === 'SMP' ? 9 : 12)}
- Mata Pelajaran / Modul: ${subject.name}
- Deskripsi Materi: ${subject.description}
- Jumlah Opsi Jawaban: ${optionCount} opsi (${optionLetters})
- Karakteristik Soal:
  1. Sangat penting: Sesuaikan materi dan tingkat kesulitan secara presisi untuk siswa Kelas ${grade || ''} di Indonesia!
  2. SANGAT PENTING: DILARANG KERAS MENGULANG SOAL! Setiap butir soal dari nomor 1 sampai ${count} HARUS 100% BERBEDA dari segi teks pertanyaan, angka, dan konsep yang diuji. Tidak boleh ada soal yang kembar/mirip!
  3. Bersifat aplikatif, kontekstual Indonesia, penalaran logis, dan berpikir tingkat tinggi (HOTS).
  4. Gunakan Bahasa Indonesia baku yang baik, benar, dan santun.
  5. Berikan pembahasan (explanation) lengkap, mendalam, dan mendidik untuk setiap butir soal.
  6. Pastikan indeks jawaban benar (correctIndex) valid: 0 untuk A, 1 untuk B, 2 untuk C, 3 untuk D${optionCount === 5 ? ', 4 untuk E' : ''}.

KEMBALIKAN HANYA JSON MURNI (Array of objects) TANPA MARKDOWN ATAU BLOK KODE.
Format JSON:
[
  {
    "id": 1,
    "question": "Kalimat pertanyaan lengkap...",
    "options": ["Teks pilihan A", "Teks pilihan B", "Teks pilihan C", "Teks pilihan D"${optionCount === 5 ? ', "Teks pilihan E"' : ''}],
    "correctIndex": 0,
    "explanation": "Langkah pengerjaan dan alasan mengapa opsi ini benar secara rinci..."
  }
]
`;

    let response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const msg = errData.error?.message || '';

      if (response.status === 429 || msg.includes('RESOURCE_EXHAUSTED')) {
        throw new Error('Batas kuota Gemini Pro Free Tier tercapai. Menunggu antrean...');
      }

      if (msg.includes('high demand') || msg.includes('no longer available') || response.status === 503 || response.status === 404) {
        const fallbackModel = model !== 'gemini-1.5-pro' ? 'gemini-1.5-pro' : 'gemini-1.5-flash';
        endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${fallbackModel}:generateContent?key=${apiKey}`;
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, topP: 0.95, maxOutputTokens: 8192, responseMimeType: 'application/json' }
          })
        });
      }

      if (!response.ok) {
        const finalErr = await response.json().catch(() => ({}));
        throw new Error(finalErr.error?.message || `HTTP ${response.status}`);
      }
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('Respons AI kosong.');
    }

    let cleaned = candidateText.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
    else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();

    const questions = JSON.parse(cleaned);
    if (!Array.isArray(questions)) throw new Error('Format keluaran AI bukan array soal.');

    return questions.map((q, idx) => ({
      id: idx + 1,
      question: q.question || `Soal no ${idx + 1}`,
      options: Array.isArray(q.options) ? q.options.slice(0, optionCount) : ['A', 'B', 'C', 'D'],
      correctIndex: typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < optionCount ? q.correctIndex : 0,
      explanation: q.explanation || 'Pembahasan terperinci tidak disertakan.'
    }));
  },

  /**
   * Smart Procedural Generator (100% Guaranteed Zero Duplicate Questions)
   * Mengumpulkan pool soal berkapasitas besar (50+ soal unik),
   * mengacak parameter angka/nama, dan menyaring agar setiap soal unik mutlak.
   */
  generateDynamicQuestions(level = 'SD', grade = 6, subject, count = 30, optionCount = 4, excludeSet = new Set()) {
    const rawPool = this.buildComprehensivePool(level, grade, subject, optionCount);
    const shuffledPool = this.shuffle(rawPool);

    const result = [];
    const seenTexts = new Set(excludeSet);

    for (const q of shuffledPool) {
      const normalized = (q.question || '').trim().toLowerCase();
      if (!seenTexts.has(normalized)) {
        seenTexts.add(normalized);
        result.push(q);
        if (result.length >= count) break;
      }
    }

    // Jika pool reguler masih kurang dari count yang diminta, hasilkan variasi parametrik matematis unik sesuai level & grade
    let extraId = 100;
    while (result.length < count) {
      const extraQ = this.generateParametricUniqueMath(extraId++, optionCount, level, grade);
      const k = extraQ.question.trim().toLowerCase();
      if (!seenTexts.has(k)) {
        seenTexts.add(k);
        result.push(extraQ);
      }
    }

    return result.slice(0, count).map((q, idx) => ({
      ...q,
      id: idx + 1
    }));
  },

  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  /**
   * Membangun Bank Soal Menyeluruh dengan Segmentasi Ketat:
   * SD (Kelas 1-2 dasar, 3-4 menengah, 5-6 atas/TKA SD), SMP (Kelas 7-9 & TKA SMP), dan SMA (Kelas 10-12 & UTBK SNBT).
   * Dijamin: Siswa SD tidak akan pernah mendapat materi SMP/SMA (seperti Phytagoras, SPLDV, atau Kalkulus)!
   */
  buildComprehensivePool(level, grade, subject, optionCount) {
    const lvl = (level || 'SD').toUpperCase();
    const gr = parseInt(grade, 10) || (lvl === 'SD' ? 6 : lvl === 'SMP' ? 9 : 12);
    const sid = (subject.id || '').toLowerCase();
    const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const names = ['Andi', 'Siti', 'Budi', 'Rina', 'Dewi', 'Rafi', 'Farhan', 'Nadia', 'Bambang', 'Alya', 'Dimas', 'Zahra', 'Bayu', 'Tiara'];

    // Helper untuk memformat soal dan mengacak opsi
    const createQ = (qText, correctAns, distArr, explanation) => {
      const reqDist = optionCount - 1;
      const d = [...distArr];
      while (d.length < reqDist) {
        const num = parseFloat(String(correctAns).replace(',', '.').replace(/[^0-9.-]/g, ''));
        if (!isNaN(num) && num !== 0) {
          const fake = num + (d.length + 1) * 2;
          d.push(String(correctAns).includes(',') ? fake.toFixed(2).replace('.', ',') : `${fake}`);
        } else {
          d.push('Semua pilihan di atas belum tepat');
        }
      }
      const slicedDist = d.slice(0, reqDist);
      const allOpts = [correctAns, ...slicedDist];
      const shuffled = this.shuffle(allOpts);
      return {
        id: 1,
        question: qText,
        options: shuffled,
        correctIndex: shuffled.indexOf(correctAns),
        explanation: explanation
      };
    };

    const pool = [];

    // =========================================================================
    // 1. MATEMATIKA / NUMERASI (SD vs SMP vs SMA)
    // =========================================================================
    if (sid.includes('matematika') || sid.includes('kuantitatif') || sid.includes('pk') || sid.includes('numerasi')) {
      if (lvl === 'SD') {
        // --- 1.A SEKOLAH DASAR (SD) ---
        if (gr <= 2) {
          // KELAS 1 - 2 SD: Operasi Dasar 1-100, Nilai Tempat, Jam, Bangun Datar
          const addPairs = [
            [15, 12, 27], [24, 15, 39], [32, 26, 58], [45, 18, 63], [53, 29, 82],
            [37, 24, 61], [48, 35, 83], [62, 19, 81], [27, 46, 73], [19, 38, 57]
          ];
          addPairs.forEach(([a, b, sum], idx) => {
            const name = names[idx % names.length];
            pool.push(createQ(
              `${name} memiliki ${a} butir kelereng. Ayah membelikan lagi sebanyak ${b} butir kelereng. Berapa jumlah kelereng ${name} sekarang?`,
              `${sum} butir`,
              [`${sum - 2} butir`, `${sum + 3} butir`, `${sum - 5} butir`],
              `Operasi penjumlahan: ${a} + ${b} = ${sum} butir.`
            ));
          });

          const subPairs = [
            [50, 18, 32], [65, 23, 42], [78, 34, 44], [84, 29, 55], [92, 45, 47],
            [46, 19, 27], [73, 28, 45], [80, 36, 44], [60, 25, 35], [95, 38, 57]
          ];
          subPairs.forEach(([a, b, diff], idx) => {
            const name = names[(idx + 3) % names.length];
            pool.push(createQ(
              `Ibu membeli ${a} buah jeruk. Sebanyak ${b} buah jeruk diberikan kepada tetangga. Sisa buah jeruk Ibu sekarang adalah ...`,
              `${diff} buah`,
              [`${diff + 2} buah`, `${diff - 3} buah`, `${diff + 5} buah`],
              `Operasi pengurangan: ${a} - ${b} = ${diff} buah jeruk.`
            ));
          });

          // Nilai tempat
          [[348, 'puluhan', '40'], [572, 'ratusan', '500'], [816, 'satuan', '6'], [629, 'puluhan', '20'], [945, 'ratusan', '900']].forEach(([num, place, ans]) => {
            pool.push(createQ(
              `Pada bilangan ${num}, nilai tempat dari angka yang berkedudukan sebagai ${place} bernilai ...`,
              ans,
              [`${parseInt(ans, 10) / 10 || 1}`, `${parseInt(ans, 10) * 10}`, `${parseInt(ans, 10) + 5}`],
              `Pada bilangan ${num}, angka pada nilai ${place} mempunyai nilai riil ${ans}.`
            ));
          });

          // Bangun Datar Dasar SD 1-2
          pool.push(createQ('Bangun datar yang memiliki tepat 3 sisi dan 3 titik sudut adalah ...', 'Segitiga', ['Persegi', 'Lingkaran', 'Persegi panjang'], 'Segitiga dibatasi oleh 3 sisi dan memiliki 3 sudut.'));
          pool.push(createQ('Bangun datar yang tidak memiliki titik sudut dan hanya dibatasi oleh 1 garis lengkung adalah ...', 'Lingkaran', ['Persegi', 'Segitiga', 'Trapesium'], 'Lingkaran berbentuk bundar mulus tanpa sudut.'));
          pool.push(createQ('Bangun datar yang memiliki 4 sisi yang sama panjang dan 4 sudut siku-siku adalah ...', 'Persegi', ['Segitiga', 'Lingkaran', 'Jajar genjang'], 'Persegi memiliki keempat sisi yang berukuran sama panjang.'));
          pool.push(createQ('Berapa banyak titik sudut yang dimiliki oleh bangun persegi panjang?', '4 titik sudut', ['3 titik sudut', '5 titik sudut', 'Tidak ada'], 'Persegi panjang memiliki 4 titik sudut siku-siku.'));

          // Jam Analog Dasar SD 1-2
          pool.push(createQ('Jika jarum pendek menunjuk ke angka 8 dan jarum panjang menunjuk tepat ke angka 12, maka jam tersebut menunjukkan pukul ...', '08.00', ['12.08', '08.12', '07.00'], 'Jarum panjang di 12 menunjukkan menit ke-00 (tepat pukul 08.00).'));
          pool.push(createQ('Jarum pendek berada di antara angka 2 dan 3, sedangkan jarum panjang tepat menunjuk angka 6. Waktu tersebut menunjukkan pukul ...', '02.30 (setengah 3)', ['03.30', '02.06', '06.15'], 'Jarum panjang di angka 6 bernilai 30 menit, sehingga menunjukkan pukul 02.30.'));

          // Perkalian dasar konsep penjumlahan berulang
          [[3, 4, 12], [4, 5, 20], [2, 7, 14], [5, 3, 15], [6, 2, 12]].forEach(([a, b, ans]) => {
            pool.push(createQ(
              `Bentuk penjumlahan berulang dari perkalian ${a} × ${b} adalah ...`,
              Array(a).fill(b).join(' + '),
              [Array(b).fill(a).join(' + '), `${a} + ${b}`, Array(a + 1).fill(b).join(' + ')],
              `${a} × ${b} artinya ${a} kali angka ${b}, yaitu ${Array(a).fill(b).join(' + ')} = ${ans}.`
            ));
          });
        } else if (gr === 3 || gr === 4) {
          // KELAS 3 - 4 SD: Perkalian/Pembagian Bersusun, Pecahan Senilai, Luas Persegi/Persegi Panjang, KPK FPB Sederhana
          const mulPairs = [[14, 6, 84], [15, 8, 120], [23, 4, 92], [35, 5, 175], [42, 6, 252], [18, 7, 126], [25, 6, 150], [16, 9, 144]];
          mulPairs.forEach(([a, b, ans]) => {
            pool.push(createQ(
              `Hasil operasi perkalian ${a} × ${b} adalah ...`,
              `${ans}`,
              [`${ans - 8}`, `${ans + 10}`, `${ans - 14}`],
              `${a} × ${b} = ${ans}.`
            ));
          });

          const divPairs = [[96, 4, 24], [84, 3, 28], [125, 5, 25], [144, 6, 24], [156, 4, 39], [180, 5, 36]];
          divPairs.forEach(([a, b, ans]) => {
            pool.push(createQ(
              `Hasil pembagian bersusun dari ${a} ÷ ${b} adalah ...`,
              `${ans}`,
              [`${ans + 2}`, `${ans - 4}`, `${ans + 5}`],
              `${a} ÷ ${b} = ${ans}.`
            ));
          });

          // Pecahan sederhana & senilai
          [['1/2', '2/4', ['1/3', '2/5', '3/8']], ['1/3', '2/6', ['2/5', '1/4', '3/7']], ['3/4', '6/8', ['4/6', '5/8', '2/3']], ['2/5', '4/10', ['3/10', '4/8', '2/10']]].forEach(([orig, eq, dist]) => {
            pool.push(createQ(
              `Pecahan di bawah ini yang senilai dengan ${orig} adalah ...`,
              eq,
              dist,
              `Pecahan senilai diperoleh dengan mengalikan pembilang dan penyebut dengan angka yang sama: ${orig} × 2/2 = ${eq}.`
            ));
          });

          // Luas & Keliling Persegi & Persegi Panjang (Dasar SD)
          [[8, 64, 32], [12, 144, 48], [9, 81, 36], [15, 225, 60]].forEach(([s, luas, kel]) => {
            pool.push(createQ(
              `Sebuah persegi memiliki panjang sisi ${s} cm. Luas persegi tersebut adalah ...`,
              `${luas} cm²`,
              [`${kel} cm²`, `${luas - 16} cm²`, `${s * 2} cm²`],
              `Luas persegi = sisi × sisi = ${s} × ${s} = ${luas} cm².`
            ));
            pool.push(createQ(
              `Sebuah persegi memiliki panjang sisi ${s} cm. Keliling persegi tersebut adalah ...`,
              `${kel} cm`,
              [`${luas} cm`, `${kel + 8} cm`, `${s * 3} cm`],
              `Keliling persegi = 4 × sisi = 4 × ${s} = ${kel} cm.`
            ));
          });

          // KPK & FPB dua bilangan dasar
          [[6, 8, 24, 2], [8, 12, 24, 4], [12, 18, 36, 6], [15, 20, 60, 5], [9, 12, 36, 3]].forEach(([a, b, kpk, fpb]) => {
            pool.push(createQ(
              `KPK (Kelipatan Persekutuan Terkecil) dari ${a} dan ${b} adalah ...`,
              `${kpk}`,
              [`${fpb}`, `${kpk / 2}`, `${a * b}`],
              `Kelipatan ${a} dan ${b} yang terkecil dan bersekutu adalah ${kpk}.`
            ));
            pool.push(createQ(
              `FPB (Faktor Persekutuan Terbesar) dari ${a} dan ${b} adalah ...`,
              `${fpb}`,
              [`${kpk}`, `${fpb * 2}`, `${fpb + 1}`],
              `Faktor terbesar yang membagi habis ${a} dan ${b} adalah ${fpb}.`
            ));
          });

          // Satuan Panjang, Berat, Waktu
          pool.push(createQ('2 jam sama dengan berapa menit?', '120 menit', ['60 menit', '100 menit', '150 menit'], '1 jam = 60 menit, jadi 2 × 60 = 120 menit.'));
          pool.push(createQ('3 kilogram (kg) sama dengan berapa gram (g)?', '3.000 gram', ['300 gram', '30 gram', '30.000 gram'], '1 kg = 1.000 gram, maka 3 kg = 3.000 gram.'));
          pool.push(createQ('Panjang tali 4 meter sama dengan berapa sentimeter (cm)?', '400 cm', ['40 cm', '4.000 cm', '44 cm'], '1 meter = 100 sentimeter, maka 4 m = 400 cm.'));
          pool.push(createQ('Sudut yang besarnya tepat 90 derajat dinamakan ...', 'Sudut siku-siku', ['Sudut lancip', 'Sudut tumpul', 'Sudut lurus'], 'Sudut siku-siku memiliki besar tepat 90°.'));
          pool.push(createQ('Sudut yang besarnya kurang dari 90 derajat dinamakan ...', 'Sudut lancip', ['Sudut tumpul', 'Sudut siku-siku', 'Sudut refleks'], 'Sudut lancip berukuran antara 0° dan 90°.'));
          pool.push(createQ('Sudut yang besarnya lebih dari 90 derajat tetapi kurang dari 180 derajat dinamakan ...', 'Sudut tumpul', ['Sudut lancip', 'Sudut siku-siku', 'Sudut lurus'], 'Sudut tumpul berukuran antara 90° dan 180°.'));
        } else {
          // KELAS 5 - 6 & TKA SD: Desimal, Persen, Diskon, Skala, Kecepatan, Volume Bangun Ruang, Rata-rata
          // Pecahan ke desimal
          const decPairs = [
            { n: 7, d: 20, a: '0,35', exp: '7/20 = (7×5)/(20×5) = 35/100 = 0,35.' },
            { n: 3, d: 20, a: '0,15', exp: '3/20 = (3×5)/(20×5) = 15/100 = 0,15.' },
            { n: 9, d: 20, a: '0,45', exp: '9/20 = (9×5)/(20×5) = 45/100 = 0,45.' },
            { n: 13, d: 20, a: '0,65', exp: '13/20 = (13×5)/(20×5) = 65/100 = 0,65.' },
            { n: 3, d: 4, a: '0,75', exp: '3/4 = (3×25)/(4×25) = 75/100 = 0,75.' },
            { n: 3, d: 8, a: '0,375', exp: '3/8 = (3×125)/(8×125) = 375/1000 = 0,375.' },
            { n: 5, d: 8, a: '0,625', exp: '5/8 = (5×125)/(8×125) = 625/1000 = 0,625.' },
            { n: 7, d: 25, a: '0,28', exp: '7/25 = (7×4)/(25×4) = 28/100 = 0,28.' },
            { n: 14, d: 25, a: '0,56', exp: '14/25 = (14×4)/(25×4) = 56/100 = 0,56.' },
            { n: 9, d: 50, a: '0,18', exp: '9/50 = (9×2)/(50×2) = 18/100 = 0,18.' }
          ];
          decPairs.forEach(p => {
            const val = parseFloat(p.a.replace(',', '.'));
            pool.push(createQ(
              `Bentuk desimal dari pecahan ${p.n}/${p.d} adalah ...`,
              p.a,
              [(val - 0.1).toFixed(2).replace('.', ','), (val + 0.1).toFixed(2).replace('.', ','), (p.n / 10).toFixed(1).replace('.', ',')],
              p.exp
            ));
          });

          // Diskon Belanja
          [15, 20, 25, 30, 40, 50].forEach((pct, idx) => {
            const price = 100000 + idx * 40000;
            const disc = (pct / 100) * price;
            const pay = price - disc;
            const buyer = names[idx % names.length];
            pool.push(createQ(
              `${buyer} membeli sepatu seharga Rp ${price.toLocaleString('id-ID')} dan mendapatkan diskon sebesar ${pct}%. Berapa uang yang harus dibayar ${buyer}?`,
              `Rp ${pay.toLocaleString('id-ID')}`,
              [`Rp ${disc.toLocaleString('id-ID')}`, `Rp ${(pay + 15000).toLocaleString('id-ID')}`, `Rp ${(pay - 10000).toLocaleString('id-ID')}`],
              `Diskon = ${pct}% × Rp ${price.toLocaleString('id-ID')} = Rp ${disc.toLocaleString('id-ID')}. Total bayar = Rp ${price.toLocaleString('id-ID')} - Rp ${disc.toLocaleString('id-ID')} = Rp ${pay.toLocaleString('id-ID')}.`
            ));
          });

          // KPK Lampu & Soal Cerita
          [[15, 20, 60], [12, 18, 36], [20, 30, 60], [10, 15, 30]].forEach(([a, b, ans]) => {
            pool.push(createQ(
              `Lampu merah menyala setiap ${a} detik sekali dan lampu kuning menyala setiap ${b} detik sekali. Jika kedua lampu menyala bersamaan pada detik ke-0, berapa detik kemudian kedua lampu tersebut akan menyala bersamaan kembali?`,
              `${ans} detik`,
              [`${ans + 10} detik`, `${ans / 2} detik`, `${a + b} detik`],
              `Menentukan waktu bersamaan menggunakan KPK dari ${a} dan ${b} = ${ans} detik.`
            ));
          });

          // Volume Balok & Kubus
          [[5, 125], [6, 216], [7, 343], [8, 512], [10, 1000]].forEach(([s, vol]) => {
            pool.push(createQ(
              `Sebuah wadah berbentuk kubus memiliki panjang rusuk ${s} cm. Volume wadah kubus tersebut adalah ...`,
              `${vol} cm³`,
              [`${vol - 25} cm³`, `${s * s} cm³`, `${s * 6} cm³`],
              `Volume kubus = rusuk × rusuk × rusuk = ${s} × ${s} × ${s} = ${vol} cm³.`
            ));
          });

          [[10, 6, 4, 240], [12, 8, 5, 480], [15, 10, 6, 900], [20, 10, 8, 1600]].forEach(([p, l, t, vol]) => {
            pool.push(createQ(
              `Sebuah akuarium balok berukuran panjang ${p} cm, lebar ${l} cm, dan tinggi ${t} cm. Volume akuarium tersebut adalah ...`,
              `${vol} cm³`,
              [`${vol + 100} cm³`, `${p * l} cm³`, `${2 * (p + l + t)} cm³`],
              `Volume balok = panjang × lebar × tinggi = ${p} × ${l} × ${t} = ${vol} cm³.`
            ));
          });

          // Kecepatan, Jarak, Waktu
          [[120, 2, 60], [150, 3, 50], [180, 3, 60], [210, 3, 70], [160, 4, 40]].forEach(([s, t, v]) => {
            pool.push(createQ(
              `Sebuah bus pariwisata menempuh jarak ${s} km dalam waktu ${t} jam. Berapa kecepatan rata-rata bus tersebut?`,
              `${v} km/jam`,
              [`${v + 10} km/jam`, `${v - 15} km/jam`, `${s - 50} km/jam`],
              `Kecepatan = Jarak ÷ Waktu = ${s} km ÷ ${t} jam = ${v} km/jam.`
            ));
          });

          // Perbandingan dan Skala Peta
          [[4, 500000, 20], [5, 400000, 20], [6, 250000, 15], [3, 1000000, 30]].forEach(([cm, skala, km]) => {
            pool.push(createQ(
              `Jarak antara dua kota pada peta berskala 1 : ${skala.toLocaleString('id-ID')} adalah ${cm} cm. Jarak sebenarnya antara kedua kota tersebut adalah ...`,
              `${km} km`,
              [`${km * 10} km`, `${km + 5} km`, `${km / 2} km`],
              `Jarak sebenarnya = Jarak peta × Skala = ${cm} cm × ${skala} = ${cm * skala} cm = ${km} km.`
            ));
          });

          // Statistika Mean SD
          [[70, 80, 80, 90, 80, '80,0'], [75, 85, 90, 70, 80, '80,0'], [60, 70, 80, 90, 100, '80,0'], [85, 90, 95, 70, 60, '80,0']].forEach(([a, b, c, d, e, mean]) => {
            pool.push(createQ(
              `Nilai ulangan matematika Budi berturut-turut adalah ${a}, ${b}, ${c}, ${d}, dan ${e}. Nilai rata-rata ulangan Budi adalah ...`,
              mean,
              ['75,0', '82,5', '78,0'],
              `Rata-rata = (${a} + ${b} + ${c} + ${d} + ${e}) ÷ 5 = ${a+b+c+d+e} ÷ 5 = ${mean}.`
            ));
          });

          // Bilangan Bulat Negatif SD
          pool.push(createQ('Suhu di dalam lemari es mula-mula -4°C. Saat listrik padam, suhu naik sebesar 7°C. Suhu lemari es sekarang adalah ...', '3°C', ['-11°C', '11°C', '-3°C'], 'Suhu sekarang = -4°C + 7°C = 3°C.'));
          pool.push(createQ('Seekor burung terbang di ketinggian 15 meter di atas permukaan laut. Seekor ikan berenang 8 meter di bawah permukaan laut. Selisih jarak antara burung dan ikan adalah ...', '23 meter', ['7 meter', '15 meter', '120 meter'], 'Selisih jarak = 15 - (-8) = 15 + 8 = 23 meter.'));
        }
      } else if (lvl === 'SMP') {
        // --- 1.B SEKOLAH MENENGAH PERTAMA (SMP) ---
        // Phytagoras (5 Variasi)
        [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [7, 24, 25], [9, 12, 15]].forEach(([a, b, c]) => {
          pool.push(createQ(
            `Sebuah segitiga siku-siku memiliki panjang sisi siku-siku ${a} cm dan ${b} cm. Panjang sisi miring (hipotenusa) segitiga tersebut adalah ...`,
            `${c} cm`,
            [`${c - 1} cm`, `${c + 2} cm`, `${a + b} cm`],
            `Berdasarkan Teorema Phytagoras: c = √(a² + b²) = √(${a}² + ${b}²) = √${c * c} = ${c} cm.`
          ));
        });

        // Persamaan Linear & Aljabar
        [[2, 5, 17, 6], [3, 4, 19, 5], [4, 7, 31, 6], [5, 3, 28, 5], [3, 8, 29, 7], [4, 5, 25, 5]].forEach(([a, b, rhs, ans]) => {
          pool.push(createQ(
            `Penyelesaian dari persamaan linear ${a}x + ${b} = ${rhs} adalah x = ...`,
            `${ans}`,
            [`${ans + 1}`, `${ans - 1}`, `${ans + 2}`],
            `${a}x = ${rhs} - ${b} → ${a}x = ${rhs - b} → x = ${ans}.`
          ));
        });

        // SPLDV
        pool.push(createQ(
          'Himpunan penyelesaian dari sistem persamaan linear dua variabel (SPLDV) 2x + y = 11 dan x - y = 1 adalah ...',
          'x = 4 dan y = 3',
          ['x = 3 dan y = 5', 'x = 5 dan y = 1', 'x = 2 dan y = 7'],
          'Jumlahkan kedua persamaan: 3x = 12 → x = 4. Substitusi x = 4: 4 - y = 1 → y = 3.'
        ));
        pool.push(createQ(
          'Harga 2 buku dan 3 pensil adalah Rp 17.000, sedangkan harga 1 buku dan 2 pensil adalah Rp 10.000. Harga sebuah buku adalah ...',
          'Rp 4.000',
          ['Rp 3.000', 'Rp 5.000', 'Rp 2.000'],
          'Misalkan buku = b dan pensil = p. 2b + 3p = 17.000 dan b + 2p = 10.000 → eliminasi menghasilkan b = 4.000.'
        ));

        // Penyederhanaan Aljabar
        pool.push(createQ('Bentuk sederhana dari aljabar 5x - 3y + 7 - 2x + 8y - 4 adalah ...', '3x + 5y + 3', ['3x - 5y + 3', '7x + 5y + 11', '3x + 11y - 3'], 'Gabungkan suku sejenis: (5x - 2x) + (-3y + 8y) + (7 - 4) = 3x + 5y + 3.'));
        pool.push(createQ('Hasil penjabaran dari (2x + 3)(x - 4) adalah ...', '2x² - 5x - 12', ['2x² + 5x - 12', '2x² - 11x - 12', '2x² + 5x + 12'], 'Gunakan sifat distributif: 2x(x) + 2x(-4) + 3(x) + 3(-4) = 2x² - 8x + 3x - 12 = 2x² - 5x - 12.'));

        // Pola Barisan Aritmetika SMP
        [[3, 5, 23], [4, 6, 28], [2, 7, 30], [5, 4, 25], [7, 3, 22]].forEach(([start, diff, ans]) => {
          const s = [start, start + diff, start + diff * 2, start + diff * 3];
          pool.push(createQ(
            `Diberikan barisan aritmetika: ${s.join(', ')}, ... . Nilai suku ke-5 barisan tersebut adalah ...`,
            `${ans}`,
            [`${ans - 2}`, `${ans + diff}`, `${ans - diff}`],
            `Beda barisan b = ${diff}. Maka suku ke-5 = U4 + ${diff} = ${s[3]} + ${diff} = ${ans}.`
          ));
        });

        // Peluang SMP
        pool.push(createQ(
          'Sebuah dadu standar bermata 6 dilempar satu kali. Peluang munculnya mata dadu bernilai bilangan prima adalah ...',
          '1/2 (atau 3/6)',
          ['1/3', '1/6', '2/3'],
          'Mata dadu prima = {2, 3, 5} ada 3 kemungkinan dari total 6 muka dadu → P = 3/6 = 1/2.'
        ));
        pool.push(createQ(
          'Dua keping uang logam dilempar secara bersamaan. Peluang munculnya paling sedikit satu sisi angka adalah ...',
          '3/4',
          ['1/2', '1/4', '2/3'],
          'Ruang sampel S = {(A,A), (A,G), (G,A), (G,G)} dengan n(S) = 4. Kejadian paling sedikit satu angka = 3 → P = 3/4.'
        ));
        pool.push(createQ(
          'Dalam sebuah kantong terdapat 5 kelereng merah dan 3 kelereng biru. Peluang terambilnya 1 kelereng biru secara acak adalah ...',
          '3/8',
          ['5/8', '3/5', '1/8'],
          'Peluang kelereng biru = Jumlah kelereng biru / Total kelereng = 3 / (5 + 3) = 3/8.'
        ));

        // Himpunan & Relasi SMP
        pool.push(createQ(
          'Diketahui A = {1, 2, 3, 4, 5, 6} dan B = {2, 4, 6, 8}. Irisan himpunan A dan B (A ∩ B) adalah ...',
          '{2, 4, 6}',
          ['{1, 3, 5}', '{2, 4, 6, 8}', '{1, 2, 3, 4, 5, 6, 8}'],
          'Irisan adalah anggota yang berada di kedua himpunan sekaligus: {2, 4, 6}.'
        ));
        pool.push(createQ(
          'Diketahui rumus fungsi f(x) = 3x - 5. Nilai dari f(4) adalah ...',
          '7',
          ['12', '9', '-1'],
          'f(4) = 3(4) - 5 = 12 - 5 = 7.'
        ));
      } else {
        // --- 1.C SEKOLAH MENENGAH ATAS (SMA) & UTBK ---
        // Kalkulus Turunan SMA
        [[3, 2, 5, '6x - 5'], [2, 3, 4, '6x² - 4'], [4, 2, 7, '8x - 7'], [5, 3, 2, '15x² - 2'], [2, 4, 3, '8x³ - 3']].forEach(([a, n, c, ans]) => {
          pool.push(createQ(
            `Turunan pertama dari fungsi f(x) = ${a}x^${n} - ${c}x + 9 adalah f'(x) = ...`,
            ans,
            [`${a * n}x`, `${a}x - ${c}`, `${a * n}x^${n} - ${c}`],
            `Menggunakan aturan diferensiasi: d/dx(axⁿ) = n·axⁿ⁻¹ dan d/dx(cx) = c.`
          ));
        });

        // Integral SMA
        pool.push(createQ(
          'Hasil dari ∫ (6x² - 4x + 5) dx adalah ...',
          '2x³ - 2x² + 5x + C',
          ['3x³ - 2x² + 5x + C', '6x³ - 4x² + 5x + C', '2x³ - 4x² + 5 + C', '2x³ - 2x² + C'],
          '∫ axⁿ dx = a/(n+1) xⁿ⁺¹: 6/3 x³ - 4/2 x² + 5x + C = 2x³ - 2x² + 5x + C.'
        ));

        // Eksponen & Logaritma SMA
        pool.push(createQ(
          'Jika diketahui 2^(3x - 1) = 32, maka nilai x yang memenuhi adalah ...',
          '2',
          ['3', '1', '4', '5'],
          '32 = 2⁵. Maka 3x - 1 = 5 → 3x = 6 → x = 2.'
        ));
        pool.push(createQ(
          'Nilai dari ²log 16 + ²log 4 adalah ...',
          '6',
          ['4', '5', '8', '3'],
          '²log 16 = 4 dan ²log 4 = 2. Jadi 4 + 2 = 6 (atau ²log(16 × 4) = ²log 64 = 6).'
        ));
        pool.push(createQ(
          'Nilai dari ³log 81 - ³log 9 adalah ...',
          '2',
          ['3', '4', '1', '5'],
          '³log 81 = 4 dan ³log 9 = 2. Hasil: 4 - 2 = 2.'
        ));

        // Matriks SMA
        [[2, 3, 1, 4, 5], [3, 2, 4, 5, 7], [4, 1, 3, 2, 5], [5, 2, 3, 2, 4]].forEach(([a, b, c, d, det]) => {
          pool.push(createQ(
            `Determinan dari matriks A = [[${a}, ${b}], [${c}, ${d}]] adalah ...`,
            `${det}`,
            [`${det + 2}`, `${det - 3}`, `${a * d + b * c}`, `${det + 4}`],
            `Determinan matriks 2×2: det(A) = ad - bc = (${a} × ${d}) - (${b} × ${c}) = ${a * d} - ${b * c} = ${det}.`
          ));
        });

        // Trigonometri SMA
        pool.push(createQ('Nilai eksak dari sin 30° + cos 60° adalah ...', '1', ['1/2', '√3', '1/2 √3', '2'], 'sin 30° = 1/2 dan cos 60° = 1/2. Jumlahnya = 1/2 + 1/2 = 1.'));
        pool.push(createQ('Nilai dari tan 45° adalah ...', '1', ['0', '1/2 √3', '√3', '1/2'], 'tan 45° = sin 45° / cos 45° = (1/2 √2) / (1/2 √2) = 1.'));

        // Kombinasi & Permutasi SMA
        pool.push(createQ(
          'Banyak cara memilih 3 orang pengurus dari 5 calon yang tersedia adalah C(5, 3) = ...',
          '10 cara',
          ['15 cara', '20 cara', '60 cara', '5 cara'],
          'C(5, 3) = 5! / (3! × 2!) = (5 × 4) / 2 = 10 cara.'
        ));
        pool.push(createQ(
          'Banyak susunan berbeda yang dapat dibentuk dari kata "BUKU" adalah ...',
          '12 susunan',
          ['24 susunan', '6 susunan', '16 susunan', '8 susunan'],
          'Kata "BUKU" terdiri dari 4 huruf dengan 2 huruf U kembar: 4! / 2! = 24 / 2 = 12.'
        ));
      }
    }

    // =========================================================================
    // 2. BAHASA INDONESIA / LITERASI / PBM / PPU
    // =========================================================================
    if (sid.includes('indonesia') || sid.includes('literasi') || sid.includes('pbm') || sid.includes('ppu')) {
      if (lvl === 'SD') {
        // SD INDONESIA: Huruf kapital dasar, tanda baca, ide pokok sederhana, pantun anak, kata baku dasar, ungkapan
        const sdIndo = [
          {
            q: 'Bacalah teks berikut!\n"Komodo adalah kadal terbesar di dunia yang hanya hidup di Nusa Tenggara Timur. Hewan langka ini dilindungi di Taman Nasional Komodo agar populasinya tetap terjaga dari kepunahan."\nIde pokok paragraf di atas adalah ...',
            a: 'Komodo adalah hewan langka terbesar yang dilindungi di NTT',
            d: ['Kepunahan satwa di seluruh Indonesia', 'Keindahan pulau Nusa Tenggara Timur', 'Wisatawan yang berkunjung ke Taman Nasional'],
            exp: 'Gagasan utama terletak pada awal paragraf yang menjelaskan keberadaan komodo sebagai kadal terbesar yang dilindungi.'
          },
          {
            q: 'Penulisan huruf kapital yang benar untuk nama kota dan hari adalah ...',
            a: 'Pada hari Senin, paman berangkat ke Bandung.',
            d: ['Pada hari senin, paman berangkat ke bandung.', 'Pada Hari senin, paman berangkat ke Bandung.', 'Pada hari Senin, paman berangkat ke bandung.'],
            exp: 'Huruf pertama nama hari (Senin) dan nama kota (Bandung) wajib menggunakan huruf kapital.'
          },
          {
            q: 'Tanda baca yang tepat untuk melengkapi kalimat tanya: "Kapan kita akan berkunjung ke museum ... " adalah ...',
            a: 'Tanda tanya (?)',
            d: ['Tanda titik (.)', 'Tanda seru (!)', 'Tanda koma (,)'],
            exp: 'Kalimat tanya yang menanyakan waktu (kapan) wajib diakhiri tanda tanya (?).'
          },
          {
            q: 'Ibu berkata, "Tolong ambilkan payung di teras, Nak!" Kalimat tersebut termasuk jenis kalimat ...',
            a: 'Perintah / Permintaan santun',
            d: ['Kalimat berita', 'Kalimat tanya', 'Kalimat penolakan'],
            exp: 'Kata "tolong" menandakan permohonan atau perintah yang disampaikan secara santun.'
          },
          {
            q: 'Perhatikan pantun berikut!\nPohon beringin rindang daunnya,\nTempat berteduh si anak gembala.\nRajin belajar sejak muda,\nKelak dewasa bahagia sentosa.\n\nPesan atau amanat dari pantun di atas adalah ...',
            a: 'Kita harus rajin belajar di masa muda agar bahagia saat dewasa',
            d: ['Anak gembala senang berteduh di pohon beringin', 'Pohon beringin memiliki daun yang sangat rimbun', 'Jangan bermain di bawah pohon saat hujan'],
            exp: 'Amanat pantun berada pada baris ke-3 dan ke-4 (isi pantun).'
          },
          {
            q: 'Makna ungkapan "kutu buku" dalam kalimat "Dimas dijuluki kutu buku oleh teman sekelasnya" adalah ...',
            a: 'Orang yang sangat gemar membaca buku',
            d: ['Orang yang sering merusak buku', 'Orang yang memiliki banyak koleksi serangga', 'Orang yang tidak suka belajar'],
            exp: 'Ungkapan "kutu buku" merujuk pada orang yang sangat suka membaca dan belajar.'
          },
          {
            q: 'Makna ungkapan "buah tangan" dalam kalimat "Ayah pulang dari Surabaya membawa buah tangan" adalah ...',
            a: 'Oleh-oleh',
            d: ['Buah-buahan segar', 'Hadiah perlombaan', 'Uang saku'],
            exp: 'Buah tangan adalah kiasan untuk oleh-oleh yang dibawa setelah bepergian.'
          },
          {
            q: 'Peribahasa "Hemat pangkal kaya, rajin pangkal ..." kelanjutannya adalah ...',
            a: 'Pandai',
            d: ['Sukses', 'Juara', 'Hebat'],
            exp: 'Peribahasa lengkap: "Hemat pangkal kaya, rajin pangkal pandai".'
          },
          {
            q: 'Kata penghubung (konjungsi) yang tepat untuk kalimat: "Rani giat belajar ... ia dapat menjadi juara kelas" adalah ...',
            a: 'agar',
            d: ['karena', 'tetapi', 'walaupun'],
            exp: 'Konjungsi "agar" atau "supaya" menyatakan hubungan tujuan.'
          },
          {
            q: 'Kata baku yang tepat sesuai ejaan bahasa Indonesia adalah ...',
            a: 'Apotek',
            d: ['Apotik', 'Apoteik', 'Apoteg'],
            exp: 'Baku menurut KBBI adalah "apotek" (seperti kata turunan apoteker).'
          },
          {
            q: 'Sinonim (persamaan kata) dari kata "haus" adalah ...',
            a: 'Dahaga',
            d: ['Lapar', 'Kenyang', 'Lelah'],
            exp: 'Haus memiliki persamaan arti dengan dahaga.'
          },
          {
            q: 'Antonim (lawan kata) dari kata "rajin" adalah ...',
            a: 'Malas',
            d: ['Bodoh', 'Lalai', 'Lambat'],
            exp: 'Lawan kata dari rajin adalah malas.'
          }
        ];
        sdIndo.forEach(item => pool.push(createQ(item.q, item.a, item.d, item.exp)));
      } else if (lvl === 'SMP') {
        // SMP INDONESIA: Teks LHO, Eksposisi, Majas, Kalimat Efektif, EYD V, Analogi
        const smpIndo = [
          {
            q: 'Bagian struktur teks Laporan Hasil Observasi (LHO) yang memuat gambaran umum objek observasi secara ringkas terdapat pada ...',
            a: 'Pernyataan umum / Definisi umum',
            d: ['Deskripsi bagian', 'Deskripsi manfaat', 'Simpulan / Rekomendasi'],
            exp: 'Teks LHO diawali oleh pernyataan/definisi umum yang memuat pembukaan dan klasifikasi objek.'
          },
          {
            q: 'Bagian teks eksposisi yang berisi sudut pandang penulis terhadap masalah yang dibahas dinamakan ...',
            a: 'Tesis (Pernyataan pendapat)',
            d: ['Argumentasi', 'Penegasan ulang', 'Komplikasi permasalahan'],
            exp: 'Tesis adalah pengenalan isu dan sikap penulis di awal teks eksposisi.'
          },
          {
            q: 'Perhatikan kalimat bermajas berikut!\n"Pena penari di atas kertas putih menumpahkan seluruh isi kegelisahan hatinya."\nMajas yang digunakan dalam kalimat tersebut adalah ...',
            a: 'Personifikasi',
            d: ['Metafora', 'Hiperbola', 'Litotes'],
            exp: 'Personifikasi mengumpamakan benda mati (pena) seolah memiliki sifat menari seperti insan manusia.'
          },
          {
            q: 'Perhatikan kalimat bermajas berikut!\n"Sorak gembira penonton di stadion itu menggelegar membelah angkasa."\nMajas tersebut adalah ...',
            a: 'Hiperbola',
            d: ['Litotes', 'Personifikasi', 'Ironi'],
            exp: 'Hiperbola menyatakan sesuatu secara melebih-lebihkan kenyataan (membelah angkasa).'
          },
          {
            q: 'Penulisan kata serapan baku berikut yang seluruhnya sesuai EYD V adalah ...',
            a: 'Praktik, aktif, izin, kualitas',
            d: ['Praktek, aktip, ijin, kwalitas', 'Praktik, aktip, izin, kwalitas', 'Praktek, aktif, ijin, kualitas'],
            exp: 'Baku menurut KBBI dan EYD V: praktik, aktif, izin, dan kualitas.'
          },
          {
            q: 'Kalimat berikut yang merupakan contoh kalimat efektif adalah ...',
            a: 'Seluruh peserta upacara mengenakan pakaian seragam putih biru.',
            d: ['Semua para peserta-peserta upacara dipersilakan berdiri.', 'Bagi para siswa yang membawa sepeda harap dikunci ganda.', 'Rani sangat senang sekali saat mendengar kabar gembira.'],
            exp: 'Kalimat efektif menghindari pemborosan kata (pleonasme) seperti "semua para" atau "sangat ... sekali".'
          },
          {
            q: 'Hubungan Kata (Analogi):\nPADI : BERAS = GANDUM : ...',
            a: 'Tepung terigu',
            d: ['Roti tawar', 'Jagung manis', 'Padi ketan'],
            exp: 'Padi diolah menjadi beras, sebagaimana gandum digiling menjadi tepung terigu.'
          },
          {
            q: 'Hubungan Kata (Analogi):\nPENULIS : BUKU = PELUKIS : ...',
            a: 'Lukisan',
            d: ['Kuas', 'Kanvas', 'Galeri seni'],
            exp: 'Penulis menghasilkan buku, sedangkan pelukis menghasilkan lukisan.'
          },
          {
            q: 'Manakah dari pernyataan berikut yang merupakan kalimat fakta (dapat diverifikasi secara objektif)?',
            a: 'Candi Borobudur dibangun pada abad ke-8 masehi oleh Wangsa Syailendra.',
            d: ['Pemandangan di Borobudur terasa paling magis dan menakjubkan.', 'Semua orang pasti betah berlama-lama di candi tersebut.', 'Suasana Candi Borobudur sangat menyenangkan di pagi hari.'],
            exp: 'Fakta dapat dibuktikan kebenarannya secara historis objektif, bukan pendapat pribadi/opini.'
          }
        ];
        smpIndo.forEach(item => pool.push(createQ(item.q, item.a, item.d, item.exp)));
      } else {
        // SMA INDONESIA: Teks Editorial, Resensi, Karya Ilmiah, Ragam Kalimat Majemuk, Penalaran Kritis
        const smaIndo = [
          {
            q: 'Ciri utama wacana tajuk rencana (editorial) pada sebuah surat kabar atau media nasional adalah ...',
            a: 'Mencerminkan sikap dan pandangan resmi redaksi media terhadap peristiwa hangat',
            d: ['Ditulis atas nama perseorangan tanpa pertanggungjawaban redaksi', 'Hanya memuat iklan niaga komersial', 'Berisi laporan fiksi cerpen sastra'],
            exp: 'Editorial merupakan artikel pokok yang mewakili pandangan resmi lembaga redaksi terhadap isu aktual.'
          },
          {
            q: 'Dalam sistematika penulisan karya tulis ilmiah, bagian yang merumuskan pertanyaan spesifik yang hendak dijawab melalui penelitian adalah ...',
            a: 'Rumusan Masalah',
            d: ['Latar Belakang', 'Tinjauan Pustaka', 'Metode Penelitian'],
            exp: 'Rumusan masalah memuat butir-butir pertanyaan fokus penelitian.'
          },
          {
            q: 'Penulisan sumber rujukan daftar pustaka format APA yang benar untuk buku adalah ...',
            a: 'Keraf, G. (2004). Komposisi: Sebuah Pengantar Kemahiran Bahasa. Ende: Nusa Indah.',
            d: ['Gorys Keraf, Komposisi, Nusa Indah, 2004.', '2004. Keraf Gorys. Komposisi. Ende.', 'Komposisi: Sebuah Pengantar Kemahiran Bahasa, Keraf Gorys: 2004.'],
            exp: 'Format APA: Nama belakang, Inisial. (Tahun). Judul Buku Miring. Kota Terbit: Penerbit.'
          },
          {
            q: 'Gaya bahasa yang menggunakan sindiran halus namun tajam dengan maksud mendidik atau mengkritik ketimpangan dinamakan ...',
            a: 'Satire',
            d: ['Sarkasme', 'Eufemisme', 'Tautologi'],
            exp: 'Satire mengkritik gagasan atau kelemahan sosial menggunakan humor atau sindiran halus.'
          },
          {
            q: 'Perhatikan kalimat majemuk bertingkat: "Pemerintah memperketat regulasi emisi karbon agar laju pemanasan global dapat ditekan secara signifikan." Anak kalimat tersebut berkedudukan sebagai perluasan ...',
            a: 'Keterangan tujuan',
            d: ['Keterangan syarat', 'Keterangan waktu', 'Keterangan perlawanan'],
            exp: 'Konjungsi "agar" menandai klausul anak kalimat keterangan tujuan.'
          }
        ];
        smaIndo.forEach(item => pool.push(createQ(item.q, item.a, item.d, item.exp)));
      }
    }

    // =========================================================================
    // 3. IPA / IPAS / SAINS / FISIKA / KIMIA / BIOLOGI
    // =========================================================================
    if (sid.includes('ipa') || sid.includes('ipas') || sid.includes('fisika') || sid.includes('kimia') || sid.includes('biologi') || sid.includes('sains')) {
      if (lvl === 'SD') {
        // SD IPAS: Rantai Makanan, Wujud Benda, Perpindahan Panas, Tata Surya, Tubuh Manusia Dasar
        const sdIpas = [
          {
            q: 'Perhatikan rantai makanan berikut!\nPadi → Belalang → Katak → Ular → Elang.\nJika petani membasmi seluruh katak di sawah dengan racun, akibat langsung yang terjadi pada ekosistem adalah ...',
            a: 'Populasi belalang meningkat tajam dan populasi ular berkurang',
            d: ['Populasi padi bertambah lebat dan elang bertambah banyak', 'Populasi ular meningkat drastis', 'Populasi belalang akan habis musnah'],
            exp: 'Katak adalah predator belalang. Hilangnya katak membuat belalang bertambah banyak dan ular kekurangan makanan.'
          },
          {
            q: 'Saat kita berada di dekat api unggun, tubuh kita merasa hangat meskipun kita tidak menyentuh nyala api. Hal ini membuktikan perpindahan panas secara ...',
            a: 'Radiasi (Pancaran)',
            d: ['Konduksi', 'Konveksi', 'Kondensasi'],
            exp: 'Radiasi adalah perpindahan panas melalui pancaran gelombang tanpa medium perantara.'
          },
          {
            q: 'Sendok logam yang dimasukkan ke dalam gelas berisi air teh panas akan ikut terasa panas pada ujungnya. Peristiwa ini merupakan contoh perpindahan panas secara ...',
            a: 'Konduksi (Hantaran)',
            d: ['Konveksi', 'Radiasi', 'Evaporasi'],
            exp: 'Konduksi terjadi melalui rambatan pada benda padat seperti logam tanpa perpindahan zatnya.'
          },
          {
            q: 'Perubahan wujud benda dari padat langsung menjadi gas tanpa mencair terlebih dahulu disebut ...',
            a: 'Menyublim',
            d: ['Menguap', 'Membeku', 'Mengembun'],
            exp: 'Menyublim adalah perubahan padat ke gas, misalnya kapur barus yang lama-kelamaan mengecil di dalam lemari.'
          },
          {
            q: 'Peristiwa terjadinya pergantian siang dan malam di bumi diakibatkan oleh ...',
            a: 'Rotasi bumi pada porosnya',
            d: ['Revolusi bumi mengitari matahari', 'Rotasi bulan mengitari bumi', 'Gerhana matahari total'],
            exp: 'Bumi berputar pada porosnya (rotasi) selama 24 jam sehingga bagian yang terkena matahari mengalami siang.'
          },
          {
            q: 'Tumbuhan hijau mampu memasak makanannya sendiri melalui proses fotosintesis. Zat hijau daun yang berfungsi menyerap cahaya matahari adalah ...',
            a: 'Klorofil',
            d: ['Stomata', 'Floem', 'Xilem'],
            exp: 'Klorofil adalah zat hijau daun yang menangkap energi cahaya matahari untuk fotosintesis.'
          },
          {
            q: 'Hubungan simbiosis mutualisme (saling menguntungkan) ditunjukkan oleh interaksi antara ...',
            a: 'Kupu-kupu dengan bunga',
            d: ['Benalu dengan pohon inangnya', 'Nyamuk dengan manusia', 'Tali putri dengan tanaman pagar'],
            exp: 'Kupu-kupu mendapat nektar manis, sedangkan bunga terbantu proses penyerbukannya.'
          },
          {
            q: 'Gaya yang bekerja saat buah kelapa yang sudah tua jatuh dari pohon ke tanah adalah gaya ...',
            a: 'Gravitasi bumi',
            d: ['Gaya gesek', 'Gaya pegas', 'Gaya magnet'],
            exp: 'Gaya tarik gravitasi bumi menarik semua benda bermassa ke arah pusat bumi.'
          },
          {
            q: 'Sumber energi listrik terbarukan ramah lingkungan yang memanfaatkan aliran arus air terjun atau waduk dinamakan ...',
            a: 'PLTA (Pembangkit Listrik Tenaga Air)',
            d: ['PLTU (Pembangkit Listrik Tenaga Uap Batubara)', 'PLTD (Pembangkit Listrik Tenaga Diesel)', 'PLTN (Nuklir)'],
            exp: 'PLTA memanfaatkan energi kinetik aliran air untuk memutar turbin generator listrik.'
          },
          {
            q: 'Tahapan daur hidup hewan (metamorfosis) yang benar pada kupu-kupu adalah ...',
            a: 'Telur → Ulat (Larva) → Kepompong (Pupa) → Kupu-kupu dewasa',
            d: ['Telur → Kepompong → Ulat → Kupu-kupu dewasa', 'Kupu-kupu → Ulat → Telur → Kepompong', 'Telur → Nimfa → Kupu-kupu dewasa'],
            exp: 'Kupu-kupu mengalami metamorfosis sempurna: telur menetas jadi ulat, berubah jadi kepompong, lalu menjadi kupu-kupu.'
          }
        ];
        sdIpas.forEach(item => pool.push(createQ(item.q, item.a, item.d, item.exp)));
      } else if (lvl === 'SMP') {
        // SMP IPA: Hukum Newton, Tekanan, Pencernaan Enzim, Peredaran Darah, Monohibrid, Bioteknologi Tempe
        const smpIpa = [
          {
            q: 'Sebuah gerobak bermassa 10 kg didorong dengan percepatan 2 m/s² di atas lantai licin. Besar gaya dorong resultan adalah ...',
            a: '20 Newton',
            d: ['12 Newton', '5 Newton', '40 Newton'],
            exp: 'Hukum II Newton: F = m × a = 10 kg × 2 m/s² = 20 N.'
          },
          {
            q: 'Sebuah balok diletakkan di lantai dengan gaya tekan 300 N dan luas bidang sentuh alas balok 3 m². Tekanan yang dihasilkan balok adalah ...',
            a: '100 N/m² (Pascal)',
            d: ['900 N/m²', '303 N/m²', '50 N/m²'],
            exp: 'Tekanan P = F / A = 300 N / 3 m² = 100 Pascal.'
          },
          {
            q: 'Sebuah benda bermassa 2 kg bergerak dengan kelajuan 6 m/s. Besar energi kinetik yang dimiliki benda tersebut adalah ...',
            a: '36 Joule',
            d: ['12 Joule', '72 Joule', '18 Joule'],
            exp: 'Ek = 1/2 · m · v² = 1/2 × 2 kg × (6 m/s)² = 36 J.'
          },
          {
            q: 'Enzim pada lambung manusia yang berfungsi mengubah protein menjadi pepton dalam suasana asam adalah ...',
            a: 'Pepsin',
            d: ['Ptialin', 'Lipase', 'Tripsin'],
            exp: 'Enzim pepsin di lambung bekerja optimal pada kondisi asam (asam klorida/HCl) untuk menguraikan protein.'
          },
          {
            q: 'Pembuluh darah yang mengalirkan darah bersih kaya oksigen dari paru-paru kembali ke serambi kiri jantung adalah ...',
            a: 'Vena pulmonalis',
            d: ['Arteri pulmonalis', 'Aorta', 'Vena kava'],
            exp: 'Vena pulmonalis adalah pembuluh darah vena yang membawa darah teroksigenasi dari paru-paru menuju jantung.'
          },
          {
            q: 'Mikroorganisme berupa jamur yang dimanfaatkan dalam pembuatan tempe dari kedelai adalah ...',
            a: 'Rhizopus oryzae',
            d: ['Saccharomyces cerevisiae', 'Lactobacillus bulgaricus', 'Acetobacter xylinum'],
            exp: 'Rhizopus oryzae membentuk hifa putih yang mengikat biji kedelai menjadi tempe.'
          },
          {
            q: 'Pada persilangan monohibrid dominan penuh antara kacang ercis berbunga merah (MM) dan berbunga putih (mm), rasio fenotipe keturunan F2 adalah ...',
            a: '3 Merah : 1 Putih',
            d: ['1 Merah : 2 Merah Muda : 1 Putih', '9 : 3 : 3 : 1', '1 Merah : 1 Putih'],
            exp: 'Persilangan monohibrid dominan penuh F2 menghasilkan rasio 3 dominan : 1 resesif.'
          }
        ];
        smpIpa.forEach(item => pool.push(createQ(item.q, item.a, item.d, item.exp)));
      } else {
        // SMA SAINS: Termodinamika Carnot, Stoikiometri mol, pH HCl, Katabolisme Seluler, DNA RNA
        const smaScience = [
          {
            q: 'Sebuah mesin kalor Carnot bekerja di antara suhu reservoir tinggi 600 K dan suhu reservoir rendah 300 K. Efisiensi termal mesin Carnot tersebut adalah ...',
            a: '50%',
            d: ['25%', '75%', '40%'],
            exp: 'Efisiensi mesin Carnot: η = (1 - Tc/Th) × 100% = (1 - 300/600) × 100% = 50%.'
          },
          {
            q: 'Volume dari 0,5 mol gas oksigen (O₂) pada kondisi standar (STP, 0°C, 1 atm) adalah ...',
            a: '11,2 Liter',
            d: ['22,4 Liter', '5,6 Liter', '44,8 Liter'],
            exp: 'Volume gas pada STP = mol × 22,4 L = 0,5 mol × 22,4 L/mol = 11,2 L.'
          },
          {
            q: 'Nilai derajat keasaman (pH) larutan asam kuat HCl dengan konsentrasi 1 × 10⁻³ M adalah ...',
            a: 'pH = 3',
            d: ['pH = 11', 'pH = 1', 'pH = 7'],
            exp: 'pH = -log[H⁺] = -log(10⁻³) = 3.'
          },
          {
            q: 'Organel sel eukariotik yang menjadi lokasi berlangsungnya Siklus Krebs dan rantai transpor elektron pembentuk ATP adalah ...',
            a: 'Mitokondria',
            d: ['Ribosom', 'Retikulum Endoplasma', 'Lisosom'],
            exp: 'Mitokondria adalah pusat respirasi aerob penghasil energi ATP seluler.'
          },
          {
            q: 'Pasangan basa nitrogen yang tepat pada struktur heliks ganda DNA dihubungkan oleh ikatan hidrogen adalah ...',
            a: 'Adenin berpasangan dengan Timin; Guanin dengan Sitosin',
            d: ['Adenin dengan Urasil; Guanin dengan Timin', 'Adenin dengan Sitosin; Guanin dengan Timin', 'Timin dengan Urasil; Guanin dengan Sitosin'],
            exp: 'Pada DNA: Adenin (A) selalu berpasangan dengan Timin (T), dan Guanin (G) dengan Sitosin (C).'
          }
        ];
        smaScience.forEach(item => pool.push(createQ(item.q, item.a, item.d, item.exp)));
      }
    }

    // =========================================================================
    // 4. IPS / SOSIAL / EKONOMI / GEOGRAFI / SEJARAH / PANCASILA
    // =========================================================================
    if (sid.includes('ips') || sid.includes('ekonomi') || sid.includes('geografi') || sid.includes('sosiologi') || sid.includes('sejarah') || sid.includes('pancasila') || sid.includes('ppkn')) {
      if (lvl === 'SD') {
        // SD IPS / PANCASILA: Simbol sila, pengamalan Pancasila, rumah adat nusantara, pahlawan kemerdekaan
        const sdSocial = [
          {
            q: 'Simbol sila kedua Pancasila "Kemanusiaan yang Adil dan Beradab" pada perisai burung Garuda adalah ...',
            a: 'Rantai emas',
            d: ['Bintang tunggal', 'Pohon beringin', 'Kepala banteng'],
            exp: 'Sila ke-2 disimbolkan oleh gelang rantai emas yang saling mengait.'
          },
          {
            q: 'Kegiatan musyawarah pemilihan ketua kelas di sekolah merupakan contoh pengamalan Pancasila, khususnya sila ke- ...',
            a: 'Keempat (Kepala Banteng)',
            d: ['Pertama', 'Kedua', 'Ketiga'],
            exp: 'Musyawarah mufakat mencerminkan nilai kerakyatan pada sila ke-4.'
          },
          {
            q: 'Rumah adat tradisional "Tongkonan" yang memiliki atap melengkung menyerupai perahu berasal dari provinsi ...',
            a: 'Sulawesi Selatan (Suku Toraja)',
            d: ['Sumatera Barat', 'Papua', 'Kalimantan Barat'],
            exp: 'Tongkonan adalah rumah adat masyarakat Toraja di Sulawesi Selatan.'
          },
          {
            q: 'Rumah adat tradisional "Honai" yang beratap jerami berbentuk kerucut berasal dari daerah ...',
            a: 'Papua',
            d: ['Bali', 'Jawa Tengah', 'Nusa Tenggara Barat'],
            exp: 'Honai adalah rumah tradisional suku pedalaman Papua.'
          },
          {
            q: 'Tokoh pejuang yang bertugas mengetik naskah proklamasi kemerdekaan Republik Indonesia adalah ...',
            a: 'Sayuti Melik',
            d: ['Sukarni', 'B.M. Diah', 'Latief Hendraningrat'],
            exp: 'Sayuti Melik mengetik teks proklamasi yang disusun Soekarno, Hatta, dan Subardjo.'
          },
          {
            q: 'Kota di Indonesia yang dilewati garis khatulistiwa (ekuator 0°) dan memiliki Tugu Khatulistiwa adalah ...',
            a: 'Pontianak (Kalimantan Barat)',
            d: ['Palembang', 'Manado', 'Surabaya'],
            exp: 'Tugu Khatulistiwa berada di kota Pontianak, Kalimantan Barat.'
          },
          {
            q: 'Peringatan Hari Pahlawan nasional setiap tanggal 10 November diadakan untuk mengenang peristiwa heroik di kota ...',
            a: 'Surabaya',
            d: ['Bandung', 'Semarang', 'Medan'],
            exp: 'Pertempuran heroik Surabaya dipimpin Bung Tomo pada 10 November 1945.'
          }
        ];
        sdSocial.forEach(item => pool.push(createQ(item.q, item.a, item.d, item.exp)));
      } else if (lvl === 'SMP') {
        // SMP IPS / PPKn: ASEAN, Posisi Silang Indonesia, Lembaga Negara, Interaksi Sosial Asosiatif
        const smpSocial = [
          {
            q: 'Deklarasi Bangkok pada tanggal 8 Agustus 1967 menandai berdirinya organisasi kerja sama Asia Tenggara (ASEAN) yang diprakarsai oleh 5 negara, yaitu ...',
            a: 'Indonesia, Malaysia, Filipina, Singapura, dan Thailand',
            d: ['Indonesia, Vietnam, Laos, Kamboja, dan Myanmar', 'Indonesia, Brunei, Singapura, Malaysia, dan Jepang', 'Indonesia, Thailand, Filipina, Vietnam, dan India'],
            exp: 'Deklarasi Bangkok ditandatangani oleh 5 menteri luar negeri negara pendiri ASEAN.'
          },
          {
            q: 'Letak geografis Indonesia berada di posisi silang strategis di antara dua benua dan dua samudra, yaitu ...',
            a: 'Benua Asia & Australia, serta Samudra Hindia & Pasifik',
            d: ['Benua Asia & Afrika, serta Samudra Atlantik & Pasifik', 'Benua Eropa & Asia, serta Samudra Hindia & Pasifik', 'Benua Amerika & Australia, serta Samudra Arktik & Hindia'],
            exp: 'Posisi silang Indonesia menjadikannya jalur lalu lintas perdagangan dunia terpenting.'
          },
          {
            q: 'Lembaga tinggi negara Republik Indonesia yang memegang kekuasaan legislatif (membuat undang-undang) adalah ...',
            a: 'Dewan Perwakilan Rakyat (DPR)',
            d: ['Presiden', 'Mahkamah Agung (MA)', 'Badan Pemeriksa Keuangan (BPK)'],
            exp: 'DPR memegang kekuasaan pembentukan undang-undang (fungsi legislasi).'
          },
          {
            q: 'Bentuk interaksi sosial yang mengarah pada terciptanya kesatuan kerja sama dan kerukunan disebut proses ...',
            a: 'Asosiatif',
            d: ['Disosiatif', 'Konflik', 'Kontravensi'],
            exp: 'Interaksi asosiatif mempererat hubungan (kerjasama, akomodasi, asimilasi).'
          },
          {
            q: 'Dalam hukum ekonomi pasar, bila penawaran suatu komoditas tetap sementara permintaan pembeli melonjak naik secara drastis, maka ...',
            a: 'Harga barang akan cenderung naik',
            d: ['Harga barang akan turun', 'Harga barang tetap stabil', 'Barang ditarik dari peredaran'],
            exp: 'Tingginya permintaan terhadap pasokan barang terbatas mendorong kenaikan harga keseimbangan pasar.'
          }
        ];
        smpSocial.forEach(item => pool.push(createQ(item.q, item.a, item.d, item.exp)));
      } else {
        // SMA SOSHUM: Akuntansi Persamaan Dasar, Kebijakan Moneter BI, Stratifikasi, Geografi Esensial
        const smaSocial = [
          {
            q: 'Persamaan dasar akuntansi keuangan yang baku dan wajib menunjukkan posisi seimbang (balance) adalah ...',
            a: 'Aset = Liabilitas (Kewajiban) + Ekuitas (Modal)',
            d: ['Aset + Liabilitas = Ekuitas', 'Aset = Liabilitas - Ekuitas', 'Pendapatan = Beban + Laba'],
            exp: 'Rumus fundamental akuntansi: Harta/Aset = Utang/Liabilitas + Modal/Ekuitas.'
          },
          {
            q: 'Lembaga negara independen yang berwenang mengatur peredaran uang, suku bunga BI-Rate, dan menjaga stabilitas nilai rupiah adalah ...',
            a: 'Bank Indonesia (Bank Sentral)',
            d: ['Otoritas Jasa Keuangan (OJK)', 'Kementerian Keuangan', 'Badan Pengawas Pasar Modal'],
            exp: 'Bank Indonesia menjalankan kebijakan moneter independen di Indonesia.'
          },
          {
            q: 'Bentuk pelapisan masyarakat (stratifikasi sosial) yang memungkinkan seseorang berpindah status sosial ke lapisan lebih tinggi melalui prestasi dan pendidikan dinamakan ...',
            a: 'Stratifikasi sosial terbuka',
            d: ['Stratifikasi sosial tertutup (kasta)', 'Stratifikasi sosial feodal', 'Stratifikasi mekanis'],
            exp: 'Sistem terbuka memungkinkan mobilitas sosial vertikal naik.'
          },
          {
            q: 'Konsep esensial geografi yang mengkaji pemusatan suatu kegiatan atau fenomena pada kawasan tertentu dinamakan konsep ...',
            a: 'Aglomerasi',
            d: ['Diferensiasi area', 'Morfologi', 'Keterjangkauan'],
            exp: 'Aglomerasi adalah kecenderungan persebaran yang bersifat mengelompok pada wilayah tertentu.'
          }
        ];
        smaSocial.forEach(item => pool.push(createQ(item.q, item.a, item.d, item.exp)));
      }
    }

    // =========================================================================
    // 5. BAHASA INGGRIS (SD vs SMP vs SMA)
    // =========================================================================
    if (sid.includes('inggris') || sid.includes('english')) {
      if (lvl === 'SD') {
        const sdEng = [
          {
            q: 'What is the English word for "Apel"?',
            a: 'Apple',
            d: ['Orange', 'Banana', 'Grape'],
            exp: 'Apel dalam bahasa Inggris adalah Apple.'
          },
          {
            q: 'Look at the time: "07.00". In English, we say it is ...',
            a: 'Seven o\'clock',
            d: ['Half past seven', 'Seven thirty', 'Seven fifteen'],
            exp: 'Pukul 07.00 tepat dinyatakan sebagai "seven o\'clock".'
          },
          {
            q: 'Complete the sentence: "Every day, I ... to school by bicycle."',
            a: 'go',
            d: ['goes', 'went', 'going'],
            exp: 'Subject "I" in Simple Present uses the base verb: go.'
          },
          {
            q: 'What is the color of ripe banana?',
            a: 'Yellow',
            d: ['Blue', 'Purple', 'Red'],
            exp: 'Pisang matang berwarna kuning (yellow).'
          },
          {
            q: 'What day comes after Monday?',
            a: 'Tuesday',
            d: ['Wednesday', 'Sunday', 'Friday'],
            exp: 'Hari setelah Senin (Monday) adalah Selasa (Tuesday).'
          }
        ];
        sdEng.forEach(item => pool.push(createQ(item.q, item.a, item.d, item.exp)));
      } else if (lvl === 'SMP') {
        const smpEng = [
          {
            q: 'Choose the correct verb: "My brother ... a glass of milk every morning."',
            a: 'drinks',
            d: ['drink', 'drinking', 'drank'],
            exp: 'Subject "my brother" (he) in Simple Present takes verb + s: drinks.'
          },
          {
            q: 'Complete the Simple Past sentence: "Yesterday, we ... my grandmother in Bandung."',
            a: 'visited',
            d: ['visit', 'visiting', 'visits'],
            exp: 'Adverb "yesterday" requires Simple Past verb 2: visited.'
          },
          {
            q: 'Change into Passive Voice: "Andrea Hirata wrote the novel Laskar Pelangi."',
            a: 'The novel Laskar Pelangi was written by Andrea Hirata.',
            d: ['The novel is written by Andrea Hirata.', 'Andrea Hirata was writing the novel.', 'The novel had written by Andrea Hirata.'],
            exp: 'Past passive: Subject + was/were + V3 (past participle) + by.'
          },
          {
            q: 'Mount Everest is the ... mountain in the world.',
            a: 'highest',
            d: ['higher', 'most high', 'high'],
            exp: 'Superlative of one-syllable adjective: high → the highest.'
          }
        ];
        smpEng.forEach(item => pool.push(createQ(item.q, item.a, item.d, item.exp)));
      } else {
        const smaEng = [
          {
            q: 'Complete the Conditional Sentence Type 1:\n"If the weather ... clear tomorrow morning, we will go hiking."',
            a: 'is',
            d: ['will be', 'was', 'were'],
            exp: 'Conditional Type 1 if-clause uses Simple Present (is/am/are) + main clause will + V1.'
          },
          {
            q: 'Complete the Conditional Sentence Type 2:\n"If I ... a million dollars, I would travel around the world."',
            a: 'had',
            d: ['have', 'will have', 'would have'],
            exp: 'Conditional Type 2 if-clause uses Simple Past (had) + would + V1.'
          },
          {
            q: 'What is the closest synonym of the underlined word?\n"Mount Bromo offers an *enormous* view of volcanic landscape."',
            a: 'huge / magnificent',
            d: ['tiny / miniature', 'dull / boring', 'narrow / crowded'],
            exp: '"Enormous" means extremely large or impressive.'
          },
          {
            q: 'What is the opposite (antonym) of the word "ancient"?',
            a: 'Modern',
            d: ['Historical', 'Antique', 'Traditional'],
            exp: 'Ancient means very old, opposite to modern.'
          }
        ];
        smaEng.forEach(item => pool.push(createQ(item.q, item.a, item.d, item.exp)));
      }
    }

    // Universal questions jika diperlukan penambahan
    if (pool.length < 40) {
      if (lvl === 'SD') {
        const sdUniversal = [
          createQ('Sikap yang baik dan terpuji saat teman sedang berbicara di depan kelas adalah ...', 'Mendengarkan dengan tertib dan menghormati', ['Memotong pembicaraannya', 'Bermain sendiri dengan gaduh', 'Mengejek penampilannya'], 'Menghargai teman yang sedang berbicara adalah wujud budi pekerti yang baik.'),
          createQ('Manfaat membiasakan diri membaca buku setiap hari adalah ...', 'Menambah wawasan pengetahuan dan kosakata baru', ['Membuat mata cepat mengantuk', 'Menghabiskan uang jajan', 'Mengurangi teman bermain'], 'Membaca buku adalah jendela dunia yang memperluas wawasan.'),
          createQ('Menjaga kebersihan lingkungan sekolah merupakan kewajiban dari ...', 'Seluruh warga sekolah (guru, murid, dan staf)', ['Hanya petugas kebersihan', 'Hanya siswa kelas satu', 'Penjaga kantin saja'], 'Kebersihan lingkungan sekolah adalah tanggung jawab bersama.')
        ];
        sdUniversal.forEach(q => pool.push(q));
      } else {
        const secUniversal = [
          createQ('Langkah awal yang paling tepat dalam menerapkan metode ilmiah untuk memecahkan suatu masalah adalah ...', 'Merumuskan masalah dan melakukan observasi', ['Langsung menarik kesimpulan akhir', 'Mempublikasikan dugaan ke media', 'Mengabaikan hipotesis eksperimen'], 'Metode ilmiah diawali perumusan masalah, observasi latar belakang, hipotesis, dan pengujian.'),
          createQ('Ciri utama manusia yang memiliki keterampilan berpikir kritis (critical thinking) adalah ...', 'Memeriksa keabsahan bukti data sebelum menerima suatu informasi', ['Mempercayai semua berita tanpa verifikasi fakta', 'Menolak argumen orang lain semata karena emosi', 'Menyalin jawaban tanpa memahami maksud materi'], 'Berpikir kritis berorientasi pada objektivitas, analisis bukti valid, dan konsistensi nalar.')
        ];
        secUniversal.forEach(q => pool.push(q));
      }
    }

    return pool;
  },

  /**
   * Generator darurat variasi matematis parametrik berjenjang (SD vs SMP vs SMA)
   */
  generateParametricUniqueMath(uniqueSeed, optionCount, level = 'SD', grade = 6) {
    const lvl = (level || 'SD').toUpperCase();
    const gr = parseInt(grade, 10) || (lvl === 'SD' ? 6 : lvl === 'SMP' ? 9 : 12);
    const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    let qText = '';
    let ansStr = '';
    let dist = [];
    let exp = '';

    if (lvl === 'SD') {
      if (gr <= 2) {
        // SD Kelas 1-2: Penjumlahan kontekstual
        const a = randInt(10, 45) + (uniqueSeed % 15);
        const b = randInt(11, 40);
        const ans = a + b;
        qText = `Budi memiliki ${a} butir kelereng, lalu dibelikan lagi oleh Paman sebanyak ${b} butir. Berapa jumlah kelereng Budi seluruhnya?`;
        ansStr = `${ans} butir`;
        dist = [`${ans - 2} butir`, `${ans + 3} butir`, `${ans - 5} butir`];
        exp = `Operasi hitung penjumlahan: ${a} + ${b} = ${ans} butir.`;
      } else if (gr <= 4) {
        // SD Kelas 3-4: Perkalian bilangan bulat
        const a = randInt(6, 18) + (uniqueSeed % 7);
        const b = randInt(4, 12);
        const ans = a * b;
        qText = `Hasil perkalian dari ${a} × ${b} adalah ...`;
        ansStr = `${ans}`;
        dist = [`${ans + 6}`, `${ans - 8}`, `${ans + 12}`];
        exp = `Operasi perkalian: ${a} × ${b} = ${ans}.`;
      } else {
        // SD Kelas 5-6: Persentase / Diskon
        const pct = [10, 15, 20, 25, 30][uniqueSeed % 5];
        const base = (randInt(2, 8) + uniqueSeed % 4) * 10000;
        const val = (pct / 100) * base;
        qText = `Nilai dari ${pct}% dari Rp ${base.toLocaleString('id-ID')} adalah ...`;
        ansStr = `Rp ${val.toLocaleString('id-ID')}`;
        dist = [`Rp ${(val + 5000).toLocaleString('id-ID')}`, `Rp ${(val - 2000).toLocaleString('id-ID')}`, `Rp ${(val + 10000).toLocaleString('id-ID')}`];
        exp = `${pct}% × Rp ${base.toLocaleString('id-ID')} = (${pct}/100) × ${base} = Rp ${val.toLocaleString('id-ID')}.`;
      }
    } else if (lvl === 'SMP') {
      // SMP: Persamaan linear satu variabel
      const a = randInt(2, 6);
      const xVal = randInt(3, 9) + (uniqueSeed % 5);
      const b = randInt(3, 15);
      const rhs = a * xVal + b;
      qText = `Nilai x yang memenuhi persamaan linear ${a}x + ${b} = ${rhs} adalah ...`;
      ansStr = `${xVal}`;
      dist = [`${xVal + 1}`, `${xVal - 1}`, `${xVal + 2}`];
      exp = `${a}x = ${rhs} - ${b} → ${a}x = ${rhs - b} → x = ${xVal}.`;
    } else {
      // SMA: Turunan fungsi polinomial
      const a = randInt(2, 6);
      const n = randInt(2, 4);
      const c = randInt(2, 8);
      const coeff = a * n;
      const power = n - 1;
      const pStr = power > 1 ? `^${power}` : '';
      qText = `Turunan pertama dari f(x) = ${a}x^${n} - ${c}x + 10 adalah f'(x) = ...`;
      ansStr = `${coeff}x${pStr} - ${c}`;
      dist = [`${coeff}x${pStr} + ${c}`, `${a}x${pStr} - ${c}`, `${coeff}x^${n} - ${c}`];
      exp = `Aturan turunan: d/dx(axⁿ) = n·axⁿ⁻¹ dan d/dx(cx) = c → ${coeff}x${pStr} - ${c}.`;
    }

    if (optionCount === 5) {
      dist.push(`Opsi cadangan ${uniqueSeed}`);
    }

    const all = [ansStr, ...dist.slice(0, optionCount - 1)];
    const shuf = this.shuffle(all);
    return {
      id: uniqueSeed,
      question: qText,
      options: shuf,
      correctIndex: shuf.indexOf(ansStr),
      explanation: exp
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AIGenerator };
}
