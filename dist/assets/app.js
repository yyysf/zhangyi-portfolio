/* 张艺的作品集 · 2026
   内容渲染、滚动叙事与几处小交互。无第三方依赖。 */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const categories = ['scripts', 'essays', 'films', 'sound', 'stage'];
const categoryNames = { scripts: '原创剧本', essays: '影评随笔', films: '影像成片', stage: '舞台实践', sound: '声音实践' };
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
function readingTime(work) {
  const text = (work.sections || []).map(section => [
    ...(section.paragraphs || []),
    ...(section.blocks || []).map(block => block.text || '')
  ].join('')).join('');
  return Math.max(1, Math.round(text.replace(/\s/g, '').length / 420));
}
function firstSentence(text) {
  if (!text) return '';
  const cut = text.indexOf('。');
  return cut > 0 ? text.slice(0, cut + 1) : text.slice(0, 42);
}
function slug(index) { return `section-${index + 1}`; }

/* ---------- 页面级交互 ---------- */

let scrollTick = false;
function updateScrollUI() {
  const y = window.scrollY || document.documentElement.scrollTop;
  const viewport = innerHeight;
  const scrollable = document.documentElement.scrollHeight - viewport;
  const ratio = scrollable > 0 ? Math.min(1, Math.max(0, y / scrollable)) : 0;
  const header = $('#site-header');
  if (header) {
    header.classList.toggle('is-scrolled', y > 24);
    const probe = header.offsetHeight * .55;
    let onDark = false;
    $$('.films, .thanks').forEach(section => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= probe && rect.bottom >= probe) onDark = true;
    });
    header.classList.toggle('is-on-dark', onDark);
  }
  const bar = $('#scroll-progress-bar');
  if (bar) bar.style.transform = `scaleX(${ratio})`;
  const reading = $('#reading-progress-bar');
  if (reading) reading.style.transform = `scaleX(${ratio})`;

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
      const chapterMap = { home: '00', about: '01', scripts: '02', essays: '03', films: '04', sound: '05', stage: '06', thanks: '07' };
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
    body.append(heading, element('p', 'script-summary', work.summary), scriptExcerpt(work), workLink(work, '阅读完整剧本'));

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
    article.append(element('span', 'essay-no', String(index + 1).padStart(2, '0')), metadata(work));
    const heading = element('h3');
    const link = workLink(work, work.title, '');
    link.lastElementChild.remove();
    heading.append(link);
    article.append(heading, element('p', 'essay-summary', work.summary));
    const quote = work.sections?.[0]?.paragraphs?.[1];
    if (quote) article.append(element('blockquote', 'essay-quote', firstSentence(quote)));
    const footer = element('div', 'essay-foot');
    footer.append(element('span', 'essay-time', `阅读约 ${readingTime(work)} 分钟`), workLink(work, '阅读全文'));
    article.append(footer);
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
      const link = coverLink(work, 'film-frame__link');
      link.append(image(work, true, '(max-width: 767px) calc(100vw - 40px), (max-width: 1180px) 90vw, 1160px'));
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
      link.append(image(work, true, '(max-width: 767px) calc(100vw - 40px), (max-width: 980px) 90vw, 620px'));
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
    body.append(notes, workLink(work, '阅读实践记录'));
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

function renderSound(works, container) {
  works.forEach((work, index) => {
    const article = element('article', 'sound-item reveal');
    article.style.setProperty('--delay', `${Math.min(index * .09, .27)}s`);
    const head = element('button', 'sound-item__head');
    head.type = 'button';
    head.setAttribute('aria-expanded', 'false');
    head.id = `sound-head-${index}`;
    head.append(
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
    const caption = element('figcaption', 'illustration-caption', item.caption || '');
    figure.append(button, caption);
    wrap.append(figure);
  });
  return wrap;
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

  const layout = element('div', 'work-layout');
  const toc = element('aside', 'work-toc');
  toc.append(element('p', '', '本文目录'));
  const article = element('article', 'work-article');
  const header = element('header', 'work-header');
  header.append(metadata(work));
  header.append(element('h1', '', work.title));
  if (work.summary) header.append(element('p', 'work-lead', work.summary));
  const headMeta = element('div', 'work-head-meta');
  headMeta.append(element('span', '', `${categoryNames[work.category] || work.categoryLabel}`));
  if (work.role) headMeta.append(element('span', '', work.role));
  if (work.year) headMeta.append(element('span', '', work.year));
  if (work.media?.caption) {
    headMeta.append(element('span', '', work.media.caption.split('·').pop().trim()));
  } else {
    headMeta.append(element('span', '', work.pdf ? '剧本全文' : `阅读约 ${readingTime(work)} 分钟`));
  }
  header.append(headMeta);
  if (work.award) {
    const award = element('p', 'work-award');
    award.append(element('span', '', '获奖'), document.createTextNode(work.award));
    header.append(award);
  }
  if (work.demo) header.append(element('p', 'work-demo-note', '本页为示例内容，用于演示作品排版与阅读体验，不代表张艺的真实创作成果。'));
  article.append(header);

  if (safeUrl(work.image)) {
    const figure = element('figure', `work-figure ${ratioClass(work)}`);
    const button = element('button', 'image-toggle');
    button.type = 'button';
    button.dataset.lightboxSrc = safeUrl(work.image);
    button.dataset.lightboxCaption = work.imageCaption || `${work.title} · 配图`;
    button.dataset.lightboxAlt = work.imageAlt || work.title;
    button.setAttribute('aria-label', `放大查看${work.title}完整配图`);
    button.append(image(work, true, '(max-width: 767px) calc(100vw - 40px), 900px'));
    const figcaption = element('figcaption', 'illustration-caption');
    figcaption.append(element('span', '', work.imageCaption || '作品配图'), element('span', 'image-hint', '点击图片放大'));
    figure.append(button, figcaption);
    article.append(figure);
  }

  const reading = element('div', 'work-reading');
  const media = mediaBlock(work);
  if (media) reading.append(media);
  (work.sections || []).forEach((section, index) => {
    const block = element('section', 'reading-section');
    block.id = slug(index);
    if (section.title) {
      block.append(element('h2', 'reveal', section.title));
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
      } else {
        block.append(element('p', item.type === 'scene' ? 'script-scene' : '', item.text));
      }
    });
    reading.append(block);
  });
  const gallery = workGallery(work);
  if (gallery) reading.append(gallery);
  if (safeUrl(work.pdf)) {
    const pdf = element('a', 'line-link download-link', '下载剧本全文');
    pdf.href = safeUrl(work.pdf);
    pdf.setAttribute('download', '');
    reading.append(pdf);
  }
  article.append(reading);

  const end = element('div', 'work-end');
  end.append(element('span', '', '感谢阅读'), returnLink(work.category));
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

  // 目录进度
  const tocLinks = $$('a', toc);
  if (tocLinks.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        tocLinks.forEach(link => link.classList.toggle('is-active', link.hash === `#${entry.target.id}`));
      });
    }, { rootMargin: '-18% 0px -65% 0px', threshold: 0 });
    $$('.reading-section', article).forEach(section => observer.observe(section));
  }
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
    store(historyKey, { y: window.scrollY, hash: location.hash, time: Date.now() });
  });
  document.addEventListener('click', event => {
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
  const ready = document.fonts ? document.fonts.ready : Promise.resolve();
  ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => {
    if (request.hash && /^#[a-z-]+$/.test(request.hash)) history.replaceState(null, '', request.hash);
    window.scrollTo({ top: request.y, behavior: 'instant' });
  })));
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
      const renderers = { scripts: renderScripts, essays: renderEssays, films: renderFilms, stage: renderStage, sound: renderSound };
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
if (isHome) setupReturnTracking();
loadContent();
