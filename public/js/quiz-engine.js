/**
 * Quiz Engine
 * Mengelola state kuis, timer countdown (MM:SS), navigasi soal (1 - N),
 * penandaan ragu-ragu, pemilihan jawaban, auto-submit saat waktu habis,
 * dan kalkulasi skor serta pembahasan.
 */

class QuizEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.level = 'SD';
    this.grade = 6;
    this.subject = null;
    this.isTKA = false;
    this.questions = [];
    this.currentIndex = 0;
    this.userAnswers = {}; // { [index]: selectedOptionIndex }
    this.flagged = new Set(); // set of indices marked as "ragu-ragu"
    this.timeLimitMinutes = 45;
    this.remainingSeconds = 45 * 60;
    this.timeSpentSeconds = 0;
    this.timerInterval = null;
    this.isFinished = false;
    this.callbacks = {};
  }

  /**
   * Memulai kuis baru
   */
  startQuiz({
    level,
    grade = 6,
    subject,
    isTKA = false,
    questions,
    timeLimitMinutes = 45,
    onTick = null,
    onQuestionChange = null,
    onFinish = null
  }) {
    this.reset();
    this.level = level;
    this.grade = grade;
    this.subject = subject;
    this.isTKA = isTKA;
    this.questions = questions;
    this.timeLimitMinutes = timeLimitMinutes;
    this.remainingSeconds = timeLimitMinutes * 60;
    this.timeSpentSeconds = 0;
    this.isFinished = false;

    this.callbacks = {
      onTick,
      onQuestionChange,
      onFinish
    };

    this.startTimer();
    this.notifyQuestionChange();
  }

  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      if (this.isFinished) {
        clearInterval(this.timerInterval);
        return;
      }

      this.remainingSeconds--;
      this.timeSpentSeconds++;

      const formatted = this.getFormattedTime();
      if (this.callbacks.onTick) {
        this.callbacks.onTick({
          remainingSeconds: this.remainingSeconds,
          timeSpentSeconds: this.timeSpentSeconds,
          formatted: formatted,
          isUrgent: this.remainingSeconds <= 300 // < 5 minutes
        });
      }

      if (this.remainingSeconds <= 0) {
        this.finishQuiz(true); // auto submit because time is up
      }
    }, 1000);
  }

  getFormattedTime() {
    const mins = Math.floor(Math.max(0, this.remainingSeconds) / 60);
    const secs = Math.max(0, this.remainingSeconds) % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  getCurrentQuestion() {
    return this.questions[this.currentIndex] || null;
  }

  goTo(index) {
    if (index >= 0 && index < this.questions.length) {
      this.currentIndex = index;
      this.notifyQuestionChange();
    }
  }

  next() {
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
      this.notifyQuestionChange();
    }
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.notifyQuestionChange();
    }
  }

  selectOption(optionIndex) {
    if (this.isFinished) return;
    // Kunci jawaban: saat sudah klik tidak bisa diubah lagi
    if (this.userAnswers[this.currentIndex] !== undefined && this.userAnswers[this.currentIndex] !== null) {
      return;
    }
    this.userAnswers[this.currentIndex] = optionIndex;
    this.notifyQuestionChange();
  }

  isQuestionLocked(index) {
    return this.userAnswers[index] !== undefined && this.userAnswers[index] !== null;
  }

  isQuestionCorrect(index) {
    const q = this.questions[index];
    const ans = this.userAnswers[index];
    return q && ans !== undefined && ans !== null && ans === q.correctIndex;
  }

  toggleFlag() {
    if (this.isFinished) return;
    if (this.flagged.has(this.currentIndex)) {
      this.flagged.delete(this.currentIndex);
    } else {
      this.flagged.add(this.currentIndex);
    }
    this.notifyQuestionChange();
  }

  isQuestionAnswered(index) {
    return this.userAnswers[index] !== undefined && this.userAnswers[index] !== null;
  }

  isQuestionFlagged(index) {
    return this.flagged.has(index);
  }

  getSummary() {
    const total = this.questions.length;
    let answered = 0;
    let flaggedCount = this.flagged.size;

    for (let i = 0; i < total; i++) {
      if (this.isQuestionAnswered(i)) answered++;
    }

    return {
      total,
      answered,
      unanswered: total - answered,
      flagged: flaggedCount
    };
  }

  notifyQuestionChange() {
    if (this.callbacks.onQuestionChange) {
      this.callbacks.onQuestionChange({
        currentIndex: this.currentIndex,
        currentQuestion: this.getCurrentQuestion(),
        totalQuestions: this.questions.length,
        userAnswer: this.userAnswers[this.currentIndex],
        isLocked: this.isQuestionLocked(this.currentIndex),
        isCorrect: this.isQuestionCorrect(this.currentIndex),
        isFlagged: this.isQuestionFlagged(this.currentIndex),
        isAnswered: this.isQuestionAnswered(this.currentIndex),
        isFirst: this.currentIndex === 0,
        isLast: this.currentIndex === this.questions.length - 1,
        summary: this.getSummary()
      });
    }
  }

  /**
   * Selesaikan kuis dan hitung skor
   */
  finishQuiz(isTimeOut = false) {
    if (this.isFinished) return;
    this.isFinished = true;
    if (this.timerInterval) clearInterval(this.timerInterval);

    const total = this.questions.length;
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    const evaluatedQuestions = this.questions.map((q, idx) => {
      const userAnswer = this.userAnswers[idx];
      const hasAnswered = userAnswer !== undefined && userAnswer !== null;
      const isCorrect = hasAnswered && userAnswer === q.correctIndex;

      if (!hasAnswered) {
        unansweredCount++;
      } else if (isCorrect) {
        correctCount++;
      } else {
        wrongCount++;
      }

      return {
        ...q,
        userAnswer: hasAnswered ? userAnswer : null,
        isCorrect,
        isFlagged: this.isQuestionFlagged(idx)
      };
    });

    const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    let gradeTitle = 'Tetap Semangat! 💪';
    let gradeBadge = 'Cukup';
    if (score >= 90) {
      gradeTitle = 'Luar Biasa, Sempurna! 🏆';
      gradeBadge = 'Istimewa';
    } else if (score >= 75) {
      gradeTitle = 'Hebat Sekali! 🌟';
      gradeBadge = 'Sangat Baik';
    } else if (score >= 60) {
      gradeTitle = 'Bagus! Latihan Terus! 👍';
      gradeBadge = 'Baik';
    }

    const result = {
      level: this.level,
      grade: this.grade,
      subjectId: this.subject ? this.subject.id : 'unknown',
      subjectName: this.subject ? this.subject.name : 'Kuis Pelajaran',
      isTKA: this.isTKA,
      totalQuestions: total,
      correctCount,
      wrongCount,
      unansweredCount,
      score,
      gradeTitle,
      gradeBadge,
      timeSpentSeconds: this.timeSpentSeconds,
      timeLimitMinutes: this.timeLimitMinutes,
      isTimeOut,
      questions: evaluatedQuestions
    };

    if (this.callbacks.onFinish) {
      this.callbacks.onFinish(result);
    }

    return result;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { QuizEngine };
}
