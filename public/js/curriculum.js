/**
 * Kurikulum dan Definisi Mata Pelajaran Pendidikan Indonesia
 * Mendukung jenjang: SD (Kelas 1-6), SMP (Kelas 7-9), SMA (Kelas 10-12)
 * Termasuk modul TKA (Tes Kemampuan Akademik) untuk setiap jenjang
 */

const CURRICULUM_DATA = {
  levels: {
    SD: {
      id: 'SD',
      name: 'Sekolah Dasar (SD / MI)',
      shortName: 'SD',
      grades: 'Kelas 1 - 6',
      gradeList: [
        { grade: 1, label: 'Kelas 1', focus: 'Operasi hitung dasar 1-20, mengenal huruf, kata dasar & benda sekitar' },
        { grade: 2, label: 'Kelas 2', focus: 'Bilangan cacah s.d 100, perkalian dasar, kalimat pendek & lingkungan sekitar' },
        { grade: 3, label: 'Kelas 3', focus: 'Pecahan sederhana, hitung ratusan/ribuan, makhluk hidup & teks narasi' },
        { grade: 4, label: 'Kelas 4', focus: 'KPK & FPB, pecahan senilai, gaya gerak, IPAS & keragaman nusantara' },
        { grade: 5, label: 'Kelas 5', focus: 'Pecahan campuran, perbandingan skala, sistem organ, tata surya dasar' },
        { grade: 6, label: 'Kelas 6', focus: 'Pecahan desimal & persen, bangun ruang, energi, persiapan ujian & TKA Masuk SMP', isDefault: true }
      ],
      defaultGrade: 6,
      description: 'Latihan soal kurikulum SD/MI dan persiapan Asesmen/TKA Masuk SMP',
      optionCount: 4, // A, B, C, D
      subjects: [
        {
          id: 'sd_matematika',
          name: 'Matematika',
          icon: '🧮',
          color: '#4F46E5',
          description: 'Pecahan, operasi hitung, KPK & FPB, bangun datar & ruang, pengukuran',
          sampleTopic: 'Pecahan desimal, persen, perbandingan dan bangun ruang',
          badge: 'Wajib'
        },
        {
          id: 'sd_indonesia',
          name: 'Bahasa Indonesia',
          icon: '📚',
          color: '#059669',
          description: 'Membaca pemahaman, ide pokok, kosakata baku, kalimat efektif, pantun',
          sampleTopic: 'Menemukan ide pokok, kalimat efektif, dan ejaan PUEBI',
          badge: 'Wajib'
        },
        {
          id: 'sd_ipas',
          name: 'IPAS (IPA & IPS)',
          icon: '🔬',
          color: '#0284C7',
          description: 'Rantai makanan, wujud benda, tata surya, energi, budaya & pahlawan nusantara',
          sampleTopic: 'Ekosistem, energi alternatif, dan keberagaman budaya',
          badge: 'Kurikulum Merdeka'
        },
        {
          id: 'sd_pancasila',
          name: 'Pendidikan Pancasila',
          icon: '🇮🇩',
          color: '#DC2626',
          description: 'Nilai-nilai Pancasila, norma dan aturan, hak & kewajiban, Bhinneka Tunggal Ika',
          sampleTopic: 'Penerapan sila Pancasila dan gotong royong di masyarakat',
          badge: 'Wajib'
        },
        {
          id: 'sd_inggris',
          name: 'Bahasa Inggris',
          icon: '🌐',
          color: '#7C3AED',
          description: 'Vocabulary harian, reading comprehension pendek, time & calendar, grammar dasar',
          sampleTopic: 'Daily routines, telling time, and descriptive vocabulary',
          badge: 'Pilihan'
        }
      ],
      tkaSubjects: [
        {
          id: 'sd_tka_indonesia',
          name: 'TKA - Bahasa Indonesia',
          icon: '📚',
          color: '#059669',
          description: 'Mata Uji Resmi: Literasi membaca wacana fiksi & informasi, ide pokok, makna tersirat, kosakata kontekstual, dan evaluasi teks (HOTS)',
          badge: 'Resmi BSKAP'
        },
        {
          id: 'sd_tka_matematika',
          name: 'TKA - Matematika',
          icon: '📐',
          color: '#4338CA',
          description: 'Mata Uji Resmi: Penalaran numerasi, pecahan, perbandingan, pola barisan bilangan, geometri, dan pemecahan masalah kontekstual HOTS',
          badge: 'Resmi BSKAP'
        }
      ]
    },

    SMP: {
      id: 'SMP',
      name: 'Sekolah Menengah Pertama (SMP / MTs)',
      shortName: 'SMP',
      grades: 'Kelas 7 - 9',
      gradeList: [
        { grade: 7, label: 'Kelas 7', focus: 'Bilangan bulat & rasional, aljabar linier, gerak & gaya, teks deskripsi' },
        { grade: 8, label: 'Kelas 8', focus: 'Phytagoras, SPLDV, tekanan zat, getaran gelombang, sistem pencernaan' },
        { grade: 9, label: 'Kelas 9', focus: 'Transformasi geometri, fungsi kuadrat, listrik dinamis, pewarisan sifat, TKA Masuk SMA', isDefault: true }
      ],
      defaultGrade: 9,
      description: 'Latihan soal kurikulum SMP/MTs dan persiapan Asesmen Daerah / TKA Masuk SMA',
      optionCount: 4, // A, B, C, D
      subjects: [
        {
          id: 'smp_matematika',
          name: 'Matematika',
          icon: '📐',
          color: '#4F46E5',
          description: 'Aljabar, Phytagoras, lingkaran, persamaan linear, statistika & peluang, transformasi',
          sampleTopic: 'SPLDV, fungsi kuadrat, phytagoras, dan peluang',
          badge: 'Wajib'
        },
        {
          id: 'smp_ipa',
          name: 'Ilmu Pengetahuan Alam (IPA)',
          icon: '🔬',
          color: '#0891B2',
          description: 'Gerak & gaya, tekanan zat, listrik & magnet, sistem organ tubuh, genetika',
          sampleTopic: 'Hukum Newton, getaran gelombang, dan sistem pernapasan manusia',
          badge: 'Wajib'
        },
        {
          id: 'smp_indonesia',
          name: 'Bahasa Indonesia',
          icon: '📚',
          color: '#059669',
          description: 'Teks laporan hasil observasi, eksposisi, cerpen, persuasi, diskusi, ejaan',
          sampleTopic: 'Analisis struktur teks LHO, majas cerpen, dan kalimat efektif',
          badge: 'Wajib'
        },
        {
          id: 'smp_inggris',
          name: 'Bahasa Inggris',
          icon: '🌐',
          color: '#7C3AED',
          description: 'Descriptive, recount, narrative, procedure text, tenses, passive voice',
          sampleTopic: 'Reading comprehension, past tense vs present perfect, conjunctions',
          badge: 'Wajib'
        },
        {
          id: 'smp_ips',
          name: 'Ilmu Pengetahuan Sosial (IPS)',
          icon: '🌍',
          color: '#EA580C',
          description: 'Interaksi antarnegara ASEAN, globalisasi, dinamika kependudukan, kegiatan ekonomi',
          sampleTopic: 'Geografi regional, pasar bebas, dan perubahan sosial budaya',
          badge: 'Wajib'
        },
        {
          id: 'smp_ppkn',
          name: 'Pendidikan Pancasila / PPKn',
          icon: '🇮🇩',
          color: '#DC2626',
          description: 'UUD 1945, norma hukum, kedaulatan NKRI, wawasan nusantara',
          sampleTopic: 'Sistem ketatanegaraan dan peran pemuda dalam bela negara',
          badge: 'Wajib'
        }
      ],
      tkaSubjects: [
        {
          id: 'smp_tka_indonesia',
          name: 'TKA - Bahasa Indonesia',
          icon: '📚',
          color: '#059669',
          description: 'Mata Uji Resmi: Literasi wacana kritis, telaah teks laporan ilmiah & editorial, argumentasi logis, opini vs fakta, dan ejaan EYD V',
          badge: 'Resmi BSKAP'
        },
        {
          id: 'smp_tka_matematika',
          name: 'TKA - Matematika',
          icon: '📐',
          color: '#4338CA',
          description: 'Mata Uji Resmi: Penalaran aljabar, persamaan linear, phytagoras, geometri ruang, fungsi kuadrat, statistika data dan peluang nyata (HOTS)',
          badge: 'Resmi BSKAP'
        }
      ]
    },

    SMA: {
      id: 'SMA',
      name: 'Sekolah Menengah Atas (SMA / MA / SMK)',
      shortName: 'SMA',
      grades: 'Kelas 10 - 12',
      gradeList: [
        { grade: 10, label: 'Kelas 10', focus: 'Eksponen & logaritma, trigonometri, dinamika partikel, ikatan kimia, teks laporan' },
        { grade: 11, label: 'Kelas 11', focus: 'Turunan, termodinamika, kesetimbangan kimia, sistem imun, pendapatan nasional' },
        { grade: 12, label: 'Kelas 12', focus: 'Kalkulus integral, fisika modern, kimia organik, metabolisme, persiapan UTBK & TKA SNBT', isDefault: true }
      ],
      defaultGrade: 12,
      description: 'Latihan soal kurikulum SMA dan persiapan UTBK-SNBT / TKA Mandiri PTN',
      optionCount: 5, // A, B, C, D, E
      subjects: [
        {
          id: 'sma_matematika',
          name: 'Matematika (Wajib & Lanjut)',
          icon: '📈',
          color: '#4F46E5',
          description: 'Trigonometri, eksponen & logaritma, matriks, kalkulus (limit & turunan), integral',
          sampleTopic: 'Turunan fungsi aljabar, vektor, dan integral tentu',
          badge: 'Wajib'
        },
        {
          id: 'sma_fisika',
          name: 'Fisika',
          icon: '⚡',
          color: '#0284C7',
          description: 'Kinematika gerak, dinamika rotasi, termodinamika, gelombang bunyi & cahaya, listrik AC',
          sampleTopic: 'Hukum Termodinamika, medan magnet, dan rangkaian RLC',
          badge: 'Saintek'
        },
        {
          id: 'sma_kimia',
          name: 'Kimia',
          icon: '🧪',
          color: '#7C3AED',
          description: 'Stoikiometri, larutan asam basa, termokimia, laju reaksi, redoks & elektrokimia',
          sampleTopic: 'Kesetimbangan kimia, pH larutan penyangga, dan sel elektrokimia',
          badge: 'Saintek'
        },
        {
          id: 'sma_biologi',
          name: 'Biologi',
          icon: '🌿',
          color: '#059669',
          description: 'Metabolisme sel & enzim, genetika DNA/RNA, sintesis protein, bioteknologi',
          sampleTopic: 'Katabolisme glukosa (respirasi sel), mutasi DNA, dan hukum Mendel',
          badge: 'Saintek'
        },
        {
          id: 'sma_ekonomi',
          name: 'Ekonomi',
          icon: '💰',
          color: '#D97706',
          description: 'Keseimbangan pasar, kebijakan moneter & fiskal, perdagangan global, jurnal akuntansi',
          sampleTopic: 'Elastisitas harga, inflasi & suku bunga, serta siklus akuntansi',
          badge: 'Soshum'
        },
        {
          id: 'sma_sosiologi',
          name: 'Sosiologi',
          icon: '👥',
          color: '#EA580C',
          description: 'Interaksi sosial, stratifikasi, konflik & integrasi, perubahan sosial modernitas',
          sampleTopic: 'Resolusi konflik sosial dan dampak globalisasi kultural',
          badge: 'Soshum'
        },
        {
          id: 'sma_geografi',
          name: 'Geografi',
          icon: '🗺️',
          color: '#0D9488',
          description: 'Litosfer, atmosfer, hidrosfer, sistem informasi geografis (SIG), tata ruang wilayah',
          sampleTopic: 'Penginderaan jauh, pola permukiman, dan mitigasi bencana',
          badge: 'Soshum'
        },
        {
          id: 'sma_sejarah',
          name: 'Sejarah Indonesia & Dunia',
          icon: '🏛️',
          color: '#B45309',
          description: 'Pergerakan nasional, kemerdekaan, perang dingin, diplomasi internasional',
          sampleTopic: 'Strategi perang kemerdekaan dan dinamika politik era Reformasi',
          badge: 'Wajib'
        },
        {
          id: 'sma_indonesia',
          name: 'Bahasa Indonesia',
          icon: '📚',
          color: '#16A34A',
          description: 'Teks editorial, artikel ilmiah, resensi, novel sastra, tata kalimat baku',
          sampleTopic: 'Analisis opini redaksi editorial dan gaya bahasa retorik',
          badge: 'Wajib'
        },
        {
          id: 'sma_inggris',
          name: 'Bahasa Inggris',
          icon: '🌐',
          color: '#6366F1',
          description: 'Analytical exposition, hortatory, conditional sentences, advanced reading',
          sampleTopic: 'Author tone, inference questions, and conditional mood',
          badge: 'Wajib'
        }
      ],
      tkaSubjects: [
        // 1. Mata Uji Wajib TKA SMA (Perka BSKAP No. 045/H/AN/2025)
        {
          id: 'sma_tka_indonesia',
          name: 'TKA - Bahasa Indonesia (Wajib)',
          icon: '📚',
          color: '#059669',
          description: 'Mata Uji Wajib: Literasi membaca kritis wacana ilmiah, penalaran bahasa, sintesis multiteks, dan EYD V',
          badge: 'Wajib BSKAP'
        },
        {
          id: 'sma_tka_matematika',
          name: 'TKA - Matematika (Wajib)',
          icon: '📐',
          color: '#4338CA',
          description: 'Mata Uji Wajib: Penalaran matematika, fungsi & kalkulus dasar, trigonometri, aljabar, dan statistika HOTS',
          badge: 'Wajib BSKAP'
        },
        {
          id: 'sma_tka_inggris',
          name: 'TKA - Bahasa Inggris (Wajib)',
          icon: '🌐',
          color: '#6366F1',
          description: 'Mata Uji Wajib: Advanced reading comprehension, essay ilmiah, communicative purpose, inferensi konteks',
          badge: 'Wajib BSKAP'
        },

        // 2. Mata Uji Pilihan Saintek / MIPA (Dukungan Seleksi SNBP / Masuk PTN)
        {
          id: 'sma_tka_fisika',
          name: 'TKA - Fisika (Pilihan MIPA)',
          icon: '⚡',
          color: '#0284C7',
          description: 'Mata Uji Pilihan: Dinamika Newton, usaha-energi, termodinamika, induksi elektromagnetik, fisika modern',
          badge: 'Pilihan MIPA'
        },
        {
          id: 'sma_tka_kimia',
          name: 'TKA - Kimia (Pilihan MIPA)',
          icon: '🧪',
          color: '#7C3AED',
          description: 'Mata Uji Pilihan: Stoikiometri, larutan asam basa & buffer, kesetimbangan reaksi, elektrokimia & redoks',
          badge: 'Pilihan MIPA'
        },
        {
          id: 'sma_tka_biologi',
          name: 'TKA - Biologi (Pilihan MIPA)',
          icon: '🌿',
          color: '#10B981',
          description: 'Mata Uji Pilihan: Metabolisme sel (respirasi sel & fotosintesis), genetika DNA-RNA, hereditas Mendel, bioteknologi',
          badge: 'Pilihan MIPA'
        },

        // 3. Mata Uji Pilihan Soshum (Dukungan Seleksi SNBP / Masuk PTN)
        {
          id: 'sma_tka_ekonomi',
          name: 'TKA - Ekonomi (Pilihan Soshum)',
          icon: '💰',
          color: '#D97706',
          description: 'Mata Uji Pilihan: Mekanisme harga pasar & elastisitas, pendapatan nasional, moneter-fiskal, siklus akuntansi',
          badge: 'Pilihan Soshum'
        },
        {
          id: 'sma_tka_sosiologi',
          name: 'TKA - Sosiologi (Pilihan Soshum)',
          icon: '👥',
          color: '#EA580C',
          description: 'Mata Uji Pilihan: Struktur & stratifikasi sosial, resolusi konflik, dinamika perubahan masyarakat modern',
          badge: 'Pilihan Soshum'
        },
        {
          id: 'sma_tka_geografi',
          name: 'TKA - Geografi (Pilihan Soshum)',
          icon: '🗺️',
          color: '#0D9488',
          description: 'Mata Uji Pilihan: Dinamika geosfer (litosfer/atmosfer), sistem informasi spasial & SIG, tata ruang wilayah',
          badge: 'Pilihan Soshum'
        },
        {
          id: 'sma_tka_sejarah',
          name: 'TKA - Sejarah (Pilihan Soshum)',
          icon: '🏛️',
          color: '#B45309',
          description: 'Mata Uji Pilihan: Pergerakan nasional, proklamasi kemerdekaan & diplomasi, geopolitik perang dingin',
          badge: 'Pilihan Soshum'
        },

        // 4. Modul TPS Tambahan (Persiapan Seleksi Nasional UTBK-SNBT)
        {
          id: 'sma_tka_tps_skolastik',
          name: 'TPS - Potensi Skolastik & Penalaran Umum',
          icon: '🎯',
          color: '#8B5CF6',
          description: 'Subtes UTBK-SNBT: Penalaran induktif-deduktif, silogisme logika analitik, dan pemahaman bacaan kuantitatif',
          badge: 'TPS UTBK'
        }
      ]
    }
  },

  questionCountOptions: [
    { count: 10, timeMinutes: 15, label: '10 Soal (15 Menit)' },
    { count: 20, timeMinutes: 30, label: '20 Soal (30 Menit)' },
    { count: 30, timeMinutes: 45, label: '30 Soal (45 Menit)', isDefault: true },
    { count: 40, timeMinutes: 60, label: '40 Soal (60 Menit)' }
  ]
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CURRICULUM_DATA };
}
