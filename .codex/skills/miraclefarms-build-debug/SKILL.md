---
name: miraclefarms-build-debug
description: Set up the local Jekyll environment and diagnose or fix MiracleFarms site build problems. Use when working in miraclefarms.github.io and you need to install Bundler/Jekyll dependencies, run `bundle exec jekyll build` or `serve`, investigate Liquid/Markdown/front matter failures in `_posts/`, or resolve output conflicts and config issues in `_config.yml`.
---

# MiracleFarms Build Debug

## Overview

Use this skill to make the repo locally buildable first, then locate content or config problems from real Jekyll output instead of guessing from static inspection.

## Workflow

1. Confirm the local toolchain:
   - Run `ruby -v`
   - Run `bundle -v`
   - Run `which bundle`
2. Install dependencies into the repo, not the system gem path:
   - Prefer `bundle install`
   - If Bundler tries to write to `/Library/Ruby/Gems/...` and asks for `sudo`, rerun `bundle install --path vendor/bundle`
   - Keep `.bundle/config` pointing at `vendor/bundle`
3. Use the build as the source of truth:
   - Run `bundle exec jekyll build`
   - Fix the first hard error
   - Re-run `bundle exec jekyll build` after each fix
4. Only after `build` passes, run a local preview:
   - Run `bundle exec jekyll serve --host 127.0.0.1 --port 4000 --livereload`
   - Confirm the server starts and stop it after the smoke test unless the user wants it left running

## Common Failures

### Liquid Parsing In Posts

Treat `bundle exec jekyll build` errors as authoritative. A common failure mode in this repo is Liquid parsing content inside posts.

If a post contains text like `{% generation %}`, Jekyll will parse it as a Liquid tag even when it appears inside inline code spans. Do one of these:
- Rewrite the phrase into plain text, such as ``generation block``
- Or wrap the literal tag in a Liquid raw block if the exact syntax must remain visible

Do not assume Markdown backticks are enough to suppress Liquid evaluation.

### Brief And Essay Tail Sections

Normalize post endings while fixing build issues:
- `brief` posts should end with `---` then `## 参考来源`
- `essay` posts should end with `---` then `## 参考资料`

Missing separators or headings may not always hard-fail the build, but fix them when you touch the file because they are part of repo conventions.

### Output Conflicts And Config

If Jekyll warns that multiple files write to the same destination, inspect duplicate pages and their permalinks first. In this repo, `docs/` is planning material and should not be rendered as site pages.

If files under `docs/` conflict with root pages like `briefs.md` or `essays.md`, exclude `docs` in `_config.yml`.

### Non-Blocking Warnings

These warnings are currently tolerated if the build exits `0`:
- `Logger not initialized properly`
- `Jekyll::Stevenson#initialize: does not call super probably`

Do not spend time chasing them unless the user explicitly asks to upgrade or modernize the Ruby/Jekyll stack.

## Validation

Finish with this order:
1. Run `bundle exec jekyll build`
2. If it passes, run `bundle exec jekyll serve --host 127.0.0.1 --port 4000 --livereload` as a smoke test
3. Report whether failures were hard errors, warnings, or repo convention fixes
4. Mention the exact files changed and any remaining warnings that are safe to ignore

## Commands

```bash
ruby -v
bundle -v
which bundle
bundle install
bundle install --path vendor/bundle
bundle exec jekyll build
bundle exec jekyll serve --host 127.0.0.1 --port 4000 --livereload
```
