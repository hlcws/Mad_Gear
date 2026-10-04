// Shared overlay logic. Each page has two parts:
//   ?part=frame  static look (rendered to PNG by render-frames.mjs, no server needed on stream)
//   ?part=live   only elements with class "live" (scoreboard), transparent, needs server.mjs
//   (no part)    both, handy for testing
// Data attributes:
//   data-bind="p1|p2|s1|s2|ft|title"  live scoreboard text
//   data-config="club|kanji|game|..."  text from config.json (baked into the PNG)
//   data-text="breakText|..."          text from config.json "texts"
//   data-socials                       social links from config.json
//   data-icon="twitch|discord|web"     prepends that icon

const ICONS = {
  twitch: '<svg viewBox="0 0 24 24"><path d="M11.57 4.71h1.72v5.15h-1.72zm4.72 0H18v5.15h-1.71zM6 0 1.71 4.29v15.42h5.15V24l4.28-4.29h3.43L22.29 12V0zm14.57 11.14-3.43 3.43h-3.43l-3 3v-3H6.86V1.71h13.71z"/></svg>',
  discord: '<svg viewBox="0 0 24 24"><path d="M20.32 4.37A19.8 19.8 0 0 0 15.43 2.85a.07.07 0 0 0-.08.04c-.21.38-.44.87-.61 1.25a18.3 18.3 0 0 0-5.49 0 12.6 12.6 0 0 0-.62-1.25.08.08 0 0 0-.08-.04A19.7 19.7 0 0 0 3.68 4.37a.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 5.99 3.03.08.08 0 0 0 .09-.03c.46-.63.87-1.3 1.22-1.99a.08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.89.08.08 0 0 1 0-.13l.37-.29a.07.07 0 0 1 .08-.01c3.93 1.79 8.18 1.79 12.06 0a.07.07 0 0 1 .08.01l.37.29a.08.08 0 0 1 0 .13c-.6.35-1.22.64-1.87.89a.08.08 0 0 0-.04.11c.36.7.77 1.36 1.22 1.99a.08.08 0 0 0 .09.03 19.8 19.8 0 0 0 6-3.03.08.08 0 0 0 .03-.06c.5-5.18-.84-9.67-3.55-13.66a.06.06 0 0 0-.03-.03zM8.02 15.33c-1.18 0-2.16-1.09-2.16-2.42s.96-2.42 2.16-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.33-.96 2.42-2.16 2.42zm7.97 0c-1.18 0-2.15-1.09-2.15-2.42s.95-2.42 2.15-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.33-.95 2.42-2.16 2.42z"/></svg>',
  web: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.93 6h-2.95a15.7 15.7 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.93 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14a8.2 8.2 0 0 1 0-4h3.38a16.5 16.5 0 0 0 0 4zm.81 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.99 7.99 0 0 1 5.07 16zm2.95-8H5.07a7.99 7.99 0 0 1 4.33-3.56A15.7 15.7 0 0 0 8.02 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66a14.7 14.7 0 0 1 0-4h4.68a14.7 14.7 0 0 1 0 4zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 0 1-4.33 3.56zM16.36 14a16.5 16.5 0 0 0 0-4h3.38a8.2 8.2 0 0 1 0 4z"/></svg>',
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export async function start() {
  const part = new URLSearchParams(location.search).get('part');
  if (part) document.body.classList.add('part-' + part);

  if (part !== 'live') {
    const config = await (await fetch('/api/config')).json();
    for (const el of document.querySelectorAll('[data-socials]')) {
      el.innerHTML = config.socials.map((s) => `<div class="social ${s.icon}">${ICONS[s.icon] || ''}<span>${esc(s.text)}</span></div>`).join('');
    }
    for (const el of document.querySelectorAll('[data-icon]')) el.insertAdjacentHTML('afterbegin', ICONS[el.dataset.icon]);
    for (const el of document.querySelectorAll('[data-config]')) el.textContent = config[el.dataset.config];
    for (const el of document.querySelectorAll('[data-text]')) el.textContent = config.texts[el.dataset.text];
    await document.fonts.ready;
    document.body.classList.add('ready'); // render-frames.mjs waits for this
  }
  if (part !== 'frame') listenState();
}

function listenState() {
  let last = {};
  const es = new EventSource('/api/events');
  es.onmessage = (e) => {
    const s = JSON.parse(e.data);
    for (const el of document.querySelectorAll('[data-bind]')) {
      const k = el.dataset.bind;
      el.textContent = k === 'ft' ? `FT${s.ft}` : s[k];
      if ((k === 's1' || k === 's2') && last[k] !== undefined && last[k] !== s[k]) {
        el.classList.add('bump');
        setTimeout(() => el.classList.remove('bump'), 180);
      }
    }
    // Highlight whoever reached the FT target
    for (const n of ['1', '2']) {
      const won = s['s' + n] >= s.ft;
      document.querySelectorAll(`[data-side="${n}"]`).forEach((el) => el.classList.toggle('winner', won));
    }
    document.body.classList.toggle('has-score', s.s1 + s.s2 > 0);
    last = s;
  };
}
