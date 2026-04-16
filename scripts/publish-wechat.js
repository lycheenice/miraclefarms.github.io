#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const FormData = require('form-data');
const juice = require('juice');
const { marked } = require('marked');
const dotenv = require('dotenv');

const WECHAT_API_BASE = 'https://api.weixin.qq.com/cgi-bin';
const LOG_FILE = path.join(__dirname, '..', 'docs', 'wechat-publish.log');
const DEFAULT_THUMB_IMAGE = path.join(__dirname, '..', 'assets', 'icons', 'favicon.png');
const RECORD_FILE = path.join(__dirname, 'wechat-publish-record.json');

function log(message) {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const entry = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, entry);
  console.error(entry.trim());
}

function parseFrontMatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontMatter: {}, body: content };

  const frontMatter = {};
  match[1].split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      frontMatter[key.trim()] = valueParts.join(':').trim();
    }
  });

  return { frontMatter, body: match[2] };
}

function setFrontMatterField(content, key, value) {
  const serialized = `${key}: ${value}`;

  if (content.startsWith('---\n')) {
    const end = content.indexOf('\n---\n', 4);
    if (end !== -1) {
      const frontMatterBlock = content.slice(4, end);
      const body = content.slice(end + 5);
      const lines = frontMatterBlock.split('\n');
      let updated = false;

      const nextLines = lines.map(line => {
        if (line.startsWith(`${key}:`)) {
          updated = true;
          return serialized;
        }
        return line;
      });

      if (!updated) {
        nextLines.push(serialized);
      }

      return `---\n${nextLines.join('\n')}\n---\n${body}`;
    }
  }

  return `---\n${serialized}\n---\n${content}`;
}

function normalizeContentForHash(content) {
  if (!content.startsWith('---\n')) {
    return content;
  }

  const end = content.indexOf('\n---\n', 4);
  if (end === -1) {
    return content;
  }

  const frontMatterBlock = content.slice(4, end);
  const body = content.slice(end + 5);
  const normalizedFrontMatter = frontMatterBlock
    .split('\n')
    .filter(line => !line.startsWith('wechat_published:'))
    .join('\n');

  return `---\n${normalizedFrontMatter}\n---\n${body}`;
}

function computeContentHash(content) {
  return crypto
    .createHash('sha256')
    .update(normalizeContentForHash(content), 'utf8')
    .digest('hex');
}

function loadPublishRecord() {
  if (!fs.existsSync(RECORD_FILE)) {
    return { version: 1, sent: [] };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(RECORD_FILE, 'utf8'));
    if (!parsed || typeof parsed !== 'object') {
      return { version: 1, sent: [] };
    }
    if (!Array.isArray(parsed.sent)) {
      parsed.sent = [];
    }
    if (!parsed.version) {
      parsed.version = 1;
    }
    return parsed;
  } catch (err) {
    log(`Failed to parse publish record: ${err.message}`);
    return { version: 1, sent: [] };
  }
}

function savePublishRecord(record) {
  fs.writeFileSync(RECORD_FILE, JSON.stringify(record, null, 2) + '\n');
}

function hasBeenPublished(record, contentHash) {
  return record.sent.some(entry => entry.content_hash === contentHash);
}

function recordPublished(record, filePath, contentHash, frontMatter, response) {
  const relativePath = path.relative(path.join(__dirname, '..'), filePath);
  record.sent.push({
    file: relativePath,
    title: frontMatter.title || 'Untitled',
    content_hash: contentHash,
    published_at: new Date().toISOString(),
    media_id: response && response.media_id ? response.media_id : null,
  });
  savePublishRecord(record);
}

async function getAccessToken(appid, appsecret) {
  const url = `${WECHAT_API_BASE}/token?grant_type=client_credential&appid=${appid}&secret=${appsecret}`;
  const response = await axios.get(url);
  if (response.data.errcode) {
    throw new Error(`access_token failed: ${response.data.errcode} - ${response.data.errmsg}`);
  }
  return response.data.access_token;
}

const DOOCS_CSS = `
section {
  font-family: -apple-system-font, BlinkMacSystemFont, Helvetica Neue, PingFang SC, Hiragino Sans GB, Microsoft YaHei UI, Microsoft YaHei, Arial, sans-serif;
  font-size: 16px;
  line-height: 1.75;
  color: #24292f;
  max-width: 100%;
  word-break: break-word;
}
h1 { display: table; margin: 2em auto 1em; padding: 0 1em; border-bottom: 2px solid #009B77; font-size: 1.3em; text-align: center; color: #009B77; }
h2 { display: table; margin: 1.5em auto 1em; padding: 0.3em 0.8em; background: #009B77; color: #fff; font-size: 1.2em; text-align: center; border-radius: 4px; }
h3 { padding-left: 8px; border-left: 3px solid #009B77; margin: 1.5em 8px 0.75em 0; font-size: 1.1em; color: #009B77; }
h4, h5, h6 { margin: 1.5em 8px 0.5em; color: #009B77; font-size: 1em; }
p { margin: 1em 0; letter-spacing: 0.05em; }
blockquote { font-style: normal; padding: 0.8em 1em; border-left: 4px solid #009B77; border-radius: 4px; background: #f6f8fa; margin: 1em 0; color: #576b95; }
blockquote p { margin: 0.5em 0; }
code { font-size: 90%; color: #d14; background: rgba(27, 31, 35, 0.05); padding: 2px 6px; border-radius: 4px; font-family: Consolas, Monaco, Andale Mono, monospace; }
pre { background: #f6f8fa; border-radius: 8px; overflow-x: auto; margin: 1em 0; padding: 0; border: 1px solid rgba(0,0,0,0.1); }
pre code { background: none; padding: 1em; color: inherit; border-radius: 0; display: block; }
a { color: #576b95; text-decoration: none; }
strong { color: #009B77; font-weight: bold; }
ul { list-style: circle; padding-left: 1.5em; margin: 1em 0; }
ol { padding-left: 1.5em; margin: 1em 0; list-style: decimal; }
li { margin: 0.3em 0; }
table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 90%; }
th, td { border: 1px solid #dfdfdf; padding: 0.5em 0.75em; text-align: left; }
th { background: rgba(0,0,0,0.03); font-weight: 600; }
img { display: block; max-width: 100%; margin: 1em auto; border-radius: 4px; }
hr { border-style: solid; border-width: 2px 0 0; border-color: rgba(0,0,0,0.1); height: 0.4em; margin: 2em 0; }
`;

function markdownToHtml(markdown) {
  marked.setOptions({
    gfm: true,
    breaks: true,
  });
  const bodyHtml = marked.parse(markdown);
  const htmlWithStyleTag = '<style>' + DOOCS_CSS + '</style><section>' + bodyHtml + '</section>';
  return juice(htmlWithStyleTag);
}

async function uploadImage(accessToken, imagePath) {
  const formData = new FormData();
  formData.append('media', fs.createReadStream(imagePath), {
    filename: path.basename(imagePath),
    contentType: 'image/png',
  });

  const url = `${WECHAT_API_BASE}/material/add_material?access_token=${accessToken}&type=image`;
  const response = await axios.post(url, formData, {
    headers: formData.getHeaders(),
  });
  if (response.data.errcode) {
    throw new Error(`material/add_material failed: ${response.data.errcode} - ${response.data.errmsg}`);
  }
  return response.data.media_id;
}

async function addDraft(accessToken, article) {
  const url = `${WECHAT_API_BASE}/draft/add?access_token=${accessToken}`;
  const payload = {
    articles: [
      {
        title: article.title,
        author: article.author,
        digest: article.digest,
        content: article.content,
        content_source_url: '',
        thumb_media_id: article.thumb_media_id,
        need_open_comment: 1,
        only_fans_can_comment: 0,
      },
    ],
  };
  const response = await axios.post(url, payload);
  if (response.data.errcode) {
    throw new Error(`add_draft failed: ${response.data.errcode} - ${response.data.errmsg}`);
  }
  return response.data;
}

function markAsPublished(filePath, content) {
  fs.writeFileSync(filePath, setFrontMatterField(content, 'wechat_published', 'true'));
}

function scanWechatDir(record) {
  const wechatDir = path.join(__dirname, '..', 'docs', 'wechat');
  if (!fs.existsSync(wechatDir)) {
    return [];
  }

  const files = fs.readdirSync(wechatDir).filter(f => f.endsWith('.md'));
  const unpublished = [];

  files.forEach(file => {
    const filePath = path.join(wechatDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { frontMatter } = parseFrontMatter(content);
    const contentHash = computeContentHash(content);

    if (frontMatter.wechat_published === 'true' || hasBeenPublished(record, contentHash)) {
      return;
    }

    unpublished.push({ filePath, content, contentHash });
  });

  return unpublished;
}

async function main() {
  dotenv.config();

  const appid = process.env.WECHAT_APPID;
  const appsecret = process.env.WECHAT_APPSECRET;
  const thumbMediaId = process.env.WECHAT_THUMB_MEDIA_ID;

  if (!appid || !appsecret) {
    log('WECHAT_APPID or WECHAT_APPSECRET not found in .env');
    return { success: 0, failed: 0 };
  }

  if (!thumbMediaId) {
    log('WECHAT_THUMB_MEDIA_ID not found in .env. Attempting to upload default image...');
  }

  let accessToken;
  try {
    accessToken = await getAccessToken(appid, appsecret);
  } catch (err) {
    log(`Failed to get access_token: ${err.message}`);
    return { success: 0, failed: 0 };
  }

  let effectiveThumbMediaId = thumbMediaId;
  if (!effectiveThumbMediaId) {
    try {
      effectiveThumbMediaId = await uploadImage(accessToken, DEFAULT_THUMB_IMAGE);
      console.error(`📤 Uploaded default thumb image, media_id: ${effectiveThumbMediaId}`);
    } catch (err) {
      log(`Failed to upload default thumb image: ${err.message}`);
      return { success: 0, failed: 0 };
    }
  }

  const publishRecord = loadPublishRecord();
  const unpublished = scanWechatDir(publishRecord);
  if (unpublished.length === 0) {
    console.error('No unpublished wechat articles found.');
    return { success: 0, failed: 0, errors: [] };
  }

  const results = { success: 0, failed: 0 };

  for (const { filePath, content, contentHash } of unpublished) {
    const fileName = path.basename(filePath);
    try {
      const { frontMatter, body } = parseFrontMatter(content);
      const title = frontMatter.title || 'Untitled';
      const author = frontMatter.author || '';
      const digest = frontMatter.intro || '';

      const htmlContent = markdownToHtml(body);

      const response = await addDraft(accessToken, { title, author, digest, content: htmlContent, thumb_media_id: effectiveThumbMediaId });
      markAsPublished(filePath, content);
      recordPublished(publishRecord, filePath, contentHash, frontMatter, response);

      console.error(`✅ Published: ${fileName}`);
      results.success++;
    } catch (err) {
      log(`${fileName}\nReason: ${err.message}\n---`);
      results.failed++;
    }
  }

  return results;
}

main().then(results => {
  if (results.success > 0 || results.failed > 0) {
    const msg = results.failed === 0
      ? `✅ Published ${results.success} article(s) to WeChat draft`
      : results.success === 0
        ? `❌ All ${results.failed} article(s) failed (see docs/wechat-publish.log)`
        : `⚠️ ${results.success} succeeded, ${results.failed} failed (see docs/wechat-publish.log)`;
    console.error(msg);
  }
  process.exit(0);
}).catch(err => {
  log(`Unexpected error: ${err.message}`);
  process.exit(0);
});
