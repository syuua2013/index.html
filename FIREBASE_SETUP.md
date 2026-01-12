# 🔥 Firebase設定ガイド（ログイン機能を有効にする）

現在、アプリは**オフラインモード**で動作しています。ログイン機能とマルチデバイス同期を有効にするには、Firebaseの設定が必要です。

---

## ステップ1: Firebaseプロジェクトを作成

1. **Firebase Console**にアクセス
   - URL: https://console.firebase.google.com/
   - Googleアカウントでログイン

2. **「プロジェクトを追加」** をクリック

3. プロジェクト名を入力（例: `lesson-records-app`）

4. Google アナリティクスは **「今は設定しない」** を選択（不要）

5. **「プロジェクトを作成」** をクリック

6. ✅ プロジェクトが作成されるまで待つ（数秒）

---

## ステップ2: Firestore データベースを有効化

1. 左サイドバーの **「ビルド」** セクションから **「Firestore Database」** をクリック

2. **「データベースの作成」** をクリック

3. **セキュリティルール**の選択:
   - **「本番環境モードで開始」** を選択
   - 「次へ」をクリック

4. **ロケーション**を選択:
   - `asia-northeast1 (東京)` を推奨
   - 「有効にする」をクリック

5. ✅ データベースが作成されるまで待つ（1-2分）

6. **セキュリティルールを設定**:
   - 上部タブの **「ルール」** をクリック
   - 以下のルールをコピー&ペースト:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザー認証済みの場合のみ、自分のデータにアクセス可能
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

   - **「公開」** をクリック

---

## ステップ3: Authentication（認証）を有効化

1. 左サイドバーの **「ビルド」** セクションから **「Authentication」** をクリック

2. **「始める」** をクリック

3. **ログイン方法を追加**:
   - **「メール/パスワード」** をクリック
   - **「メール/パスワード」** を **有効** に切り替える
   - **「保存」** をクリック

4. ✅ 認証が有効になりました！

---

## ステップ4: Webアプリの設定情報を取得

### 方法A: プロジェクト概要から取得（推奨）

1. 左サイドバーの一番上の **⚙️ プロジェクトの概要** の隣の **歯車アイコン** をクリック

2. **「プロジェクトの設定」** を選択

3. 下にスクロールして **「マイアプリ」** セクションを確認
   - アプリがまだない場合は次に進む

4. **「</> Web」** アイコン（HTMLタグのアイコン）をクリック

5. **アプリのニックネーム** を入力（例: `レッスン記録アプリ`）
   - 「このアプリのFirebase Hostingも設定します」は **チェックしない**

6. **「アプリを登録」** をクリック

7. **「Firebase SDKの追加」** 画面が表示される
   - 「**設定**」を選択（「npm」ではなく）
   - 以下のような設定情報が表示されます:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDxxx...",
  authDomain: "lesson-records-app.firebaseapp.com",
  projectId: "lesson-records-app",
  storageBucket: "lesson-records-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

8. ✅ この設定情報をコピーしておく（次のステップで使用）

### 方法B: 既にアプリがある場合

1. **プロジェクトの設定** > **全般** タブを開く

2. 下にスクロールして **「マイアプリ」** セクションを見る

3. 既存のWebアプリの **「設定」** または **「構成」** をクリック

4. `firebaseConfig` の値をコピー

---

## ステップ5: firebase-config.js を更新

1. プロジェクトフォルダの **`firebase-config.js`** ファイルを開く

2. 以下の部分を **ステップ4でコピーした値** に置き換える:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",          // ← 実際の値に置き換え
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",  // ← 実際の値に置き換え
    projectId: "YOUR_PROJECT_ID",         // ← 実際の値に置き換え
    storageBucket: "YOUR_PROJECT_ID.appspot.com",   // ← 実際の値に置き換え
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",  // ← 実際の値に置き換え
    appId: "YOUR_APP_ID"                  // ← 実際の値に置き換え
};
```

**例**（あなたのステップ4でコピーした値を使用）:
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyDxxx...",
    authDomain: "lesson-records-app.firebaseapp.com",
    projectId: "lesson-records-app",
    storageBucket: "lesson-records-app.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
};
```

3. **FIREBASE_ENABLED を true に変更**:

```javascript
const FIREBASE_ENABLED = true;  // ← false から true に変更
```

4. ファイルを **保存**

---

## ステップ6: GitHub に変更をアップロード

設定ファイルを更新したので、GitHubにプッシュします:

```bash
git add firebase-config.js
git commit -m "Firebase設定を追加"
git push
```

---

## ステップ7: アプリでログインを試す

1. **ブラウザでアプリを開く**
   - GitHub Pages URL: `https://syuua2013.github.io/index.html/`
   - または、ローカルで開いている場合は **ページをリロード**（F5 または Cmd+R）

2. **キャッシュをクリア**（重要！）:
   - **Chrome/Edge**: `Ctrl+Shift+Delete` (Windows) または `Cmd+Shift+Delete` (Mac)
     - 「キャッシュされた画像とファイル」を選択
     - 「データを削除」をクリック
   - **Safari**: `Cmd+Option+E`

3. **ページをリロード** (F5)

4. **「ログイン」をクリック**

5. **「アカウントを作成」をクリック**

6. **メールアドレスとパスワード**を入力
   - 例: `test@example.com` / `password123`
   - ⚠️ このメールアドレスは実在しなくても大丈夫です

7. **「作成」をクリック**

8. ✅ ログイン成功！ヘッダー右上にメールアドレスが表示されます

---

## ステップ8: 他のデバイスでログイン

### PC / Mac

1. ブラウザで `https://syuua2013.github.io/index.html/` を開く

2. **「ログイン」** をクリック

3. **ステップ7で作成したメールアドレスとパスワード** を入力

4. ✅ ログイン成功！データが同期されます

### iPhone / iPad

1. **Safari** で `https://syuua2013.github.io/index.html/` を開く

2. 「ログイン」をタップ

3. 同じメールアドレスとパスワードでログイン

4. **ホーム画面に追加**:
   - 画面下部の **共有ボタン** (□に↑) をタップ
   - **「ホーム画面に追加」** を選択
   - 「追加」をタップ

5. ✅ ホーム画面からアプリを開けるようになります！

### Android

1. **Chrome** で `https://syuua2013.github.io/index.html/` を開く

2. 「ログイン」をタップ

3. 同じメールアドレスとパスワードでログイン

4. **ホーム画面に追加**:
   - 画面右上の **メニュー** (⋮) をタップ
   - **「ホーム画面に追加」** または **「アプリをインストール」** を選択
   - 「インストール」をタップ

5. ✅ ホーム画面からアプリを開けるようになります！

---

## トラブルシューティング

### ❌ ログインボタンを押しても何も起こらない

**原因**: Firebase設定が正しく反映されていない

**解決方法**:
1. `firebase-config.js` の内容を確認
   - `YOUR_API_KEY_HERE` などのプレースホルダーが残っていないか
   - `FIREBASE_ENABLED = true` になっているか
2. ブラウザのキャッシュをクリア
3. ページをリロード（F5）

### ❌ 「Firebase: Error (auth/invalid-api-key)」エラー

**原因**: APIキーが間違っている

**解決方法**:
1. Firebase Consoleで設定情報を再確認
2. `firebase-config.js` を正しい値で更新
3. `git add . && git commit -m "Firebase設定修正" && git push`
4. GitHub Pagesが更新されるまで1-2分待つ
5. ブラウザのキャッシュをクリアしてリロード

### ❌ アカウント作成できない / ログインできない

**原因**: Firebase Authentication が有効になっていない

**解決方法**:
1. Firebase Console > Authentication > Sign-in method
2. 「メール/パスワード」が **有効** になっているか確認
3. 有効になっていない場合は、クリックして有効化

### ❌ データが同期されない

**原因**: Firestore のセキュリティルールが正しくない

**解決方法**:
1. Firebase Console > Firestore Database > ルール
2. 上記の **ステップ2-6** のルールをコピー&ペースト
3. 「公開」をクリック

### ❌ 「オフラインモード」と表示される

**原因**: Firebase接続に失敗している

**解決方法**:
1. インターネット接続を確認
2. ブラウザのコンソールを開く（F12）
3. エラーメッセージを確認
4. `firebase-config.js` の設定を再確認

---

## ✅ 設定完了の確認方法

以下がすべて満たされていれば成功です:

1. ✅ ヘッダー右上に **メールアドレス** が表示されている
2. ✅ 「オフラインモード」の表示が **ない**
3. ✅ レッスンを追加すると、他のデバイスでも表示される
4. ✅ 1つのデバイスで編集すると、他のデバイスでも反映される

---

## 🎉 完了！

これで、iPhone、iPad、PC のどのデバイスからでもレッスン記録にアクセスでき、すべてのデータが自動同期されます！

**次のステップ**:
- 実際にレッスン記録を追加してみる
- 複数のデバイスでログインして同期を確認
- 定期的にエクスポート機能でバックアップを取る
