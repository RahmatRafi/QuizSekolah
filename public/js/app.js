/**
 * PintarKuiz & Ruang TKA - Main Application Controller
 */

class AppController {
  constructor() {
    this.currentLevel = 'SD'; // 'SD' | 'SMP' | 'SMA'
    this.selectedGrades = { SD: 6, SMP: 9, SMA: 12 };
    this.currentGrade = 6;
    this.currentMode = 'REGULAR'; // 'REGULAR' | 'TKA'
    this.questionCount = 30; // default 30 soal (seperti di screenshot)
    this.timeMinutes = 45; // default 45 menit

    this.quizEngine = new QuizEngine();
    this.currentSessionResult = null;

    this.init();
  }

  init() {
    this.bindEvents();
    this.renderLevelContent();
    this.updateDashboardStats();
    this.renderHistory();

    // Setup keyboard shortcuts
    window.addEventListener('keydown', (e) => this.handleKeyboard(e));
  }

  // ==========================================
  // VIEW SWITCHING
  // ==========================================
  showView(viewId) {
    document.querySelectorAll('.app-view').forEach(view => {
      view.classList.remove('active');
    });

    const target = document.getElementById(viewId);
    if (target) {
      target.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Update nav tabs active state
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewId);
    });

    if (viewId === 'view-history') {
      this.renderHistory();
    } else if (viewId === 'view-dashboard' || viewId === 'view-tka') {
      this.updateDashboardStats();
    }
  }

  // ==========================================
  // EVENT BINDINGS
  // ==========================================
  bindEvents() {
    // Navigation Tabs
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = btn.dataset.view;
        if (view === 'view-tka') {
          this.currentMode = 'TKA';
          this.renderLevelContent();
        } else if (view === 'view-dashboard') {
          this.currentMode = 'REGULAR';
          this.renderLevelContent();
        }
        this.showView(view);
      });
    });

    // Level Switcher (SD, SMP, SMA)
    document.querySelectorAll('.level-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentLevel = btn.dataset.level;
        this.currentGrade = this.selectedGrades[this.currentLevel] || (CURRICULUM_DATA.levels[this.currentLevel].defaultGrade || 1);
        this.renderLevelContent();
        this.updateDashboardStats();
      });
    });

    // Question Count Selector
    document.querySelectorAll('.count-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.count-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.questionCount = parseInt(btn.dataset.count, 10);
        this.timeMinutes = parseInt(btn.dataset.time, 10);
        this.updateCountNotice();
      });
    });

    // Quiz Navigation Buttons
    const btnPrev = document.getElementById('quiz-btn-prev');
    const btnNext = document.getElementById('quiz-btn-next');
    const btnFlag = document.getElementById('quiz-btn-flag');
    const btnSubmit = document.getElementById('quiz-btn-submit');

    if (btnPrev) btnPrev.addEventListener('click', () => this.quizEngine.prev());
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        const isLast = this.quizEngine.currentIndex === this.quizEngine.questions.length - 1;
        if (isLast) {
          this.promptSubmitConfirmation();
        } else {
          this.quizEngine.next();
        }
      });
    }
    if (btnFlag) btnFlag.addEventListener('click', () => this.quizEngine.toggleFlag());
    if (btnSubmit) btnSubmit.addEventListener('click', () => this.promptSubmitConfirmation());

    // Settings Modal
    const settingsBtn = document.getElementById('btn-open-settings');
    const modalSettings = document.getElementById('modal-settings');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    const btnSaveSettings = document.getElementById('btn-save-settings');
    const btnTestApi = document.getElementById('btn-test-api');

    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        document.getElementById('input-gemini-key').value = AIGenerator.getApiKey();
        document.getElementById('select-gemini-model').value = AIGenerator.getModel();
        modalSettings.classList.add('active');
      });
    }

    if (btnCloseSettings) {
      btnCloseSettings.addEventListener('click', () => modalSettings.classList.remove('active'));
    }

    if (btnSaveSettings) {
      btnSaveSettings.addEventListener('click', () => {
        const key = document.getElementById('input-gemini-key').value;
        const model = document.getElementById('select-gemini-model').value;
        AIGenerator.setApiKey(key);
        AIGenerator.setModel(model);
        modalSettings.classList.remove('active');
        alert('Pengaturan AI Gemini berhasil disimpan!');
      });
    }

    const btnDetectModels = document.getElementById('btn-detect-models');
    if (btnDetectModels) {
      btnDetectModels.addEventListener('click', async () => {
        const key = document.getElementById('input-gemini-key').value.trim();
        const hint = document.getElementById('model-detection-hint');
        const select = document.getElementById('select-gemini-model');
        const testStatus = document.getElementById('api-test-status');
        if (!key) {
          hint.textContent = '⚠️ Masukkan API Key Anda di atas terlebih dahulu, lalu klik tombol ini.';
          hint.style.color = '#EF4444';
          return;
        }

        hint.textContent = '⏳ Memindai daftar model resmi langsung dari server Google AI Studio...';
        hint.style.color = '#2563EB';

        try {
          const models = await AIGenerator.fetchLiveModels(key);
          if (!models || models.length === 0) {
            hint.innerHTML = '<span style="color: #EF4444; font-weight: 700;">❌ API Key valid, namun belum ada model teks yang diizinkan untuk project ini.</span>';
            return;
          }

          select.innerHTML = '';
          models.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = `${m.displayName || m.id} (${m.id})`;
            select.appendChild(opt);
          });

          // Prioritaskan model 1.5 Pro atau 1.5 Flash yang paling stabil dan aktif di Free Tier
          const preferred = models.find(m => m.id === 'gemini-1.5-pro') ||
                          models.find(m => m.id === 'gemini-1.5-flash') ||
                          models.find(m => m.id === 'gemini-2.5-flash') ||
                          models.find(m => m.id.includes('1.5-pro')) ||
                          models.find(m => m.id.includes('1.5-flash')) ||
                          models[0];

          select.value = preferred.id;
          AIGenerator.setModel(preferred.id);

          hint.innerHTML = `
            <div style="background: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; padding: 10px 14px; border-radius: 8px; margin-top: 8px;">
              <strong>✅ API Key Anda 100% AKTIF & SAH di Google!</strong><br>
              Server Google mengonfirmasi <strong>${models.length} model</strong> tersedia untuk akun Anda.<br>
              <em>Model stabil terpilih: <strong>${preferred.displayName || preferred.id} (${preferred.id})</strong>.</em>
            </div>
          `;

          // Otomatis lakukan uji koneksi cepat untuk model terpilih
          testStatus.textContent = `Menguji model ${preferred.id}...`;
          testStatus.style.color = '#2563EB';

          try {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${preferred.id}:generateContent?key=${key}`;
            const res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: 'Tes' }] }] })
            });

            if (res.ok) {
              testStatus.textContent = `✓ Model ${preferred.id} BERHASIL AKTIF & SIAP PAKAI!`;
              testStatus.style.color = '#059669';
            } else {
              const err = await res.json().catch(() => ({}));
              testStatus.textContent = `Status: ${err.error?.message || 'Kode ' + res.status}`;
              testStatus.style.color = '#D97706';
            }
          } catch (e) {
            testStatus.textContent = `Uji koneksi: ${e.message}`;
          }
        } catch (e) {
          let errorExplanation = e.message;
          if (e.message.includes('API key not valid') || e.message.includes('API_KEY_INVALID')) {
            errorExplanation = 'API Key tidak valid atau salah salin. Pastikan tidak ada spasi di awal/akhir.';
          } else if (e.message.includes('PERMISSION_DENIED')) {
            errorExplanation = 'Izin ditolak (Permission Denied). Buat API key baru di project baru di Google AI Studio.';
          }
          hint.innerHTML = `
            <div style="background: #FEF2F2; border: 1px solid #FECACA; color: #991B1B; padding: 10px 14px; border-radius: 8px; margin-top: 8px;">
              <strong>❌ API Key Tidak Aktif / Ditolak Google:</strong><br>
              ${errorExplanation}<br>
              <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color: #DC2626; font-weight: 700; text-decoration: underline;">
                Klik di sini untuk membuat API Key baru di Google AI Studio &rarr;
              </a>
            </div>
          `;
        }
      });
    }

    if (btnTestApi) {
      btnTestApi.addEventListener('click', async () => {
        const key = document.getElementById('input-gemini-key').value.trim();
        const model = document.getElementById('select-gemini-model').value;
        const testStatus = document.getElementById('api-test-status');
        if (!key) {
          testStatus.textContent = 'Harap masukkan API key terlebih dahulu.';
          testStatus.style.color = '#EF4444';
          return;
        }

        testStatus.textContent = `Menghubungi AI Gemini (${model})...`;
        testStatus.style.color = '#2563EB';

        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: 'Halo, respon singkat: API OK' }] }] })
          });

          if (res.ok) {
            testStatus.textContent = `✓ Koneksi Berhasil! Model ${model} aktif.`;
            testStatus.style.color = '#059669';
          } else {
            const err = await res.json().catch(() => ({}));
            const msg = err.error?.message || '';

            if (msg.includes('high demand') || res.status === 503) {
              testStatus.textContent = `⚠️ Model ${model} sedang overload di server Google (High Demand). Coba pilih Gemini 1.5 Pro atau Gemini 1.5 Flash.`;
              testStatus.style.color = '#D97706';
            } else if (res.status === 429 || msg.includes('RESOURCE_EXHAUSTED')) {
              testStatus.textContent = 'Batas kuota Gemini Pro Free Tier (2 RPM) tercapai. API Key aktif, silakan tunggu 30 detik.';
              testStatus.style.color = '#D97706';
            } else if (msg.includes('no longer available') || res.status === 404) {
              testStatus.textContent = `Model ${model} tidak aktif di akun ini. Silakan pilih Gemini 1.5 Pro.`;
              testStatus.style.color = '#EF4444';
            } else {
              testStatus.textContent = `Gagal: ${msg || 'Kode ' + res.status}`;
              testStatus.style.color = '#EF4444';
            }
          }
        } catch (e) {
          testStatus.textContent = `Error: ${e.message}`;
          testStatus.style.color = '#EF4444';
        }
      });
    }

    // Modal Submit Confirm
    const modalConfirm = document.getElementById('modal-submit-confirm');
    const btnCancelSubmit = document.getElementById('btn-cancel-submit');
    const btnConfirmSubmit = document.getElementById('btn-confirm-submit');

    if (btnCancelSubmit) btnCancelSubmit.addEventListener('click', () => modalConfirm.classList.remove('active'));
    if (btnConfirmSubmit) {
      btnConfirmSubmit.addEventListener('click', () => {
        modalConfirm.classList.remove('active');
        this.quizEngine.finishQuiz(false);
      });
    }

    // History reset controls (Lokasi Aman & Terstruktur)
    const handleResetHistory = () => {
      if (confirm('PERINGATAN: Apakah Anda yakin ingin mereset seluruh histori latihan dan statistik belajar? Tindakan ini tidak dapat dibatalkan.')) {
        HistoryManager.clearAll();
        this.renderHistory();
        this.updateDashboardStats();
        alert('Seluruh riwayat latihan telah berhasil direset.');
      }
    };

    const btnResetMain = document.getElementById('btn-reset-history-main');
    const btnResetModal = document.getElementById('btn-reset-history-modal');
    const btnResetHidden = document.getElementById('btn-reset-history-hidden');
    const btnResetSubtle = document.getElementById('btn-reset-history-subtle');
    const btnExportHistory = document.getElementById('btn-export-history');

    if (btnResetMain) btnResetMain.addEventListener('click', handleResetHistory);
    if (btnResetModal) btnResetModal.addEventListener('click', handleResetHistory);
    if (btnResetHidden) btnResetHidden.addEventListener('click', handleResetHistory);
    if (btnResetSubtle) btnResetSubtle.addEventListener('click', handleResetHistory);
    if (btnExportHistory) {
      btnExportHistory.addEventListener('click', () => HistoryManager.exportJSON());
    }

    // Result actions
    const btnBackHome = document.getElementById('btn-result-home');
    const btnRepeatQuiz = document.getElementById('btn-result-repeat');
    if (btnBackHome) {
      btnBackHome.addEventListener('click', () => {
        this.showView(this.currentMode === 'TKA' ? 'view-tka' : 'view-dashboard');
      });
    }
    if (btnRepeatQuiz) {
      btnRepeatQuiz.addEventListener('click', () => {
        if (this.currentSessionResult) {
          const level = this.currentSessionResult.level;
          const subjectId = this.currentSessionResult.subjectId;
          const isTKA = this.currentSessionResult.isTKA;
          this.startNewQuiz(level, subjectId, isTKA);
        }
      });
    }
  }

  // ==========================================
  // RENDER LEVEL CONTENT & SUBJECTS
  // ==========================================
  renderLevelContent() {
    const levelInfo = CURRICULUM_DATA.levels[this.currentLevel];
    if (!levelInfo) return;

    // Render Grade Selector Pills (Kelas 1-6 SD, 7-9 SMP, 10-12 SMA)
    this.renderGradeSelectors();
    this.updateGradeHeaders();
    this.updateCountNotice();

    // Render Subjects on Dashboard (Regular Mode)
    const dashboardGrid = document.getElementById('dashboard-subjects-grid');
    if (dashboardGrid) {
      dashboardGrid.innerHTML = '';
      levelInfo.subjects.forEach(subj => {
        const card = this.createSubjectCard(subj, false);
        dashboardGrid.appendChild(card);
      });
    }

    // Render TKA Modules (Ruang TKA Mode)
    const tkaGrid = document.getElementById('tka-subjects-grid');
    if (tkaGrid) {
      tkaGrid.innerHTML = '';
      levelInfo.tkaSubjects.forEach(subj => {
        const card = this.createSubjectCard(subj, true);
        tkaGrid.appendChild(card);
      });
    }
  }

  renderGradeSelectors() {
    const levelInfo = CURRICULUM_DATA.levels[this.currentLevel];
    if (!levelInfo || !levelInfo.gradeList) return;

    const dashContainer = document.getElementById('dashboard-grade-selector');
    const tkaContainer = document.getElementById('tka-grade-selector');

    const renderPills = (container) => {
      if (!container) return;
      container.innerHTML = '';
      levelInfo.gradeList.forEach(g => {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = `grade-pill ${g.grade === this.currentGrade ? 'active' : ''}`;
        pill.textContent = g.label;
        pill.title = g.focus || g.label;
        pill.addEventListener('click', () => {
          this.setGrade(g.grade);
        });
        container.appendChild(pill);
      });
    };

    renderPills(dashContainer);
    renderPills(tkaContainer);
  }

  setGrade(grade) {
    this.currentGrade = grade;
    this.selectedGrades[this.currentLevel] = grade;
    this.renderGradeSelectors();
    this.updateGradeHeaders();
  }

  updateGradeHeaders() {
    const levelInfo = CURRICULUM_DATA.levels[this.currentLevel];
    if (!levelInfo) return;

    const gradeObj = (levelInfo.gradeList || []).find(g => g.grade === this.currentGrade);
    const focusText = gradeObj ? gradeObj.focus : '';

    const levelTitleElem = document.getElementById('hero-level-title');
    const levelSubElem = document.getElementById('hero-level-desc');
    const tkaTitleElem = document.getElementById('tka-level-title');
    const tkaSubElem = document.getElementById('tka-level-desc');

    if (levelTitleElem) levelTitleElem.textContent = `Kuis Pelajaran ${this.currentLevel} (Kelas ${this.currentGrade})`;
    if (levelSubElem) levelSubElem.textContent = focusText ? `Fokus Materi: ${focusText}` : `${levelInfo.description} (${levelInfo.grades})`;

    if (tkaTitleElem) tkaTitleElem.textContent = `Ruang TKA ${this.currentLevel} (Kelas ${this.currentGrade})`;
    if (tkaSubElem) tkaSubElem.textContent = `Tempat latihan seru untuk siswa Kelas ${this.currentGrade} ${this.currentLevel === 'SD' ? 'SD/MI' : this.currentLevel === 'SMP' ? 'SMP/MTs' : 'SMA/MA'}`;
  }

  updateCountNotice() {
    const noticeText = `Setiap latihan berisi ${this.questionCount} soal pilihan ganda. Waktu pengerjaan ${this.timeMinutes} menit.`;
    const notice1 = document.getElementById('dashboard-notice-text');
    const notice2 = document.getElementById('tka-notice-text');
    if (notice1) notice1.textContent = noticeText;
    if (notice2) notice2.textContent = noticeText;
  }

  createSubjectCard(subject, isTKA) {
    const div = document.createElement('div');
    div.className = `subject-card ${isTKA ? 'is-tka' : ''}`;
    div.innerHTML = `
      <div class="subject-card-top">
        <div class="subject-icon-wrap" style="background-color: ${subject.color}15; color: ${subject.color};">
          ${subject.icon || '📚'}
        </div>
        <span class="subject-tag-badge">${subject.badge || (isTKA ? 'TKA' : 'Wajib')}</span>
      </div>
      <h4>${subject.name}</h4>
      <p>${subject.description}</p>
      <button class="subject-card-btn">
        Mulai Latihan →
      </button>
    `;

    div.addEventListener('click', () => {
      this.startNewQuiz(this.currentLevel, subject.id, isTKA);
    });

    return div;
  }

  // ==========================================
  // START QUIZ WITH AI GENERATION
  // ==========================================
  async startNewQuiz(level, subjectId, isTKA) {
    const levelInfo = CURRICULUM_DATA.levels[level];
    const allSubjects = [...levelInfo.subjects, ...levelInfo.tkaSubjects];
    const subject = allSubjects.find(s => s.id === subjectId) || allSubjects[0];
    const grade = this.currentGrade;

    const overlay = document.getElementById('loading-overlay');
    const statusMsg = document.getElementById('loading-status-text');

    if (overlay) overlay.classList.add('active');
    if (statusMsg) statusMsg.textContent = `Menyiapkan ${this.questionCount} butir soal ${subject.name} Kelas ${grade}...`;

    try {
      const questions = await AIGenerator.generateQuestions({
        level,
        grade,
        subjectId: subject.id,
        count: this.questionCount,
        onProgress: (p) => {
          if (statusMsg) statusMsg.textContent = p.message;
        }
      });

      if (!questions || questions.length === 0) {
        throw new Error('Gagal memuat soal. Silakan coba kembali.');
      }

      // Hide loading
      if (overlay) overlay.classList.remove('active');

      // Initialize engine
      this.showView('view-quiz');

      this.quizEngine.startQuiz({
        level,
        grade,
        subject,
        isTKA,
        questions,
        timeLimitMinutes: this.timeMinutes,
        onTick: (data) => this.handleTimerTick(data),
        onQuestionChange: (data) => this.handleQuestionRender(data),
        onFinish: (result) => this.handleQuizFinished(result)
      });

    } catch (err) {
      if (overlay) overlay.classList.remove('active');
      alert(`Terjadi kendala saat memuat soal: ${err.message}`);
    }
  }

  // ==========================================
  // QUIZ RUNTIME HANDLERS (Screenshot 1 Layout)
  // ==========================================
  handleTimerTick(data) {
    const timerElem = document.getElementById('quiz-timer-display');
    if (timerElem) {
      timerElem.textContent = data.formatted;
      timerElem.classList.toggle('urgent', data.isUrgent);
    }
  }

  handleQuestionRender(data) {
    const { currentIndex, currentQuestion, totalQuestions, userAnswer, isFlagged, isFirst, isLast, summary } = data;
    if (!currentQuestion) return;

    // Subject Pill Badge
    const subjectPill = document.getElementById('quiz-subject-pill');
    if (subjectPill) {
      subjectPill.textContent = this.quizEngine.subject ? this.quizEngine.subject.name : 'Kuis';
    }

    // Counter title: "Soal 1 dari 30"
    const counterTitle = document.getElementById('quiz-question-counter');
    if (counterTitle) {
      counterTitle.textContent = `Soal ${currentIndex + 1} dari ${totalQuestions}`;
    }

    // Progress Bar
    const progressFill = document.getElementById('quiz-progress-fill');
    if (progressFill) {
      const pct = Math.round(((currentIndex + 1) / totalQuestions) * 100);
      progressFill.style.width = `${pct}%`;
    }

    // Question Text
    const questionTextElem = document.getElementById('quiz-question-text');
    if (questionTextElem) {
      questionTextElem.textContent = currentQuestion.question;
    }

    const isLocked = userAnswer !== undefined && userAnswer !== null;
    const isCorrect = isLocked && userAnswer === currentQuestion.correctIndex;
    const letters = ['A', 'B', 'C', 'D', 'E'];

    // Options Container
    const optionsContainer = document.getElementById('quiz-options-container');
    if (optionsContainer) {
      optionsContainer.innerHTML = '';

      // Tentukan apakah muat 2 kolom 2 baris (jika opsi ringkas, <= 65 karakter)
      const maxOptLength = currentQuestion.options.reduce((m, opt) => Math.max(m, (opt || '').length), 0);
      const isShortOptions = maxOptLength <= 65;
      optionsContainer.className = `options-list ${isShortOptions ? 'grid-2col' : 'grid-1col'}`;

      currentQuestion.options.forEach((optText, optIdx) => {
        const item = document.createElement('div');
        let stateClass = '';

        if (isLocked) {
          stateClass += ' locked';
          if (optIdx === currentQuestion.correctIndex) {
            stateClass += ' is-correct';
          } else if (optIdx === userAnswer) {
            stateClass += ' is-wrong';
          }
        } else if (userAnswer === optIdx) {
          stateClass += ' selected';
        }

        item.className = `option-item ${stateClass}`.trim();
        item.innerHTML = `
          <div class="option-letter-badge">${letters[optIdx] || optIdx + 1}</div>
          <div class="option-text-content">${optText}</div>
        `;

        if (!isLocked) {
          item.addEventListener('click', () => {
            this.quizEngine.selectOption(optIdx);
          });
        }

        optionsContainer.appendChild(item);
      });
    }

    // Instant Feedback Box (Persis seperti di gambar acuan)
    const feedbackBox = document.getElementById('quiz-instant-feedback');
    if (feedbackBox) {
      if (isLocked) {
        feedbackBox.style.display = 'block';
        feedbackBox.className = `instant-feedback-card ${isCorrect ? 'is-correct' : ''}`;
        const correctLetter = letters[currentQuestion.correctIndex] || 'A';
        const correctText = currentQuestion.options[currentQuestion.correctIndex] || '';

        feedbackBox.innerHTML = `
          <div class="instant-feedback-title">
            ${isCorrect ? '🎉 Tepat sekali!' : '💡 Belum tepat.'}
          </div>
          <div class="instant-feedback-answer">
            Kunci jawaban: ${correctLetter}. ${correctText}
          </div>
          <div class="instant-feedback-explanation">
            ${currentQuestion.explanation || ''}
          </div>
        `;
      } else {
        feedbackBox.style.display = 'none';
        feedbackBox.innerHTML = '';
      }
    }

    // Nav Buttons
    const btnPrev = document.getElementById('quiz-btn-prev');
    const btnNext = document.getElementById('quiz-btn-next');
    const btnFlag = document.getElementById('quiz-btn-flag');

    if (btnPrev) btnPrev.disabled = isFirst;
    if (btnNext) {
      btnNext.innerHTML = isLast ? 'Selesai Ujian &rarr;' : 'Berikutnya &rarr;';
      btnNext.onclick = null;
    }
    if (btnFlag) {
      btnFlag.classList.toggle('active', isFlagged);
    }

    // Render Bottom Question Numbers Grid (1 to 30)
    this.renderQuestionGrid(totalQuestions, currentIndex);
  }

  renderQuestionGrid(totalQuestions, activeIndex) {
    const gridWrap = document.getElementById('quiz-number-grid');
    if (!gridWrap) return;

    gridWrap.innerHTML = '';

    for (let i = 0; i < totalQuestions; i++) {
      const btn = document.createElement('button');
      btn.className = 'grid-num-btn';
      btn.textContent = i + 1;

      const isCurrent = i === activeIndex;
      const isAnswered = this.quizEngine.isQuestionAnswered(i);
      const isCorrect = this.quizEngine.isQuestionCorrect(i);
      const isFlagged = this.quizEngine.isQuestionFlagged(i);

      if (isCurrent) btn.classList.add('current');
      if (isAnswered) {
        btn.classList.add(isCorrect ? 'btn-correct' : 'btn-wrong');
      }
      if (isFlagged) btn.classList.add('flagged');

      btn.addEventListener('click', () => {
        this.quizEngine.goTo(i);
      });

      gridWrap.appendChild(btn);
    }
  }

  handleKeyboard(e) {
    const quizView = document.getElementById('view-quiz');
    if (!quizView || !quizView.classList.contains('active')) return;

    // Navigasi panah selalu aktif
    if (e.key === 'ArrowRight') {
      this.quizEngine.next();
      return;
    } else if (e.key === 'ArrowLeft') {
      this.quizEngine.prev();
      return;
    } else if (e.key.toLowerCase() === 'r') {
      this.quizEngine.toggleFlag();
      return;
    }

    // Jika soal sudah terkunci, abaikan pemilihan tombol angka/huruf
    const isLocked = this.quizEngine.isQuestionLocked(this.quizEngine.currentIndex);
    if (isLocked) return;

    // Keys 1, 2, 3, 4, 5 or A, B, C, D, E for options
    if (['1', '2', '3', '4', '5'].includes(e.key)) {
      const optIdx = parseInt(e.key, 10) - 1;
      this.quizEngine.selectOption(optIdx);
    } else if (['a', 'b', 'c', 'd', 'e'].includes(e.key.toLowerCase())) {
      const map = { a: 0, b: 1, c: 2, d: 3, e: 4 };
      this.quizEngine.selectOption(map[e.key.toLowerCase()]);
    }
  }

  promptSubmitConfirmation() {
    const summary = this.quizEngine.getSummary();
    const modal = document.getElementById('modal-submit-confirm');
    const summaryText = document.getElementById('submit-confirm-summary');

    if (summaryText) {
      if (summary.unanswered > 0) {
        summaryText.innerHTML = `
          Masih ada <strong>${summary.unanswered} soal</strong> yang belum Anda jawab dari total ${summary.total} soal.<br>
          ${summary.flagged > 0 ? `Terdapat <strong>${summary.flagged} soal</strong> dengan tanda ragu-ragu.<br>` : ''}
          Apakah Anda yakin ingin menyelesaikan kuis sekarang?
        `;
      } else {
        summaryText.innerHTML = `
          Hebat! Seluruh <strong>${summary.total} soal</strong> sudah Anda jawab.<br>
          ${summary.flagged > 0 ? `Perhatian: Ada ${summary.flagged} soal ditandai ragu-ragu.<br>` : ''}
          Kumpulkan jawaban dan lihat skor sekarang?
        `;
      }
    }

    if (modal) modal.classList.add('active');
  }

  // ==========================================
  // QUIZ FINISHED & RESULTS
  // ==========================================
  async handleQuizFinished(result) {
    this.currentSessionResult = result;

    // Save to history
    await HistoryManager.save(result);
    this.updateDashboardStats();

    // Show result view
    this.showView('view-results');

    // Populate results
    document.getElementById('result-level-tag').textContent = `${result.level} (Kelas ${result.grade || ''}) - ${result.subjectName}`;
    document.getElementById('result-score-value').textContent = result.score;
    document.getElementById('result-title-text').textContent = result.gradeTitle;

    document.getElementById('res-correct-count').textContent = result.correctCount;
    document.getElementById('res-wrong-count').textContent = result.wrongCount;
    document.getElementById('res-empty-count').textContent = result.unansweredCount;

    const mins = Math.floor(result.timeSpentSeconds / 60);
    const secs = result.timeSpentSeconds % 60;
    document.getElementById('res-time-spent').textContent = `${mins}m ${secs}s`;

    // Render Full Explanations (Pembahasan)
    this.renderReviewList(result.questions);
  }

  renderReviewList(questions) {
    const container = document.getElementById('result-review-list');
    if (!container) return;

    container.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D', 'E'];

    questions.forEach((q, idx) => {
      const item = document.createElement('div');
      item.className = 'review-item-card';

      let statusBadge = '';
      if (q.userAnswer === null || q.userAnswer === undefined) {
        statusBadge = '<span class="review-status-tag empty">Tidak Dijawab</span>';
      } else if (q.isCorrect) {
        statusBadge = '<span class="review-status-tag correct">Benar (+1)</span>';
      } else {
        statusBadge = '<span class="review-status-tag wrong">Salah</span>';
      }

      let optionsHtml = '<div style="display: flex; flex-direction: column; gap: 8px; margin: 12px 0;">';
      q.options.forEach((opt, oIdx) => {
        let style = 'padding: 10px 14px; border-radius: 8px; border: 1px solid #E2E8F0; display: flex; align-items: center; gap: 10px; font-size: 0.95rem;';
        let badgeStyle = 'width: 26px; height: 26px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem;';

        const isUserSelected = q.userAnswer === oIdx;
        const isRightAnswer = q.correctIndex === oIdx;

        if (isRightAnswer) {
          style += 'background: #D1FAE5; border-color: #10B981; font-weight: 700; color: #065F46;';
          badgeStyle += 'background: #059669; color: #FFF;';
        } else if (isUserSelected && !isRightAnswer) {
          style += 'background: #FEE2E2; border-color: #EF4444; color: #991B1B;';
          badgeStyle += 'background: #DC2626; color: #FFF;';
        } else {
          style += 'background: #FFF; color: #475569;';
          badgeStyle += 'background: #EFF6FF; color: #2563EB;';
        }

        optionsHtml += `
          <div style="${style}">
            <div style="${badgeStyle}">${letters[oIdx]}</div>
            <div>${opt} ${isRightAnswer ? '<strong>(Kunci Jawaban)</strong>' : ''} ${isUserSelected && !isRightAnswer ? '<em>(Jawaban Anda)</em>' : ''}</div>
          </div>
        `;
      });
      optionsHtml += '</div>';

      item.innerHTML = `
        <div class="review-item-header">
          <div class="review-q-num">Soal Nomor ${idx + 1}</div>
          ${statusBadge}
        </div>
        <p style="font-weight: 700; font-size: 1.05rem; margin-bottom: 8px; white-space: pre-line;">${q.question}</p>
        ${optionsHtml}
        <div class="review-explanation-box">
          <h5>💡 Pembahasan & Langkah Penyelesaian:</h5>
          <p>${q.explanation || 'Pembahasan terperinci tidak tersedia.'}</p>
        </div>
      `;

      container.appendChild(item);
    });
  }

  // ==========================================
  // DASHBOARD & HISTORY STATS (Screenshot 2 Match)
  // ==========================================
  updateDashboardStats() {
    const stats = HistoryManager.getStats(this.currentLevel);

    // Dashboard values (Screenshot 2: 25 Latihan, 49 Rata-rata, 100 Nilai terbaik)
    const stat1 = document.getElementById('dash-stat-completed');
    const stat2 = document.getElementById('dash-stat-avg');
    const stat3 = document.getElementById('dash-stat-best');

    if (stat1) stat1.textContent = stats.totalCompleted;
    if (stat2) stat2.textContent = stats.averageScore;
    if (stat3) stat3.textContent = stats.bestScore;

    // TKA Page Stats
    const tkaStat1 = document.getElementById('tka-stat-completed');
    const tkaStat2 = document.getElementById('tka-stat-avg');
    const tkaStat3 = document.getElementById('tka-stat-best');

    if (tkaStat1) tkaStat1.textContent = stats.totalCompleted;
    if (tkaStat2) tkaStat2.textContent = stats.averageScore;
    if (tkaStat3) tkaStat3.textContent = stats.bestScore;
  }

  renderHistory() {
    const historyList = HistoryManager.getAll();
    const container = document.getElementById('history-records-list');
    const emptyState = document.getElementById('history-empty-state');
    if (!container) return;

    if (historyList.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    container.innerHTML = '';

    historyList.forEach(item => {
      const card = document.createElement('div');
      card.className = 'history-card-item';

      let scoreClass = 'med';
      if (item.score >= 80) scoreClass = 'high';
      else if (item.score < 60) scoreClass = 'low';

      card.innerHTML = `
        <div class="history-info-main">
          <div class="history-score-pill ${scoreClass}">
            ${item.score}
          </div>
          <div class="history-details">
            <h4>${item.subjectName} <span class="subject-tag-badge">${item.level} ${item.grade ? 'Kelas ' + item.grade : ''}</span> ${item.isTKA ? '<span class="badge-home-study" style="font-size: 0.7rem; padding: 2px 8px;">TKA</span>' : ''}</h4>
            <div class="history-meta-sub">
              <span>📅 ${item.dateFormatted}</span>
              <span>•</span>
              <span>⏱️ ${Math.round((item.timeSpentSeconds || 0) / 60)} menit</span>
              <span>•</span>
              <span>🎯 ${item.correctCount}/${item.totalQuestions} Benar</span>
            </div>
          </div>
        </div>
        <div class="history-actions">
          <button class="btn-secondary btn-review-history" style="padding: 8px 16px; font-size: 0.85rem;">
            Lihat Pembahasan
          </button>
          <button class="btn-secondary btn-del-history" style="padding: 8px 12px; font-size: 0.85rem; color: #EF4444;" title="Hapus catatan">
            🗑️
          </button>
        </div>
      `;

      card.querySelector('.btn-review-history').addEventListener('click', () => {
        this.currentSessionResult = item;
        this.showView('view-results');
        document.getElementById('result-level-tag').textContent = `${item.level} - ${item.subjectName}`;
        document.getElementById('result-score-value').textContent = item.score;
        document.getElementById('result-title-text').textContent = item.score >= 80 ? 'Hasil Ujian Bagus!' : 'Hasil Latihan';
        document.getElementById('res-correct-count').textContent = item.correctCount;
        document.getElementById('res-wrong-count').textContent = item.wrongCount;
        document.getElementById('res-empty-count').textContent = item.unansweredCount || 0;
        document.getElementById('res-time-spent').textContent = `${Math.round((item.timeSpentSeconds || 0) / 60)} menit`;
        this.renderReviewList(item.questions);
      });

      card.querySelector('.btn-del-history').addEventListener('click', () => {
        if (confirm('Hapus sesi latihan ini?')) {
          HistoryManager.delete(item.id);
          this.renderHistory();
          this.updateDashboardStats();
        }
      });

      container.appendChild(card);
    });
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
});
