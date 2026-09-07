# nexus-training-management

Nexus技術研修の進捗管理スプレッドシートを再現・保守するためのGoogle Apps Scriptです。

## 含まれるもの

- `Code.gs`: シート、見出し、数式、入力規則、条件付き書式を安全に初期設定
- `appsscript.json`: Apps Script V8ランタイム設定
- `.clasp.json.example`: clasp接続設定の雛形
- `docs/sheet-spec.md`: 匿名化したスプレッドシート仕様

## セットアップ

1. 対象のGoogleスプレッドシートで「拡張機能 → Apps Script」を開く
2. `Code.gs` と `appsscript.json` の内容をApps Scriptプロジェクトへ追加
3. `setupNexusTrainingWorkbook()` を一度実行し、必要な権限を許可
4. スプレッドシートを再読み込みし、「Nexus研修管理」メニューを利用

既存データは消去せず、空欄の見出しや不足している設定だけを補います。ただし、実行前に対象スプレッドシートのバックアップを推奨します。

## claspを使う場合

```bash
cp .clasp.json.example .clasp.json
# .clasp.json の scriptId を対象プロジェクトIDへ変更
clasp push
```

`.clasp.json` はリポジトリへコミットしない設定です。

## 公開情報の扱い

このリポジトリにはコードと匿名化した仕様だけを保存します。以下は追加しないでください。

- 研修生の氏名・連絡内容
- SlackやGmailの本文
- 非公開リポジトリ、Issue、GASデプロイURL
- アクセストークン、Apps ScriptプロジェクトIDなどの認証・識別情報

## 注意

- `installDailyRefreshTrigger()` は既存の同名トリガーを置き換え、毎日8時台にサマリーを更新します。
- Webアプリのデプロイは行いません。必要な場合は用途と公開範囲を確認して別途設定してください。
