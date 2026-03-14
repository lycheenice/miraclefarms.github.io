---
layout: default
title: Foundations
description: MiracleFarms 的站点起源、方法论与基础文本。
permalink: /foundations/
---
<section class="section archive-section">
  <div class="section-heading">
    <p class="eyebrow">Foundations</p>
    <h2>起点与方法</h2>
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
