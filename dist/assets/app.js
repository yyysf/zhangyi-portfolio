const $ = (selector, root = document) => root.querySelector(selector);
const categories = ['scripts', 'essays', 'films', 'stage', 'sound'];
const returnKey = 'zhangyi-portfolio:return';
const restoreKey = 'zhangyi-portfolio:restore';
const historyKey = 'zhangyi-portfolio:history';
const isHome = document.body.dataset.page === 'home';
let siteTitle = '张艺的作品集';

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
function workLink(work, text = '阅读作品', className = 'text-link work-link') {
  const link = element('a', `${className} work-link-target`, text);
  link.href = `work.html?id=${encodeURIComponent(work.id)}`;
  link.dataset.category = work.category;
  const arrow = element('span', '', '→');
  arrow.setAttribute('aria-hidden', 'true');
  link.append(arrow);
  return link;
}
function metadata(work) {
  const meta = element('div', 'work-meta');
  meta.append(element('span', '', work.subtitle || work.categoryLabel));
  if (work.demo) meta.append(element('span', 'demo-label', '示例内容'));
  return meta;
}
function title(work, className = 'work-title') {
  const h = element('h3', className);
  const a = workLink(work, work.title, '');
  a.lastElementChild.remove();
  h.append(a);
  return h;
}
function image(work, eager = false) {
  const img = element('img');
  img.src = safeUrl(work.image) || '';
  img.alt = work.imageAlt || `${work.title}配图`;
  img.width = 1536; img.height = 1024;
  if (safeUrl(work.imageSmall) && safeUrl(work.image)) {
    img.srcset = `${safeUrl(work.imageSmall)} 768w, ${safeUrl(work.image)} 1536w`;
    img.sizes = eager
      ? '(max-width: 767px) calc(100vw - 40px), (max-width: 980px) calc(100vw - 80px), 900px'
      : work.category === 'films'
        ? '(max-width: 767px) calc(100vw - 40px), (max-width: 1200px) calc(100vw - 80px), 1120px'
        : '(max-width: 767px) calc(100vw - 40px), (max-width: 1023px) 55vw, 650px';
  }
  img.loading = eager ? 'eager' : 'lazy';
  img.decoding = 'async';
  return img;
}
function imageLink(work) {
  const a = workLink(work, '', 'work-image');
  a.setAttribute('aria-label', `阅读${work.title}`);
  a.replaceChildren(image(work));
  return a;
}
function pendingStatus(work) {
  const status = element('div', 'media-status');
  const mark = element('span', 'status-mark', work.media?.type === 'audio' ? '声' : '映');
  mark.setAttribute('aria-hidden', 'true');
  const copy = element('div');
  copy.append(element('strong', '', work.media?.caption || '素材待补充'), element('p', '', work.media?.description || '真实作品素材待补充。'));
  status.append(mark, copy);
  return status;
}
function media(work, showPending = true) {
  const source = safeUrl(work.media?.src);
  const external = safeUrl(work.media?.externalUrl);
  if (!source && !external) return showPending ? pendingStatus(work) : null;
  const wrapper = element('div', 'media-block');
  if (source) {
    const player = element(work.media.type === 'audio' ? 'audio' : 'video');
    player.controls = true;
    player.preload = 'none';
    player.src = source;
    player.setAttribute('aria-label', `${work.title}，${work.media.type === 'audio' ? '音频' : '视频'}`);
    if (player.tagName === 'VIDEO') {
      player.playsInline = true;
      if (safeUrl(work.image)) player.poster = safeUrl(work.image);
    }
    player.addEventListener('play', () => {
      document.querySelectorAll('audio,video').forEach(other => { if (other !== player) other.pause(); });
    });
    player.addEventListener('error', () => {
      player.pause(); player.hidden = true;
      if (!$('.media-error', wrapper)) wrapper.prepend(element('p', 'media-error', '媒体暂时无法播放，请稍后重试或通过原作品链接查看。'));
    });
    wrapper.append(player);
  }
  if (external) {
    const link = element('a', 'media-external', '打开原作品（新窗口）');
    link.href = external; link.target = '_blank'; link.rel = 'noopener noreferrer';
    wrapper.append(link);
  }
  return wrapper;
}
function renderScripts(works, container) {
  works.forEach((work, i) => {
    const article = element('article', i === 0 ? 'script-feature' : 'script-secondary');
    const copy = element('div', 'script-copy');
    copy.append(metadata(work), title(work), element('p', 'work-summary', work.summary), workLink(work, '阅读剧本'));
    if (i === 0) {
      const visual = element('div', 'script-visual');
      if (safeUrl(work.image)) visual.append(imageLink(work));
      visual.append(copy);
      const manuscript = element('div', 'manuscript');
      manuscript.append(element('p', 'manuscript-label', '剧本节选'));
      const blocks = work.sections?.flatMap(section => section.blocks || []) || [];
      blocks.slice(0, 4).forEach(block => {
        if (block.type === 'dialogue') {
          const dialogue = element('dl', 'dialogue');
          dialogue.append(element('dt', '', block.speaker), element('dd', '', block.text)); manuscript.append(dialogue);
        } else manuscript.append(element('p', block.type === 'scene' ? 'manuscript-scene' : 'manuscript-text', block.text));
      });
      manuscript.append(workLink(work, '翻开完整剧本'));
      article.append(visual, manuscript);
    } else {
      article.append(copy);
      if (work.excerpt) article.append(element('p', 'secondary-quote', work.excerpt));
    }
    container.append(article);
  });
}
function renderEssays(works, container) {
  works.forEach(work => {
    const article = element('article', 'essay-item');
    const heading = title(work);
    const arrow = element('span', 'title-arrow', '→'); arrow.setAttribute('aria-hidden', 'true');
    heading.firstElementChild.append(arrow);
    article.append(metadata(work), heading, element('p', 'work-summary', work.summary));
    const quote = work.sections?.[0]?.paragraphs?.[1];
    if (quote) article.append(element('blockquote', 'essay-quote', quote.split('。')[0] + '。'));
    article.append(workLink(work, '阅读全文'));
    container.append(article);
  });
}
function renderFilms(works, container) {
  works.forEach(work => {
    const article = element('article', 'film-feature');
    const screen = element('div', 'film-screen');
    if (safeUrl(work.image)) screen.append(imageLink(work));
    article.append(screen);
    const caption = element('div', 'film-caption');
    const info = element('div');
    info.append(metadata(work), title(work));
    const copy = element('div');
    copy.append(element('p', 'work-summary', work.summary), media(work), workLink(work, '查看作品解析'));
    caption.append(info, copy); article.append(caption); container.append(article);
  });
}
function renderStage(works, container) {
  works.forEach(work => {
    const article = element('article', 'stage-feature');
    const figure = element('figure');
    if (safeUrl(work.image)) figure.append(imageLink(work));
    if (work.imageCaption) figure.append(element('figcaption', 'illustration-caption', work.imageCaption));
    const copy = element('div');
    copy.append(metadata(work), title(work), element('p', 'work-summary', work.summary));
    const notes = element('div', 'stage-notes');
    (work.sections || []).filter(section => ['排演过程', '实践思考'].includes(section.title)).forEach(section => {
      const note = element('div', 'stage-note');
      note.append(element('h4', '', section.title), element('p', '', section.paragraphs?.[0] || ''));
      notes.append(note);
    });
    copy.append(notes, workLink(work, '阅读实践记录')); article.append(figure, copy); container.append(article);
  });
}
function renderSound(works, container) {
  works.forEach(work => {
    const article = element('article', 'sound-item');
    const copy = element('div');
    copy.append(metadata(work), title(work), element('p', 'work-summary', work.summary));
    const actions = element('div', 'sound-actions');
    actions.append(workLink(work, '阅读文字与介绍', 'text-link'));
    const player = media(work, false);
    if (!player) actions.append(element('span', 'pending-media', work.media?.caption || '录音待补充'));
    copy.append(actions); if (player) copy.append(player);
    article.append(copy); container.append(article);
  });
}
const renderers = { scripts: renderScripts, essays: renderEssays, films: renderFilms, stage: renderStage, sound: renderSound };

function setupNavigation() {
  const toggle = $('.menu-toggle');
  const nav = $('#main-nav');
  const header = $('.site-header');
  if (header && 'ResizeObserver' in window) {
    const sizing = new ResizeObserver(() => {
      // Keep anchor headings visible when text enlargement makes the header taller.
      // Ignore the expanded directory, whose height is temporary.
      if (toggle?.getAttribute('aria-expanded') !== 'true') {
        document.documentElement.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`);
      }
    });
    sizing.observe(header);
  }
  if (!toggle || !nav) return;
  function closeMenu() {
    toggle.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open');
  }
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open);
  });
  nav.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { closeMenu(); toggle.focus(); }
  });
  matchMedia('(min-width: 1024px)').addEventListener('change', e => { if (e.matches) closeMenu(); });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const entry = entries.filter(item => item.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!entry) return;
      nav.querySelectorAll('a').forEach(a => {
        if (a.hash === `#${entry.target.id}`) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
      });
    }, { rootMargin: '-15% 0px -55% 0px', threshold: 0 });
    document.querySelectorAll('main>section').forEach(section => observer.observe(section));
  }
}
function setupReturnTracking() {
  window.addEventListener('pagehide', () => {
    store(historyKey, { y: window.scrollY, hash: location.hash, time: Date.now() });
  });
  document.addEventListener('click', e => {
    const link = e.target.closest('a.work-link-target');
    if (!link || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    store(returnKey, { y: window.scrollY, hash: location.hash, category: link.dataset.category, time: Date.now() });
  });
}
function restorePosition() {
  // On a normal history reload, native restoration can run before JSON fills
  // the page. Restore after rendering, just as for the explicit return link.
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
function returnLink(category, className = 'text-link') {
  const link = element('a', className);
  const arrow = element('span', '', '←');
  arrow.setAttribute('aria-hidden', 'true');
  link.append(arrow, '返回作品集');
  link.href = `index.html#${categories.includes(category) ? category : 'home'}`;
  link.addEventListener('click', e => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const saved = getStored(returnKey);
    if (saved && saved.category === category && Date.now() - saved.time < 1000 * 60 * 120) {
      store(restoreKey, saved);
      // Restore only after content and fonts have settled; a fragment here would
      // let the browser's anchor scrolling compete with the stored position.
      link.href = 'index.html';
    }
  });
  return link;
}
function renderWork(work) {
  document.body.dataset.category = work.category;
  const main = $('#main');
  main.replaceChildren();
  const container = element('article', 'work-container');
  const header = element('header', 'work-header');
  header.append(metadata(work), element('h1', '', work.title));
  if (work.summary) header.append(element('p', 'work-lead', work.summary));
  if (work.demo) header.append(element('p', 'work-demo-note', '本页为示例内容，用于演示作品排版与阅读体验，不代表张艺的真实创作成果。'));
  container.append(header);
  if (work.category === 'sound') {
    const stillLife = element('figure', 'detail-sound-art');
    stillLife.append(image({ title: '声音主题', image: 'assets/images/listening.webp', imageSmall: 'assets/images/listening-small.webp', imageAlt: '录音机、耳机与信纸的声音主题水彩插画' }, true));
    container.append(stillLife);
  }
  if (safeUrl(work.image)) {
    const figure = element('figure', 'work-figure');
    const button = element('button', 'image-toggle');
    button.type = 'button'; button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', `展开查看${work.title}完整配图`);
    button.append(image(work, true));
    const figcaption = element('figcaption', 'illustration-caption');
    figcaption.append(element('span', '', work.imageCaption || '作品配图'));
    const hint = element('span', 'image-hint', '点击图片展开查看'); figcaption.append(hint);
    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(expanded));
      button.setAttribute('aria-label', `${expanded ? '收起' : '展开查看'}${work.title}完整配图`);
      hint.textContent = expanded ? '再次点击收起' : '点击图片展开查看';
    });
    figure.append(button, figcaption); container.append(figure);
  }
  const reading = element('div', 'work-reading');
  if (work.media) reading.append(media(work));
  if (safeUrl(work.pdf)) {
    const pdf = element('a', 'text-link download-link', '下载剧本 PDF');
    pdf.href = safeUrl(work.pdf); pdf.setAttribute('download', ''); reading.append(pdf);
  }
  (work.sections || []).forEach(section => {
    const block = element('section', 'reading-section');
    if (section.title) block.append(element('h2', '', section.title));
    (section.paragraphs || []).forEach(p => block.append(element('p', '', p)));
    (section.blocks || []).forEach(item => {
      if (item.type === 'dialogue') {
        const dialogue = element('dl', 'dialogue');
        dialogue.append(element('dt', '', item.speaker || '人物'), element('dd', '', item.text)); block.append(dialogue);
      } else block.append(element('p', item.type === 'scene' ? 'script-scene' : '', item.text));
    });
    reading.append(block);
  });
  container.append(reading);
  const end = element('div', 'work-end');
  end.append(element('small', '', '感谢阅读'), returnLink(work.category)); container.append(end);
  main.append(container); main.setAttribute('aria-busy', 'false');
  $('#header-back').replaceWith(returnLink(work.category, 'back-link'));
  document.title = `${work.title} · ${siteTitle}`;
}
function renderNotFound() {
  const main = $('#main');
  const container = element('section', 'not-found shell');
  container.append(element('h1', '', '这篇作品还没有放进来。'), element('p', '', '链接可能已变更，或作品正在整理。你可以回到作品集，看看其他内容。'), returnLink('home'));
  main.replaceChildren(container); main.setAttribute('aria-busy', 'false');
  document.title = '作品未找到 · 张艺的作品集';
}
function showLoadError() {
  const nodes = isHome ? categories.map(id => $(`#${id}-list`)) : [$('#main')];
  nodes.forEach((node, index) => {
    const message = element('div', 'error-message', '作品暂时未能加载，请检查网络后重试。');
    if (index === 0) {
      const retry = element('button', 'retry-button', '重新加载作品');
      retry.type = 'button'; retry.addEventListener('click', () => { retry.disabled = true; retry.textContent = '正在重试…'; loadContent(); });
      message.append(retry);
    }
    if (!isHome) message.classList.add('work-container');
    node.replaceChildren(message); node.setAttribute('aria-busy', 'false');
  });
}
async function loadContent() {
  try {
    const response = await fetch('data/portfolio.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('Content request failed');
    const data = await response.json();
    if (!Array.isArray(data.works)) throw new Error('Invalid content');
    if (data.profile?.siteTitle) siteTitle = data.profile.siteTitle;
    if (data.profile?.name) {
      document.querySelectorAll('.wordmark').forEach(mark => {
        mark.replaceChildren(document.createTextNode(data.profile.name), element('span', '', '的作品集'));
        mark.setAttribute('aria-label', siteTitle);
      });
      if (isHome) $('#hero-title').textContent = `我叫${data.profile.name}。`;
    }
    document.querySelectorAll('.site-footer>span:first-child').forEach(node => { node.textContent = siteTitle; });
    if (isHome) {
      document.title = siteTitle;
      if (data.profile?.intro) {
        const intro = data.profile.intro;
        const cut = intro.indexOf('被听见');
        const node = $('.hero-intro');
        // Preserve the original semantic line break without injecting HTML.
        if (cut > 0) node.replaceChildren(document.createTextNode(intro.slice(0, cut)), element('br'), document.createTextNode(intro.slice(cut)));
        else node.textContent = intro;
      }
      categories.forEach(category => {
        const container = $(`#${category}-list`);
        const works = data.works.filter(work => work.category === category);
        container.replaceChildren();
        if (works.length) renderers[category](works, container);
        else container.append(element('p', 'loading-message', '作品正在整理，稍后补充。'));
        container.setAttribute('aria-busy', 'false');
      });
      restorePosition();
    } else {
      const id = new URLSearchParams(location.search).get('id');
      const work = data.works.find(item => item.id === id);
      if (work) renderWork(work); else renderNotFound();
    }
  } catch { showLoadError(); }
}

document.addEventListener('error', e => {
  if (!(e.target instanceof HTMLImageElement) || e.target.dataset.failed) return;
  const img = e.target; img.dataset.failed = 'true'; img.hidden = true;
  const fallback = element('div', 'image-fallback', '配图暂时未能加载');
  fallback.append(element('small', '', '文字内容仍可正常阅读'));
  img.after(fallback);
}, true);
setupNavigation();
if (isHome) setupReturnTracking();
loadContent();
