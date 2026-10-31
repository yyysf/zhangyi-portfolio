/* 张艺的作品集 · 2026
   内容渲染、滚动叙事与几处小交互。无第三方依赖。 */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const categories = ['scripts', 'essays', 'papers', 'films', 'sound', 'stage'];
const categoryNames = { scripts: '原创剧本', essays: '影评随笔', papers: '文学与戏剧研读札记', films: '影像成片', stage: '舞台实践', sound: '声音时间' };
const returnKey = 'zhangyi-portfolio:return';
const restoreKey = 'zhangyi-portfolio:restore';
const historyKey = 'zhangyi-portfolio:history';
const isHome = document.body.dataset.page === 'home';
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let siteTitle = '张艺的作品集';
let allWorks = [];
let contentReady = false;

/* ---------- 小工具 ---------- */

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function safeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value, location.href);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}
function getStored(key) {
  try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; }
}
function store(key, value) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage is optional. */ }
}
function removeStored(key) {
  try { sessionStorage.removeItem(key); } catch { /* Storage is optional. */ }
}
function workLink(work, text = '阅读作品', className = 'line-link') {
  const link = element('a', `${className} work-link-target`);
  link.href = `work.html?id=${encodeURIComponent(work.id)}`;
  link.dataset.category = work.category;
  const arrow = element('span', '', '↗');
  arrow.setAttribute('aria-hidden', 'true');
  link.append(text, arrow);
  return link;
}
function coverLink(work, className = '') {
  const link = element('a', `cover-link ${className}`.trim());
  link.href = `work.html?id=${encodeURIComponent(work.id)}`;
  link.dataset.category = work.category;
  link.classList.add('work-link-target');
  link.setAttribute('aria-label', `阅读${work.title}`);
  return link;
}
function cue(label) {
  return element('span', 'postcard__cue', label);
}
function metadata(work) {
  const meta = element('div', 'work-meta');
  meta.append(element('span', '', work.subtitle || work.categoryLabel));
  if (work.award) meta.append(element('span', 'award-label', '获奖作品'));
  if (work.demo) meta.append(element('span', 'demo-label', '示例内容'));
  return meta;
}
function ratioClass(work) {
  return work.imageRatio === 'portrait' ? 'ratio-portrait'
    : work.imageRatio === 'square' ? 'ratio-square'
      : 'ratio-landscape';
}
function image(work, eager = false, sizes = '(max-width: 767px) calc(100vw - 40px), (max-width: 980px) 90vw, 760px') {
  const img = element('img');
  const full = safeUrl(work.image);
  img.src = full || '';
  img.alt = work.imageAlt || `${work.title}配图`;
  img.width = Number(work.imageWidth) || 1536;
  img.height = Number(work.imageHeight) || 1024;
  if (full && safeUrl(work.imageSmall)) {
    img.srcset = `${safeUrl(work.imageSmall)} 700w, ${full} ${img.width}w`;
    img.sizes = sizes;
  }
  img.loading = eager ? 'eager' : 'lazy';
  img.decoding = 'async';
  return img;
}
function hook(work) {
  const text = work.summary || '';
  const cut = text.search(/[。；！？]/);
  let line = cut > 0 ? text.slice(0, cut + 1) : text;
  if (line.length > 34) line = `${line.slice(0, 34)}…`;
  return line;
}
function readingTime(work) {
  const text = (work.sections || []).map(section => [
    ...(section.paragraphs || []),
    ...(section.blocks || []).map(block => (block.speaker || '') + (block.text || ''))
  ].join('')).join('');
  return Math.max(1, Math.round(text.replace(/\s/g, '').length / 420));
}
function wordCount(work) {
  const text = (work.sections || []).map(section => [
    ...(section.paragraphs || []),
    ...(section.blocks || []).map(block => (block.speaker || '') + (block.text || ''))
  ].join('')).join('');
  const count = text.replace(/\s/g, '').length;
  return count >= 10000 ? `全文约 ${(count / 10000).toFixed(1)} 万字` : `全文 ${count} 字`;
}
function firstSentence(text) {
  if (!text) return '';
  const cut = text.indexOf('。');
  return cut > 0 ? text.slice(0, cut + 1) : text.slice(0, 42);
}
function slug(index) { return `section-${index + 1}`; }

/* ---------- 页面级交互 ---------- */

// 章节目录与场次导航共用同一条判定线：视口 34%。
// 原来章节走 IntersectionObserver 的 18%–35% 观察带、场次走 34% 探针，
// 两套阈值在文末给出不同答案——实测滚到 10800px 时章节还停在上一节，
// 同一位置的场次却已经翻到下一节去了。改成同一个探针、同一次扫描，
// 两级高亮就永远指向同一节。
const READ_PROBE = .34;

let scrollTick = false;
// 阅读进度的分母用正文高度，不用整页高度：
// 整页口径下，文末的「感谢阅读」、上一篇/下一篇和页脚会把满格稀释掉，
// 读到最后一个字时进度条才走到八成。
// 不缓存 offsetHeight：图片解码后正文会继续长高，缓存下来的旧值
// 会让文末停在六成多。这里读之前 updateScrollUI 已经量过 scrollHeight，
// 布局是干净的，再读一次 offsetHeight 不会额外重排。
function readingProgress(y, viewport) {
  const article = document.querySelector('.work-article');
  if (!article) return null;
  const headerH = $('#site-header')?.offsetHeight || 0;
  const start = article.offsetTop - headerH;
  const span = article.offsetTop + article.offsetHeight - viewport - start;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (y - start) / span));
}
function updateScrollUI() {
  const y = window.scrollY || document.documentElement.scrollTop;
  const viewport = innerHeight;
  const scrollable = document.documentElement.scrollHeight - viewport;
  const ratio = scrollable > 0 ? Math.min(1, Math.max(0, y / scrollable)) : 0;
  const header = $('#site-header');
  if (header) {
    header.classList.toggle('is-scrolled', y > 24);
    const probe = header.offsetHeight * .55;
    // 深色块统一挂 data-dark，页眉反色只认这一个标记
    let onDark = false;
    $$('[data-dark]').forEach(section => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= probe && rect.bottom >= probe) onDark = true;
    });
    header.classList.toggle('is-on-dark', onDark);
  }
  updateReadingNav();
  if (!reduceMotion) {
    const mid = viewport / 2;
    $$('.chapter-plate__bg img').forEach(img => {
      const plate = img.closest('.chapter-plate');
      if (!plate) return;
      const rect = plate.getBoundingClientRect();
      if (rect.bottom < -160 || rect.top > viewport + 160) return;
      const progress = (rect.top + rect.height / 2 - mid) / viewport;
      const offset = Math.max(-26, Math.min(26, progress * -46));
      img.style.setProperty('--pl-y', `${offset.toFixed(1)}px`);
    });
  }
  const bar = $('#scroll-progress-bar');
  if (bar) bar.style.transform = `scaleX(${ratio})`;
  const reading = $('#reading-progress-bar');
  if (reading) reading.style.transform = `scaleX(${readingProgress(y, viewport) ?? ratio})`;

  if (isHome) {
    const sections = $$('main section[id]');
    const point = y + viewport * .38;
    let current = '';
    sections.forEach(section => {
      const top = section.getBoundingClientRect().top + y;
      if (top <= point) current = section.id;
    });
    $$('[data-nav]').forEach(link => {
      const active = link.dataset.nav === current;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    const counter = $('#header-chapter');
    if (counter) {
      const chapterMap = { home: '00', about: '01', scripts: '02', essays: '03', papers: '04', sound: '05', showcase: '06', thanks: '07' };
      const value = `${chapterMap[current] || '00'} / 07`;
      if (counter.textContent !== value) counter.textContent = value;
    }
  }
  scrollTick = false;
}
function onScroll() {
  if (!scrollTick) {
    scrollTick = true;
    requestAnimationFrame(updateScrollUI);
  }
}

function setupHeader() {
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  updateScrollUI();
}

function setupMenu() {
  const dialog = $('#index-dialog');
  const toggle = $('.menu-toggle');
  const close = $('.index-close');
  if (!dialog || !toggle) return;
  const preview = $('#index-preview-image');
  const caption = $('#index-preview-caption');
  const previewBox = $('.index-preview');
  let previewTimer = 0;

  const open = () => {
    if (typeof dialog.showModal !== 'function') { location.hash = '#about'; return; }
    dialog.tabIndex = -1;
    dialog.showModal();
    document.body.classList.add('is-locked');
    toggle.setAttribute('aria-expanded', 'true');
    dialog.focus({ preventScroll: true });
  };
  const closeMenu = () => {
    if (dialog.open) dialog.close();
  };
  toggle.addEventListener('click', open);
  close?.addEventListener('click', closeMenu);
  dialog.addEventListener('close', () => {
    document.body.classList.remove('is-locked');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.classList.add('no-ring');
    toggle.focus({ preventScroll: true });
    toggle.addEventListener('blur', () => toggle.classList.remove('no-ring'), { once: true });
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog) closeMenu();
  });

  $$('[data-menu-link]', dialog).forEach(link => {
    const showPreview = () => {
      const source = link.dataset.preview;
      if (!source || !preview || !caption) return;
      clearTimeout(previewTimer);
      previewBox?.classList.add('is-changing');
      previewTimer = setTimeout(() => {
        // 换图必须连 width/height 属性一起换：卡现在按图的真实比例排版，
        // 属性还留着上一张的（初始是首屏那张 768×512），新图解码完成前卡片
        // 会先按旧比例撑出一个错的尺寸，解码后再跳一下。
        if (link.dataset.previewW) {
          preview.width = Number(link.dataset.previewW);
          preview.height = Number(link.dataset.previewH);
        }
        preview.src = source;
        preview.alt = '';
        caption.textContent = link.dataset.previewCaption || '';
        previewBox?.classList.remove('is-changing');
      }, 130);
    };
    link.addEventListener('mouseenter', showPreview);
    link.addEventListener('focus', showPreview);
    link.addEventListener('click', event => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      event.preventDefault();
      closeMenu();
      setTimeout(() => {
        target.setAttribute('tabindex', '-1');
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        target.focus({ preventScroll: true });
        target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
        history.replaceState(null, '', link.getAttribute('href'));
      }, 80);
    });
  });
}

let revealObserver;
function observeReveals(scope = document) {
  const nodes = $$('.reveal, .reveal-figure', scope).filter(node => !node.classList.contains('is-inview'));
  if (!('IntersectionObserver' in window) || reduceMotion) {
    nodes.forEach(node => node.classList.add('is-inview'));
    return;
  }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-inview');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  }
  nodes.forEach(node => revealObserver.observe(node));
}
function setupReveals() { observeReveals(); }

function setupRoomPreview() {
  const root = $('[data-room-index]');
  if (!root) return;
  const preview = $('#room-preview-image');
  const caption = $('#room-preview-caption');
  const figure = $('.room-preview');
  const rooms = $$('.room', root);
  let timer = 0;
  const activate = room => {
    const source = room.dataset.preview;
    if (!source || !preview) return;
    rooms.forEach(item => item.classList.toggle('is-active', item === room));
    clearTimeout(timer);
    figure?.classList.add('is-changing');
    timer = setTimeout(() => {
      preview.src = source;
      caption.textContent = room.dataset.previewCaption || '';
      figure?.classList.remove('is-changing');
    }, 150);
  };
  rooms.forEach(room => {
    room.addEventListener('mouseenter', () => activate(room));
    room.addEventListener('focus', () => activate(room));
  });
}

function setupLightbox() {
  const lightbox = $('#lightbox');
  const lightboxImage = $('#lightbox-image');
  const lightboxCaption = $('#lightbox-caption');
  if (!lightbox || !lightboxImage) return;
  const prev = $('.lightbox-prev', lightbox);
  const next = $('.lightbox-next', lightbox);
  let lastTrigger = null;
  let group = [];
  let groupIndex = 0;

  const markTriggers = () => {
    $$('[data-lightbox-src]').forEach(trigger => {
      if (trigger.tagName === 'BUTTON' || trigger.tagName === 'A') return;
      trigger.setAttribute('role', 'button');
      trigger.tabIndex = 0;
      if (!trigger.getAttribute('aria-label')) trigger.setAttribute('aria-label', '放大查看图片');
    });
  };
  const show = trigger => {
    const source = trigger.dataset.lightboxSrc;
    if (!source) return;
    groupIndex = Math.max(0, group.indexOf(trigger));
    lightboxImage.src = source;
    lightboxImage.alt = trigger.dataset.lightboxAlt || trigger.querySelector('img')?.alt || '';
    lightboxCaption.textContent = trigger.dataset.lightboxCaption || '';
    const hasGroup = group.length > 1;
    lightbox.classList.toggle('has-group', hasGroup);
    if (prev) prev.disabled = !hasGroup;
    if (next) next.disabled = !hasGroup;
  };
  const open = trigger => {
    lastTrigger = trigger;
    const gallery = trigger.closest('.work-gallery');
    group = gallery ? $$('[data-lightbox-src]', gallery) : [trigger];
    show(trigger);
    lightbox.showModal();
    document.body.classList.add('is-locked');
  };
  const step = direction => {
    if (group.length < 2) return;
    const nextIndex = (groupIndex + direction + group.length) % group.length;
    show(group[nextIndex]);
  };
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-lightbox-src]');
    if (trigger) { event.preventDefault(); open(trigger); }
  });
  document.addEventListener('keydown', event => {
    if (!lightbox.open) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
  });
  document.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && document.activeElement?.matches('[data-lightbox-src]:not(button):not(a)')) {
      event.preventDefault();
      open(document.activeElement);
    }
  });
  prev?.addEventListener('click', event => { event.stopPropagation(); step(-1); });
  next?.addEventListener('click', event => { event.stopPropagation(); step(1); });
  $('.lightbox-close')?.addEventListener('click', () => lightbox.close());
  lightbox.addEventListener('click', event => {
    if (event.target === lightbox) lightbox.close();
  });
  lightbox.addEventListener('close', () => {
    document.body.classList.remove('is-locked');
    lightboxImage.src = 'assets/images/meadow-small.webp';
    lightboxImage.alt = '';
    lightboxCaption.textContent = '';
    lightbox.classList.remove('has-group');
    group = [];
    lastTrigger?.focus({ preventScroll: true });
    lastTrigger = null;
  });
  markTriggers();
  window.markLightboxTriggers = markTriggers;
}

function setupVideoLightbox() {
  const dialog = $('#video-lightbox');
  const player = $('#video-lightbox-player');
  if (!dialog || !player) return;
  let lastTrigger = null;
  const open = trigger => {
    const source = trigger.dataset.videoSrc;
    if (!source) return;
    lastTrigger = trigger;
    player.src = source;
    player.poster = trigger.dataset.videoPoster || '';
    dialog.showModal();
    document.body.classList.add('is-locked');
    player.play().catch(() => { /* The controls remain available. */ });
  };
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-video-src]');
    if (!trigger) return;
    event.preventDefault();
    open(trigger);
  });
  $('.lightbox-close', dialog)?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('is-locked');
    player.pause();
    player.removeAttribute('src');
    player.load();
    lastTrigger?.focus({ preventScroll: true });
    lastTrigger = null;
  });
}

function setupRandomWork() {
  const button = $('#random-work');
  if (!button) return;
  button.addEventListener('click', () => {
    if (!allWorks.length) return;
    const work = allWorks[Math.floor(Math.random() * allWorks.length)];
    document.body.classList.add('is-leaving');
    setTimeout(() => {
      location.href = `work.html?id=${encodeURIComponent(work.id)}`;
    }, reduceMotion ? 0 : 280);
  });
}

function setupCopyLink() {
  const button = $('#copy-link');
  const toast = $('#toast');
  if (!button) return;
  let toastTimer = 0;
  button.addEventListener('click', async () => {
    const value = location.href.split('#')[0];
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const helper = element('textarea');
      helper.value = value;
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.append(helper);
      helper.select();
      try { document.execCommand('copy'); } catch { /* Copy can fail on old browsers. */ }
      helper.remove();
    }
    if (toast) {
      toast.textContent = '链接已复制';
      toast.classList.add('is-visible');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
    }
  });
}

/* ---------- 声音试听 ---------- */

function buildWaveform() {
  const waveform = $('.waveform');
  if (!waveform || waveform.children.length) return;
  const heights = [30, 55, 42, 78, 48, 64, 35, 88, 50, 72, 38, 60, 82, 45, 68, 32, 54, 76, 40, 62, 86, 48, 58, 34, 70, 44, 80, 52, 66, 36];
  heights.forEach((height, index) => {
    const bar = element('i');
    bar.style.setProperty('--h', `${height}%`);
    bar.style.setProperty('--i', index);
    waveform.append(bar);
  });
}
function setupSoundPreview() {
  buildWaveform();
  const button = $('#sound-preview-toggle');
  const audio = $('#sound-preview-audio');
  const wrapper = $('.sound-preview');
  const label = $('.sound-preview__label', button || document);
  const time = $('.sound-preview__time');
  if (!button || !audio) return;

  const format = seconds => {
    if (!Number.isFinite(seconds)) return '00:00';
    const total = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(total / 60);
    const rest = total % 60;
    return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  };
  const reset = () => {
    wrapper?.classList.remove('is-playing');
    button.setAttribute('aria-pressed', 'false');
    if (label) label.textContent = '试听《今晚，稻田没有睡》';
    if (time) time.textContent = format(audio.duration || 241);
  };

  button.addEventListener('click', async () => {
    if (audio.paused) {
      $$('audio,video').forEach(other => { if (other !== audio) other.pause(); });
      try {
        await audio.play();
      } catch (error) {
        if (label) label.textContent = error?.name === 'NotAllowedError' ? '请再点一次播放' : '音频暂不可用';
      }
    } else {
      audio.pause();
    }
  });
  audio.addEventListener('play', () => {
    wrapper?.classList.add('is-playing');
    button.setAttribute('aria-pressed', 'true');
    if (label) label.textContent = '暂停试听';
  });
  audio.addEventListener('pause', reset);
  audio.addEventListener('ended', reset);
  audio.addEventListener('error', () => {
    if (label) label.textContent = '音频暂不可用';
    wrapper?.classList.remove('is-playing');
    button.setAttribute('aria-pressed', 'false');
  });
  audio.addEventListener('loadedmetadata', () => {
    if (time) time.textContent = format(audio.duration);
  });
  audio.addEventListener('timeupdate', () => {
    if (time && !audio.paused) time.textContent = `${format(audio.currentTime)} / ${format(audio.duration)}`;
  });
  addEventListener('pagehide', () => audio.pause());
}

/* ---------- 首页渲染 ---------- */

function scriptExcerpt(work) {
  if (Array.isArray(work.homeExcerpt) && work.homeExcerpt.length) {
    const curated = element('div', 'script-excerpt');
    work.homeExcerpt.forEach(item => {
      if (item.type === 'dialogue') {
        const dialogue = element('dl', 'script-dialogue');
        dialogue.append(element('dt', '', item.speaker || '人物'), element('dd', '', item.text));
        curated.append(dialogue);
      } else if (item.type === 'scene') {
        curated.append(element('p', 'script-scene-line', item.text));
      } else {
        curated.append(element('p', 'script-action', item.text));
      }
    });
    return curated;
  }
  const blocks = (work.sections || []).flatMap(section => section.blocks || []);
  const start = blocks.findIndex(block => block.type === 'scene');
  const fromScene = start >= 0 ? blocks.slice(start) : blocks;
  const nextScene = fromScene.findIndex((block, index) => index > 0 && block.type === 'scene');
  const sceneBlocks = nextScene > 0 ? fromScene.slice(0, nextScene) : fromScene;
  const scene = sceneBlocks.find(block => block.type === 'scene');
  const dialogues = sceneBlocks.filter(block => block.type === 'dialogue').slice(0, 2);
  const action = sceneBlocks.find(block => block.type === 'paragraph');
  const box = element('div', 'script-excerpt');
  if (scene) box.append(element('p', 'script-scene-line', scene.text));
  if (action) box.append(element('p', 'script-action', action.text));
  dialogues.forEach(item => {
    const dialogue = element('dl', 'script-dialogue');
    dialogue.append(element('dt', '', item.speaker || '人物'), element('dd', '', item.text));
    box.append(dialogue);
  });
  if (!scene && !action && !dialogues.length) {
    const first = work.sections?.[0]?.paragraphs?.[0];
    if (first) box.append(element('p', 'script-action', firstSentence(first)));
  }
  return box;
}

function renderScripts(works, container) {
  works.forEach((work, index) => {
    const hasImage = Boolean(safeUrl(work.image));
    const article = element('article', `script-card reveal ${hasImage && index === 0 ? 'script-card--feature' : 'script-card--note'}`);
    article.style.setProperty('--delay', `${Math.min(index * .08, .24)}s`);

    const body = element('div', 'script-body');
    const kicker = element('p', 'work-kicker');
    kicker.append(element('b', '', String(index + 1).padStart(2, '0')), document.createTextNode(`${work.subtitle || work.categoryLabel}`));
    if (work.demo) kicker.append(element('span', 'demo-label', '示例'));
    body.append(kicker);

    const heading = element('h3', 'script-title');
    const headingLink = workLink(work, work.title, '');
    headingLink.lastElementChild.remove();
    heading.append(headingLink);
    body.append(heading, element('p', 'script-hook', work.hook || hook(work)));
    if (work.pullQuote) {
      const pull = element('blockquote', 'script-pull');
      pull.append(element('p', '', work.pullQuote));
      if (work.pullFrom) pull.append(element('cite', '', work.pullFrom));
      body.append(pull);
    }
    body.append(workLink(work, '读全文'));

    if (hasImage) {
      const figure = element('figure', `script-media reveal-figure ${ratioClass(work)}`);
      const link = coverLink(work, 'script-media__link');
      link.append(image(work, index === 0, '(max-width: 767px) calc(100vw - 40px), (max-width: 980px) 90vw, 680px'), cue('阅读'));
      figure.append(element('span', 'script-media__tag', `剧本 ${String(index + 1).padStart(2, '0')}`), link);
      const caption = element('figcaption');
      caption.append(element('span', '', work.imageCaption || '作品封面'), element('span', '', work.pdf ? '剧本全文' : '作品'));
      figure.append(caption);
      article.append(figure, body);
    } else {
      const quote = element('aside', 'script-quote-panel');
      const quoteText = element('p', 'script-quote', work.excerpt || firstSentence(work.sections?.[0]?.paragraphs?.[0] || ''));
      const footer = element('footer');
      footer.append(element('span', '', work.subtitle || '独幕剧'), element('span', '', '片段'));
      quote.append(quoteText, footer);
      article.append(body, quote);
    }
    container.append(article);
  });
}

function renderEssays(works, container) {
  works.forEach((work, index) => {
    const article = element('article', 'essay-card reveal');
    article.style.setProperty('--delay', `${Math.min(index * .1, .2)}s`);

    const content = element('div', 'essay-content');
    content.append(element('span', 'essay-no', String(index + 1).padStart(2, '0')), metadata(work));
    const heading = element('h3');
    const link = workLink(work, work.title, '');
    link.lastElementChild.remove();
    heading.append(link);
    content.append(heading, element('p', 'essay-summary', work.summary));
    const quote = work.sections?.[0]?.paragraphs?.[1];
    if (quote) content.append(element('blockquote', 'essay-quote', firstSentence(quote)));
    const footer = element('div', 'essay-foot');
    footer.append(element('span', 'essay-time', `阅读约 ${readingTime(work)} 分钟`), workLink(work, '阅读全文'));
    content.append(footer);

    if (safeUrl(work.image)) {
      const portrait = work.imageRatio === 'portrait';
      const figure = element('figure', `essay-visual essay-visual--${portrait ? 'portrait' : 'landscape'} reveal-figure`);
      // 两件作品的版式必须一致：以前横图走通栏「图在上、字在下」、
      // 竖图走「图左、字右」，同一房间里一件占满整幅、另一件只占四分之一，
      // 读起来像两套版式。现在统一成图左字右，只有图版列宽按比例不同。
      // 列宽不同是为了让两张图版的面积接近（560×306 ≈ 352×507），
      // 不是随手给的数——详见 style.css 的 .essay-card 注释。
      article.classList.add(portrait ? 'essay-card--portrait' : 'essay-card--landscape');
      const w = Number(work.imageWidth);
      const h = Number(work.imageHeight);
      // --ar 两种都要写：图版框按原图比例排版，cover 才不会裁掉画面边缘的构图。
      if (w && h) figure.style.setProperty('--ar', `${w} / ${h}`);
      const coverAnchor = coverLink(work, 'essay-visual__link');
      coverAnchor.append(
        image(work, index === 0, portrait
          ? '(max-width: 767px) 62vw, (max-width: 980px) 44vw, 340px'
          : '(max-width: 767px) calc(100vw - 40px), (max-width: 980px) 62vw, 560px'),
        cue('阅读')
      );
      figure.append(coverAnchor);
      if (work.imageCaption) figure.append(element('figcaption', '', work.imageCaption));
      article.append(figure, content);
    } else {
      article.append(content);
    }
    container.append(article);
  });
}

function renderPapers(works, container) {
  works.forEach((work, index) => {
    const article = element('article', 'paper-item reveal');
    article.style.setProperty('--delay', `${Math.min(index * .08, .24)}s`);

    const thumb = coverLink(work, `paper-thumb ${ratioClass(work)}`);
    thumb.setAttribute('aria-label', `阅读《${work.title}》`);
    thumb.append(image(work, index === 0, '(max-width: 767px) 96px, 96px'));
    article.append(thumb);

    const body = element('div', 'paper-body');
    const kicker = element('p', 'work-kicker');
    kicker.append(element('b', '', String(index + 1).padStart(2, '0')), document.createTextNode(work.subtitle || work.categoryLabel));
    body.append(kicker);

    const heading = element('h3', 'paper-title');
    const link = workLink(work, work.title, '');
    link.lastElementChild.remove();
    heading.append(link);
    body.append(heading, element('p', 'paper-summary', work.summary));

    const foot = element('div', 'paper-foot');
    foot.append(element('span', '', `${wordCount(work)} 字`), element('span', '', `阅读约 ${readingTime(work)} 分钟`), workLink(work, '读全文'));
    body.append(foot);
    article.append(body);
    container.append(article);
  });
}

function renderFilms(works, container) {
  works.forEach((work, index) => {
    const article = element('article', 'film-card reveal');
    const top = element('div', 'film-topline');
    top.append(element('span', '', `影像 ${String(index + 1).padStart(2, '0')}`), element('span', '', work.subtitle || work.categoryLabel), element('span', '', '静帧'));
    article.append(top);

    if (safeUrl(work.image)) {
      const figure = element('figure', `film-frame reveal-figure ${ratioClass(work)}`);
      const frameWidth = Number(work.imageWidth) || 16;
      const frameHeight = Number(work.imageHeight) || 9;
      if (frameHeight > frameWidth) article.classList.add('film-card--portrait');
      figure.style.setProperty('--ar', `${frameWidth} / ${frameHeight}`);
      if (frameHeight > frameWidth) figure.classList.add('is-portrait');
      const link = coverLink(work, 'film-frame__link');
      // 06 展演距首屏 5 屏以上，封面不该在首屏就抢带宽——与首屏 hero 同一批请求
      // 会拖慢 LCP。四张全部 lazy，滚动到附近再取。
      link.append(image(work, false, '(max-width: 767px) calc(100vw - 40px), (max-width: 1180px) 90vw, 1160px'));
      const play = element('button', 'film-play');
      play.type = 'button';
      if (safeUrl(work.media?.src)) {
        play.dataset.videoSrc = safeUrl(work.media.src);
        play.dataset.videoPoster = safeUrl(work.image) || '';
        play.append(element('span', 'film-play-icon'), document.createTextNode('观看作品'));
      } else {
        play.dataset.lightboxSrc = safeUrl(work.image);
        play.dataset.lightboxCaption = work.imageCaption || `${work.title} · 静帧`;
        play.dataset.lightboxAlt = work.imageAlt || work.title;
        play.append(element('span', 'film-play-icon'), document.createTextNode('查看静帧'));
      }
      figure.append(link, cue('阅读'), play);
      const caption = element('figcaption', 'film-frame-caption');
      caption.append(element('span', '', work.imageCaption || '作品静帧'), element('span', '', '二〇二五'));
      figure.append(caption);
      article.append(figure);
    }

    const copy = element('div', 'film-copy');
    const main = element('div');
    main.append(metadata(work));
    const heading = element('h3');
    const link = workLink(work, work.title, '');
    link.lastElementChild.remove();
    heading.append(link);
    main.append(heading, element('p', 'film-summary', work.summary));
    const second = work.sections?.find(section => section.title === '关于这次创作')?.paragraphs?.[0];
    if (second) main.append(element('p', 'film-summary', firstSentence(second)));

    const meta = element('div', 'film-meta');
    const dl = element('dl');
    [['形式', work.subtitle || '影像'], ['职责', work.role || '文案'], ['获奖', work.award || '—'], ['年份', work.year || '2025']].forEach(([term, value]) => {
      dl.append(element('dt', '', term), element('dd', '', value));
    });
    meta.append(dl, workLink(work, '阅读作品解析'));
    copy.append(main, meta);
    article.append(copy);
    container.append(article);
  });
}

function renderStage(works, container) {
  works.forEach(work => {
    const article = element('article', 'stage-card reveal');
    if (safeUrl(work.image)) {
      const figure = element('figure', `stage-visual reveal-figure ${ratioClass(work)}`);
      const link = coverLink(work, 'stage-visual__link');
      link.append(image(work, false, '(max-width: 767px) calc(100vw - 40px), (max-width: 980px) 90vw, 620px'));
      figure.append(link, cue('阅读'));
      figure.append(element('span', 'stage-beat', '舞台 01'));
      figure.append(element('figcaption', 'stage-caption', work.imageCaption || '舞台作品'));
      article.append(figure);
    }
    const body = element('div', 'stage-body');
    body.append(metadata(work));
    const heading = element('h3', 'stage-title');
    const link = workLink(work, work.title, '');
    link.lastElementChild.remove();
    heading.append(link);
    body.append(heading, element('p', 'stage-summary', work.summary));

    const controls = element('div', 'stage-controls');
    const switchButton = element('button', 'light-switch');
    switchButton.type = 'button';
    switchButton.setAttribute('aria-pressed', 'false');
    const dot = element('span', 'light-switch__dot');
    const switchLabel = element('span', 'light-switch__label', '开灯');
    switchButton.append(dot, switchLabel);
    controls.append(switchButton, element('span', 'stage-hint', '试试把舞台的灯打开'));
    body.append(controls);

    const notes = element('div', 'stage-notes');
    (work.sections || []).filter(section => ['人物', '排演与主创', '关于这部戏'].includes(section.title)).slice(0, 3).forEach((section, index) => {
      const note = element('div', 'stage-note');
      const text = element('div');
      text.append(element('h4', '', section.title), element('p', '', firstSentence(section.paragraphs?.[0] || '')));
      note.append(element('span', 'stage-note-no', String(index + 1).padStart(2, '0')), text);
      notes.append(note);
    });
    body.append(notes);

    const stills = (work.gallery || []).filter(item => safeUrl(item.image)).slice(0, 3);
    if (stills.length) {
      const strip = element('div', 'stage-strip');
      stills.forEach(still => {
        const shot = element('button', 'stage-strip__item');
        shot.type = 'button';
        shot.dataset.lightboxSrc = safeUrl(still.image);
        shot.dataset.lightboxCaption = still.caption || '';
        shot.dataset.lightboxAlt = still.imageAlt || '';
        shot.setAttribute('aria-label', `放大查看${still.caption || work.title + '剧照'}`);
        const stillImage = element('img');
        stillImage.src = safeUrl(still.imageSmall) || safeUrl(still.image);
        stillImage.alt = still.imageAlt || '';
        stillImage.width = 700;
        stillImage.height = 467;
        stillImage.loading = 'lazy';
        stillImage.decoding = 'async';
        shot.append(stillImage);
        strip.append(shot);
      });
      body.append(strip);
    }

    body.append(workLink(work, '阅读实践记录'));
    article.append(body);
    container.append(article);

    switchButton.addEventListener('click', () => {
      const lit = !article.classList.contains('is-lit');
      article.classList.toggle('is-lit', lit);
      switchButton.setAttribute('aria-pressed', String(lit));
      switchLabel.textContent = lit ? '关灯' : '开灯';
      const hint = $('.stage-hint', controls);
      if (hint) hint.textContent = lit ? '灯亮了，树影落在地上' : '试试把舞台的灯打开';
    });
  });
  const quote = element('blockquote', 'stage-quote reveal');
  quote.append(document.createTextNode('我必须是你近旁的一株木棉，'));
  quote.append(element('br'));
  quote.append(document.createTextNode('作为树的形象和你站在一起。'));
  quote.append(element('small', '', '舒婷 ·《致橡树》'));
  container.append(quote);
}

function soundThumb(work) {
  const wrap = element('span', 'sound-item__thumb');
  const source = safeUrl(work.imageSmall) || safeUrl(work.image);
  if (!source) { wrap.classList.add('is-empty'); return wrap; }
  const img = element('img');
  img.src = source;
  img.alt = '';
  img.width = 128;
  img.height = 128;
  img.loading = 'lazy';
  img.decoding = 'async';
  wrap.append(img);
  return wrap;
}

function renderSound(works, container) {
  works.forEach((work, index) => {
    const article = element('article', 'sound-item reveal');
    article.style.setProperty('--delay', `${Math.min(index * .09, .27)}s`);
    const head = element('button', 'sound-item__head');
    head.type = 'button';
    head.setAttribute('aria-expanded', 'false');
    head.id = `sound-head-${index}`;
    head.append(
      soundThumb(work),
      element('span', 'sound-item__no', String(index + 1).padStart(2, '0')),
      element('span', 'sound-item__title', work.title),
      element('span', 'sound-item__meta', work.subtitle || work.categoryLabel),
      element('span', 'sound-item__plus')
    );
    const body = element('div', 'sound-item__body');
    body.id = `sound-body-${index}`;
    body.setAttribute('role', 'region');
    body.setAttribute('aria-labelledby', head.id);
    const inner = element('div', 'sound-item__inner');
    inner.append(element('p', 'sound-item__summary', work.summary));
    const layers = element('div', 'sound-item__layers');
    (work.sections || []).slice(1, 3).forEach(section => {
      (section.paragraphs || []).slice(0, 2).forEach(text => layers.append(element('span', '', text)));
    });
    inner.append(layers, workLink(work, '阅读文字与介绍'));
    if (work.media?.caption) inner.append(element('p', 'sound-item__summary', `${work.media.caption} · 可在详情页收听`));
    const innerWrap = element('div');
    innerWrap.append(inner);
    body.append(innerWrap);
    article.append(head, body);
    container.append(article);
  });

  container.addEventListener('click', event => {
    const head = event.target.closest('.sound-item__head');
    if (!head) return;
    const item = head.closest('.sound-item');
    const open = head.getAttribute('aria-expanded') !== 'true';
    $$('.sound-item', container).forEach(other => {
      if (other === item) return;
      other.classList.remove('is-open');
      $('.sound-item__head', other)?.setAttribute('aria-expanded', 'false');
    });
    item.classList.toggle('is-open', open);
    head.setAttribute('aria-expanded', String(open));
  });
}

function setupSoundCount() {
  const count = $('.sound-list-head span:last-child');
  if (count) count.textContent = `${String($$('.sound-item').length).padStart(2, '0')} 则`;
}

/* ---------- 详情页 ---------- */

function mediaBlock(work) {
  const source = safeUrl(work.media?.src);
  const external = safeUrl(work.media?.externalUrl);
  if (!source && !external) {
    if (!work.media) return null;
    const status = element('div', 'media-status');
    const mark = element('span', 'status-mark', work.media.type === 'audio' ? '声' : '映');
    mark.setAttribute('aria-hidden', 'true');
    const copy = element('div');
    copy.append(
      element('strong', '', work.media.caption || '素材待补充'),
      element('p', '', work.media.description || '真实作品素材待补充。')
    );
    status.append(mark, copy);
    return status;
  }
  const wrapper = element('div', 'media-block');
  if (source) {
    const player = element(work.media.type === 'audio' ? 'audio' : 'video');
    player.controls = true;
    player.preload = work.media.type === 'audio' ? 'metadata' : 'none';
    player.src = source;
    player.setAttribute('aria-label', `${work.title}，${work.media.type === 'audio' ? '音频' : '视频'}`);
    if (player.tagName === 'VIDEO') {
      player.playsInline = true;
      if (safeUrl(work.image)) player.poster = safeUrl(work.image);
    }
    player.addEventListener('play', () => {
      $$('audio,video').forEach(other => { if (other !== player) other.pause(); });
    });
    player.addEventListener('error', () => {
      player.pause();
      player.hidden = true;
      if (!$('.media-error', wrapper)) wrapper.prepend(element('p', 'media-error', '媒体暂时无法播放，请稍后重试或通过原作品链接查看。'));
    });
    wrapper.append(player);
  }
  if (external) {
    const link = element('a', 'media-external', '打开原作品（新窗口）');
    link.href = external;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    wrapper.append(link);
  }
  return wrapper;
}

function returnLink(category, className = 'line-link') {
  const link = element('a', className);
  const arrow = element('span', '', '←');
  arrow.setAttribute('aria-hidden', 'true');
  link.append(arrow, '返回作品集');
  link.href = `index.html#${categories.includes(category) ? category : 'home'}`;
  link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const saved = getStored(returnKey);
    if (saved && saved.category === category && Date.now() - saved.time < 1000 * 60 * 120) {
      store(restoreKey, saved);
      link.href = 'index.html';
    }
  });
  return link;
}

function pagePreviewBlock(work) {
  const pages = Array.isArray(work.pagePreviews)
    ? work.pagePreviews.filter(page => safeUrl(page.image)).slice(0, 2)
    : [];
  if (!pages.length) return null;
  const strip = element('figure', 'script-pages script-pages--work');
  const frame = element('div', 'script-pages__strip');
  pages.forEach((page, pageIndex) => {
    const thumb = element('button', 'script-page');
    thumb.type = 'button';
    thumb.dataset.lightboxSrc = safeUrl(page.image);
    thumb.dataset.lightboxCaption = `${work.title} · ${page.caption || `原页 ${pageIndex + 1}`}`;
    thumb.dataset.lightboxAlt = page.imageAlt || `${work.title}剧本原页`;
    thumb.setAttribute('aria-label', `放大查看${work.title}剧本原页 ${pageIndex + 1}`);
    const thumbImage = element('img');
    thumbImage.src = safeUrl(page.imageSmall) || thumb.dataset.lightboxSrc;
    thumbImage.alt = page.imageAlt || `${work.title}剧本原页`;
    thumbImage.width = 640;
    thumbImage.height = 853;
    thumbImage.loading = 'lazy';
    thumbImage.decoding = 'async';
    thumb.append(thumbImage);
    frame.append(thumb);
  });
  strip.append(frame);
  const caption = element('figcaption', 'script-pages__caption');
  caption.append(element('span', '', `剧本原页 · 共 ${work.pageCount || pages.length} 页 · 点击放大`));
  strip.append(caption);
  return strip;
}

function workGallery(work) {
  if (!Array.isArray(work.gallery) || !work.gallery.length) return null;
  const wrap = element('div', 'work-gallery');
  work.gallery.forEach(item => {
    const figure = element('figure', 'work-gallery__item reveal-figure');
    const button = element('button', 'work-gallery__button');
    button.type = 'button';
    button.dataset.lightboxSrc = safeUrl(item.image) || '';
    button.dataset.lightboxCaption = item.caption || '';
    button.dataset.lightboxAlt = item.imageAlt || '';
    button.setAttribute('aria-label', `放大查看${item.caption || '图片'}`);
    button.append(image({ ...item, title: item.caption || work.title }, false, '(max-width: 767px) calc(100vw - 40px), 500px'));
    const caption = element('figcaption', 'illustration-caption');
    caption.append(element('span', 'caption-no', `图 ${String(wrap.children.length + 1).padStart(2, '0')}`));
    if (item.caption) caption.append(document.createTextNode(item.caption));
    figure.append(button, caption);
    wrap.append(figure);
  });
  return wrap;
}

// 字号档位只写倍率，绝对字号归 :root 的 --fs-body-base 管。
// 窄屏媒体查询改的是基数，内联样式改的是倍率，两个不同的输入，
// 所以内联值不会像以前那样把媒体查询整个压掉。
const FONT_SCALES = { sm: 0.882, md: 1, lg: 1.118 };
const FONT_LABELS = [['sm', '小'], ['md', '中'], ['lg', '大']];
// 当前档位记在模块里：开关是详情页渲染时才建出来的，
// 初始状态不能靠读 DOM 的 aria-pressed 反推。
let fontSizeKey = 'md';

function fontSizeControl() {
  const group = element('div', 'font-size');
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', '正文字号');
  FONT_LABELS.forEach(([key, label]) => {
    const button = element('button', '', label);
    button.type = 'button';
    button.dataset.size = key;
    button.setAttribute('aria-pressed', String(key === fontSizeKey));
    group.append(button);
  });
  return group;
}

// 切档后正文会重排，视口里正在读的那一段必须留在原处。
// 用元素锚定，不按比例补 scrollY——banner 与页眉不缩放，按比例补会漂。
function readingAnchor() {
  const limit = innerHeight * 0.25;
  for (const node of $$('.reading-section > *')) {
    if (node.getBoundingClientRect().bottom > limit) return node;
  }
  return null;
}

function syncFontSizeButtons() {
  $$('.font-size button').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.size === fontSizeKey));
  });
}

function applyFontSize(key) {
  const scale = FONT_SCALES[key];
  if (!scale) return;
  fontSizeKey = key;
  const anchor = readingAnchor();
  const before = anchor ? anchor.getBoundingClientRect().top : 0;
  document.documentElement.style.setProperty('--fs-scale', String(scale));
  if (anchor) {
    // 先读后写，读之前已经完成一次同步布局，这里拿到的是新位置。
    // behavior 必须 instant：html 上有 scroll-behavior:smooth，
    // 'auto' 会继承成异步动画，下一帧测量就落在动画中途。
    const delta = anchor.getBoundingClientRect().top - before;
    if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: 'instant' });
    // 换行位置会晚一帧定型，等字体就绪再补一次
    document.fonts?.ready.then(() => {
      const drift = anchor.getBoundingClientRect().top - before;
      if (Math.abs(drift) > 2) window.scrollBy({ top: drift, behavior: 'instant' });
      resetReadingNav();
      updateScrollUI();
    });
  }
  resetReadingNav();
  updateScrollUI();
  syncFontSizeButtons();
}

// 开关在详情页渲染时才出现，而这里在 loadContent 之前就跑了，
// 所以监听挂在 document 上做委托——挂 .font-size 会拿到 null 静默退出。
function setupFontSize() {
  let saved = null;
  try { saved = localStorage.getItem('zy-font-size'); } catch { /* storage optional */ }
  if (saved && FONT_SCALES[saved]) applyFontSize(saved);
  syncFontSizeButtons();
  if (setupFontSize.bound) return;
  setupFontSize.bound = true;
  document.addEventListener('click', event => {
    const button = event.target.closest('.font-size button[data-size]');
    if (!button) return;
    applyFontSize(button.dataset.size);
    try { localStorage.setItem('zy-font-size', button.dataset.size); } catch { /* ignore */ }
  });
}

// ≤980px 侧栏整列消失，场次导航也就没了。这里补一个在文档流里的折叠索引：
// 可展开、可跳转、不跟随滚动——不用被否掉的「抽屉式吸顶」。
function sceneIndexBlock(scenes) {
  if (!scenes || scenes.length < 3) return null;
  const box = element('details', 'scene-index');
  box.id = 'scene-index';
  box.append(element('summary', '', `场次索引 · 共 ${scenes.length} 场`));
  const list = element('ol', 'scene-index__list');
  scenes.forEach(scene => {
    const item = element('li');
    const link = element('a', '', scene.text);
    link.href = `#${scene.id}`;
    item.append(link);
    list.append(item);
  });
  box.append(list);
  return box;
}

function buildSceneNav(scenes, toc) {
  if (!scenes || scenes.length < 3) return;
  const groups = new Map();
  scenes.forEach(scene => {
    if (!groups.has(scene.sectionIndex)) groups.set(scene.sectionIndex, []);
    groups.get(scene.sectionIndex).push(scene);
  });
  groups.forEach((list, sectionIndex) => {
    const sectionLink = $(`a[href="#${slug(sectionIndex)}"]`, toc);
    if (!sectionLink) return;
    const nav = element('ol', 'toc-scenes');
    nav.dataset.count = String(list.length);
    list.forEach(scene => {
      const item = element('li');
      const link = element('a', '', scene.text);
      link.href = `#${scene.id}`;
      link.dataset.scene = scene.id;
      item.append(link);
      nav.append(item);
    });
    sectionLink.after(nav);
    const label = $('p', toc);
    if (label && !$('.toc-scenes-readout', label)) {
      label.append(element('span', 'toc-scenes-readout', `共 ${scenes.length} 场`));
    }
  });
}

function updateReadingNav() {
  const probe = innerHeight * READ_PROBE;
  // 兜底：正文底部越过判定线说明人已经读完了，章与场都不该再高亮。
  // 现有内容下这条不会触发——实测三种作品 × 1440/390 两档，最大滚动位置
  // 正文底边都在 666–755px，远高于探针 287px，页面不存在「已滚过正文」
  // 的状态，最后一节始终还在阅读线上。留着是为了将来放进来的短作品。
  const article = $('.work-article');
  const done = !!article && article.getBoundingClientRect().bottom < probe;
  updateSceneNav(probe, done, updateChapterNav(probe, done));
}

// 只观察章节链接：场次链接也在同一份目录里，混进来会把场次高亮抹掉，
// 两级高亮本该并存（章 → 场）。
function updateChapterNav(probe, done) {
  const toc = $('.work-toc');
  if (!toc) return;
  const links = $$('a:not([data-scene])', toc);
  if (!links.length) return;
  let active = null;
  if (!done) {
    links.forEach(link => {
      const target = document.getElementById(link.hash.slice(1));
      if (target && target.getBoundingClientRect().top <= probe) active = link;
    });
  }
  // 章节没变也要把 section 交回去：场次靠它判断自己属不属于当前这一节。
  const section = active ? document.getElementById(active.hash.slice(1)) : null;
  if (active === updateChapterNav.last) return section;
  updateChapterNav.last = active;
  links.forEach(link => {
    const on = link === active;
    link.classList.toggle('is-active', on);
    if (on) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  return section;
}

function updateSceneNav(probe, done, chapter) {
  const links = $$('[data-scene]');
  if (!links.length) return;
  let active = null;
  // 场次只认当前章节里的：翻到没有场次的一节时，场次高亮不该还停在
  // 上一节的最后一场，两级目录要指向同一节。
  if (!done && chapter) {
    links.forEach(link => {
      const target = document.getElementById(link.dataset.scene);
      if (target && target.closest('.reading-section') === chapter
        && target.getBoundingClientRect().top <= probe) active = link;
    });
  }
  if (active === updateSceneNav.last) return;
  updateSceneNav.last = active;
  links.forEach(link => link.classList.toggle('is-active', link === active));
  const readout = $('.toc-scenes-readout');
  if (readout && active) {
    const total = links.length;
    const index = links.indexOf(active) + 1;
    readout.textContent = `${index} / ${total} 场`;
  }
  if (active) {
    const list = active.closest('.toc-scenes');
    if (list) {
      const rect = active.getBoundingClientRect();
      const listRect = list.getBoundingClientRect();
      if (rect.top < listRect.top || rect.bottom > listRect.bottom) {
        // 目录跟随也要平滑：直接改 scrollTop 是硬跳，连着翻几场时列表一格一格闪。
        // scroll-behavior 不继承，html 上的 smooth 管不到这个内部滚动容器。
        list.scrollTo({
          top: list.scrollTop + rect.top - listRect.top - listRect.height / 2,
          behavior: reduceMotion ? 'auto' : 'smooth'
        });
      }
    }
  }
}

// 改字号会重排正文，缓存下来的 active 指向的可能是另一节了，强制重算。
function resetReadingNav() {
  updateChapterNav.last = null;
  updateSceneNav.last = null;
}

function workBanner(work) {
  const banner = element('header', 'work-banner');
  banner.dataset.dark = '';
  banner.append(element('div', 'work-banner__wash'));
  const inner = element('div', 'work-banner__inner');
  const kicker = element('div', 'work-banner__kicker');
  kicker.append(element('span', '', categoryNames[work.category] || work.categoryLabel || '作品'));
  if (work.role) kicker.append(element('span', '', work.role));
  if (work.award) kicker.append(element('span', 'work-banner__award', '获奖作品'));
  inner.append(kicker);
  inner.append(element('h1', 'work-banner__title', work.title));
  if (work.summary) inner.append(element('p', 'work-banner__lead', work.summary));
  const meta = element('div', 'work-banner__meta');
  if (work.year) meta.append(element('span', '', work.year));
  if (work.media?.caption) meta.append(element('span', '', work.media.caption.split('·').pop().trim()));
  meta.append(element('span', '', wordCount(work)), element('span', '', `阅读约 ${readingTime(work)} 分钟`));
  meta.append(fontSizeControl());
  inner.append(meta);
  if (work.demo) inner.append(element('p', 'work-banner__note', '本页为示例内容，用于演示作品排版与阅读体验，不代表张艺的真实创作成果。'));
  banner.append(inner);

  if (safeUrl(work.image)) {
    const figure = element('figure', 'work-banner__cover');
    const button = element('button', 'image-toggle');
    button.type = 'button';
    const video = work.media?.type === 'video' ? safeUrl(work.media.src) : null;
    if (video) {
      button.dataset.videoSrc = video;
      button.dataset.videoPoster = safeUrl(work.image) || '';
      button.classList.add('work-banner__play');
      button.setAttribute('aria-label', `播放《${work.title}》`);
      button.append(element('span', 'banner-play', '播放作品'));
    } else {
      button.dataset.lightboxSrc = safeUrl(work.image);
      button.dataset.lightboxCaption = work.imageCaption || `${work.title} · 配图`;
      button.dataset.lightboxAlt = work.imageAlt || work.title;
      button.setAttribute('aria-label', `放大查看${work.title}封面`);
    }
    const bannerImage = element('img');
    bannerImage.src = safeUrl(work.image);
    bannerImage.alt = work.imageAlt || `${work.title}封面`;
    bannerImage.width = Number(work.imageWidth) || 1200;
    bannerImage.height = Number(work.imageHeight) || 1600;
    bannerImage.loading = 'eager';
    bannerImage.decoding = 'async';
    button.append(bannerImage);
    figure.append(button);
    const captionText = video
      ? `${work.imageCaption || '作品静帧'} · 点击播放`
      : `${work.imageCaption || '作品配图'} · 点击放大`;
    figure.append(element('figcaption', 'work-banner__caption', captionText));
    banner.append(figure);
  }
  return banner;
}

function renderWork(work) {
  document.body.dataset.category = work.category;
  const main = $('#main');
  const works = allWorks;
  const workIndex = works.findIndex(item => item.id === work.id);
  const next = works[(workIndex + 1) % works.length];
  const prev = works[(workIndex - 1 + works.length) % works.length];

  main.replaceChildren();
  const container = element('div', 'work-container');
  const top = element('div', 'work-top');
  const back = returnLink(work.category, '');
  back.textContent = '';
  back.append(document.createTextNode(`作品集 / ${categoryNames[work.category] || '作品'}`));
  top.append(back, element('span', '', `第 ${String(workIndex + 1).padStart(2, '0')} 篇 / 共 ${String(works.length).padStart(2, '0')} 篇`));
  container.append(top);

  container.append(workBanner(work));

  if (work.epigraph?.text) {
    const band = element('section', 'work-epigraph');
    const inner = element('div', 'work-epigraph__inner');
    inner.append(element('p', 'work-epigraph__text', work.epigraph.text));
    if (work.epigraph.from) inner.append(element('cite', 'work-epigraph__from', work.epigraph.from));
    band.append(inner);
    // 创作手记是题记网格的第二列，不是引言内的一段：
    // 挂在 inner 里会让两列只剩一列有内容，右栏整片留白。
    const notes = Array.isArray(work.epigraph.note) ? work.epigraph.note.filter(Boolean) : [];
    if (notes.length) {
      const note = element('div', 'work-epigraph__note');
      notes.forEach(text => note.append(element('p', '', text)));
      band.append(note);
    } else {
      band.classList.add('work-epigraph--solo');
    }
    container.append(band);
  }

  const layout = element('div', 'work-layout');
  const toc = element('aside', 'work-toc');
  toc.append(element('p', '', '本文目录'));
  const article = element('article', 'work-article');

  const reading = element('div', 'work-reading');
  const sceneNav = [];
  const media = work.media?.type === 'video' && safeUrl(work.media.src) ? null : mediaBlock(work);
  if (media) reading.append(media);
  (work.sections || []).forEach((section, index) => {
    const block = element('section', 'reading-section');
    block.id = slug(index);
    const sceneCountBefore = sceneNav.length;
    const hasScriptBlocks = (section.blocks || []).some(item => item.type === 'scene' || item.type === 'dialogue');
    if (hasScriptBlocks) block.classList.add('reading-section--script');
    if (section.title) {
      const heading = element('h2', 'reveal', section.title);
      if (!/^[一二三四五六七八九十0-9]/.test(section.title)) {
        heading.prepend(element('span', 'reading-section__no', String(index + 1).padStart(2, '0')));
      }
      block.append(heading);
      const tocLink = element('a', '', section.title);
      tocLink.href = `#${slug(index)}`;
      toc.append(tocLink);
    }
    (section.paragraphs || []).forEach(text => block.append(element('p', '', text)));
    (section.blocks || []).forEach(item => {
      if (item.type === 'dialogue') {
        const dialogue = element('dl', 'dialogue');
        dialogue.append(element('dt', '', item.speaker || '人物'), element('dd', '', item.text));
        block.append(dialogue);
      } else if (item.type === 'subhead') {
        block.append(element('h3', 'reading-subhead', item.text));
      } else {
        const paragraph = element('p', item.type === 'scene' ? 'script-scene' : '', item.text);
        if (item.type === 'scene') {
          paragraph.id = `scene-${sceneNav.length + 1}`;
          sceneNav.push({ id: paragraph.id, text: item.text, sectionIndex: index });
        }
        block.append(paragraph);
      }
    });
    // 一个剧本可能跨四五个 section，每段末尾给一个回索引的入口。
    // 4 个而不是 98 个：按 section 给，不按场次给。
    if (sceneNav.length > sceneCountBefore) {
      const back = element('a', 'scene-index__back', '↑ 回到场次索引');
      back.href = '#scene-index';
      block.append(back);
    }
    reading.append(block);
  });
  buildSceneNav(sceneNav, toc);
  const sceneIndex = sceneIndexBlock(sceneNav);
  if (sceneIndex) {
    const firstSection = $('.reading-section', reading);
    if (firstSection) reading.insertBefore(sceneIndex, firstSection);
    else reading.append(sceneIndex);
  }
  const gallery = workGallery(work);
  if (gallery) reading.append(gallery);
  const pages = pagePreviewBlock(work);
  if (pages) reading.append(pages);
  if (safeUrl(work.pdf)) {
    const pdf = element('a', 'line-link download-link', '下载 PDF 文件');
    pdf.href = safeUrl(work.pdf);
    pdf.setAttribute('download', '');
    reading.append(pdf);
  }
  article.append(reading);

  const end = element('div', 'work-end');
  // ≤1240px 右栏消失后，全站就没有「回到顶部」了。在文末给一个，
  // 不做浮动按钮——浮层会一直压在文字上。
  const toTop = element('button', 'work-end__top', '↑ 回到顶部');
  toTop.type = 'button';
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
  end.append(element('span', '', '感谢阅读'), toTop, returnLink(work.category));
  article.append(end);

  const worksNav = element('nav', 'works-nav');
  worksNav.setAttribute('aria-label', '相邻作品');
  const prevLink = element('a', 'works-nav__link works-nav__prev');
  prevLink.href = `work.html?id=${encodeURIComponent(prev.id)}`;
  const prevRow = element('span', 'works-nav__row');
  prevRow.append(element('span', 'works-nav__arrow', '←'), element('span', 'works-nav__title', prev.title));
  prevLink.append(element('small', '', `上一篇 / ${categoryNames[prev.category] || '作品'}`), prevRow);
  const nextLink = element('a', 'works-nav__link works-nav__next');
  nextLink.href = `work.html?id=${encodeURIComponent(next.id)}`;
  const nextRow = element('span', 'works-nav__row');
  nextRow.append(element('span', 'works-nav__title', next.title), element('span', 'works-nav__arrow', '→'));
  nextLink.append(element('small', '', `下一篇 / ${categoryNames[next.category] || '作品'}`), nextRow);
  worksNav.append(prevLink, nextLink);
  article.append(worksNav);

  layout.append(toc, article);

  const side = element('aside', 'work-side');
  const topButton = element('button', '', '↑');
  topButton.type = 'button';
  topButton.setAttribute('aria-label', '回到顶部');
  topButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
  const copyButton = element('button', 'work-side-copy', '复制');
  copyButton.type = 'button';
  copyButton.setAttribute('aria-label', '复制本页链接');
  copyButton.innerHTML = '<svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><rect x="6" y="5" width="8" height="9" rx="1.2" stroke="currentColor" stroke-width="1"/><path d="M12 5V4.2A1.2 1.2 0 0 0 10.8 3H4.2A1.2 1.2 0 0 0 3 4.2v7.6A1.2 1.2 0 0 0 4.2 13H6" stroke="currentColor" stroke-width="1"/></svg>';
  copyButton.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href); } catch { /* Clipboard can fail. */ }
    const toast = $('#toast');
    if (toast) {
      toast.textContent = '链接已复制';
      toast.classList.add('is-visible');
      setTimeout(() => toast.classList.remove('is-visible'), 2200);
    }
  });
  side.append(topButton, copyButton, element('span', 'side-label', '张艺'));
  layout.append(side);

  container.append(layout);
  main.append(container);
  main.setAttribute('aria-busy', 'false');
  $('#header-back')?.replaceWith(returnLink(work.category, 'back-link'));
  document.title = `${work.title} · ${siteTitle}`;

  // 目录进度交给 updateReadingNav()：章节与场次共用同一条 34% 判定线，
  // 这里不再单独开 IntersectionObserver——18%–35% 的观察带和场次的 34% 探针
  // 是两套阈值，文末会给出互相矛盾的答案。
  resetReadingNav();
  updateScrollUI();
  if (window.markLightboxTriggers) window.markLightboxTriggers();
}

function renderNotFound() {
  const main = $('#main');
  const container = element('div', 'not-found');
  container.append(
    element('h1', '', '这篇作品还没有放进来。'),
    element('p', '', '链接可能已变更，或作品正在整理。你可以回到作品集，看看其他内容。'),
    returnLink('home')
  );
  main.replaceChildren(container);
  main.setAttribute('aria-busy', 'false');
  document.title = '作品未找到 · 张艺的作品集';
}

function showLoadError() {
  const nodes = isHome ? categories.map(id => $(`#${id}-list`)) : [$('#main')];
  nodes.forEach((node, index) => {
    if (!node) return;
    const message = element('div', 'error-message', '作品暂时未能加载，请检查网络后重试。');
    if (index === 0) {
      const retry = element('button', 'retry-button', '重新加载作品');
      retry.type = 'button';
      retry.addEventListener('click', () => { retry.disabled = true; retry.textContent = '正在重试…'; loadContent(); });
      message.append(retry);
    }
    if (!isHome) message.classList.add('work-container');
    node.replaceChildren(message);
    node.setAttribute('aria-busy', 'false');
  });
}

/* ---------- 位置记忆 ---------- */

function setupReturnTracking() {
  window.addEventListener('pagehide', () => {
    store(historyKey, {
      y: window.scrollY,
      hash: location.hash,
      path: location.pathname + location.search,
      time: Date.now(),
    });
  });
  document.addEventListener('click', event => {
    // 详情页的「上一篇 / 下一篇」不该覆盖首页的返回位置
    if (!isHome) return;
    const link = event.target.closest('a.work-link-target');
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    store(returnKey, { y: window.scrollY, hash: location.hash, category: link.dataset.category, time: Date.now() });
  });
}
function restorePosition() {
  const isHistoryReturn = performance.getEntriesByType('navigation')[0]?.type === 'back_forward';
  const request = getStored(restoreKey) || (isHistoryReturn ? getStored(historyKey) : null);
  if (!request) return;
  removeStored(restoreKey);
  if (!Number.isFinite(request.y) || Date.now() - request.time > 1000 * 60 * 120) return;
  // historyKey 全站共用，从详情页退回来时带着的是详情页的路径，不能拿来定位首页
  if (request.path && request.path !== location.pathname + location.search) return;
  const ready = document.fonts ? document.fonts.ready : Promise.resolve();
  ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => {
    if (request.hash && /^#[a-z0-9-]+$/.test(request.hash)) history.replaceState(null, '', request.hash);
    window.scrollTo({ top: request.y, behavior: 'instant' });
  })));
}

/* ---------- 详情页：位置恢复与深链 ---------- */

// 正文里的图解码完高度才定型，字体同理。两样都就位再定位。
// 懒加载的图在进入视口前 decode() 可能永远不落地，所以先改成 eager，
// 再兜一个 700ms 上限——否则深链会一直等在那里不滚。
function readingSettled() {
  const imgs = [...document.querySelectorAll('.work-reading img')];
  imgs.forEach(img => { if (!img.complete) img.loading = 'eager'; });
  const settle = Promise.all([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    ...imgs.map(img => img.decode().catch(() => {})),
  ]);
  return Promise.race([settle, new Promise(resolve => setTimeout(resolve, 700))]);
}

// 详情页没有 returnKey（那是首页的位置），只有 historyKey。
// 只有从别的页面退回来、且路径对得上时才还位置。
function restoreWorkPosition() {
  const isHistoryReturn = performance.getEntriesByType('navigation')[0]?.type === 'back_forward';
  if (!isHistoryReturn) return;
  const request = getStored(historyKey);
  if (!request || !Number.isFinite(request.y)) return;
  if (request.path !== location.pathname + location.search) return;
  if (Date.now() - request.time > 1000 * 60 * 120) return;
  readingSettled().then(() => requestAnimationFrame(() => requestAnimationFrame(() => {
    window.scrollTo({ top: request.y, behavior: 'instant' });
  })));
}

// #scene-30 / #section-3 直达。图片解码会把位置顶走，所以解码后再滚，
// 600ms 后再校正一次——只补超过 4px 的漂移。
function scrollToDeepLink() {
  if (!/^#(scene|section)-\d+$/.test(location.hash)) return false;
  const target = document.getElementById(location.hash.slice(1));
  if (!target) return false;
  readingSettled().then(() => {
    target.scrollIntoView({ behavior: 'instant', block: 'start' });
    setTimeout(() => {
      const offset = ($('#site-header')?.offsetHeight || 0) + 18;
      const drift = target.getBoundingClientRect().top - offset;
      if (Math.abs(drift) > 4) window.scrollBy({ top: drift, behavior: 'instant' });
      updateScrollUI();
    }, 600);
  });
  return true;
}

/* ---------- 页面转场 ---------- */

function setupPageTransitions() {
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="work.html"]');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank') return;
    event.preventDefault();
    document.body.classList.add('is-leaving');
    setTimeout(() => { location.href = link.href; }, reduceMotion ? 0 : 280);
  });
  addEventListener('pageshow', () => document.body.classList.remove('is-leaving'));
}

/* ---------- 加载 ---------- */

async function loadContent() {
  try {
    const response = await fetch('data/portfolio.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('Content request failed');
    const data = await response.json();
    if (!Array.isArray(data.works)) throw new Error('Invalid content');
    allWorks = data.works;
    contentReady = true;
    if (data.profile?.siteTitle) siteTitle = data.profile.siteTitle;
    if (data.profile?.name) {
      $$('.wordmark').forEach(mark => {
        mark.replaceChildren(document.createTextNode(data.profile.name), element('span', '', '的作品集'));
        mark.setAttribute('aria-label', siteTitle);
      });
      if (isHome) {
        const heroTitle = $('#hero-title');
        if (heroTitle) heroTitle.textContent = `我叫${data.profile.name}。`;
      }
    }
    $$('.site-footer span:first-child').forEach(node => { node.textContent = siteTitle; });

    if (isHome) {
      document.title = siteTitle;
      if (data.profile?.intro) {
        const intro = data.profile.intro;
        const cut = intro.indexOf('被听见');
        const node = $('.hero-intro');
        if (node) {
          if (cut > 0) node.replaceChildren(document.createTextNode(intro.slice(0, cut)), element('br', 'desktop-break'), document.createTextNode(intro.slice(cut)));
          else node.textContent = intro;
        }
      }
      const renderers = { scripts: renderScripts, essays: renderEssays, papers: renderPapers, films: renderFilms, stage: renderStage, sound: renderSound };
      categories.forEach(category => {
        const container = $(`#${category}-list`);
        const works = data.works.filter(work => work.category === category);
        if (!container) return;
        container.replaceChildren();
        if (works.length) renderers[category](works, container);
        else container.append(element('p', 'loading-message', '作品正在整理，稍后补充。'));
        container.setAttribute('aria-busy', 'false');
      });
      setupSoundCount();
      observeReveals();
      if (window.markLightboxTriggers) window.markLightboxTriggers();
      restorePosition();
    } else {
      const id = new URLSearchParams(location.search).get('id');
      const work = data.works.find(item => item.id === id);
      if (work) {
        renderWork(work);
        observeReveals();
        // 深链优先：有 #scene-N 就不还旧位置
        if (!scrollToDeepLink()) restoreWorkPosition();
      } else renderNotFound();
    }
  } catch {
    showLoadError();
  }
}

/* ---------- 启动 ---------- */

document.documentElement.classList.add('js');
addEventListener('error', () => document.documentElement.classList.remove('js'));
document.addEventListener('error', event => {
  if (!(event.target instanceof HTMLImageElement) || event.target.dataset.failed) return;
  const img = event.target;
  img.dataset.failed = 'true';
  img.hidden = true;
  const fallback = element('div', 'image-fallback', '配图暂时未能加载');
  fallback.append(element('small', '', '文字内容仍可正常阅读'));
  img.after(fallback);
}, true);

setupHeader();
setupMenu();
setupReveals();
setupRoomPreview();
setupLightbox();
setupVideoLightbox();
setupRandomWork();
setupSoundPreview();
setupCopyLink();
setupPageTransitions();
setupFontSize();
// 详情页也要挂：pagehide 里存的位置是「从详情页退回首页」时用的
setupReturnTracking();
loadContent();
