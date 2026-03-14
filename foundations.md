---
layout: default
title: Foundations
description: MiracleFarms 的站点起源、方法论与基础文本。
permalink: /foundations/
---
<section class="section archive-hero archive-hero-foundation">
  <div class="archive-hero-copy">
    <p class="eyebrow">基础文本栏目</p>
    <h1>起点与方法</h1>
    <p class="archive-hero-intro">这里收录 MiracleFarms 的基础文本：站点为何建立、如何写作、长期关注什么，以及这套公开研究型写作方法背后的基本假设。</p>
  </div>
  <div class="archive-hero-side">
    <div class="archive-metric-card">
      <span>定位</span>
      <strong>起点 · 方法 · 意图</strong>
    </div>
    <div class="archive-metric-card">
      <span>适合谁看</span>
      <strong>第一次来到站点，或想理解它为何这样组织内容的读者</strong>
    </div>
  </div>
</section>

<section class="section archive-section">
  <div class="section-heading">
    <p class="eyebrow">全部基础文本</p>
    <h2>基础文本归档</h2>
    <p class="section-intro">集中查看 MiracleFarms 的起源、写作方法和长期定位说明。</p>
  </div>

  <div class="archive-list">
    {% assign founding_notes = site.posts | where: 'kind', 'founding-note' %}
    {% for post in founding_notes %}
    <article class="archive-card post-kind-{{ post.kind }}">
      <div class="post-card-topline">
        <span class="post-category">{{ post.category | default: 'Founding Note' }}</span>
        <span class="post-card-meta">{{ post.date | date: "%Y.%m.%d" }}</span>
      </div>
      <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
      <p>{{ post.intro | default: post.excerpt | strip_html | truncate: 170 }}</p>
      <a class="text-link" href="{{ post.url | relative_url }}">了解起点 →</a>
    </article>
    {% endfor %}
  </div>
</section>
