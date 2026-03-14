---
layout: default
title: Briefs
description: MiracleFarms 上的 AI Infra 简报与时效性聚合更新。
permalink: /briefs/
---
<section class="section archive-hero archive-hero-brief">
  <div class="archive-hero-copy">
    <p class="eyebrow">Brief Archive</p>
    <h1>简报</h1>
    <p class="archive-hero-intro">这里聚合 MiracleFarms 上所有更适合快速扫描的 AI Infra 简报。它们强调时效性、节奏感与高信号密度，帮助读者快速建立最近一段时间里最值得关注的变化脉络。</p>
  </div>
  <div class="archive-hero-side">
    <div class="archive-metric-card">
      <span>Focus</span>
      <strong>Fast scan · Daily signals</strong>
    </div>
    <div class="archive-metric-card">
      <span>Best for</span>
      <strong>快速了解最近 24h / 近几天的重要变化</strong>
    </div>
  </div>
</section>

<section class="section archive-section">
  <div class="section-heading">
    <p class="eyebrow">All Briefs</p>
    <h2>简报归档</h2>
    <p class="section-intro">集中查看 AI Infra 早报与其他高时效、适合快速扫描的聚合更新。</p>
  </div>

  <div class="archive-list">
    {% assign briefs = site.posts | where: 'kind', 'brief' %}
    {% for post in briefs %}
    <article class="archive-card post-kind-{{ post.kind }}">
      <div class="post-card-topline">
        <span class="post-category">{{ post.category | default: 'Brief' }}</span>
        <span class="post-card-meta">{{ post.date | date: "%Y.%m.%d" }}</span>
        {% if post.series %}<span class="post-card-meta">{{ post.series }}</span>{% endif %}
      </div>
      <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
      <p>{{ post.intro | default: post.excerpt | strip_html | truncate: 160 }}</p>
      <a class="text-link" href="{{ post.url | relative_url }}">查看简报 →</a>
    </article>
    {% endfor %}
  </div>
</section>
