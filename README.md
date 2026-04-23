![CI](https://github.com/mikewang71/payout-sandbox-qa/actions/workflows/qa.yml/badge.svg)

## QA 測試報告 Dashboard

| 版本 | 說明 |
|---|---|
| 互動版 | 開啟 `dashboard/QA Dashboard.html`，支援 PM/RD 切換、Dark/Light 模式、英文/繁體中文 |
| 列印版 | 開啟 `dashboard/QA Dashboard-print.html`，可直接列印或存成 PDF |

# Candidate Guide

Thank you for taking the time to complete this QA take-home assignment.

This repository contains a runnable payout sandbox that you should assess as if it were a real product already in active use.

We care more about prioritization, investigation depth, and test design quality than broad coverage for its own sake.

## What we expect from your submission

- API coverage is required
- UI automation is optional and judgment-based
- Your work should show risk prioritization, not just execution volume
- If you intentionally skip something, explain why

## Public docs to read first

- English
  - `candidate/assignment.md`
  - `candidate/api_reference.md`
  - `candidate/sandbox_overview.md`
- 繁體中文
  - `candidate/assignment.zh-TW.md`
  - `candidate/api_reference.zh-TW.md`
  - `candidate/sandbox_overview.zh-TW.md`

## Stack

- TanStack Start
- React
- SQLite
- Rust worker
- mise

## Install `mise`

If you are on macOS and use Homebrew:

```bash
brew install mise
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc
exec zsh
```

If you use another shell or platform, check the official install guide:

- https://mise.jdx.dev/getting-started.html

## Quick start

```bash
mise install
mise run setup
mise run dev
```

Default app URL:

```bash
http://localhost:3000
```

## Useful commands

- `mise run setup` - install dependencies and initialize the database
- `mise run dev` - start the web app and the Rust worker
- `mise run reset` - rebuild the SQLite database from schema and seed data

Async payout progression depends on the Rust worker being running. If the worker is not running, delayed or long-running payout states will not advance normally.
It is acceptable to reset the sandbox back to the seeded state during investigation. If you do, mention that in your notes or reproduction steps.

## Test accounts

The UI can switch between seeded users from the dashboard.

You can also impersonate users in API tests using the `x-user-id` header.

Available seeded users:

- `user_admin`
- `user_operator`
- `user_viewer`

## Public product rules

- Currency is currently `USDC`
- Recipient addresses use an Ethereum-like `0x...` format
- Payouts are processed asynchronously
- Some provider modes are intentionally unstable
- Not every issue in the sandbox is announced up front

## Running the QA tests

本地執行需要啟動 payout sandbox（`mise run dev`），CI 環境執行 test collection 驗證套件結構。

| 環境 | 指令 | 說明 |
|------|------|------|
| 本地 | `pytest tests/test_api.py -v` | 需先執行 `mise run dev` 啟動 sandbox |
| 本地 | `pytest tests/test_ui.py -v` | 需安裝 `playwright install firefox` |
| CI | `pytest tests/test_api.py --collect-only` | 驗證套件語法與結構，不需 sandbox |

詳細說明請見 [tests/README.md](tests/README.md)，測試發現請見 [bug_report.md](bug_report.md)。

## Submission expectations

Submit whatever format the interviewer requested, but your work should clearly show:

- Your risk assessment
- API coverage
- Chosen UI coverage and why you chose it
- Bugs or suspicious behaviors you found
- Any assumptions and tradeoffs
