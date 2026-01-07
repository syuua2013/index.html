// ================================================
// Firebase設定ファイル
// ================================================
//
// このファイルを使用するには:
// 1. https://console.firebase.google.com/ でFirebaseプロジェクトを作成
// 2. Firebaseプロジェクトの設定から、Webアプリの設定情報を取得
// 3. 以下の設定値を自分のFirebaseプロジェクトの値に置き換える
// 4. Firestoreデータベースを有効化
// 5. Authentication > Sign-in methodで「メール/パスワード」を有効化
//
// ================================================

// Firebase設定オブジェクト
const firebaseConfig = {
  apiKey: "AIzaSyByUrjES-dfpgBoeiFsX5VdWpqo65Sq_ow",
  authDomain: "lesson-records-app-26a00.firebaseapp.com",
  projectId: "lesson-records-app-26a00",
  storageBucket: "lesson-records-app-26a00.firebasestorage.app",
  messagingSenderId: "976747887082",
  appId: "1:976747887082:web:1fe812c9c07709bb745a93",
  measurementId: "G-C8YDKWWVHT"
};

// Firebase機能を有効にするかどうか
// Firebase設定が完了したら、この値をtrueに変更してください
const FIREBASE_ENABLED = true;

// ================================================
// 設定の検証
// ================================================
function isFirebaseConfigured() {
    if (!FIREBASE_ENABLED) {
        return false;
    }

    const hasPlaceholders = Object.values(firebaseConfig).some(value =>
        typeof value === 'string' && value.includes('YOUR_')
    );

    if (hasPlaceholders) {
        console.warn('Firebase設定が未完了です。firebase-config.jsファイルを編集してください。');
        return false;
    }

    return true;
}

// ================================================
// エクスポート
// ================================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { firebaseConfig, FIREBASE_ENABLED, isFirebaseConfigured };
}
