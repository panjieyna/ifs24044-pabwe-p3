'use strict';

/* ============================================================================
   LaciKu — assets/script.js
   Studi kasus PABWE P3

   Struktur file:
   1. Util bersama (storage helper, format angka, id generator)
   2. Navigasi tab (state tab disimpan di query string URL, BUKAN localStorage)
   3. Modul Expense Tracker   (IIFE, key storage sendiri)
   4. Modul Bookmark Manager  (IIFE, key storage sendiri)
   5. Modul Quiz App          (IIFE, key storage sendiri)
   6. Bootstrap aplikasi
   ============================================================================ */

/* ============================================================================
   1. UTIL BERSAMA
   ============================================================================ */

// Key localStorage dipisah per fitur agar data tidak saling menimpa
const STORAGE_KEYS = {
  EXPENSE: 'laciku_expenses_v1',
  BOOKMARK: 'laciku_bookmarks_v1',
  QUIZ_HIGHSCORE: 'laciku_quiz_highscore_v1',
};

/**
 * Mengambil data JSON dari localStorage dengan aman.
 * Mengembalikan fallback jika data tidak ada / rusak.
 */
function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error(`Gagal memuat data untuk key "${key}":`, err);
    return fallback;
  }
}

/** Menyimpan data ke localStorage dalam bentuk JSON. */
function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Gagal menyimpan data untuk key "${key}":`, err);
  }
}

/** Membuat id unik sederhana berbasis timestamp + random string. */
function generateId() {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Format angka menjadi format Rupiah, contoh: 25000 -> "Rp 25.000". */
function formatRupiah(value) {
  const number = Number(value) || 0;
  return `Rp ${number.toLocaleString('id-ID')}`;
}

/** Escape karakter HTML agar input pengguna aman ditampilkan lewat innerHTML. */
function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = String(text ?? '');
  return div.innerHTML;
}

/** Helper generik untuk membuka / menutup modal via class 'is-open'. */
function openModal(modalId) {
  document.getElementById(modalId)?.classList.add('is-open');
}
function closeModal(modalId) {
  document.getElementById(modalId)?.classList.remove('is-open');
}

// Tombol dengan atribut data-close-modal dipakai di beberapa modal sekaligus
document.addEventListener('click', (event) => {
  const closeBtn = event.target.closest('[data-close-modal]');
  if (closeBtn) {
    closeModal(closeBtn.dataset.closeModal);
  }
  // Klik area gelap di luar kotak modal juga menutup modal
  if (event.target.classList.contains('modal-overlay')) {
    event.target.classList.remove('is-open');
  }
});

/* ============================================================================
   2. NAVIGASI TAB — state disimpan & dipulihkan lewat query string URL
      Contoh: index.html?tab=bookmark
   ============================================================================ */

const TabNavigation = (() => {
  const TAB_IDS = ['expense', 'bookmark', 'quiz'];
  const DEFAULT_TAB = 'expense';

  function getTabFromURL() {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    return TAB_IDS.includes(tab) ? tab : DEFAULT_TAB;
  }

  function setTabInURL(tabId) {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tabId);
    window.history.replaceState({}, '', url);
  }

  function activateTab(tabId) {
    TAB_IDS.forEach((id) => {
      const panel = document.getElementById(`panel-${id}`);
      const button = document.getElementById(`tab-btn-${id}`);
      const isActive = id === tabId;
      panel.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', String(isActive));
    });
    setTabInURL(tabId);
  }

  function init() {
    TAB_IDS.forEach((id) => {
      document.getElementById(`tab-btn-${id}`).addEventListener('click', () => activateTab(id));
    });
    // Pulihkan tab terakhir dari query string saat halaman dimuat / di-refresh
    activateTab(getTabFromURL());

    // Jika pengguna menekan tombol back/forward browser, ikuti perubahan query
    window.addEventListener('popstate', () => activateTab(getTabFromURL()));
  }

  return { init };
})();

/* ============================================================================
   3. MODUL EXPENSE TRACKER
   ============================================================================ */

const ExpenseTracker = (() => {
  let expenses = loadFromStorage(STORAGE_KEYS.EXPENSE, []);
  let deleteTargetId = null;

  // --- Referensi DOM ---
  const form = document.getElementById('expense-form');
  const titleInput = document.getElementById('expense-title');
  const categoryInput = document.getElementById('expense-category');
  const amountInput = document.getElementById('expense-amount');
  const typeInput = document.getElementById('expense-type');
  const dateInput = document.getElementById('expense-date');

  const listContainer = document.getElementById('expense-list');
  const emptyState = document.getElementById('expense-empty');

  const searchInput = document.getElementById('expense-search');
  const filterTypeSelect = document.getElementById('expense-filter-type');
  const filterCategorySelect = document.getElementById('expense-filter-category');
  const sortSelect = document.getElementById('expense-sort');

  const totalIncomeEl = document.getElementById('expense-total-income');
  const totalExpenseEl = document.getElementById('expense-total-expense');
  const balanceEl = document.getElementById('expense-balance');

  // Modal ubah
  const editModalId = 'expense-modal';
  const editForm = document.getElementById('expense-edit-form');
  const editIdInput = document.getElementById('expense-edit-id');
  const editTitleInput = document.getElementById('expense-edit-title');
  const editCategoryInput = document.getElementById('expense-edit-category');
  const editAmountInput = document.getElementById('expense-edit-amount');
  const editTypeInput = document.getElementById('expense-edit-type');
  const editDateInput = document.getElementById('expense-edit-date');

  // Modal hapus
  const deleteModalId = 'expense-delete-modal';
  const deleteConfirmBtn = document.getElementById('expense-delete-confirm-btn');

  function persist() {
    saveToStorage(STORAGE_KEYS.EXPENSE, expenses);
  }

  /** Validasi form tambah/ubah transaksi. Mengembalikan objek error (kosong = valid). */
  function validate({ title, amount, date }) {
    const errors = {};
    if (!title || !title.trim()) errors.title = 'Judul wajib diisi.';
    const numericAmount = Number(amount);
    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      errors.amount = 'Jumlah harus berupa angka lebih dari 0.';
    }
    if (!date) errors.date = 'Tanggal wajib diisi.';
    return errors;
  }

  function showFieldError(errorElId, inputEl, message) {
    const errorEl = document.getElementById(errorElId);
    if (errorEl) errorEl.textContent = message || '';
    if (inputEl) inputEl.classList.toggle('input-error', Boolean(message));
  }

  function clearFormErrors(prefix) {
    ['title', 'amount', 'date'].forEach((field) => {
      showFieldError(`${prefix}-${field}-error`, document.getElementById(`${prefix}-${field}`), '');
    });
  }

  // --- Tambah transaksi ---
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = {
      title: titleInput.value,
      category: categoryInput.value,
      amount: amountInput.value,
      type: typeInput.value,
      date: dateInput.value,
    };

    clearFormErrors('expense');
    const errors = validate(data);
    if (errors.title) showFieldError('expense-title-error', titleInput, errors.title);
    if (errors.amount) showFieldError('expense-amount-error', amountInput, errors.amount);
    if (errors.date) showFieldError('expense-date-error', dateInput, errors.date);
    if (Object.keys(errors).length > 0) return;

    expenses.push({
      id: generateId(),
      title: data.title.trim(),
      category: data.category,
      amount: Number(data.amount),
      type: data.type,
      date: data.date,
      createdAt: Date.now(),
    });

    persist();
    form.reset();
    render();
  });

  // --- Buka modal ubah ---
  function openEditModal(id) {
    const item = expenses.find((exp) => exp.id === id);
    if (!item) return;
    editIdInput.value = item.id;
    editTitleInput.value = item.title;
    editCategoryInput.value = item.category;
    editAmountInput.value = item.amount;
    editTypeInput.value = item.type;
    editDateInput.value = item.date;
    clearFormErrors('expense-edit');
    openModal(editModalId);
  }

  editForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = {
      title: editTitleInput.value,
      amount: editAmountInput.value,
      date: editDateInput.value,
    };

    clearFormErrors('expense-edit');
    const errors = validate(data);
    if (errors.title) showFieldError('expense-edit-title-error', editTitleInput, errors.title);
    if (errors.amount) showFieldError('expense-edit-amount-error', editAmountInput, errors.amount);
    if (errors.date) showFieldError('expense-edit-date-error', editDateInput, errors.date);
    if (Object.keys(errors).length > 0) return;

    const index = expenses.findIndex((exp) => exp.id === editIdInput.value);
    if (index !== -1) {
      expenses[index] = {
        ...expenses[index],
        title: data.title.trim(),
        category: editCategoryInput.value,
        amount: Number(data.amount),
        type: editTypeInput.value,
        date: data.date,
      };
      persist();
      render();
    }
    closeModal(editModalId);
  });

  // --- Hapus transaksi (via modal konfirmasi) ---
  function openDeleteModal(id) {
    deleteTargetId = id;
    openModal(deleteModalId);
  }

  deleteConfirmBtn.addEventListener('click', () => {
    if (deleteTargetId) {
      expenses = expenses.filter((exp) => exp.id !== deleteTargetId);
      persist();
      render();
    }
    deleteTargetId = null;
    closeModal(deleteModalId);
  });

  // --- Filter, cari, sort ---
  function getVisibleExpenses() {
    const keyword = searchInput.value.trim().toLowerCase();
    const typeFilter = filterTypeSelect.value;
    const categoryFilter = filterCategorySelect.value;
    const sortMode = sortSelect.value;

    let result = expenses.filter((exp) => {
      const matchesKeyword = !keyword || exp.title.toLowerCase().includes(keyword);
      const matchesType = typeFilter === 'all' || exp.type === typeFilter;
      const matchesCategory = categoryFilter === 'all' || exp.category === categoryFilter;
      return matchesKeyword && matchesType && matchesCategory;
    });

    result = result.sort((a, b) => {
      switch (sortMode) {
        case 'oldest':
          return a.createdAt - b.createdAt;
        case 'amount-desc':
          return b.amount - a.amount;
        case 'amount-asc':
          return a.amount - b.amount;
        case 'newest':
        default:
          return b.createdAt - a.createdAt;
      }
    });

    return result;
  }

  function renderSummary() {
    const totalIncome = expenses
      .filter((exp) => exp.type === 'pemasukan')
      .reduce((sum, exp) => sum + exp.amount, 0);
    const totalExpense = expenses
      .filter((exp) => exp.type === 'pengeluaran')
      .reduce((sum, exp) => sum + exp.amount, 0);

    totalIncomeEl.textContent = formatRupiah(totalIncome);
    totalExpenseEl.textContent = formatRupiah(totalExpense);
    balanceEl.textContent = formatRupiah(totalIncome - totalExpense);
  }

  function createExpenseRow(item) {
    const row = document.createElement('div');
    row.className = 'row-card p-3 flex flex-wrap items-center justify-between gap-3';

    const isIncome = item.type === 'pemasukan';
    const badgeClass = isIncome ? 'badge-income' : 'badge-expense';
    const badgeLabel = isIncome ? 'Pemasukan' : 'Pengeluaran';
    const amountSign = isIncome ? '+' : '-';
    const amountColor = isIncome ? 'text-leaf' : 'text-rust';

    row.innerHTML = `
      <div class="min-w-[10rem]">
        <p class="font-semibold text-sm">${escapeHTML(item.title)}</p>
        <div class="flex flex-wrap items-center gap-2 mt-1">
          <span class="badge ${badgeClass}">${badgeLabel}</span>
          <span class="badge badge-cat">${escapeHTML(item.category)}</span>
          <span class="text-xs text-inkmuted">${escapeHTML(item.date)}</span>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <p class="font-display font-semibold ${amountColor}">${amountSign} ${formatRupiah(item.amount)}</p>
        <div class="flex gap-1">
          <button type="button" class="btn-edit p-2 rounded hover:bg-[#EDE9DA]" aria-label="Ubah transaksi">
            <i class="ti ti-pencil" aria-hidden="true"></i>
          </button>
          <button type="button" class="btn-delete p-2 rounded hover:bg-[#EDE9DA]" aria-label="Hapus transaksi">
            <i class="ti ti-trash text-rust" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    `;

    row.querySelector('.btn-edit').addEventListener('click', () => openEditModal(item.id));
    row.querySelector('.btn-delete').addEventListener('click', () => openDeleteModal(item.id));
    return row;
  }

  function render() {
    renderSummary();
    const visible = getVisibleExpenses();

    listContainer.innerHTML = '';
    if (visible.length === 0) {
      emptyState.classList.remove('hidden');
    } else {
      emptyState.classList.add('hidden');
      const fragment = document.createDocumentFragment();
      visible.forEach((item) => fragment.appendChild(createExpenseRow(item)));
      listContainer.appendChild(fragment);
    }
  }

  function init() {
    [searchInput, filterTypeSelect, filterCategorySelect, sortSelect].forEach((el) => {
      el.addEventListener('input', render);
      el.addEventListener('change', render);
    });
    render();
  }

  return { init };
})();

/* ============================================================================
   4. MODUL BOOKMARK MANAGER
   ============================================================================ */

const BookmarkManager = (() => {
  let bookmarks = loadFromStorage(STORAGE_KEYS.BOOKMARK, []);
  let deleteTargetId = null;

  // --- Referensi DOM ---
  const form = document.getElementById('bookmark-form');
  const titleInput = document.getElementById('bookmark-title');
  const urlInput = document.getElementById('bookmark-url');
  const categoryInput = document.getElementById('bookmark-category');
  const noteInput = document.getElementById('bookmark-note');

  const listContainer = document.getElementById('bookmark-list');
  const emptyState = document.getElementById('bookmark-empty');

  const searchInput = document.getElementById('bookmark-search');
  const sortSelect = document.getElementById('bookmark-sort');

  // Modal ubah
  const editModalId = 'bookmark-modal';
  const editForm = document.getElementById('bookmark-edit-form');
  const editIdInput = document.getElementById('bookmark-edit-id');
  const editTitleInput = document.getElementById('bookmark-edit-title');
  const editUrlInput = document.getElementById('bookmark-edit-url');
  const editCategoryInput = document.getElementById('bookmark-edit-category');
  const editNoteInput = document.getElementById('bookmark-edit-note');

  // Modal hapus
  const deleteModalId = 'bookmark-delete-modal';
  const deleteConfirmBtn = document.getElementById('bookmark-delete-confirm-btn');

  function persist() {
    saveToStorage(STORAGE_KEYS.BOOKMARK, bookmarks);
  }

  /** Validasi URL sederhana: wajib diawali http:// atau https:// dan punya domain. */
  function isValidURL(value) {
    if (!/^https?:\/\/.+/i.test(value.trim())) return false;
    try {
      new URL(value.trim());
      return true;
    } catch {
      return false;
    }
  }

  function validate({ title, url, category }) {
    const errors = {};
    if (!title || !title.trim()) errors.title = 'Nama wajib diisi.';
    if (!url || !url.trim()) {
      errors.url = 'URL wajib diisi.';
    } else if (!isValidURL(url)) {
      errors.url = 'URL harus diawali http:// atau https://';
    }
    if (!category || !category.trim()) errors.category = 'Kategori wajib diisi.';
    return errors;
  }

  function showFieldError(errorElId, inputEl, message) {
    const errorEl = document.getElementById(errorElId);
    if (errorEl) errorEl.textContent = message || '';
    if (inputEl) inputEl.classList.toggle('input-error', Boolean(message));
  }

  function clearFormErrors(prefix) {
    ['title', 'url', 'category'].forEach((field) => {
      showFieldError(`${prefix}-${field}-error`, document.getElementById(`${prefix}-${field}`), '');
    });
  }

  // --- Tambah bookmark ---
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = {
      title: titleInput.value,
      url: urlInput.value,
      category: categoryInput.value,
      note: noteInput.value,
    };

    clearFormErrors('bookmark');
    const errors = validate(data);
    if (errors.title) showFieldError('bookmark-title-error', titleInput, errors.title);
    if (errors.url) showFieldError('bookmark-url-error', urlInput, errors.url);
    if (errors.category) showFieldError('bookmark-category-error', categoryInput, errors.category);
    if (Object.keys(errors).length > 0) return;

    bookmarks.push({
      id: generateId(),
      title: data.title.trim(),
      url: data.url.trim(),
      category: data.category.trim(),
      note: data.note.trim(),
      createdAt: Date.now(),
    });

    persist();
    form.reset();
    render();
  });

  // --- Buka modal ubah ---
  function openEditModal(id) {
    const item = bookmarks.find((bm) => bm.id === id);
    if (!item) return;
    editIdInput.value = item.id;
    editTitleInput.value = item.title;
    editUrlInput.value = item.url;
    editCategoryInput.value = item.category;
    editNoteInput.value = item.note;
    clearFormErrors('bookmark-edit');
    openModal(editModalId);
  }

  editForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = {
      title: editTitleInput.value,
      url: editUrlInput.value,
      category: editCategoryInput.value,
    };

    clearFormErrors('bookmark-edit');
    const errors = validate(data);
    if (errors.title) showFieldError('bookmark-edit-title-error', editTitleInput, errors.title);
    if (errors.url) showFieldError('bookmark-edit-url-error', editUrlInput, errors.url);
    if (errors.category) showFieldError('bookmark-edit-category-error', editCategoryInput, errors.category);
    if (Object.keys(errors).length > 0) return;

    const index = bookmarks.findIndex((bm) => bm.id === editIdInput.value);
    if (index !== -1) {
      bookmarks[index] = {
        ...bookmarks[index],
        title: data.title.trim(),
        url: data.url.trim(),
        category: data.category.trim(),
        note: editNoteInput.value.trim(),
      };
      persist();
      render();
    }
    closeModal(editModalId);
  });

  // --- Hapus bookmark (via modal konfirmasi) ---
  function openDeleteModal(id) {
    deleteTargetId = id;
    openModal(deleteModalId);
  }

  deleteConfirmBtn.addEventListener('click', () => {
    if (deleteTargetId) {
      bookmarks = bookmarks.filter((bm) => bm.id !== deleteTargetId);
      persist();
      render();
    }
    deleteTargetId = null;
    closeModal(deleteModalId);
  });

  // --- Cari & sort ---
  function getVisibleBookmarks() {
    const keyword = searchInput.value.trim().toLowerCase();
    const sortMode = sortSelect.value;

    let result = bookmarks.filter((bm) => {
      if (!keyword) return true;
      return (
        bm.title.toLowerCase().includes(keyword) ||
        bm.url.toLowerCase().includes(keyword) ||
        bm.category.toLowerCase().includes(keyword)
      );
    });

    result = result.sort((a, b) => {
      switch (sortMode) {
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'newest':
        default:
          return b.createdAt - a.createdAt;
      }
    });

    return result;
  }

  function createBookmarkRow(item) {
    const row = document.createElement('div');
    row.className = 'row-card p-3 flex flex-wrap items-center justify-between gap-3';

    row.innerHTML = `
      <div class="min-w-[12rem]">
        <a href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer"
           class="font-semibold text-sm text-brand hover:underline inline-flex items-center gap-1">
          ${escapeHTML(item.title)} <i class="ti ti-external-link text-xs" aria-hidden="true"></i>
        </a>
        <div class="flex flex-wrap items-center gap-2 mt-1">
          <span class="badge badge-cat">${escapeHTML(item.category)}</span>
          <span class="text-xs text-inkmuted truncate max-w-[16rem] inline-block align-middle">${escapeHTML(item.url)}</span>
        </div>
        ${item.note ? `<p class="text-xs text-inkmuted mt-1">${escapeHTML(item.note)}</p>` : ''}
      </div>
      <div class="flex gap-1">
        <button type="button" class="btn-edit p-2 rounded hover:bg-[#EDE9DA]" aria-label="Ubah bookmark">
          <i class="ti ti-pencil" aria-hidden="true"></i>
        </button>
        <button type="button" class="btn-delete p-2 rounded hover:bg-[#EDE9DA]" aria-label="Hapus bookmark">
          <i class="ti ti-trash text-rust" aria-hidden="true"></i>
        </button>
      </div>
    `;

    row.querySelector('.btn-edit').addEventListener('click', () => openEditModal(item.id));
    row.querySelector('.btn-delete').addEventListener('click', () => openDeleteModal(item.id));
    return row;
  }

  function render() {
    const visible = getVisibleBookmarks();

    listContainer.innerHTML = '';
    if (visible.length === 0) {
      emptyState.classList.remove('hidden');
    } else {
      emptyState.classList.add('hidden');
      const fragment = document.createDocumentFragment();
      visible.forEach((item) => fragment.appendChild(createBookmarkRow(item)));
      listContainer.appendChild(fragment);
    }
  }

  function init() {
    [searchInput, sortSelect].forEach((el) => {
      el.addEventListener('input', render);
      el.addEventListener('change', render);
    });
    render();
  }

  return { init };
})();

/* ============================================================================
   5. MODUL QUIZ APP
   ============================================================================ */

const QuizApp = (() => {
  // Soal disimpan sebagai array of object (bukan hardcode HTML per soal)
  const QUESTIONS = [
    {
      question: 'Tag HTML apa yang digunakan untuk membuat tautan (link)?',
      options: ['<link>', '<a>', '<href>', '<nav>'],
      answerIndex: 1,
    },
    {
      question: 'Properti CSS apa yang digunakan untuk mengubah warna teks?',
      options: ['background-color', 'text-align', 'color', 'font-style'],
      answerIndex: 2,
    },
    {
      question: 'Fungsi JavaScript apa yang digunakan untuk mengubah string JSON menjadi objek?',
      options: ['JSON.stringify()', 'JSON.parse()', 'JSON.toObject()', 'Object.parse()'],
      answerIndex: 1,
    },
    {
      question: 'Metode array JavaScript apa yang digunakan untuk menyaring elemen sesuai kondisi tertentu?',
      options: ['map()', 'reduce()', 'filter()', 'sort()'],
      answerIndex: 2,
    },
    {
      question: 'Media penyimpanan browser apa yang datanya tetap ada meski browser ditutup dan dibuka lagi?',
      options: ['sessionStorage', 'cookie session', 'localStorage', 'variabel global'],
      answerIndex: 2,
    },
    {
      question: 'Selector JavaScript mana yang mengembalikan elemen pertama yang cocok dengan sebuah CSS selector?',
      options: ['document.querySelectorAll()', 'document.getElementsByClassName()', 'document.querySelector()', 'document.getAll()'],
      answerIndex: 2,
    },
  ];

  const TOTAL_QUESTIONS = QUESTIONS.length;

  let currentIndex = 0;
  let score = 0;
  let hasAnsweredCurrent = false;

  // --- Referensi DOM ---
  const startScreen = document.getElementById('quiz-start-screen');
  const questionScreen = document.getElementById('quiz-question-screen');
  const resultScreen = document.getElementById('quiz-result-screen');

  const startBtn = document.getElementById('quiz-start-btn');
  const restartBtn = document.getElementById('quiz-restart-btn');
  const nextBtn = document.getElementById('quiz-next-btn');

  const currentNumberEl = document.getElementById('quiz-current-number');
  const totalNumberEl = document.getElementById('quiz-total-number');
  const currentScoreEl = document.getElementById('quiz-current-score');
  const progressBar = document.getElementById('quiz-progress-bar');
  const questionTextEl = document.getElementById('quiz-question-text');
  const optionsContainer = document.getElementById('quiz-options');
  const feedbackEl = document.getElementById('quiz-feedback');

  const finalScoreEl = document.getElementById('quiz-final-score');
  const finalTotalEl = document.getElementById('quiz-final-total');
  const resultMessageEl = document.getElementById('quiz-result-message');

  const highscoreEl = document.getElementById('quiz-highscore');
  const highscoreTotalEl = document.getElementById('quiz-highscore-total');

  function showScreen(screen) {
    [startScreen, questionScreen, resultScreen].forEach((el) => el.classList.add('hidden'));
    screen.classList.remove('hidden');
  }

  function getHighScore() {
    return loadFromStorage(STORAGE_KEYS.QUIZ_HIGHSCORE, 0);
  }

  function updateHighScoreDisplay() {
    highscoreEl.textContent = getHighScore();
    highscoreTotalEl.textContent = TOTAL_QUESTIONS;
  }

  function maybeSaveHighScore(finalScore) {
    const currentHigh = getHighScore();
    if (finalScore > currentHigh) {
      saveToStorage(STORAGE_KEYS.QUIZ_HIGHSCORE, finalScore);
    }
  }

  function startQuiz() {
    currentIndex = 0;
    score = 0;
    hasAnsweredCurrent = false;
    totalNumberEl.textContent = TOTAL_QUESTIONS;
    showScreen(questionScreen);
    renderQuestion();
  }

  function renderQuestion() {
    hasAnsweredCurrent = false;
    const item = QUESTIONS[currentIndex];

    currentNumberEl.textContent = currentIndex + 1;
    currentScoreEl.textContent = score;
    progressBar.style.width = `${(currentIndex / TOTAL_QUESTIONS) * 100}%`;
    questionTextEl.textContent = item.question;
    feedbackEl.textContent = '';
    nextBtn.classList.add('hidden');

    optionsContainer.innerHTML = '';
    item.options.forEach((optionText, optionIndex) => {
      const optionEl = document.createElement('button');
      optionEl.type = 'button';
      optionEl.className = 'quiz-option w-full text-left';
      optionEl.textContent = optionText;
      optionEl.addEventListener('click', () => handleAnswer(optionIndex, optionEl));
      optionsContainer.appendChild(optionEl);
    });
  }

  function handleAnswer(selectedIndex, selectedEl) {
    if (hasAnsweredCurrent) return; // cegah jawab dua kali untuk soal yang sama
    hasAnsweredCurrent = true;

    const item = QUESTIONS[currentIndex];
    const isCorrect = selectedIndex === item.answerIndex;

    // Tandai seluruh opsi: kunci jawaban selalu ditandai hijau, pilihan salah ditandai merah
    Array.from(optionsContainer.children).forEach((optionEl, index) => {
      optionEl.classList.add('is-disabled');
      if (index === item.answerIndex) {
        optionEl.classList.add('is-correct');
      } else if (index === selectedIndex) {
        optionEl.classList.add('is-wrong');
      }
    });

    if (isCorrect) {
      score += 1;
      feedbackEl.textContent = 'Benar!';
      feedbackEl.className = 'text-sm font-semibold mb-4 min-h-[1.25rem] text-leaf';
    } else {
      feedbackEl.textContent = `Kurang tepat. Jawaban yang benar: ${item.options[item.answerIndex]}`;
      feedbackEl.className = 'text-sm font-semibold mb-4 min-h-[1.25rem] text-rust';
    }

    currentScoreEl.textContent = score;
    progressBar.style.width = `${((currentIndex + 1) / TOTAL_QUESTIONS) * 100}%`;

    const isLastQuestion = currentIndex === TOTAL_QUESTIONS - 1;
    nextBtn.textContent = '';
    nextBtn.innerHTML = isLastQuestion
      ? 'Lihat Hasil <i class="ti ti-flag" aria-hidden="true"></i>'
      : 'Soal Berikutnya <i class="ti ti-arrow-right" aria-hidden="true"></i>';
    nextBtn.classList.remove('hidden');
  }

  function goToNext() {
    const isLastQuestion = currentIndex === TOTAL_QUESTIONS - 1;
    if (isLastQuestion) {
      finishQuiz();
    } else {
      currentIndex += 1;
      renderQuestion();
    }
  }

  function finishQuiz() {
    maybeSaveHighScore(score);
    updateHighScoreDisplay();

    finalScoreEl.textContent = score;
    finalTotalEl.textContent = TOTAL_QUESTIONS;

    const ratio = score / TOTAL_QUESTIONS;
    if (ratio === 1) {
      resultMessageEl.textContent = 'Sempurna! Semua jawaban benar.';
    } else if (ratio >= 0.6) {
      resultMessageEl.textContent = 'Bagus! Pemahamanmu sudah cukup solid.';
    } else {
      resultMessageEl.textContent = 'Jangan menyerah, coba lagi untuk hasil lebih baik.';
    }

    showScreen(resultScreen);
  }

  function init() {
    updateHighScoreDisplay();
    startBtn.addEventListener('click', startQuiz);
    restartBtn.addEventListener('click', startQuiz);
    nextBtn.addEventListener('click', goToNext);
    showScreen(startScreen);
  }

  return { init };
})();

/* ============================================================================
   6. BOOTSTRAP APLIKASI
   ============================================================================ */

document.addEventListener('DOMContentLoaded', () => {
  TabNavigation.init();
  ExpenseTracker.init();
  BookmarkManager.init();
  QuizApp.init();
});
