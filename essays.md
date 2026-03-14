---
layout: default
title: Essays & Notes
description: MiracleFarms 上的深度技术文章、研究笔记与系统性分析。
permalink: /essays/
---
<section class="section archive-hero archive-hero-essay">
  <div class="archive-hero-copy">
    <p class="eyebrow">深度文章栏目</p>
    <h1>深度文章</h1>
    <p class="archive-hero-intro">这里聚合更适合慢读的长文、研究笔记与系统性分析。相比简报，这一栏目更强调问题定义、结构化拆解、技术判断与可复用的长期认知框架。</p>
  </div>
  <div class="archive-hero-side">
    <div class="archive-metric-card">
      <span>定位</span>
      <strong>深度阅读 · 研究笔记</strong>
    </div>
    <div class="archive-metric-card">
      <span>适合谁看</span>
      <strong>想理解机制、架构取舍与系统脉络的读者</strong>
    </div>
  </div>
</section>

<section class="section archive-section">
  <div class="section-heading">
    <p class="eyebrow">全部深度文章</p>
    <h2>深度文章归档</h2>
    <p class="section-intro">集中查看更适合慢读的长文、研究笔记与系统性技术拆解。</p>
  </div>

  <div class="archive-list">
    {% assign essays = site.posts | where: 'kind', 'essay' %}
    {% assign field_notes = site.posts | where: 'kind', 'field-note' %}
    {% for post in essays %}
    <article class="archive-card post-kind-{{ post.kind }}">
      <div class="post-card-topline">
        <span class="post-category">{{ post.category | default: 'Essay' }}</span>
        <span class="post-card-meta">{{ post.date | date: "%Y.%m.%d" }}</span>
      </div>
      <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
      <p>{{ post.intro | default: post.excerpt | strip_html | truncate: 190 }}</p>
      <a class="text-link" href="{{ post.url | relative_url }}">进入深读 →</a>
    </article>
    {% endfor %}
    {% for post in field_notes %}
    <article class="archive-card post-kind-{{ post.kind }}">
      <div class="post-card-topline">
        <span class="post-category">{{ post.category | default: 'Field Note' }}</span>
        <span class="post-card-meta">{{ post.date | date: "%Y.%m.%d" }}</span>
      </div>
      <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
      <p>{{ post.intro | default: post.excerpt | strip_html | truncate: 170 }}</p>
      <a class="text-link" href="{{ post.url | relative_url }}">阅读全文 →</a>
    </article>
    {% endfor %}
  </div>
</section>
