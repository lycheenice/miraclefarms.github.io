# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

MiracleFarms is a Jekyll-based static blog deployed to GitHub Pages at `https://miraclefarms.github.io`. The site focuses on AI Infrastructure research, publishing two primary content types: daily briefs (`brief`) and deep-dive technical essays (`essay`).

## Commands

```bash
# Install dependencies
bundle install

# Local development server (http://localhost:4000)
bundle exec jekyll serve

# Build only
bundle exec jekyll build
```

Pushing to `main` triggers automatic deployment via GitHub Actions (`.github/workflows/pages.yml`).

## Post Authoring Rules

All new posts go in `_posts/YYYY-MM-DD-slug.md`. The filename date **must exactly match** the `date` front matter field (year/month/day).

### Front Matter

```yaml
---
title: AI Infra 早报｜{主题描述}
date: 2026-03-17 08:00:00 +0800
author: 荔枝不耐思
kind: brief
category: Brief
series: ai-infra-daily-brief   # optional, for brief series
intro: 一句话摘要，不超过 100 字。
---
```

**Required fields:** `title`, `date`, `author`, `kind`, `category`, `intro`

`kind` / `category` must match:

| `kind` | `category` | Use case |
|--------|------------|----------|
| `brief` | `Brief` | Daily briefs, quick dispatches |
| `essay` | `Essay` | Deep technical analysis |
| `field-note` | `Field Note` | Research notes |
| `founding-note` | `Founding Note` | Site philosophy |

**Author by content type:**
- `荔枝不耐思` — AI Infra daily briefs
- `Ethan` — Technical essays
- `MiracleFarms` — Site notes / founding notes

### Timezone

All dates must use `+0800` (Asia/Shanghai). Never use `-0400` or other offsets.

```yaml
date: 2026-03-17 08:00:00 +0800   # ✓ correct
date: 2026-03-17 12:40:00 -0400   # ✗ wrong
```

Conventional publish times:
- Brief: `08:00:00 +0800` or `05:30:00 +0800`
- Essay: `12:00:00 +0800`

### Title Format

- **Brief:** `AI Infra 早报｜{description}` — use full-width pipe `｜` (U+FF5C), not ASCII `|`
- **Essay:** Plain descriptive Chinese title, no prefix

### Body Structure

**Brief:**
- Opening paragraph (no H2 heading): overall context and key judgment
- H2 sections numbered with Chinese numerals: `## 一、{topic}`, `## 二、{topic}`, …
- Optional closing section: `## N、今天真正值得记住的判断`
- Required ending: `---` separator then `## 参考来源` with numbered references

**Essay:**
- Optional version declaration blockquote
- Opening paragraph (no H2): pose the core question
- H2 sections with Chinese numerals
- No `## 参考来源` section needed

### Citation Format — **do not mix between types**

**Brief** — inline `[[N]](url)` + end-of-post references section:
```markdown
SGLang 合并了 H2O 剪枝支持[[1]](https://github.com/...)，...

---

## 参考来源

[1] [SGLang H2O KV cache pruning](https://github.com/...)

[2] [Another reference](https://github.com/...)
```

**Essay** — inline HTML anchor, no references section:
```markdown
SGLang 在早期描述了共享前缀 workload<a href="https://...">[1]</a>。
```

### Images

Store assets under `/assets/{post-slug}/`:
```markdown
![description](/assets/post-slug/image.png)
*图 N：caption text。*
```

### H2/H3 Numbering

- H2: Chinese numerals `一、` `二、` `三、`
- H3: Arabic `1.1` `1.2` (optional)
- Never use H1 (`#`) in post body — `title` renders as the page H1

## Architecture

- **`_layouts/default.html`** — base HTML shell with site header/nav and footer
- **`_layouts/post.html`** — post layout extending default; renders `kind`-aware header, ToC sidebar (hidden for `brief` and `founding-note`), and reading-mode label. ToC is JS-generated from H2 headings only.
- **`_config.yml`** — `permalink: /notes/:year/:month/:day/:title/`, `future: true` (posts with future dates are built), timezone `Asia/Shanghai`
- **`assets/css/site.css`** — single stylesheet for the entire site
- **`docs/`** — planning and reference documents (not served as Jekyll pages)
- **`briefs.md` / `essays.md` / `foundations.md`** — index pages at root, filtered by `kind` via `site.posts | where: 'kind', '...'`

## Repo-Local Skill

- **`/.codex/skills/miraclefarms-writer/`** — repo-local writing skill for generating publishable MiracleFarms posts from themes and source links.
- Read **`/.codex/skills/miraclefarms-writer/SKILL.md`** before writing a new post from external references; it points to the brief and essay format guides under `references/`.
