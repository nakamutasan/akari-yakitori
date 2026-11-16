// =========================================
// 炭火焼鳥 あかり の動きをつけるファイル
// =========================================

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isSmall = window.innerWidth < 600;

// --- 1. 舞い上がる火の粉（トップ・炭火の章・お品書き・ご予約で使う） ---
// <canvas class="embers" data-count="数"> があれば、そこに火の粉を描く
function createEmbers(canvas) {
  const ctx = canvas.getContext('2d');
  const area = canvas.parentElement;
  // スマホは数を半分くらいにして、軽くする
  const count = Math.round(Number(canvas.dataset.count || 30) * (isSmall ? 0.5 : 1));
  const particles = [];
  let w = 0;
  let h = 0;
  let running = false;

  // 描く場所の大きさを、画面に合わせる（くっきり見えるように）
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // 火の粉を1つ、下から（最初は画面のあちこちから）出す
  function spawn(p, anywhere) {
    p.x = Math.random() * w;
    p.y = anywhere ? Math.random() * h : h + 10;
    p.r = 0.6 + Math.random() * 1.8;        // 大きさ
    p.vy = 0.3 + Math.random() * 0.9;        // のぼる速さ
    p.sway = Math.random() * Math.PI * 2;    // ゆらゆら揺れる動き
    p.swaySpeed = 0.01 + Math.random() * 0.02;
    p.alpha = 0;
    p.max = 0.5 + Math.random() * 0.5;       // いちばん明るいときの明るさ
    return p;
  }

  function draw() {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter'; // 重なると明るく光る

    particles.forEach((p) => {
      p.y -= p.vy;
      p.sway += p.swaySpeed;
      p.x += Math.sin(p.sway) * 0.4;
      p.alpha = Math.min(p.max, p.alpha + 0.02);

      // 上にいくほど消えていき、ちらちら瞬く
      const fadeTop = Math.min(1, p.y / (h * 0.35));
      const a = p.alpha * Math.max(fadeTop, 0) * (0.75 + Math.random() * 0.25);

      ctx.fillStyle = `rgba(255, 130, 50, ${a * 0.22})`; // まわりのぼんやりした光
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 205, 130, ${a})`;       // 火の粉の芯
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();

      if (p.y < -10 || fadeTop <= 0) spawn(p, false);
    });

    requestAnimationFrame(draw);
  }

  resize();
  for (let i = 0; i < count; i++) particles.push(spawn({}, true));

  // その場所が画面に見えている間だけ描く（見えていないときは止めて、電池を節約）
  new IntersectionObserver(([entry]) => {
    const was = running;
    running = entry.isIntersecting;
    if (running && !was) {
      resize();
      requestAnimationFrame(draw);
    }
  }).observe(area);

  window.addEventListener('resize', resize);
}

if (!reduceMotion) {
  document.querySelectorAll('canvas.embers').forEach(createEmbers);
}

// --- 2. スクロールに合わせて動くもの ---
const header = document.querySelector('.header');
const spBar = document.querySelector('.sp-bar');
const tennaiImg = document.querySelector('[data-parallax]');
let ticking = false;

function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const y = window.scrollY;

    // ヘッダー：少しスクロールしたら黒い背景をつける
    header.classList.toggle('is-scrolled', y > 60);

    // スマホの下の予約ボタン：トップを過ぎたら出てくる
    spBar.classList.toggle('is-show', y > window.innerHeight * 0.7);

    // 店内の写真：ゆっくりずらして、奥行きを出す
    if (!reduceMotion && tennaiImg) {
      const r = tennaiImg.parentElement.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) {
        const center = r.top + r.height / 2 - window.innerHeight / 2;
        const base = -r.height * 0.12; // 写真は少し大きめなので、真ん中に来るよう上にずらしておく
        tennaiImg.style.transform = `translate3d(0, ${base - center * 0.1}px, 0)`;
      }
    }
    ticking = false;
  });
}

window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// --- 3. 画面に入ったら表示（ふわっと／のれんが開く／木札が吊り下がる） ---
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });

document.querySelectorAll('.reveal, .noren').forEach((el) => observer.observe(el));

// --- 3-2. お品書き：タブで「串焼・一品・飲みもの」を切り替える ---
const tabs = document.querySelectorAll('.menu-tabs [role="tab"]');
const panels = document.querySelectorAll('.menu-list');

// 表示中の品書きを、もう一度奥から浮かび上がらせる
function showPanel(panel) {
  panel.classList.remove('is-on');
  void panel.offsetWidth; // いったん消えた状態を、ブラウザに確定させる
  setTimeout(() => panel.classList.add('is-on'), 30);
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => t.setAttribute('aria-selected', t === tab));
    panels.forEach((p) => {
      const on = p.id === tab.getAttribute('aria-controls');
      p.hidden = !on;
      if (on) showPanel(p);
    });
  });
});

// 最初の品書き（串焼）は、画面に入ったときに浮かび上がる
const firstPanel = document.querySelector('.menu-list:not([hidden])');
new IntersectionObserver(([entry], obs) => {
  if (entry.isIntersecting) {
    firstPanel.classList.add('is-on');
    obs.disconnect();
  }
}, { threshold: 0.15 }).observe(firstPanel);

// --- 3-3. お品書き：品名の横に、料理の写真がふわっと浮かぶ ---
// パソコン：マウスを乗せると出る（CSS で表示）／スマホ：タップすると出る

// 種類ごとに、順番に見せる写真
const menuPhotos = {
  'menu-kushi': ['images/tori.jpg', 'images/course2.jpg', 'images/course1.jpg'],
  'menu-ippin': ['images/course1.jpg', 'images/course2.jpg'],
  'menu-nomimono': ['images/sake.jpg'],
};

// 品書きの1行ずつに「順番に浮かび上がる時間差」「写真」「タップで写真を出す動き」をつける
// （スプレッドシートから品書きを作り直したときも、もう一度これを呼ぶ）
function prepareMenu(panel) {
  [...panel.children].forEach((li, i) => {
    li.style.setProperty('--delay', `${0.15 + i * 0.08}s`);

    // 品名のすぐ後ろに、写真の枠を入れる
    const photos = menuPhotos[panel.id];
    const thumb = document.createElement('span');
    thumb.className = 'thumb';
    thumb.innerHTML = `<img src="${photos[i % photos.length]}" alt="" loading="lazy">`;
    li.querySelector('.name').after(thumb);

    // タップ（クリック）すると、その品の写真を出す。もう一度タップすると閉じる
    li.addEventListener('click', () => {
      const open = !li.classList.contains('is-open');
      panel.querySelectorAll('li.is-open').forEach((x) => x.classList.remove('is-open'));
      li.classList.toggle('is-open', open);
    });
  });
}

panels.forEach(prepareMenu);

// --- 3-4. お品書き：Google スプレッドシートから読み込む ---
// ▼ メニュー表を「ウェブに公開」したときの CSV のアドレスを、'' の中に貼ります。
//   空のままなら、HTML に書いてある見本のお品書きがそのまま出ます。
//   表の形：A列＝種類（串焼・一品・飲みもの） B列＝品名 C列＝英語名（なくてもOK） D列＝価格（例：220、700〜、時価）
const MENU_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQUE5Di3HEwbOXoyeOwHBuerNI6qtaZr8OTZwuB0lJn-iAMfb6Ah1ABwoeySX5mxUOGl57JmWBwEMsH/pub?gid=0&single=true&output=csv';
const MENU_KINDS = { '串焼': 'menu-kushi', '串焼き': 'menu-kushi', '一品': 'menu-ippin', '飲みもの': 'menu-nomimono', '飲み物': 'menu-nomimono' };

// 「700〜」→ 700<small>円〜</small> のように、数字と後ろの文字に分けて入れる
function makePrice(text) {
  const price = document.createElement('span');
  price.className = 'price';
  const m = text.replace(/[,，円\s]/g, '').match(/^(\d+)(.*)$/);
  if (m) {
    price.textContent = Number(m[1]).toLocaleString('ja-JP');
    const small = document.createElement('small');
    small.textContent = `円${m[2]}`;
    price.append(small);
  } else {
    price.textContent = text; // 「時価」など、数字でないときはそのまま
  }
  return price;
}

async function loadMenu() {
  if (!MENU_SHEET_URL) return;
  try {
    const res = await fetch(MENU_SHEET_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    const rows = parseCSV(await res.text()).slice(1); // 1行目は見出しなので飛ばす

    // 種類ごとに分ける（品名が空の行と、種類が分からない行は飛ばす）
    const groups = {};
    rows.forEach((r) => {
      const id = MENU_KINDS[(r[0] || '').trim()];
      const name = (r[1] || '').trim();
      if (!id || !name) return;
      (groups[id] = groups[id] || []).push({ name, en: (r[2] || '').trim(), price: (r[3] || '').trim() });
    });

    // 表に品がある種類だけ、作り直す（品がない種類は、見本のまま）
    panels.forEach((panel) => {
      const items = groups[panel.id];
      if (!items) return;
      panel.replaceChildren(...items.map((item, i) => {
        const li = document.createElement('li');
        const no = document.createElement('span');
        no.className = 'no';
        no.textContent = String(i + 1).padStart(2, '0');
        const name = document.createElement('span');
        name.className = 'name';
        name.textContent = item.name;
        if (item.en) {
          const em = document.createElement('em');
          em.textContent = item.en;
          name.append(em);
        }
        const line = document.createElement('span');
        line.className = 'line';
        li.append(no, name, line, makePrice(item.price));
        return li;
      }));
      prepareMenu(panel);
      if (panel.classList.contains('is-on')) showPanel(panel);
    });
  } catch (err) {
    // 読めなかったときは、見本のお品書きをそのまま残す
    console.warn('お品書きを読み込めませんでした', err);
  }
}

loadMenu();

// --- 4. 三つのこだわり：章が画面に入ったら、写真・筆文字・説明を出す ---
const craftObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-in');
      craftObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.45 });

document.querySelectorAll('.craft').forEach((el) => craftObserver.observe(el));

// --- 5. スマホ用メニュー ---
const toggle = document.querySelector('.menu-toggle');

toggle.addEventListener('click', () => {
  const open = document.body.classList.toggle('menu-open');
  toggle.setAttribute('aria-expanded', open);
  toggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
});

document.querySelectorAll('.nav a').forEach((a) => a.addEventListener('click', () => {
  document.body.classList.remove('menu-open');
  toggle.setAttribute('aria-expanded', false);
}));

// --- 6. 見本サイト用：予約ボタンを押したときのお知らせ ---
const toast = document.querySelector('.toast');
let toastTimer;

document.querySelectorAll('[data-demo]').forEach((el) => el.addEventListener('click', (e) => {
  e.preventDefault();
  toast.textContent = 'ポートフォリオ用の見本サイトのため、予約はできません。';
  toast.classList.add('is-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-show'), 3000);
}));

// --- 7. お知らせ：Google スプレッドシートから読み込む ---
// ▼ スプレッドシートを「ウェブに公開」したときの CSV のアドレスを、'' の中に貼ります。
//   空のままなら、HTML に書いてある見本のお知らせがそのまま出ます。
const NEWS_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQvV9H71kXUdjosd4XhNDk63uAogjazBnXoLc_Sg_Ua4WSfCkRptoKRkjLIrEX3Vz-letUAweBfdBuM/pub?gid=0&single=true&output=csv';
const NEWS_MAX = 5; // 表示するお知らせの数（上から順に）

// CSV（カンマ区切りの文字）を、表の形（行と列）に直す
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

async function loadNews() {
  const list = document.getElementById('news-list');
  if (!list || !NEWS_SHEET_URL) return;
  try {
    const res = await fetch(NEWS_SHEET_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    // 1行目は見出し（日付・ラベル・お知らせ）なので飛ばす。本文が空の行も飛ばす
    const items = parseCSV(await res.text())
      .slice(1)
      .map((r) => ({ date: (r[0] || '').trim(), tag: (r[1] || '').trim(), text: (r[2] || '').trim() }))
      .filter((n) => n.text)
      .slice(0, NEWS_MAX);
    if (!items.length) return;

    // 文字は textContent で入れる（スプレッドシートに何を書かれても、安全に文字として出す）
    list.replaceChildren(...items.map((n) => {
      const li = document.createElement('li');
      const time = document.createElement('time');
      const tag = document.createElement('span');
      const p = document.createElement('p');
      time.textContent = n.date;
      tag.className = 'news-tag';
      tag.textContent = n.tag;
      p.textContent = n.text;
      if (!n.tag) li.classList.add('no-tag');
      li.append(time, tag, p);
      return li;
    }));
  } catch (err) {
    // 読めなかったときは、見本のお知らせをそのまま残す
    console.warn('お知らせを読み込めませんでした', err);
  }
}

loadNews();
