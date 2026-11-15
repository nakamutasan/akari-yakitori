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

// 品書きの1行ずつに「何番目か」をつけて、上から順番に浮かび上がるようにする
panels.forEach((panel) => {
  [...panel.children].forEach((li, i) => li.style.setProperty('--delay', `${0.15 + i * 0.08}s`));
});

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

panels.forEach((panel) => {
  [...panel.children].forEach((li, i) => {
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
});

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
