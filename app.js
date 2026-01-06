// ================================================
// IndexedDB データベース管理
// ================================================
class LessonDB {
    constructor() {
        this.dbName = 'LessonRecordsDB';
        this.version = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains('lessons')) {
                    const objectStore = db.createObjectStore('lessons', {
                        keyPath: 'id',
                        autoIncrement: true
                    });

                    objectStore.createIndex('date', 'date', { unique: false });
                    objectStore.createIndex('teacher', 'teacher', { unique: false });
                    objectStore.createIndex('summary', 'summary', { unique: false });
                }
            };
        });
    }

    async addLesson(lesson) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['lessons'], 'readwrite');
            const objectStore = transaction.objectStore('lessons');
            const request = objectStore.add(lesson);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateLesson(lesson) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['lessons'], 'readwrite');
            const objectStore = transaction.objectStore('lessons');
            const request = objectStore.put(lesson);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteLesson(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['lessons'], 'readwrite');
            const objectStore = transaction.objectStore('lessons');
            const request = objectStore.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getLesson(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['lessons'], 'readonly');
            const objectStore = transaction.objectStore('lessons');
            const request = objectStore.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllLessons() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['lessons'], 'readonly');
            const objectStore = transaction.objectStore('lessons');
            const request = objectStore.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

// ================================================
// アプリケーション状態管理
// ================================================
class AppState {
    constructor() {
        this.currentView = 'list';
        this.currentLessonId = null;
        this.lessons = [];
        this.filteredLessons = [];
        this.searchQuery = '';
        this.filterTeacher = '';
        this.sortBy = 'date-desc';
        this.audioFiles = {};
        this.notesImages = {};
        this.diagramImages = {};
        this.currentImageGallery = [];
        this.currentImageIndex = 0;
    }

    setView(view) {
        this.currentView = view;
    }

    setCurrentLesson(id) {
        this.currentLessonId = id;
    }

    setLessons(lessons) {
        this.lessons = lessons;
        this.applyFilters();
    }

    applyFilters() {
        let filtered = [...this.lessons];

        // 検索フィルター
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(lesson =>
                lesson.teacher.toLowerCase().includes(query) ||
                lesson.summary.toLowerCase().includes(query)
            );
        }

        // 先生フィルター
        if (this.filterTeacher) {
            filtered = filtered.filter(lesson => lesson.teacher === this.filterTeacher);
        }

        // ソート
        filtered.sort((a, b) => {
            switch (this.sortBy) {
                case 'date-desc':
                    return new Date(b.date) - new Date(a.date);
                case 'date-asc':
                    return new Date(a.date) - new Date(b.date);
                case 'teacher-asc':
                    return a.teacher.localeCompare(b.teacher, 'ja');
                default:
                    return 0;
            }
        });

        this.filteredLessons = filtered;
    }
}

// ================================================
// UI コントローラー
// ================================================
class UIController {
    constructor(state, db) {
        this.state = state;
        this.db = db;
        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        // ビュー要素
        this.listView = document.getElementById('listView');
        this.detailView = document.getElementById('detailView');
        this.formView = document.getElementById('formView');

        // ナビゲーション
        this.showAllBtn = document.getElementById('showAllBtn');
        this.addNewBtn = document.getElementById('addNewBtn');
        this.exportBtn = document.getElementById('exportBtn');
        this.importBtn = document.getElementById('importBtn');

        // 検索・フィルター
        this.searchInput = document.getElementById('searchInput');
        this.filterTeacher = document.getElementById('filterTeacher');
        this.sortBy = document.getElementById('sortBy');

        // リスト
        this.lessonList = document.getElementById('lessonList');
        this.emptyState = document.getElementById('emptyState');

        // 詳細
        this.lessonDetail = document.getElementById('lessonDetail');
        this.backToListBtn = document.getElementById('backToListBtn');
        this.editLessonBtn = document.getElementById('editLessonBtn');
        this.deleteLessonBtn = document.getElementById('deleteLessonBtn');

        // フォーム
        this.lessonForm = document.getElementById('lessonForm');
        this.formTitle = document.getElementById('formTitle');
        this.cancelFormBtn = document.getElementById('cancelFormBtn');
        this.cancelFormBtn2 = document.getElementById('cancelFormBtn2');
        this.audioFile = document.getElementById('audioFile');
        this.notesImage = document.getElementById('notesImage');
        this.diagramImage = document.getElementById('diagramImage');

        // モーダル
        this.imageModal = document.getElementById('imageModal');
        this.modalImage = document.getElementById('modalImage');
        this.modalImageInfo = document.getElementById('modalImageInfo');
        this.deleteModal = document.getElementById('deleteModal');
        this.confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        this.cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

        // インポート
        this.importFileInput = document.getElementById('importFileInput');

        // トースト
        this.toastContainer = document.getElementById('toastContainer');
    }

    attachEventListeners() {
        // ナビゲーション
        this.showAllBtn.addEventListener('click', () => this.showListView());
        this.addNewBtn.addEventListener('click', () => this.showFormView());
        this.exportBtn.addEventListener('click', () => this.exportData());
        this.importBtn.addEventListener('click', () => this.importFileInput.click());

        // 検索・フィルター
        this.searchInput.addEventListener('input', (e) => {
            this.state.searchQuery = e.target.value;
            this.state.applyFilters();
            this.renderLessonList();
        });

        this.filterTeacher.addEventListener('change', (e) => {
            this.state.filterTeacher = e.target.value;
            this.state.applyFilters();
            this.renderLessonList();
        });

        this.sortBy.addEventListener('change', (e) => {
            this.state.sortBy = e.target.value;
            this.state.applyFilters();
            this.renderLessonList();
        });

        // 詳細
        this.backToListBtn.addEventListener('click', () => this.showListView());
        this.editLessonBtn.addEventListener('click', () => this.editCurrentLesson());
        this.deleteLessonBtn.addEventListener('click', () => this.showDeleteModal());

        // フォーム
        this.lessonForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        this.cancelFormBtn.addEventListener('click', () => this.showListView());
        this.cancelFormBtn2.addEventListener('click', () => this.showListView());

        // ファイルアップロード
        this.setupFileUpload(this.audioFile, 'audioPreview', 'audio');
        this.setupFileUpload(this.notesImage, 'notesPreview', 'images');
        this.setupFileUpload(this.diagramImage, 'diagramPreview', 'images');

        // モーダル
        this.imageModal.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeImageModal());
        });

        this.imageModal.querySelector('.modal-prev').addEventListener('click', () => {
            this.showPreviousImage();
        });

        this.imageModal.querySelector('.modal-next').addEventListener('click', () => {
            this.showNextImage();
        });

        this.deleteModal.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeDeleteModal());
        });

        this.cancelDeleteBtn.addEventListener('click', () => this.closeDeleteModal());
        this.confirmDeleteBtn.addEventListener('click', () => this.deleteCurrentLesson());

        // インポート
        this.importFileInput.addEventListener('change', (e) => this.handleImport(e));

        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeImageModal();
                this.closeDeleteModal();
            }
            if (this.imageModal.classList.contains('active')) {
                if (e.key === 'ArrowLeft') this.showPreviousImage();
                if (e.key === 'ArrowRight') this.showNextImage();
            }
        });

        // モーダル背景クリックで閉じる
        [this.imageModal, this.deleteModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }

    setupFileUpload(input, previewId, type) {
        const preview = document.getElementById(previewId);
        const uploadArea = input.closest('.file-upload-area');

        // クリックでファイル選択
        uploadArea.querySelector('.file-upload-label').addEventListener('click', () => {
            input.click();
        });

        // ドラッグ&ドロップ
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--color-primary)';
            uploadArea.style.background = 'rgba(99, 102, 241, 0.05)';
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = '';
            uploadArea.style.background = '';
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '';
            uploadArea.style.background = '';

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                input.files = files;
                this.handleFilePreview(input, preview, type);
            }
        });

        // ファイル変更時のプレビュー
        input.addEventListener('change', () => {
            this.handleFilePreview(input, preview, type);
        });
    }

    async handleFilePreview(input, preview, type) {
        const files = Array.from(input.files);
        if (files.length === 0) {
            preview.style.display = 'none';
            return;
        }

        preview.innerHTML = '';
        preview.style.display = type === 'audio' ? 'block' : 'grid';

        if (type === 'audio') {
            const file = files[0];
            const fileData = await this.fileToBase64(file);

            preview.innerHTML = `
                <div class="audio-preview-item">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 18V5l12-2v13"></path>
                        <circle cx="6" cy="18" r="3"></circle>
                        <circle cx="18" cy="16" r="3"></circle>
                    </svg>
                    <div class="audio-preview-info">
                        <div class="audio-preview-name">${file.name}</div>
                        <div class="audio-preview-size">${this.formatFileSize(file.size)}</div>
                    </div>
                    <button type="button" class="preview-remove" onclick="uiController.removeFile('${input.id}', '${preview.id}', 'audio')">&times;</button>
                </div>
            `;
        } else {
            for (const file of files) {
                const fileData = await this.fileToBase64(file);
                const item = document.createElement('div');
                item.className = 'preview-item';
                item.innerHTML = `
                    <img src="${fileData}" alt="${file.name}">
                    <div class="preview-item-name">${file.name}</div>
                    <button type="button" class="preview-remove" onclick="uiController.removeFileFromList('${input.id}', '${preview.id}', '${file.name}')">&times;</button>
                `;
                preview.appendChild(item);
            }
        }
    }

    removeFile(inputId, previewId, type) {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        input.value = '';
        preview.innerHTML = '';
        preview.style.display = 'none';
    }

    removeFileFromList(inputId, previewId, fileName) {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        const dt = new DataTransfer();

        Array.from(input.files).forEach(file => {
            if (file.name !== fileName) {
                dt.items.add(file);
            }
        });

        input.files = dt.files;
        this.handleFilePreview(input, preview, 'images');
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short'
        });
    }

    async showListView() {
        this.state.setView('list');
        await this.loadLessons();
        this.switchView('listView');
        this.updateNavButtons();
    }

    showDetailView(id) {
        this.state.setView('detail');
        this.state.setCurrentLesson(id);
        this.renderLessonDetail();
        this.switchView('detailView');
        this.updateNavButtons();
    }

    showFormView(lessonId = null) {
        this.state.setView('form');
        this.state.setCurrentLesson(lessonId);

        if (lessonId) {
            this.formTitle.textContent = 'レッスン記録を編集';
            this.loadLessonToForm(lessonId);
        } else {
            this.formTitle.textContent = '新規レッスン記録';
            this.lessonForm.reset();
            this.clearFilePreviews();
            document.getElementById('lessonDate').valueAsDate = new Date();
        }

        this.switchView('formView');
        this.updateNavButtons();
    }

    switchView(viewId) {
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById(viewId).classList.add('active');
    }

    updateNavButtons() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        if (this.state.currentView === 'list') {
            this.showAllBtn.classList.add('active');
        }
    }

    async loadLessons() {
        try {
            const lessons = await this.db.getAllLessons();
            this.state.setLessons(lessons);
            this.renderLessonList();
            this.updateTeacherFilter();
        } catch (error) {
            console.error('レッスンの読み込みエラー:', error);
            this.showToast('レッスンの読み込みに失敗しました', 'error');
        }
    }

    renderLessonList() {
        if (this.state.filteredLessons.length === 0) {
            this.lessonList.style.display = 'none';
            this.emptyState.style.display = 'block';
            return;
        }

        this.lessonList.style.display = 'grid';
        this.emptyState.style.display = 'none';
        this.lessonList.innerHTML = '';

        this.state.filteredLessons.forEach(lesson => {
            const card = this.createLessonCard(lesson);
            this.lessonList.appendChild(card);
        });
    }

    createLessonCard(lesson) {
        const card = document.createElement('div');
        card.className = 'lesson-card';
        card.onclick = () => this.showDetailView(lesson.id);

        const badges = [];
        if (lesson.audioData) {
            badges.push(`
                <div class="lesson-card-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 18V5l12-2v13"></path>
                        <circle cx="6" cy="18" r="3"></circle>
                        <circle cx="18" cy="16" r="3"></circle>
                    </svg>
                    音声
                </div>
            `);
        }
        if (lesson.notesImages && lesson.notesImages.length > 0) {
            badges.push(`
                <div class="lesson-card-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    ノート ${lesson.notesImages.length}
                </div>
            `);
        }
        if (lesson.diagramImages && lesson.diagramImages.length > 0) {
            badges.push(`
                <div class="lesson-card-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="20" x2="18" y2="10"></line>
                        <line x1="12" y1="20" x2="12" y2="4"></line>
                        <line x1="6" y1="20" x2="6" y2="14"></line>
                    </svg>
                    図解 ${lesson.diagramImages.length}
                </div>
            `);
        }

        card.innerHTML = `
            <div class="lesson-card-header">
                <div class="lesson-card-date">${this.formatDate(lesson.date)}</div>
            </div>
            <div class="lesson-card-teacher">${this.escapeHtml(lesson.teacher)}</div>
            <div class="lesson-card-summary">${this.escapeHtml(lesson.summary)}</div>
            <div class="lesson-card-meta">
                ${badges.join('')}
            </div>
        `;

        return card;
    }

    async renderLessonDetail() {
        try {
            const lesson = await this.db.getLesson(this.state.currentLessonId);
            if (!lesson) {
                this.showToast('レッスンが見つかりません', 'error');
                this.showListView();
                return;
            }

            let html = `
                <div class="detail-info-grid">
                    <div class="detail-info-item">
                        <div class="detail-info-label">レッスン日</div>
                        <div class="detail-info-value">${this.formatDate(lesson.date)}</div>
                    </div>
                    <div class="detail-info-item">
                        <div class="detail-info-label">先生</div>
                        <div class="detail-info-value">${this.escapeHtml(lesson.teacher)}</div>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        要約
                    </h3>
                    <div class="detail-summary">${this.escapeHtml(lesson.summary)}</div>
                </div>
            `;

            if (lesson.audioData) {
                html += `
                    <div class="detail-section">
                        <h3>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 18V5l12-2v13"></path>
                                <circle cx="6" cy="18" r="3"></circle>
                                <circle cx="18" cy="16" r="3"></circle>
                            </svg>
                            音声記録
                        </h3>
                        <div class="audio-player">
                            <audio controls>
                                <source src="${lesson.audioData}" type="${lesson.audioType || 'audio/mpeg'}">
                                お使いのブラウザは音声再生に対応していません。
                            </audio>
                        </div>
                    </div>
                `;
            }

            if (lesson.notesImages && lesson.notesImages.length > 0) {
                html += `
                    <div class="detail-section">
                        <h3>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                            レッスンノート
                        </h3>
                        <div class="image-gallery">
                            ${lesson.notesImages.map((img, index) => `
                                <div class="gallery-item" onclick="uiController.openImageModal(${this.state.currentLessonId}, 'notes', ${index})">
                                    <img src="${img.data}" alt="レッスンノート ${index + 1}">
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            if (lesson.diagramImages && lesson.diagramImages.length > 0) {
                html += `
                    <div class="detail-section">
                        <h3>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="20" x2="18" y2="10"></line>
                                <line x1="12" y1="20" x2="12" y2="4"></line>
                                <line x1="6" y1="20" x2="6" y2="14"></line>
                            </svg>
                            図解
                        </h3>
                        <div class="image-gallery">
                            ${lesson.diagramImages.map((img, index) => `
                                <div class="gallery-item" onclick="uiController.openImageModal(${this.state.currentLessonId}, 'diagram', ${index})">
                                    <img src="${img.data}" alt="図解 ${index + 1}">
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            this.lessonDetail.innerHTML = html;
        } catch (error) {
            console.error('詳細表示エラー:', error);
            this.showToast('詳細の読み込みに失敗しました', 'error');
        }
    }

    async openImageModal(lessonId, type, index) {
        try {
            const lesson = await this.db.getLesson(lessonId);
            this.state.currentImageGallery = type === 'notes' ? lesson.notesImages : lesson.diagramImages;
            this.state.currentImageIndex = index;
            this.showImageInModal();
            this.imageModal.classList.add('active');
        } catch (error) {
            console.error('画像モーダルエラー:', error);
        }
    }

    showImageInModal() {
        const image = this.state.currentImageGallery[this.state.currentImageIndex];
        this.modalImage.src = image.data;
        this.modalImageInfo.textContent = `${this.state.currentImageIndex + 1} / ${this.state.currentImageGallery.length}`;
    }

    showPreviousImage() {
        if (this.state.currentImageIndex > 0) {
            this.state.currentImageIndex--;
            this.showImageInModal();
        }
    }

    showNextImage() {
        if (this.state.currentImageIndex < this.state.currentImageGallery.length - 1) {
            this.state.currentImageIndex++;
            this.showImageInModal();
        }
    }

    closeImageModal() {
        this.imageModal.classList.remove('active');
    }

    async loadLessonToForm(lessonId) {
        try {
            const lesson = await this.db.getLesson(lessonId);
            if (!lesson) return;

            document.getElementById('lessonId').value = lesson.id;
            document.getElementById('lessonDate').value = lesson.date;
            document.getElementById('teacherName').value = lesson.teacher;
            document.getElementById('summaryText').value = lesson.summary;

            this.clearFilePreviews();

            // 音声プレビュー
            if (lesson.audioData) {
                const audioPreview = document.getElementById('audioPreview');
                audioPreview.style.display = 'block';
                audioPreview.innerHTML = `
                    <div class="audio-preview-item">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 18V5l12-2v13"></path>
                            <circle cx="6" cy="18" r="3"></circle>
                            <circle cx="18" cy="16" r="3"></circle>
                        </svg>
                        <div class="audio-preview-info">
                            <div class="audio-preview-name">${lesson.audioName || '音声ファイル'}</div>
                        </div>
                    </div>
                `;
            }

            // ノート画像プレビュー
            if (lesson.notesImages && lesson.notesImages.length > 0) {
                const notesPreview = document.getElementById('notesPreview');
                notesPreview.style.display = 'grid';
                notesPreview.innerHTML = lesson.notesImages.map(img => `
                    <div class="preview-item">
                        <img src="${img.data}" alt="${img.name}">
                        <div class="preview-item-name">${img.name}</div>
                    </div>
                `).join('');
            }

            // 図解画像プレビュー
            if (lesson.diagramImages && lesson.diagramImages.length > 0) {
                const diagramPreview = document.getElementById('diagramPreview');
                diagramPreview.style.display = 'grid';
                diagramPreview.innerHTML = lesson.diagramImages.map(img => `
                    <div class="preview-item">
                        <img src="${img.data}" alt="${img.name}">
                        <div class="preview-item-name">${img.name}</div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('フォーム読み込みエラー:', error);
            this.showToast('レッスンの読み込みに失敗しました', 'error');
        }
    }

    clearFilePreviews() {
        ['audioPreview', 'notesPreview', 'diagramPreview'].forEach(id => {
            const preview = document.getElementById(id);
            preview.innerHTML = '';
            preview.style.display = 'none';
        });
    }

    async handleFormSubmit(e) {
        e.preventDefault();

        try {
            const formData = new FormData(this.lessonForm);
            const lessonId = formData.get('id');

            const lesson = {
                date: formData.get('date'),
                teacher: formData.get('teacher'),
                summary: formData.get('summary'),
            };

            // 音声ファイル処理
            const audioFile = this.audioFile.files[0];
            if (audioFile) {
                lesson.audioData = await this.fileToBase64(audioFile);
                lesson.audioType = audioFile.type;
                lesson.audioName = audioFile.name;
            } else if (lessonId) {
                const existingLesson = await this.db.getLesson(parseInt(lessonId));
                if (existingLesson) {
                    lesson.audioData = existingLesson.audioData;
                    lesson.audioType = existingLesson.audioType;
                    lesson.audioName = existingLesson.audioName;
                }
            }

            // レッスンノート画像処理
            const notesFiles = Array.from(this.notesImage.files);
            if (notesFiles.length > 0) {
                lesson.notesImages = await Promise.all(
                    notesFiles.map(async file => ({
                        data: await this.fileToBase64(file),
                        name: file.name,
                        type: file.type
                    }))
                );
            } else if (lessonId) {
                const existingLesson = await this.db.getLesson(parseInt(lessonId));
                if (existingLesson) {
                    lesson.notesImages = existingLesson.notesImages || [];
                }
            }

            // 図解画像処理
            const diagramFiles = Array.from(this.diagramImage.files);
            if (diagramFiles.length > 0) {
                lesson.diagramImages = await Promise.all(
                    diagramFiles.map(async file => ({
                        data: await this.fileToBase64(file),
                        name: file.name,
                        type: file.type
                    }))
                );
            } else if (lessonId) {
                const existingLesson = await this.db.getLesson(parseInt(lessonId));
                if (existingLesson) {
                    lesson.diagramImages = existingLesson.diagramImages || [];
                }
            }

            // 保存
            if (lessonId) {
                lesson.id = parseInt(lessonId);
                await this.db.updateLesson(lesson);
                this.showToast('レッスン記録を更新しました', 'success');
            } else {
                await this.db.addLesson(lesson);
                this.showToast('レッスン記録を追加しました', 'success');
            }

            this.showListView();
        } catch (error) {
            console.error('保存エラー:', error);
            this.showToast('保存に失敗しました', 'error');
        }
    }

    async editCurrentLesson() {
        this.showFormView(this.state.currentLessonId);
    }

    showDeleteModal() {
        this.deleteModal.classList.add('active');
    }

    closeDeleteModal() {
        this.deleteModal.classList.remove('active');
    }

    async deleteCurrentLesson() {
        try {
            await this.db.deleteLesson(this.state.currentLessonId);
            this.closeDeleteModal();
            this.showToast('レッスン記録を削除しました', 'success');
            this.showListView();
        } catch (error) {
            console.error('削除エラー:', error);
            this.showToast('削除に失敗しました', 'error');
        }
    }

    updateTeacherFilter() {
        const teachers = [...new Set(this.state.lessons.map(l => l.teacher))].sort((a, b) =>
            a.localeCompare(b, 'ja')
        );

        this.filterTeacher.innerHTML = '<option value="">すべて</option>';
        teachers.forEach(teacher => {
            const option = document.createElement('option');
            option.value = teacher;
            option.textContent = teacher;
            this.filterTeacher.appendChild(option);
        });
    }

    async exportData() {
        try {
            const lessons = await this.db.getAllLessons();
            const dataStr = JSON.stringify(lessons, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `lesson-records-${new Date().toISOString().split('T')[0]}.json`;
            link.click();

            URL.revokeObjectURL(url);
            this.showToast('データをエクスポートしました', 'success');
        } catch (error) {
            console.error('エクスポートエラー:', error);
            this.showToast('エクスポートに失敗しました', 'error');
        }
    }

    async handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const lessons = JSON.parse(text);

            if (!Array.isArray(lessons)) {
                throw new Error('無効なデータ形式です');
            }

            for (const lesson of lessons) {
                delete lesson.id;
                await this.db.addLesson(lesson);
            }

            this.showToast(`${lessons.length}件のレッスン記録をインポートしました`, 'success');
            this.showListView();
        } catch (error) {
            console.error('インポートエラー:', error);
            this.showToast('インポートに失敗しました', 'error');
        } finally {
            this.importFileInput.value = '';
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-message">${this.escapeHtml(message)}</div>
            <button class="toast-close">&times;</button>
        `;

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            toast.remove();
        });

        this.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ================================================
// アプリケーション初期化
// ================================================
let db, state, uiController;

async function initApp() {
    try {
        db = new LessonDB();
        await db.init();

        state = new AppState();
        uiController = new UIController(state, db);

        await uiController.showListView();

        console.log('レッスン記録管理システムを起動しました');
    } catch (error) {
        console.error('アプリケーション初期化エラー:', error);
        alert('アプリケーションの起動に失敗しました。ブラウザを更新してください。');
    }
}

// アプリケーション起動
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
