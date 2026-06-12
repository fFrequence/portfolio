#!/usr/bin/env node
/* ============================================================
   fFrequence Portfolio — Admin Server
   Run via Claude Code: start "admin" in launch panel
   Or manually: node admin.js  →  http://localhost:3002
   ============================================================ */
'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT  = 3002;
const INDEX = path.join(__dirname, 'index.html');
const ABOUT = path.join(__dirname, 'about.html');

// ---- MARKER HELPERS -----------------------------------------------

function get(html, key) {
  const s = `<!--EDIT:${key}-->`;
  const e = `<!--/EDIT:${key}-->`;
  const si = html.indexOf(s);
  if (si < 0) return '';
  const ci = si + s.length;
  const ei = html.indexOf(e, ci);
  return ei < 0 ? '' : html.slice(ci, ei).trim();
}

function set(html, key, value) {
  const s = `<!--EDIT:${key}-->`;
  const e = `<!--/EDIT:${key}-->`;
  const si = html.indexOf(s);
  if (si < 0) return html;
  const ci = si + s.length;
  const ei = html.indexOf(e, ci);
  if (ei < 0) return html;
  return html.slice(0, ci) + value + html.slice(ei);
}

// ---- BODY / EXPERIENCE HELPERS ------------------------------------

function parseBody(str) {
  const out = {};
  new URLSearchParams(str).forEach((v, k) => { out[k] = v; });
  return out;
}

function expToLines(html) {
  return [...html.matchAll(/<li>([^<]+)<\/li>/g)]
    .map(m => m[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>'))
    .join('\n');
}

function linesToExp(text) {
  const encode = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = text.trim().split('\n').filter(Boolean);
  return '\n' + lines.map(l => `          <li>${encode(l.trim())}</li>`).join('\n') + '\n        ';
}

function htmlDecode(s) {
  return (s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

function esc(s) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---- UI BUILDERS --------------------------------------------------

function field(label, name, value, multi = false) {
  const v = esc(htmlDecode(value));
  const input = multi
    ? `<textarea name="${name}" rows="4">${v}</textarea>`
    : `<input type="text" name="${name}" value="${v}" />`;
  return `<div class="field"><label>${label}</label>${input}</div>`;
}

function section(id, title, ...fields) {
  return `<section id="${id}"><h2>${title}</h2>${fields.join('')}</section>`;
}

function buildUI(idx, abt) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Admin · fFrequence</title>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet"/>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Nunito',sans-serif;background:#f7f7f5;color:#111;min-height:100vh}
    .bar{position:sticky;top:0;z-index:10;background:#111;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 28px;height:52px;gap:12px}
    .bar h1{font-size:.78rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;white-space:nowrap}
    .bar .info{font-size:.72rem;color:#666;white-space:nowrap}
    .btn{background:#f5c842;color:#111;border:none;padding:7px 20px;border-radius:99px;font-family:inherit;font-size:.78rem;font-weight:800;cursor:pointer;letter-spacing:.04em;transition:background .15s;white-space:nowrap}
    .btn:hover{background:#e8a820}
    .toast{position:fixed;top:62px;right:18px;background:#22c55e;color:#fff;padding:9px 15px;border-radius:8px;font-size:.78rem;font-weight:700;opacity:0;transform:translateY(-6px);transition:all .2s;pointer-events:none;z-index:99}
    .toast.on{opacity:1;transform:translateY(0)}
    .wrap{display:flex;min-height:calc(100vh - 52px)}
    nav{width:180px;flex-shrink:0;background:#fff;border-right:1px solid #e6e6e4;padding:18px 0;position:sticky;top:52px;height:calc(100vh - 52px);overflow-y:auto}
    nav .lbl{padding:14px 20px 5px;font-size:.62rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#bbb}
    nav a{display:block;padding:7px 20px;font-size:.78rem;font-weight:700;color:#737373;text-decoration:none;border-left:2px solid transparent;transition:all .15s}
    nav a:hover{color:#111;border-left-color:#f5c842}
    .main{flex:1;padding:32px 36px;max-width:720px}
    section{background:#fff;border:1px solid #e6e6e4;border-radius:10px;padding:22px;margin-bottom:16px;scroll-margin-top:64px}
    section h2{font-size:.65rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#737373;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #e6e6e4}
    .field{margin-bottom:13px}
    .field:last-of-type{margin-bottom:0}
    label{display:block;font-size:.72rem;font-weight:700;color:#737373;margin-bottom:5px}
    input,textarea{width:100%;font-family:inherit;font-size:.88rem;padding:8px 10px;border:1px solid #e6e6e4;border-radius:6px;background:#f7f7f5;color:#111;resize:vertical;transition:border-color .15s}
    input:focus,textarea:focus{outline:none;border-color:#f5c842;background:#fff}
    textarea{line-height:1.6}
    .hint{font-size:.7rem;color:#bbb;margin-top:5px}
  </style>
</head>
<body>
  <div class="bar">
    <h1>fFrequence · Content Editor</h1>
    <span class="info">Changes save directly to your HTML files</span>
    <button class="btn" onclick="save()">Save all</button>
  </div>
  <div class="toast" id="toast">Saved!</div>

  <div class="wrap">
    <nav>
      <div class="lbl">Homepage</div>
      <a href="#hero">Hero</a>
      <a href="#swarm">Swarm Sync</a>
      <a href="#yuki">Yuki Aim</a>
      <a href="#neuro">Neuro-Sama</a>
      <a href="#roundtable">Roundtable</a>
      <a href="#contact">Contact</a>
      <div class="lbl">About page</div>
      <a href="#about-intro">Intro</a>
      <a href="#about-exp">Experience</a>
    </nav>

    <form class="main" id="form">

      ${section('hero', 'Hero',
        field('Status badge', 'hero.eyebrow', get(idx, 'hero.eyebrow')),
        field('Subtitle', 'hero.sub', get(idx, 'hero.sub'))
      )}

      ${section('swarm', 'Swarm Sync',
        field('Tag', 'proj.swarm.tag', get(idx, 'proj.swarm.tag')),
        field('Description', 'proj.swarm.desc', get(idx, 'proj.swarm.desc'), true)
      )}

      ${section('yuki', 'Yuki Aim',
        field('Tag', 'proj.yuki.tag', get(idx, 'proj.yuki.tag')),
        field('Description', 'proj.yuki.desc', get(idx, 'proj.yuki.desc'), true)
      )}

      ${section('neuro', 'Neuro-Sama & Evil Neuro',
        field('Tag', 'proj.neuro.tag', get(idx, 'proj.neuro.tag')),
        field('Description', 'proj.neuro.desc', get(idx, 'proj.neuro.desc'), true)
      )}

      ${section('roundtable', 'The Roundtable',
        field('Tag', 'proj.roundtable.tag', get(idx, 'proj.roundtable.tag')),
        field('Description', 'proj.roundtable.desc', get(idx, 'proj.roundtable.desc'), true)
      )}

      ${section('contact', 'Contact',
        field('Email', 'contact.email', get(idx, 'contact.email'))
      )}

      ${section('about-intro', 'About — Intro',
        field('Paragraph', 'about.intro', get(abt, 'about.intro'), true)
      )}

      ${section('about-exp', 'About — Work Experience',
        field('Entries (one per line)', 'about.exp', expToLines(get(abt, 'about.exp')), true),
        '<p class="hint">Format: Role at Company, Year</p>'
      )}

    </form>
  </div>

  <script>
    async function save() {
      const data = new URLSearchParams(new FormData(document.getElementById('form')));
      const r = await fetch('/save', { method: 'POST', body: data });
      if (r.ok) {
        const t = document.getElementById('toast');
        t.classList.add('on');
        setTimeout(() => t.classList.remove('on'), 2200);
      }
    }
  </script>
</body>
</html>`;
}

// ---- HTTP HANDLER -------------------------------------------------

http.createServer((req, res) => {

  if (req.method === 'GET' && req.url === '/') {
    const idx = fs.readFileSync(INDEX, 'utf8');
    const abt = fs.readFileSync(ABOUT, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(buildUI(idx, abt));
    return;
  }

  if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      const data = parseBody(body);
      let idx = fs.readFileSync(INDEX, 'utf8');
      let abt = fs.readFileSync(ABOUT, 'utf8');

      const idxKeys = [
        'hero.eyebrow', 'hero.sub',
        'proj.swarm.tag',     'proj.swarm.desc',
        'proj.yuki.tag',      'proj.yuki.desc',
        'proj.neuro.tag',     'proj.neuro.desc',
        'proj.roundtable.tag','proj.roundtable.desc',
        'contact.email',
      ];
      for (const key of idxKeys) {
        if (data[key] !== undefined) idx = set(idx, key, data[key]);
      }
      if (data['about.intro'] !== undefined) abt = set(abt, 'about.intro', data['about.intro']);
      if (data['about.exp']   !== undefined) abt = set(abt, 'about.exp',   linesToExp(data['about.exp']));

      fs.writeFileSync(INDEX, idx, 'utf8');
      fs.writeFileSync(ABOUT, abt, 'utf8');

      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');

}).listen(PORT, () => {
  console.log(`\n  Admin panel → http://localhost:${PORT}\n`);
});
