# md-live

ローカルの Markdown ファイルを、目次ナビゲーション付きで閲覧・編集できるライブビューアです。

## Features

- ローカル Markdown ファイルをブラウザでプレビュー
- `markdown-it` による Markdown 変換
- 現在位置に追従する目次ナビゲーション
- `h1`〜`h3` のフラットな目次表示
- 本文見出しにはリンク用の `#` を表示
- 目次のリサイズと開閉
- ローカルページ上で Markdown を編集
- 編集内容を元の `.md` ファイルへ自動保存
- Markdown ファイル変更時の自動リロード

## Requirements

- Node.js `24.0.0` or later
- pnpm `11.7.0`

このリポジトリは Vite+ を使って `test` / `lint` / `format` / `typecheck` を実行します。

## Usage

### Clone

依存関係をインストールします。

```sh
pnpm install
```

Markdown ファイルを指定してローカルサーバーを起動します。

```sh
pnpm start -- sample.md
```

ブラウザで開きます。

```text
http://127.0.0.1:4321
```

ポートを変える場合:

```sh
pnpm start -- sample.md --port 4322
```

### Package

公開後は package runner から実行できます。

```sh
pnpm dlx md-live ./memo.md
```

## Shortcuts

- `Cmd+E` / `Ctrl+E`: プレビューと編集モードを切り替え
- `Cmd+B` / `Ctrl+B`: 目次ナビゲーションを開閉

## Notes

このツールはローカル利用を前提にしています。

編集モードで変更した内容は、起動時に指定した Markdown ファイルへ直接保存されます。外部公開用のサーバーとしては使わないでください。

## Development

```sh
pnpm check
pnpm test
pnpm format
```

コミット前には `.githooks/pre-commit` で format / lint / typecheck を実行する想定です。
