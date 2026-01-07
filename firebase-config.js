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
// ⚠️ 重要: 以下の値を自分のFirebaseプロジェクトの値に置き換えてください
const firebaseConfig = {
    apiKey: "AIzaSyDxxx...",
    authDomain: "lesson-records-app.firebaseapp.com",
    projectId: "lesson-records-app",
    storageBucket: "lesson-records-app.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
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
