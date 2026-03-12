# MiracleFarms GitHub Pages

MiracleFarms is a lightweight GitHub Pages blog focused on AI infrastructure.

## Recommended repository name

For a user or organization GitHub Pages site, the repository should be named:

`miraclefarms.github.io`

As of March 12, 2026, I did not find a public repository or public Pages site already using that exact repo path under the `miraclefarms` account, but actual availability is only confirmed when you create the repository on GitHub.

## Local structure

- `index.html`: homepage
- `_posts/`: markdown posts
- `_layouts/`: Jekyll layouts
- `assets/css/site.css`: site styles
- `_config.yml`: site configuration

## Publish on GitHub Pages

1. Create a new public repository named `miraclefarms.github.io` under the `miraclefarms` account.
2. Push the contents of this directory to the repository root on the `main` branch.
3. In GitHub, open `Settings > Pages`.
4. Set `Source` to `GitHub Actions`.
5. The included workflow at `.github/workflows/pages.yml` will build and deploy the site automatically on every push to `main`.

The site URL should then be:

`https://miraclefarms.github.io`

## First push

```bash
git remote add origin git@github.com:miraclefarms/miraclefarms.github.io.git
git add .
git commit -m "Initial MiracleFarms site"
git push -u origin main
```

## Write the next article

Add a markdown file to `_posts/` using this naming format:

`YYYY-MM-DD-title.md`

Example front matter:

```md
---
title: 新文章标题
date: 2026-03-13 09:00:00 -0400
author: MiracleFarms
category: Field Note
intro: 一句话摘要。
---
```

## Optional local preview

This repo is designed to deploy from GitHub Actions, so local preview is optional.

If you want to preview locally later, install Jekyll and run:

```bash
bundle exec jekyll serve
```
