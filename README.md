# nexus-training-management

Nexus技術研修の研修生管理をGitHub Issuesで行うための運用リポジトリです。

研修生ごとに1件のIssueを作成し、技術研修課題からGate5までの進捗、提出期限、判定、次のアクションを継続して管理します。作成時はIssuesの「研修生の進捗管理」フォームを使用してください。詳細は[研修生Issue運用](docs/issue-management.md)を参照してください。

実名・連絡先・Slack/Gmail本文などの個人情報はIssueに保存せず、管理用の識別子のみを使用します。

## 旧スプレッドシート運用

以下のApps Scriptと仕様は、既存スプレッドシートを保守する必要がある場合のために残しています。今後の研修生管理の新規登録・進捗更新はGitHub Issuesを正とします。

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
