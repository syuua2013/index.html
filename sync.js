// ================================================
// マルチデバイス同期システム
// ================================================

class SyncManager {
    constructor(db, uiController) {
        this.db = db;
        this.uiController = uiController;
        this.firebaseApp = null;
        this.firestore = null;
        this.auth = null;
        this.storage = null;
        this.currentUser = null;
        this.isOnline = navigator.onLine;
        this.syncInProgress = false;
        this.pendingChanges = [];

        this.setupOnlineStatusListener();
    }

    async init() {
        if (!isFirebaseConfigured()) {
            console.log('Firebase未設定 - ローカルモードで動作します');
            return false;
        }

        try {
            // Firebase初期化
            this.firebaseApp = firebase.initializeApp(firebaseConfig);
            this.firestore = firebase.firestore();
            this.auth = firebase.auth();
            this.storage = firebase.storage();

            // 認証状態の監視
            this.auth.onAuthStateChanged(async (user) => {
                this.currentUser = user;
                if (user) {
                    console.log('ログイン中:', user.email);
                    await this.syncFromCloud();
                    this.setupRealtimeSync();
                } else {
                    console.log('ログアウト');
                }
            });

            return true;
        } catch (error) {
            console.error('Firebase初期化エラー:', error);
            return false;
        }
    }

    setupOnlineStatusListener() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('オンラインになりました');
            if (this.currentUser) {
                this.syncPendingChanges();
            }
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('オフラインになりました');
        });
    }

    // ================================================
    // 認証機能
    // ================================================

    async signUp(email, password) {
        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            this.currentUser = userCredential.user;

            // 初回登録時にローカルデータをクラウドにアップロード
            await this.syncToCloud();

            return { success: true, user: this.currentUser };
        } catch (error) {
            console.error('サインアップエラー:', error);
            return { success: false, error: error.message };
        }
    }

    async signIn(email, password) {
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            this.currentUser = userCredential.user;

            // ログイン時にクラウドデータを取得
            await this.syncFromCloud();

            return { success: true, user: this.currentUser };
        } catch (error) {
            console.error('ログインエラー:', error);
            return { success: false, error: error.message };
        }
    }

    async signOut() {
        try {
            await this.auth.signOut();
            this.currentUser = null;
            return { success: true };
        } catch (error) {
            console.error('ログアウトエラー:', error);
            return { success: false, error: error.message };
        }
    }

    // ================================================
    // データ同期機能
    // ================================================

    // Base64データをFirebase Storageにアップロード
    async uploadFileToStorage(base64Data, fileName, lessonId) {
        if (!base64Data || !this.storage || !this.currentUser) {
            return null;
        }

        try {
            // Base64をBlobに変換
            const byteString = atob(base64Data.split(',')[1]);
            const mimeType = base64Data.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], { type: mimeType });

            // Storageにアップロード
            const path = `users/${this.currentUser.uid}/lessons/${lessonId}/${fileName}`;
            const storageRef = this.storage.ref(path);
            await storageRef.put(blob);

            // ダウンロードURLを取得
            const downloadURL = await storageRef.getDownloadURL();
            return downloadURL;
        } catch (error) {
            console.error('ファイルアップロードエラー:', error);
            return null;
        }
    }

    // Firebase StorageからファイルをBase64として取得
    async downloadFileFromStorage(url) {
        if (!url) {
            return null;
        }

        try {
            const response = await fetch(url);
            const blob = await response.blob();

            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('ファイルダウンロードエラー:', error);
            return null;
        }
    }

    async syncToCloud() {
        if (!this.currentUser || !this.isOnline) {
            this.queueChange('sync_all');
            return;
        }

        if (this.syncInProgress) {
            return;
        }

        this.syncInProgress = true;

        try {
            const lessons = await this.db.getAllLessons();
            const userLessonsRef = this.firestore.collection('users').doc(this.currentUser.uid).collection('lessons');

            for (const lesson of lessons) {
                const lessonData = { ...lesson };

                // 大きなファイルをStorageにアップロード
                if (lesson.audioData) {
                    const audioURL = await this.uploadFileToStorage(
                        lesson.audioData,
                        lesson.audioName || 'audio',
                        lesson.id
                    );
                    if (audioURL) {
                        lessonData.audioURL = audioURL;
                        delete lessonData.audioData; // Base64データは削除
                    }
                }

                if (lesson.images && lesson.images.length > 0) {
                    lessonData.imageURLs = [];
                    for (let i = 0; i < lesson.images.length; i++) {
                        const imageURL = await this.uploadFileToStorage(
                            lesson.images[i],
                            `image_${i}`,
                            lesson.id
                        );
                        if (imageURL) {
                            lessonData.imageURLs.push(imageURL);
                        }
                    }
                    delete lessonData.images; // Base64データは削除
                }

                if (lesson.notePdf) {
                    const pdfURL = await this.uploadFileToStorage(
                        lesson.notePdf,
                        lesson.notePdfName || 'notes.pdf',
                        lesson.id
                    );
                    if (pdfURL) {
                        lessonData.notePdfURL = pdfURL;
                        delete lessonData.notePdf; // Base64データは削除
                    }
                }

                // Firestoreに保存（URLのみ）
                const docRef = userLessonsRef.doc(lesson.id.toString());
                await docRef.set({
                    ...lessonData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    deviceId: this.getDeviceId()
                });
            }

            console.log(`${lessons.length}件のレッスンをクラウドに同期しました`);
        } catch (error) {
            console.error('クラウド同期エラー:', error);
        } finally {
            this.syncInProgress = false;
        }
    }

    async syncFromCloud() {
        if (!this.currentUser || !this.isOnline) {
            return;
        }

        try {
            const userLessonsRef = this.firestore
                .collection('users')
                .doc(this.currentUser.uid)
                .collection('lessons');

            const snapshot = await userLessonsRef.get();

            if (snapshot.empty) {
                console.log('クラウドにデータがありません - ローカルデータをアップロードします');
                await this.syncToCloud();
                return;
            }

            // クラウドのデータとローカルデータをマージ
            const cloudLessons = [];

            for (const doc of snapshot.docs) {
                const lessonData = {
                    ...doc.data(),
                    id: parseInt(doc.id)
                };

                // StorageのURLからファイルを復元
                if (lessonData.audioURL && !lessonData.audioData) {
                    lessonData.audioData = await this.downloadFileFromStorage(lessonData.audioURL);
                }

                if (lessonData.imageURLs && lessonData.imageURLs.length > 0 && !lessonData.images) {
                    lessonData.images = [];
                    for (const imageURL of lessonData.imageURLs) {
                        const imageData = await this.downloadFileFromStorage(imageURL);
                        if (imageData) {
                            lessonData.images.push(imageData);
                        }
                    }
                }

                if (lessonData.notePdfURL && !lessonData.notePdf) {
                    lessonData.notePdf = await this.downloadFileFromStorage(lessonData.notePdfURL);
                }

                cloudLessons.push(lessonData);
            }

            const localLessons = await this.db.getAllLessons();
            const localIds = new Set(localLessons.map(l => l.id));

            for (const cloudLesson of cloudLessons) {
                if (localIds.has(cloudLesson.id)) {
                    // 既存のレッスンを更新
                    await this.db.updateLesson(cloudLesson);
                } else {
                    // 新しいレッスンを追加
                    await this.db.addLesson(cloudLesson);
                }
            }

            console.log(`${cloudLessons.length}件のレッスンをクラウドから同期しました`);

            // UIを更新
            if (this.uiController) {
                await this.uiController.loadLessons();
            }
        } catch (error) {
            console.error('クラウドからの同期エラー:', error);
        }
    }

    setupRealtimeSync() {
        if (!this.currentUser) return;

        const userLessonsRef = this.firestore
            .collection('users')
            .doc(this.currentUser.uid)
            .collection('lessons');

        // リアルタイムリスナーを設定
        userLessonsRef.onSnapshot(async (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                const lesson = {
                    ...change.doc.data(),
                    id: parseInt(change.doc.id)
                };

                // 自分のデバイスからの変更は無視
                if (lesson.deviceId === this.getDeviceId()) {
                    return;
                }

                if (change.type === 'added' || change.type === 'modified') {
                    const existingLesson = await this.db.getLesson(lesson.id);
                    if (existingLesson) {
                        await this.db.updateLesson(lesson);
                    } else {
                        await this.db.addLesson(lesson);
                    }

                    // UIを更新
                    if (this.uiController) {
                        await this.uiController.loadLessons();
                    }
                }

                if (change.type === 'removed') {
                    await this.db.deleteLesson(lesson.id);

                    // UIを更新
                    if (this.uiController) {
                        await this.uiController.loadLessons();
                    }
                }
            });
        });
    }

    async addLesson(lesson) {
        if (!this.currentUser || !this.isOnline) {
            this.queueChange({ type: 'add', lesson });
            return;
        }

        try {
            const lessonData = { ...lesson };

            // 大きなファイルをStorageにアップロード
            if (lesson.audioData) {
                const audioURL = await this.uploadFileToStorage(
                    lesson.audioData,
                    lesson.audioName || 'audio',
                    lesson.id
                );
                if (audioURL) {
                    lessonData.audioURL = audioURL;
                    delete lessonData.audioData;
                }
            }

            if (lesson.images && lesson.images.length > 0) {
                lessonData.imageURLs = [];
                for (let i = 0; i < lesson.images.length; i++) {
                    const imageURL = await this.uploadFileToStorage(
                        lesson.images[i],
                        `image_${i}`,
                        lesson.id
                    );
                    if (imageURL) {
                        lessonData.imageURLs.push(imageURL);
                    }
                }
                delete lessonData.images;
            }

            if (lesson.notePdf) {
                const pdfURL = await this.uploadFileToStorage(
                    lesson.notePdf,
                    lesson.notePdfName || 'notes.pdf',
                    lesson.id
                );
                if (pdfURL) {
                    lessonData.notePdfURL = pdfURL;
                    delete lessonData.notePdf;
                }
            }

            const userLessonsRef = this.firestore
                .collection('users')
                .doc(this.currentUser.uid)
                .collection('lessons');

            await userLessonsRef.doc(lesson.id.toString()).set({
                ...lessonData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                deviceId: this.getDeviceId()
            });
        } catch (error) {
            console.error('レッスン追加エラー:', error);
            this.queueChange({ type: 'add', lesson });
        }
    }

    async updateLesson(lesson) {
        if (!this.currentUser || !this.isOnline) {
            this.queueChange({ type: 'update', lesson });
            return;
        }

        try {
            const lessonData = { ...lesson };

            // 大きなファイルをStorageにアップロード
            if (lesson.audioData) {
                const audioURL = await this.uploadFileToStorage(
                    lesson.audioData,
                    lesson.audioName || 'audio',
                    lesson.id
                );
                if (audioURL) {
                    lessonData.audioURL = audioURL;
                    delete lessonData.audioData;
                }
            }

            if (lesson.images && lesson.images.length > 0) {
                lessonData.imageURLs = [];
                for (let i = 0; i < lesson.images.length; i++) {
                    const imageURL = await this.uploadFileToStorage(
                        lesson.images[i],
                        `image_${i}`,
                        lesson.id
                    );
                    if (imageURL) {
                        lessonData.imageURLs.push(imageURL);
                    }
                }
                delete lessonData.images;
            }

            if (lesson.notePdf) {
                const pdfURL = await this.uploadFileToStorage(
                    lesson.notePdf,
                    lesson.notePdfName || 'notes.pdf',
                    lesson.id
                );
                if (pdfURL) {
                    lessonData.notePdfURL = pdfURL;
                    delete lessonData.notePdf;
                }
            }

            const userLessonsRef = this.firestore
                .collection('users')
                .doc(this.currentUser.uid)
                .collection('lessons');

            await userLessonsRef.doc(lesson.id.toString()).update({
                ...lessonData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                deviceId: this.getDeviceId()
            });
        } catch (error) {
            console.error('レッスン更新エラー:', error);
            this.queueChange({ type: 'update', lesson });
        }
    }

    async deleteLesson(lessonId) {
        if (!this.currentUser || !this.isOnline) {
            this.queueChange({ type: 'delete', lessonId });
            return;
        }

        try {
            const userLessonsRef = this.firestore
                .collection('users')
                .doc(this.currentUser.uid)
                .collection('lessons');

            await userLessonsRef.doc(lessonId.toString()).delete();
        } catch (error) {
            console.error('レッスン削除エラー:', error);
            this.queueChange({ type: 'delete', lessonId });
        }
    }

    // ================================================
    // オフライン対応
    // ================================================

    queueChange(change) {
        this.pendingChanges.push(change);
        localStorage.setItem('pendingChanges', JSON.stringify(this.pendingChanges));
    }

    async syncPendingChanges() {
        if (!this.currentUser || !this.isOnline || this.pendingChanges.length === 0) {
            return;
        }

        console.log(`${this.pendingChanges.length}件の保留中の変更を同期しています...`);

        for (const change of this.pendingChanges) {
            try {
                if (change === 'sync_all') {
                    await this.syncToCloud();
                } else if (change.type === 'add' || change.type === 'update') {
                    await this.addLesson(change.lesson);
                } else if (change.type === 'delete') {
                    await this.deleteLesson(change.lessonId);
                }
            } catch (error) {
                console.error('保留中の変更の同期エラー:', error);
            }
        }

        this.pendingChanges = [];
        localStorage.removeItem('pendingChanges');
        console.log('保留中の変更の同期が完了しました');
    }

    loadPendingChanges() {
        const stored = localStorage.getItem('pendingChanges');
        if (stored) {
            this.pendingChanges = JSON.parse(stored);
        }
    }

    // ================================================
    // ユーティリティ
    // ================================================

    getDeviceId() {
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('deviceId', deviceId);
        }
        return deviceId;
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

// グローバルに公開
if (typeof window !== 'undefined') {
    window.SyncManager = SyncManager;
}
