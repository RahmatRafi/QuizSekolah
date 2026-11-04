/**
 * Manajer Histori & Statistik Ujian
 * Menyimpan riwayat latihan ke LocalStorage dan menyinkronkan dengan backend server (jika aktif)
 */

const HistoryManager = {
  storageKey: 'pintar_quiz_history_v1',

  /**
   * Mengambil seluruh data riwayat ujian
   */
  getAll() {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return [];
      }
      let list = JSON.parse(raw);
      if (!Array.isArray(list)) return [];
      
      // Bersihkan data sampel/dummy lawas otomatis jika ada
      const cleaned = list.filter(item => !item.id || !item.id.startsWith('quiz_seed_'));
      if (cleaned.length !== list.length) {
        localStorage.setItem(this.storageKey, JSON.stringify(cleaned));
        list = cleaned;
      }
      
      return list;
    } catch (e) {
      console.error('Gagal membaca riwayat:', e);
      return [];
    }
  },

  /**
   * Menyimpan sesi ujian yang baru selesai
   */
  async save(session) {
    const historyItem = {
      id: 'quiz_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      timestamp: Date.now(),
      dateFormatted: new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date()),
      level: session.level, // 'SD', 'SMP', 'SMA'
      grade: session.grade || null,
      subjectId: session.subjectId,
      subjectName: session.subjectName,
      isTKA: Boolean(session.isTKA),
      totalQuestions: session.totalQuestions,
      correctCount: session.correctCount,
      wrongCount: session.wrongCount,
      unansweredCount: session.unansweredCount,
      score: session.score, // 0 - 100
      timeSpentSeconds: session.timeSpentSeconds,
      timeLimitMinutes: session.timeLimitMinutes,
      questions: session.questions.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        userAnswer: q.userAnswer !== undefined ? q.userAnswer : null,
        isCorrect: q.userAnswer === q.correctIndex,
        isFlagged: Boolean(q.isFlagged),
        explanation: q.explanation
      }))
    };

    // 1. Simpan ke LocalStorage
    const currentList = this.getAll();
    currentList.unshift(historyItem); // terbaru di atas
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(currentList));
    } catch (e) {
      console.warn('LocalStorage kuota penuh atau error:', e);
      // jika penuh, simpan 50 terakhir
      if (currentList.length > 50) {
        localStorage.setItem(this.storageKey, JSON.stringify(currentList.slice(0, 50)));
      }
    }

    // 2. Coba sync ke server backend jika tersedia
    try {
      fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(historyItem)
      }).catch(() => {});
    } catch (e) {}

    return historyItem;
  },

  /**
   * Menghitung statistik keseluruhan atau berdasarkan jenjang
   */
  getStats(levelFilter = null) {
    let list = this.getAll();
    if (levelFilter && levelFilter !== 'ALL') {
      list = list.filter(item => item.level === levelFilter);
    }

    const total = list.length;
    if (total === 0) {
      return {
        totalCompleted: 0,
        averageScore: 0,
        bestScore: 0,
        totalCorrect: 0,
        totalQuestions: 0
      };
    }

    const totalScore = list.reduce((sum, item) => sum + (item.score || 0), 0);
    const bestScore = list.reduce((max, item) => Math.max(max, item.score || 0), 0);
    const averageScore = Math.round(totalScore / total);
    const totalCorrect = list.reduce((sum, item) => sum + (item.correctCount || 0), 0);
    const totalQuestions = list.reduce((sum, item) => sum + (item.totalQuestions || 0), 0);

    return {
      totalCompleted: total,
      averageScore,
      bestScore,
      totalCorrect,
      totalQuestions
    };
  },

  /**
   * Menghapus 1 entri riwayat
   */
  delete(id) {
    const list = this.getAll().filter(item => item.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(list));
    try {
      fetch(`/api/history/${id}`, { method: 'DELETE' }).catch(() => {});
    } catch (e) {}
    return list;
  },

  /**
   * Mengosongkan seluruh histori
   */
  clearAll() {
    localStorage.setItem(this.storageKey, JSON.stringify([]));
    try {
      fetch('/api/history', { method: 'DELETE' }).catch(() => {});
    } catch (e) {}
  },

  /**
   * Ekspor histori ke file JSON
   */
  exportJSON() {
    const data = JSON.stringify(this.getAll(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `histori-kuis-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HistoryManager };
}
