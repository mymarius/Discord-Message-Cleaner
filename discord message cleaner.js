/**
 * Discord Message Cleaner v3.0
 * Kendi mesajlarını (ve istersen tepkilerini) kanallardan, DM'lerden veya bir sunucudan siler.
 * Deletes YOUR OWN messages (and optionally your reactions) from channels, DMs or a server.
 *
 * Kullanım: discord.com/app'i masaüstü tarayıcıda aç -> F12 -> Console -> bu dosyanın tamamını yapıştır -> Enter.
 * Açılır pencereye (popup) izin ver.
 *
 * v3 değişiklikleri:
 *  - Token artık kullanılmadan önce /users/@me ile DOĞRULANIYOR. Eski/yanlış token otomatik atlanıyor,
 *    geçerli olanı bulana kadar tüm adaylar (localStorage, webpack, ağ istekleri) deneniyor.
 *  - Author ID, token'ın sahibinden otomatik alınıyor; elle yanlış girilirse uyarıyor.
 *  - 401 artık "erişim yok" diye yanıltmıyor; net hata verip duruyor.
 *  - Onay penceresi tarayıcı confirm() yerine uygulama içi modal.
 *  - Yeni arayüz: iki kolon, istatistik kartları, ilerleme çubuğu, zaman damgalı log.
 *  - Kanal ID alanına kanal linki yapıştırabilirsin.
 *
 * UYARI: Kullanıcı hesabını otomatikleştirmek Discord Hizmet Şartları'na aykırıdır. Sorumluluk sana aittir.
 * Silinen mesajlar geri alınamaz. Token'ını kimseyle paylaşma.
 */
(function () {
    'use strict';

    if (window.__dmcPopup && !window.__dmcPopup.closed) { window.__dmcPopup.focus(); return 'Zaten açık.'; }

    const API = 'https://discord.com/api/v9';
    const DELETABLE = [0, 6, 19, 20];
    const TEXT_CHANNEL_TYPES = [0, 2, 5, 13];
    const DISCORD_EPOCH = 1420070400000n;
    const CAP = window.__dmcCap || (window.__dmcCap = new Set());

    // ------------------------------------------------------------ i18n
    const I18N = {
        tr: {
            title: 'Mesaj Temizleyici', sub: 'Kendi Discord mesajlarını güvenle sil',
            warn: 'Kullanıcı hesabını otomatikleştirmek Discord Hizmet Şartları’na aykırıdır. Silinen mesajlar geri alınamaz.',
            account: 'Hesap', where: 'Nerede', filters: 'Filtreler', options: 'Seçenekler',
            token: 'Auth token', tokenPh: 'Boş bırak, otomatik bulunur', author: 'Yazar ID',
            find: 'Bul', check: 'Doğrula', show: 'Göster', hide: 'Gizle',
            pillIdle: 'Doğrulanmadı', pillOk: 'Geçerli: {u}', pillBad: 'Geçersiz token',
            scopeIds: 'Kanallar', scopeDms: 'Tüm DM’ler', scopeGuild: 'Sunucu',
            channelIds: 'Kanal ID veya link', channelHint: 'Birden fazlasını virgül ya da boşlukla ayır',
            guildId: 'Sunucu ID', fillHere: 'Açık kanaldan al',
            after: 'Şundan sonra', before: 'Şundan önce', olderThan: 'Şundan eski (gün)',
            afterId: 'Mesaj ID’sinden sonra', beforeId: 'Mesaj ID’sinden önce', contains: 'İçerdiği metin',
            hasLink: 'Sadece link içerenler', hasFile: 'Sadece dosya içerenler', pinned: 'Sabitlenenleri de sil',
            reactions: 'Tepkilerimi de kaldır', dry: 'Deneme modu (sadece tara, silme)',
            backup: 'Silmeden önce JSON yedeği indir', delay: 'Silme aralığı (ms)', jitter: 'Rastgele sapma ekle',
            start: 'Başlat', pause: 'Duraklat', resume: 'Devam et', stop: 'Durdur', clear: 'Logu temizle', export: 'JSON indir',
            autoScroll: 'Otomatik kaydır', blur: 'Gizlilik modu', verbose: 'Ayrıntılı log',
            sScanned: 'Taranan', sFound: 'Bulunan', sDeleted: 'Silinen', sFailed: 'Başarısız', sEta: 'Kalan süre',
            logTitle: 'Etkinlik', idle: 'Hazır', phaseScan: 'Taranıyor', phaseDelete: 'Siliniyor', phaseDone: 'Bitti',
            started: 'Başladı',
            tokenFinding: 'Token aranıyor ve doğrulanıyor...',
            tokenSavedBad: 'Alandaki token geçersiz, otomatik arama yapılıyor...',
            tokenOk: 'Token doğrulandı: {u}',
            tokenFail: 'Geçerli token bulunamadı. Discord sekmesinde bir kanala tıkla ve tekrar dene, ya da token’ı elle yapıştır.',
            authorMismatch: 'Girilen Yazar ID token sahibiyle uyuşmuyordu. Doğru ID kullanıldı: {id}',
            noScope: 'İşlenecek kanal yok. Kanal ID / sunucu ID gir ya da DM seç.',
            resolving: 'Kanallar çözümleniyor...', resolved: '{n} kanal taranacak.',
            scanning: '{name} taranıyor...',
            channelDone: '{name}: {f} mesaj, {r} tepki bulundu ({s} mesaj tarandı)',
            noMine: '{name}: {s} mesaj tarandı ama hiçbiri senin değil. Yazar ID veya kanal yanlış olabilir.',
            skip: '{name}: erişilemedi (HTTP {c}), atlandı.',
            unauthorized: 'HTTP 401: token reddedildi. İşlem durduruldu. Sayfayı yenileyip tekrar dene.',
            summary: 'Tarama bitti. Taranan {s}, silinecek {f}, kaldırılacak tepki {r}.',
            nothing: 'Silinecek bir şey bulunamadı.',
            confirmTitle: 'Silmeyi onayla',
            confirmBody: '{c} kanalda {f} mesaj silinecek, {r} tepki kaldırılacak. Tahmini süre: {eta}.',
            confirmType: 'Büyük işlem. Devam etmek için DELETE yaz.',
            previewTitle: 'Önizleme (ilk {n})',
            ok: 'Sil', cancel: 'Vazgeç', aborted: 'İptal edildi.',
            backupSaved: 'Yedek indirildi ({n} mesaj).',
            dryDone: 'Deneme bitti, hiçbir şey silinmedi. Listeyi “JSON indir” ile kaydedebilirsin.',
            deleting: '{i}/{n}  {p}',
            rate: 'Rate limit: {ms} ms bekleniyor. Silme aralığı {d} ms oldu.',
            done: 'Bitti. Silinen {d}, tepki {rx}, başarısız {f}, rate limit {r}, süre {t}.',
            stopped: 'Durduruldu.', paused: 'Duraklatıldı.', resumed: 'Devam ediliyor.',
            netErr: 'Ağ hatası: {e}', badDate: 'Geçersiz tarih yok sayıldı: {v}',
            running: 'Zaten çalışıyor.', noChan: 'Önce Discord sekmesinde bir kanal aç.',
            exportNone: 'Dışa aktarılacak bir şey yok.', blurOn: 'Gizlilik modu kimlik bilgilerini bulanıklaştırır. Ekran görüntüsü paylaşmadan önce yine de kontrol et.',
        },
        en: {
            title: 'Message Cleaner', sub: 'Safely delete your own Discord messages',
            warn: 'Automating a user account is against Discord’s Terms of Service. Deleted messages cannot be recovered.',
            account: 'Account', where: 'Where', filters: 'Filters', options: 'Options',
            token: 'Auth token', tokenPh: 'Leave empty to auto-detect', author: 'Author ID',
            find: 'Find', check: 'Verify', show: 'Show', hide: 'Hide',
            pillIdle: 'Not verified', pillOk: 'Valid: {u}', pillBad: 'Invalid token',
            scopeIds: 'Channels', scopeDms: 'All DMs', scopeGuild: 'Server',
            channelIds: 'Channel ID or link', channelHint: 'Separate several with commas or spaces',
            guildId: 'Server ID', fillHere: 'Use open channel',
            after: 'After', before: 'Before', olderThan: 'Older than (days)',
            afterId: 'After message ID', beforeId: 'Before message ID', contains: 'Containing text',
            hasLink: 'Only with links', hasFile: 'Only with files', pinned: 'Include pinned',
            reactions: 'Also remove my reactions', dry: 'Dry run (scan only)',
            backup: 'Download JSON backup first', delay: 'Delete delay (ms)', jitter: 'Add random jitter',
            start: 'Start', pause: 'Pause', resume: 'Resume', stop: 'Stop', clear: 'Clear log', export: 'Export JSON',
            autoScroll: 'Auto scroll', blur: 'Privacy mode', verbose: 'Verbose log',
            sScanned: 'Scanned', sFound: 'Found', sDeleted: 'Deleted', sFailed: 'Failed', sEta: 'Time left',
            logTitle: 'Activity', idle: 'Ready', phaseScan: 'Scanning', phaseDelete: 'Deleting', phaseDone: 'Done',
            started: 'Started',
            tokenFinding: 'Looking for a token and verifying it...',
            tokenSavedBad: 'The token in the field is invalid, searching automatically...',
            tokenOk: 'Token verified: {u}',
            tokenFail: 'No valid token found. Click any channel in Discord and retry, or paste the token manually.',
            authorMismatch: 'The Author ID did not match the token owner. Using the correct ID: {id}',
            noScope: 'Nothing to process. Enter a channel ID / server ID or pick DMs.',
            resolving: 'Resolving channels...', resolved: '{n} channel(s) to scan.',
            scanning: 'Scanning {name}...',
            channelDone: '{name}: {f} message(s), {r} reaction(s) found ({s} scanned)',
            noMine: '{name}: scanned {s} messages but none are yours. Author ID or channel may be wrong.',
            skip: '{name}: not accessible (HTTP {c}), skipped.',
            unauthorized: 'HTTP 401: token rejected. Stopped. Refresh the page and retry.',
            summary: 'Scan finished. Scanned {s}, to delete {f}, reactions {r}.',
            nothing: 'Nothing to delete.',
            confirmTitle: 'Confirm deletion',
            confirmBody: 'Delete {f} message(s) and remove {r} reaction(s) in {c} channel(s). Estimated time: {eta}.',
            confirmType: 'Large operation. Type DELETE to continue.',
            previewTitle: 'Preview (first {n})',
            ok: 'Delete', cancel: 'Cancel', aborted: 'Aborted.',
            backupSaved: 'Backup downloaded ({n} messages).',
            dryDone: 'Dry run finished, nothing was deleted. Use “Export JSON” to save the list.',
            deleting: '{i}/{n}  {p}',
            rate: 'Rate limited: waiting {ms} ms. Delay is now {d} ms.',
            done: 'Done. Deleted {d}, reactions {rx}, failed {f}, rate limits {r}, time {t}.',
            stopped: 'Stopped.', paused: 'Paused.', resumed: 'Resumed.',
            netErr: 'Network error: {e}', badDate: 'Invalid date ignored: {v}',
            running: 'Already running.', noChan: 'Open a channel in the Discord tab first.',
            exportNone: 'Nothing to export.', blurOn: 'Privacy mode blurs identifying info. Double-check before sharing screenshots.',
        },
    };
    let LANG = (navigator.language || 'en').toLowerCase().startsWith('tr') ? 'tr' : 'en';
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
    const tRaw = (k, v = {}) => String((I18N[LANG] && I18N[LANG][k]) ?? I18N.en[k] ?? k).replace(/\{(\w+)\}/g, (_, n) => v[n] ?? '');
    const t = (k, v = {}) => tRaw(k, Object.fromEntries(Object.entries(v).map(([a, b]) => [a, esc(b)])));

    // ------------------------------------------------------------ popup UI
    const W = Math.min(1100, screen.width), H = Math.min(screen.height, 880);
    const popup = window.open('', '', `top=20,left=${Math.max(0, (screen.width - W) / 2)},width=${W},height=${H}`);
    if (!popup || !popup.document || !popup.document.write) return console.error('Popup engellendi! İzin verip tekrar dene.');
    window.__dmcPopup = popup;

    popup.document.write(/*html*/`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Message Cleaner</title><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_blank">
<style>
:root{
  --bg:#14161c; --panel:#1b1e26; --raised:#232732; --line:#2c3140; --text:#e6e8ee; --muted:#8b93a7;
  --accent:#7c8cff; --accent-ink:#0f1230; --ok:#3ecf8e; --warn:#f2b84b; --bad:#ff6b6b; --info:#6cc4ff;
  --r:10px;
}
*{box-sizing:border-box}
html,body{height:100%;margin:0}
body{background:var(--bg);color:var(--text);font:13px/1.45 "Segoe UI",system-ui,-apple-system,sans-serif;display:flex;flex-direction:column;overflow:hidden}
button,input,select{font:inherit;color:inherit}
:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.hide{display:none!important}

header{display:flex;align-items:center;gap:14px;padding:12px 20px;border-bottom:1px solid var(--line);background:var(--panel)}
.logo{width:34px;height:34px;border-radius:9px;background:var(--accent);color:var(--accent-ink);display:grid;place-items:center;font-weight:700;font-size:16px}
header h1{font-size:16px;margin:0;font-weight:650;letter-spacing:.1px}
header p{margin:0;color:var(--muted);font-size:12px}
header .sp{flex:1}
.tog{display:inline-flex;align-items:center;gap:6px;color:var(--muted);cursor:pointer;user-select:none}
select{background:var(--raised);border:1px solid var(--line);border-radius:7px;padding:4px 8px}

.warn{margin:12px 20px 0;padding:8px 12px;border-radius:var(--r);background:rgba(242,184,75,.1);border:1px solid rgba(242,184,75,.35);color:var(--warn);font-size:12px}

main{flex:1;min-height:0;display:grid;grid-template-columns:minmax(340px,420px) 1fr;gap:16px;padding:16px 20px}
@media (max-width:820px){main{grid-template-columns:1fr;overflow:auto}}
#side{overflow:auto;display:flex;flex-direction:column;gap:12px;padding-right:4px}
#work{min-height:0;display:flex;flex-direction:column;gap:12px}

section.card{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:12px 14px}
section.card h2{margin:0 0 8px;font-size:13px;font-weight:650;color:var(--text)}
label{display:block;margin:8px 0 0;color:var(--muted);font-size:12px}
label>.in,label>input,label>select{margin-top:4px}
input[type=text],input[type=password],input[type=number],input[type=datetime-local],select.full{
  width:100%;background:var(--raised);border:1px solid var(--line);border-radius:8px;padding:7px 10px;color:var(--text)}
input::placeholder{color:#5f6679}
input:focus{border-color:var(--accent)}
.hint{display:block;margin-top:3px;font-size:11px;color:#6d7488}
.row{display:flex;align-items:center;gap:8px;color:var(--text);margin:8px 0 0;cursor:pointer}
.row input{accent-color:var(--accent)}
.two{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.inline{display:flex;gap:6px}
.inline input{flex:1}

button{border:0;border-radius:8px;padding:7px 14px;cursor:pointer;background:var(--raised);border:1px solid var(--line)}
button:hover:not(:disabled){border-color:#3a4155;background:#2a2f3c}
button:disabled{opacity:.4;cursor:not-allowed}
button.mini{padding:6px 10px;font-size:12px}
button.primary{background:var(--accent);border-color:var(--accent);color:var(--accent-ink);font-weight:650}
button.primary:hover:not(:disabled){background:#95a1ff;border-color:#95a1ff}
button.danger{background:rgba(255,107,107,.12);border-color:rgba(255,107,107,.5);color:var(--bad)}

.pill{display:inline-flex;align-items:center;gap:6px;margin-top:6px;padding:3px 10px;border-radius:99px;font-size:12px;background:var(--raised);color:var(--muted)}
.pill::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor}
.pill.ok{color:var(--ok);background:rgba(62,207,142,.1)}
.pill.bad{color:var(--bad);background:rgba(255,107,107,.1)}

.seg{display:grid;grid-template-columns:repeat(3,1fr);background:var(--raised);border:1px solid var(--line);border-radius:9px;padding:3px;gap:3px}
.seg button{border:0;background:transparent;padding:6px 4px;color:var(--muted)}
.seg button.on{background:var(--accent);color:var(--accent-ink);font-weight:650}

#stats{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
@media (max-width:1000px){#stats{grid-template-columns:repeat(3,1fr)}}
.stat{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:9px 12px}
.stat b{display:block;font-size:20px;font-weight:650;font-variant-numeric:tabular-nums}
.stat span{color:var(--muted);font-size:12px}
.stat.f b{color:var(--info)}.stat.d b{color:var(--ok)}.stat.x b{color:var(--bad)}

#bar{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:10px 14px}
#barTop{display:flex;justify-content:space-between;color:var(--muted);font-size:12px;margin-bottom:6px}
#track{height:8px;border-radius:99px;background:var(--raised);overflow:hidden}
#fill{height:100%;width:0;background:var(--accent);border-radius:99px;transition:width .25s}
#track.indet #fill{width:35%;animation:slide 1.1s ease-in-out infinite alternate}
@keyframes slide{from{margin-left:0}to{margin-left:65%}}
@media (prefers-reduced-motion:reduce){#track.indet #fill{animation:none;width:100%;opacity:.5}}

#actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
#actions .sp{flex:1}

#logWrap{flex:1;min-height:160px;display:flex;flex-direction:column;background:var(--panel);border:1px solid var(--line);border-radius:var(--r);overflow:hidden}
#logHead{display:flex;align-items:center;gap:14px;padding:8px 14px;border-bottom:1px solid var(--line);font-weight:650}
#logHead .sp{flex:1}
#log{flex:1;overflow:auto;padding:8px 14px;font:12px/1.6 Consolas,Menlo,monospace;white-space:pre-wrap;word-break:break-word}
#log div{padding:0 0 0 8px;border-left:2px solid transparent}
#log .ts{color:#5f6679;margin-right:8px}
#log .info{color:var(--info);border-color:var(--info)}
#log .verb{color:var(--muted)}
#log .warn{color:var(--warn);border-color:var(--warn)}
#log .error{color:var(--bad);border-color:var(--bad)}
#log .success{color:var(--ok);border-color:var(--ok)}
#log.hideVerb .verb{display:none}
body.redact .priv{filter:blur(5px)}

#modal{position:fixed;inset:0;background:rgba(8,9,13,.72);display:grid;place-items:center;padding:20px;z-index:10}
#modal .box{width:min(560px,100%);max-height:90vh;overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px}
#modal h3{margin:0 0 8px;font-size:16px}
#mPrev{background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px 10px;margin:10px 0;font:11px/1.6 Consolas,monospace;color:var(--muted);max-height:180px;overflow:auto;white-space:pre-wrap;word-break:break-word}
#modal .btns{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}
</style></head><body class="redact">
<header>
  <div class="logo">M</div>
  <div><h1 data-i="title"></h1><p data-i="sub"></p></div>
  <div class="sp"></div>
  <label class="tog" style="margin:0"><input type="checkbox" id="redact" checked><span data-i="blur"></span></label>
  <select id="lang"><option value="tr">Türkçe</option><option value="en">English</option></select>
</header>
<div class="warn" data-i="warn"></div>
<main>
  <div id="side">
    <section class="card">
      <h2 data-i="account"></h2>
      <label><span data-i="token"></span>
        <div class="inline" style="margin-top:4px">
          <input type="password" id="authToken" autocomplete="off" spellcheck="false">
          <button class="mini" id="tokTog" data-i="show"></button>
          <button class="mini" id="tokFind" data-i="find"></button>
        </div>
      </label>
      <span class="pill" id="pill"></span>
      <label><span data-i="author"></span><input type="text" id="authorId" class="priv" spellcheck="false"></label>
    </section>

    <section class="card">
      <h2 data-i="where"></h2>
      <div class="seg" id="seg">
        <button data-scope="ids" data-i="scopeIds"></button>
        <button data-scope="dms" data-i="scopeDms"></button>
        <button data-scope="guild" data-i="scopeGuild"></button>
      </div>
      <label id="chanRow"><span data-i="channelIds"></span><input type="text" id="channelId" class="priv" spellcheck="false">
        <span class="hint" data-i="channelHint"></span></label>
      <label id="guildRow"><span data-i="guildId"></span>
        <div class="inline" style="margin-top:4px"><input type="text" id="guildId" class="priv" spellcheck="false">
        <button class="mini" id="getGC" data-i="fillHere"></button></div></label>
    </section>

    <section class="card">
      <h2 data-i="filters"></h2>
      <div class="two">
        <label><span data-i="after"></span><input type="datetime-local" id="minDate"></label>
        <label><span data-i="before"></span><input type="datetime-local" id="maxDate"></label>
      </div>
      <label><span data-i="olderThan"></span><input type="number" id="olderDays" min="0" placeholder="0"></label>
      <div class="two">
        <label><span data-i="afterId"></span><input type="text" id="minId" class="priv"></label>
        <label><span data-i="beforeId"></span><input type="text" id="maxId" class="priv"></label>
      </div>
      <label><span data-i="contains"></span><input type="text" id="content" class="priv"></label>
      <label class="row"><input type="checkbox" id="hasLink"><span data-i="hasLink"></span></label>
      <label class="row"><input type="checkbox" id="hasFile"><span data-i="hasFile"></span></label>
      <label class="row"><input type="checkbox" id="includePinned"><span data-i="pinned"></span></label>
    </section>

    <section class="card">
      <h2 data-i="options"></h2>
      <label class="row"><input type="checkbox" id="removeReactions"><span data-i="reactions"></span></label>
      <label class="row"><input type="checkbox" id="dryRun"><span data-i="dry"></span></label>
      <label class="row"><input type="checkbox" id="backup" checked><span data-i="backup"></span></label>
      <label class="row"><input type="checkbox" id="jitter" checked><span data-i="jitter"></span></label>
      <label><span data-i="delay"></span><input type="number" id="delay" value="1200" min="300" step="100"></label>
    </section>
  </div>

  <div id="work">
    <div id="actions">
      <button class="primary" id="start" data-i="start"></button>
      <button id="pause" data-i="pause" disabled></button>
      <button class="danger" id="stop" data-i="stop" disabled></button>
      <div class="sp"></div>
      <button id="export" data-i="export"></button>
    </div>
    <div id="stats">
      <div class="stat"><b id="vScanned">0</b><span data-i="sScanned"></span></div>
      <div class="stat f"><b id="vFound">0</b><span data-i="sFound"></span></div>
      <div class="stat d"><b id="vDeleted">0</b><span data-i="sDeleted"></span></div>
      <div class="stat x"><b id="vFailed">0</b><span data-i="sFailed"></span></div>
      <div class="stat"><b id="vEta">–</b><span data-i="sEta"></span></div>
    </div>
    <div id="bar">
      <div id="barTop"><span id="phase"></span><span id="pct"></span></div>
      <div id="track"><div id="fill"></div></div>
    </div>
    <div id="logWrap">
      <div id="logHead"><span data-i="logTitle"></span><div class="sp"></div>
        <label class="tog" style="margin:0"><input type="checkbox" id="verbose" checked><span data-i="verbose"></span></label>
        <label class="tog" style="margin:0"><input type="checkbox" id="autoScroll" checked><span data-i="autoScroll"></span></label>
        <button class="mini" id="clear" data-i="clear"></button>
      </div>
      <div id="log"></div>
    </div>
  </div>
</main>

<div id="modal" class="hide"><div class="box" role="dialog" aria-modal="true">
  <h3 id="mTitle"></h3>
  <div id="mBody"></div>
  <div id="mPrevTitle" style="margin-top:10px;color:var(--muted);font-size:12px"></div>
  <div id="mPrev" class="priv"></div>
  <div id="mTypeRow" class="hide"><span style="color:var(--warn)" id="mTypeMsg"></span>
    <input type="text" id="mType" style="margin-top:6px" autocomplete="off"></div>
  <div class="btns"><button id="mCancel"></button><button class="danger" id="mOk"></button></div>
</div></div>
</body></html>`);
    popup.document.close();

    const $ = s => popup.document.querySelector(s);
    const logArea = $('#log');
    popup.addEventListener('beforeunload', () => { S.stop = true; window.__dmcPopup = null; });

    // ------------------------------------------------------------ state
    const S = {
        running: false, stop: false, paused: false, phase: 'idle',
        token: '', authorId: '', scope: 'ids', delay: 1200, ping: 0,
        scanned: 0, found: [], reactions: [], deleted: 0, rxRemoved: 0, failed: 0, throttled: 0,
        user: null,
    };

    // ------------------------------------------------------------ helpers
    const sleep0 = ms => new Promise(r => setTimeout(r, ms));
    const fmtDur = ms => {
        const h = (ms / 3.6e6) | 0, m = ((ms % 3.6e6) / 6e4) | 0, s = ((ms % 6e4) / 1000) | 0;
        return h ? `${h}sa ${m}dk` : m ? `${m}dk ${s}sn` : `${s}sn`;
    };
    const pad = n => String(n).padStart(2, '0');

    function log(type, html, priv) {
        const d = popup.document.createElement('div');
        const now = new Date();
        d.className = type + (priv ? ' priv' : '');
        d.innerHTML = `<span class="ts">${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}</span>${html}`;
        logArea.appendChild(d);
        while (logArea.childElementCount > 3000) logArea.firstElementChild.remove();
        if ($('#autoScroll').checked) logArea.scrollTop = logArea.scrollHeight;
    }

    function applyLang() {
        popup.document.querySelectorAll('[data-i]').forEach(el => { el.textContent = tRaw(el.dataset.i); });
        popup.document.title = tRaw('title');
        $('#pause').textContent = tRaw(S.paused ? 'resume' : 'pause');
        $('#tokTog').textContent = tRaw($('#authToken').type === 'password' ? 'show' : 'hide');
        $('#mCancel').textContent = tRaw('cancel');
        $('#mOk').textContent = tRaw('ok');
        setPill(S.user ? 'ok' : $('#pill').dataset.state || 'idle', S.user && S.user.username);
        updateStats();
    }

    function updateStats() {
        const done = S.deleted + S.rxRemoved + S.failed;
        const total = S.found.length + S.reactions.length;
        const remaining = Math.max(0, total - done);
        $('#vScanned').textContent = S.scanned;
        $('#vFound').textContent = S.found.length;
        $('#vDeleted').textContent = S.deleted + S.rxRemoved;
        $('#vFailed').textContent = S.failed;
        $('#vEta').textContent = S.phase === 'delete' && remaining ? fmtDur(remaining * (S.delay * 1.2 + (S.ping || 250))) : '–';
        const track = $('#track');
        if (S.phase === 'delete' && total) {
            track.classList.remove('indet');
            $('#fill').style.width = `${Math.round(done / total * 100)}%`;
            $('#pct').textContent = `${done}/${total}`;
        } else if (S.phase === 'scan') {
            track.classList.add('indet'); $('#pct').textContent = '';
        } else {
            track.classList.remove('indet');
            $('#fill').style.width = S.phase === 'done' ? '100%' : '0';
            $('#pct').textContent = '';
        }
        $('#phase').textContent = tRaw({ idle: 'idle', scan: 'phaseScan', delete: 'phaseDelete', done: 'phaseDone' }[S.phase]);
    }

    function setPill(state, name) {
        const p = $('#pill');
        p.dataset.state = state;
        p.className = 'pill' + (state === 'ok' ? ' ok' : state === 'bad' ? ' bad' : '');
        p.classList.toggle('priv', state === 'ok');
        p.textContent = state === 'ok' ? tRaw('pillOk', { u: name }) : tRaw(state === 'bad' ? 'pillBad' : 'pillIdle');
    }

    function setRunUi(running) {
        $('#start').disabled = running;
        $('#stop').disabled = !running;
        $('#pause').disabled = !running;
        if (!running) { S.paused = false; $('#pause').textContent = tRaw('pause'); }
    }

    // snowflake helpers
    const msToSnow = ms => { const x = (BigInt(Math.floor(ms)) - DISCORD_EPOCH) << 22n; return x < 0n ? 0n : x; };
    function parseSnow(v) {
        v = (v || '').trim();
        if (!v) return null;
        if (/^\d{15,}$/.test(v)) return BigInt(v);
        const ms = new Date(v).getTime();
        if (isNaN(ms)) { log('warn', t('badDate', { v })); return null; }
        return msToSnow(ms);
    }

    async function gate() {
        while (S.paused && !S.stop) await sleep0(250);
        if (popup.closed) S.stop = true;
    }
    async function sleep(ms) {
        const end = Date.now() + ms;
        while (Date.now() < end) {
            await gate();
            if (S.stop) return;
            await sleep0(Math.max(0, Math.min(250, end - Date.now())));
        }
    }

    // central request helper: rate limits, 5xx retries, network errors, 401 stop
    async function req(method, path) {
        for (let attempt = 0; attempt < 6; attempt++) {
            await gate();
            if (S.stop) return { aborted: true };
            let r;
            const t0 = Date.now();
            try {
                r = await fetch(API + path, { method, headers: { Authorization: S.token } });
            } catch (e) {
                log('warn', t('netErr', { e: e.message }));
                await sleep(1500 * (attempt + 1));
                continue;
            }
            S.ping = S.ping ? S.ping * 0.8 + (Date.now() - t0) * 0.2 : Date.now() - t0;
            if (r.status === 401) {
                log('error', t('unauthorized'));
                setPill('bad'); S.stop = true;
                return { aborted: true, status: 401 };
            }
            if (r.status === 429) {
                let ra = 1;
                try { ra = (await r.json()).retry_after; } catch (e) { /* ignore */ }
                const w = Math.ceil((Number(ra) || 1) * 1000) + 300;
                S.throttled++;
                S.delay = Math.min(Math.round(S.delay * 1.25), 10000);
                log('warn', t('rate', { ms: w, d: S.delay }));
                await sleep(w);
                continue;
            }
            if (r.status >= 500) { await sleep(1500 * (attempt + 1)); continue; }
            let data = null;
            if (r.status !== 204) { try { data = await r.json(); } catch (e) { /* ignore */ } }
            return { ok: r.ok, status: r.status, data };
        }
        return { ok: false, status: 0 };
    }

    function download(name, obj) {
        const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
        const url = popup.URL.createObjectURL(blob);
        const a = popup.document.createElement('a');
        a.href = url; a.download = name;
        popup.document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => popup.URL.revokeObjectURL(url), 15000);
    }

    // ------------------------------------------------------------ token (validated)
    const cleanTok = v => String(v || '').trim().replace(/^["'\s]+|["'\s]+$/g, '');
    const looksTok = v => typeof v === 'string' && v.length > 20 && !/^(Bearer|Bot|Basic)\s/i.test(v);

    function tokenCandidates() {
        const out = new Set();
        try { // localStorage through a throwaway iframe (Discord removes window.localStorage)
            window.dispatchEvent(new Event('beforeunload'));
            const iframe = document.body.appendChild(document.createElement('iframe'));
            const raw = iframe.contentWindow.localStorage.token;
            iframe.remove();
            if (raw) { try { out.add(cleanTok(JSON.parse(raw))); } catch (e) { out.add(cleanTok(raw)); } }
        } catch (e) { /* ignore */ }
        const saved = {};
        const methods = ['log', 'info', 'warn', 'error', 'debug', 'trace'];
        methods.forEach(k => { saved[k] = console[k]; console[k] = () => {}; });
        try { // webpack module cache
            window.webpackChunkdiscord_app.push([[Symbol()], {}, req2 => {
                for (const m of Object.values(req2.c || {})) {
                    try {
                        const ex = m && m.exports;
                        if (!ex || typeof ex !== 'object') continue;
                        for (const c of [ex, ex.default, ...Object.values(ex)]) {
                            if (!c || (typeof c !== 'object' && typeof c !== 'function')) continue;
                            if (typeof c.getToken === 'function' && typeof c.getId === 'function') {
                                const tk = c.getToken();
                                if (looksTok(tk)) out.add(cleanTok(tk));
                            }
                        }
                    } catch (e) { /* some getters throw */ }
                }
            }]);
        } catch (e) { /* ignore */ } finally { methods.forEach(k => { console[k] = saved[k]; }); }
        CAP.forEach(v => out.add(v)); // tokens seen in Discord's own requests
        return [...out].filter(looksTok);
    }

    // read-only hook: remember Authorization headers of Discord's own requests (installed once)
    if (!window.__dmcHooked) {
        window.__dmcHooked = true;
        try {
            const origFetch = window.fetch;
            window.fetch = function (input, init) {
                try {
                    const h = (init && init.headers) || (input && input.headers);
                    const a = h && typeof h.get === 'function' ? h.get('authorization') : h && (h.Authorization || h.authorization);
                    if (looksTok(a)) CAP.add(cleanTok(a));
                } catch (e) { /* ignore */ }
                return origFetch.apply(this, arguments);
            };
            const origSet = XMLHttpRequest.prototype.setRequestHeader;
            XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
                try { if (/^authorization$/i.test(k) && looksTok(v)) CAP.add(cleanTok(v)); } catch (e) { /* ignore */ }
                return origSet.apply(this, arguments);
            };
        } catch (e) { /* ignore */ }
    }

    // returns the user object if the token works, otherwise null
    async function validateToken(tk) {
        if (!tk) return null;
        try {
            const r = await fetch(`${API}/users/@me`, { headers: { Authorization: tk } });
            if (r.ok) return await r.json();
        } catch (e) { /* network */ }
        return null;
    }

    async function findValidToken(timeout = 20000) {
        const tried = new Set();
        const t0 = Date.now();
        while (!popup.closed && Date.now() - t0 < timeout) {
            for (const tk of tokenCandidates()) {
                if (tried.has(tk)) continue;
                tried.add(tk);
                const user = await validateToken(tk);
                if (user) return { token: tk, user };
            }
            await sleep0(1000);
        }
        return null;
    }

    function acceptAccount(tk, user) {
        S.user = user;
        $('#authToken').value = tk;
        $('#authorId').value = user.id;
        setPill('ok', user.username);
        log('success', t('tokenOk', { u: user.username }), true);
    }

    // make sure the token in the field is valid; fall back to auto-detection
    async function ensureAccount() {
        const typed = cleanTok($('#authToken').value);
        if (typed) {
            const user = await validateToken(typed);
            if (user) { acceptAccount(typed, user); return true; }
            log('warn', t('tokenSavedBad'));
        } else log('info', t('tokenFinding'));
        const found = await findValidToken();
        if (found) { acceptAccount(found.token, found.user); return true; }
        setPill('bad');
        log('error', t('tokenFail'));
        return false;
    }

    function fillGuildChannel(force) {
        const m = location.href.match(/channels\/([\w@]+)\/(\d+)/);
        if (!m) { if (force) popup.alert(tRaw('noChan')); return; }
        if (force || !$('#guildId').value.trim()) $('#guildId').value = m[1];
        if (force || !$('#channelId').value.trim()) $('#channelId').value = m[2];
    }

    // ------------------------------------------------------------ core logic
    function readOptions() {
        S.token = cleanTok($('#authToken').value);
        S.authorId = $('#authorId').value.trim();
        if (S.user && S.authorId !== S.user.id) {
            log('warn', t('authorMismatch', { id: S.user.id }), true);
            S.authorId = S.user.id; $('#authorId').value = S.user.id;
        }
        S.guildId = ($('#guildId').value.match(/@me|\d{15,}/) || [''])[0];
        S.channelIds = [...new Set($('#channelId').value.match(/\d{15,}/g) || [])];
        // a pasted full link keeps only the last id (the channel), so take the last id of each link
        const links = $('#channelId').value.match(/channels\/[\w@]+\/\d+/g);
        if (links) S.channelIds = [...new Set(links.map(l => l.split('/').pop()))];
        S.content = $('#content').value.trim().toLowerCase();
        S.hasLink = $('#hasLink').checked;
        S.hasFile = $('#hasFile').checked;
        S.includePinned = $('#includePinned').checked;
        S.removeReactions = $('#removeReactions').checked;
        S.dryRun = $('#dryRun').checked;
        S.backup = $('#backup').checked;
        S.baseDelay = Math.max(300, parseInt($('#delay').value, 10) || 1200);
        S.delay = S.baseDelay;
        S.jitter = $('#jitter').checked;

        S.minSnow = parseSnow($('#minId').value || $('#minDate').value) ?? 0n;
        const maxes = [parseSnow($('#maxId').value || $('#maxDate').value)].filter(x => x !== null);
        const days = parseFloat($('#olderDays').value);
        if (days > 0) maxes.push(msToSnow(Date.now() - days * 864e5));
        S.maxSnow = maxes.length ? maxes.reduce((a, b) => (a < b ? a : b)) : null;

        S.scanned = 0; S.found = []; S.reactions = [];
        S.deleted = 0; S.rxRemoved = 0; S.failed = 0; S.throttled = 0;
    }

    async function resolveChannels() {
        if (S.scope === 'ids') {
            const list = [];
            for (const id of S.channelIds) {
                const r = await req('GET', `/channels/${id}`);
                if (r.aborted) return [];
                const name = r.ok && r.data ? (r.data.name ? '#' + r.data.name : (r.data.recipients || []).map(u => u.username).join(', ') || id) : '#' + id;
                list.push({ id, name });
            }
            return list;
        }
        if (S.scope === 'dms') {
            const r = await req('GET', '/users/@me/channels');
            if (r.aborted) return [];
            if (!r.ok) { log('error', t('skip', { name: 'DMs', c: r.status })); return []; }
            return r.data.filter(c => c.type === 1 || c.type === 3).map(c => ({
                id: c.id, name: c.name || (c.recipients || []).map(u => u.username).join(', ') || c.id,
            }));
        }
        if (!S.guildId || S.guildId === '@me') return [];
        const r = await req('GET', `/guilds/${S.guildId}/channels`);
        if (r.aborted) return [];
        if (!r.ok) { log('error', t('skip', { name: S.guildId, c: r.status }), true); return []; }
        return r.data.filter(c => TEXT_CHANNEL_TYPES.includes(c.type)).map(c => ({ id: c.id, name: '#' + c.name }));
    }

    function matches(m) {
        if (!DELETABLE.includes(m.type)) return false;
        if (m.pinned && !S.includePinned) return false;
        if (S.content && !(m.content || '').toLowerCase().includes(S.content)) return false;
        if (S.hasLink && !/https?:\/\//i.test(m.content || '')) return false;
        if (S.hasFile && !(m.attachments && m.attachments.length)) return false;
        return true;
    }

    async function scanChannel(ch) {
        let before = S.maxSnow !== null ? S.maxSnow.toString() : undefined;
        let scanned = 0, foundHere = 0, rxHere = 0, mineAny = 0;
        while (true) {
            const r = await req('GET', `/channels/${ch.id}/messages?limit=100${before ? '&before=' + before : ''}`);
            if (r.aborted) return false;
            if (!r.ok) { log('warn', t('skip', { name: ch.name, c: r.status }), true); break; }
            const batch = r.data;
            if (!Array.isArray(batch) || !batch.length) break;
            scanned += batch.length; S.scanned += batch.length;

            for (const m of batch) {
                if (BigInt(m.id) <= S.minSnow) continue;
                const mine = m.author && m.author.id === S.authorId;
                if (mine) mineAny++;
                if (mine && matches(m)) {
                    S.found.push({
                        id: m.id, channel_id: m.channel_id || ch.id, channel: ch.name,
                        timestamp: m.timestamp, content: m.content || '',
                        attachments: (m.attachments || []).map(a => a.url), deleted: false,
                    });
                    foundHere++;
                }
                if (S.removeReactions && Array.isArray(m.reactions)) {
                    for (const rx of m.reactions) {
                        if (!rx.me) continue;
                        const key = rx.emoji.id ? `${rx.emoji.name}:${rx.emoji.id}` : rx.emoji.name;
                        S.reactions.push({ channel_id: m.channel_id || ch.id, id: m.id, key });
                        rxHere++;
                    }
                }
            }
            before = batch[batch.length - 1].id;
            updateStats();
            if (BigInt(before) <= S.minSnow) break;
            await sleep(500);
        }
        if (scanned > 300 && mineAny === 0) log('warn', t('noMine', { name: ch.name, s: scanned }), true);
        else log('verb', t('channelDone', { name: ch.name, f: foundHere, r: rxHere, s: scanned }), true);
        return true;
    }

    function askConfirm(info) {
        return new Promise(res => {
            const need = info.total >= 500;
            $('#mTitle').textContent = tRaw('confirmTitle');
            $('#mBody').innerHTML = t('confirmBody', { f: info.f, r: info.r, c: info.c, eta: info.eta });
            $('#mPrevTitle').textContent = tRaw('previewTitle', { n: info.preview.length });
            $('#mPrev').innerHTML = info.preview.map(esc).join('<br>') || '–';
            $('#mTypeRow').classList.toggle('hide', !need);
            $('#mTypeMsg').textContent = tRaw('confirmType');
            const input = $('#mType'), ok = $('#mOk'), cancel = $('#mCancel');
            input.value = ''; ok.disabled = need;
            input.oninput = () => { ok.disabled = need && input.value.trim() !== 'DELETE'; };
            const close = v => { $('#modal').classList.add('hide'); ok.onclick = cancel.onclick = null; res(v); };
            ok.onclick = () => close(true);
            cancel.onclick = () => close(false);
            $('#modal').classList.remove('hide');
            (need ? input : cancel).focus();
        });
    }

    async function pipeline() {
        log('success', `${t('started')}: ${esc(new Date().toLocaleString())}`);
        log('info', t('resolving'));
        S.phase = 'scan'; updateStats();
        const channels = await resolveChannels();
        if (S.stop) return log('error', t('stopped'));
        if (!channels.length) return log('error', t('noScope'));
        log('info', t('resolved', { n: channels.length }));

        for (const ch of channels) {
            if (S.stop) return log('error', t('stopped'));
            log('info', t('scanning', { name: ch.name }), true);
            if (!(await scanChannel(ch))) return log('error', t('stopped'));
        }
        const total = S.found.length + S.reactions.length;
        log('info', t('summary', { s: S.scanned, f: S.found.length, r: S.reactions.length }));
        if (!total) return log('success', t('nothing'));
        if (S.dryRun) return log('success', t('dryDone'));

        if (S.backup && S.found.length) {
            download(`discord-backup-${Date.now()}.json`, { exportedAt: new Date().toISOString(), items: S.found });
            log('success', t('backupSaved', { n: S.found.length }));
        }

        const chanCount = new Set([...S.found, ...S.reactions].map(x => x.channel_id)).size;
        const preview = S.found.slice(0, 8).map(m => `[${new Date(m.timestamp).toLocaleString()}] ${m.attachments.length ? '[+dosya] ' : ''}${m.content.slice(0, 70)}`);
        const ok = await askConfirm({ total, f: S.found.length, r: S.reactions.length, c: chanCount, eta: fmtDur(total * (S.delay * 1.2 + 300)), preview });
        if (!ok) return log('error', t('aborted'));

        S.phase = 'delete'; updateStats();
        let i = 0;
        const n = total;
        const wait = () => sleep(S.delay + (S.jitter ? Math.random() * S.delay * 0.4 : 0));

        for (const m of S.found) {
            if (S.stop) return log('error', t('stopped'));
            i++;
            log('verb', t('deleting', { i, n, p: m.content.slice(0, 80).replace(/\n/g, ' ') || (m.attachments.length ? '[dosya]' : '') }), true);
            const r = await req('DELETE', `/channels/${m.channel_id}/messages/${m.id}`);
            if (r.aborted) return log('error', t('stopped'));
            if (r.ok || r.status === 404) { S.deleted++; m.deleted = true; }
            else { S.failed++; log('error', esc(`HTTP ${r.status}${r.data && r.data.message ? ' - ' + r.data.message : ''}`), true); }
            updateStats();
            await wait();
        }
        for (const rx of S.reactions) {
            if (S.stop) return log('error', t('stopped'));
            i++;
            const r = await req('DELETE', `/channels/${rx.channel_id}/messages/${rx.id}/reactions/${encodeURIComponent(rx.key)}/@me`);
            if (r.aborted) return log('error', t('stopped'));
            if (r.ok || r.status === 404) S.rxRemoved++; else S.failed++;
            updateStats();
            await wait();
        }
        S.phase = 'done';
        log('success', t('done', { d: S.deleted, rx: S.rxRemoved, f: S.failed, r: S.throttled, t: fmtDur(Date.now() - S.startedAt) }));
    }

    async function run() {
        if (S.running) return log('warn', t('running'));
        S.running = true; S.stop = false; S.paused = false;
        setRunUi(true);
        try {
            S.startedAt = Date.now();
            if (!(await ensureAccount())) return;
            if (S.scope === 'guild' || S.scope === 'ids') fillGuildChannel(false);
            readOptions();
            await pipeline();
        } catch (e) {
            log('error', esc(e && e.stack ? e.stack : e));
        } finally {
            S.running = false;
            if (S.phase !== 'done') S.phase = 'idle';
            setRunUi(false);
            updateStats();
        }
    }

    // ------------------------------------------------------------ wiring
    $('#start').onclick = () => { S.phase = 'idle'; run(); };
    $('#stop').onclick = () => { S.stop = true; S.paused = false; };
    $('#pause').onclick = () => {
        S.paused = !S.paused;
        $('#pause').textContent = tRaw(S.paused ? 'resume' : 'pause');
        log('warn', t(S.paused ? 'paused' : 'resumed'));
    };
    $('#clear').onclick = () => { logArea.innerHTML = ''; };
    $('#export').onclick = () => {
        if (!S.found.length) return popup.alert(tRaw('exportNone'));
        download(`discord-export-${Date.now()}.json`, { exportedAt: new Date().toISOString(), items: S.found, reactions: S.reactions });
    };
    $('#tokTog').onclick = () => {
        const i = $('#authToken');
        i.type = i.type === 'password' ? 'text' : 'password';
        $('#tokTog').textContent = tRaw(i.type === 'password' ? 'show' : 'hide');
    };
    $('#tokFind').onclick = async () => {
        $('#tokFind').disabled = true;
        log('info', t('tokenFinding'));
        const typed = cleanTok($('#authToken').value);
        const user = typed ? await validateToken(typed) : null;
        if (user) acceptAccount(typed, user);
        else {
            const f = await findValidToken();
            if (f) acceptAccount(f.token, f.user); else { setPill('bad'); log('error', t('tokenFail')); }
        }
        $('#tokFind').disabled = false;
    };
    $('#authToken').onchange = async () => {
        const tk = cleanTok($('#authToken').value);
        $('#authToken').value = tk;
        if (!tk) return setPill('idle');
        const user = await validateToken(tk);
        if (user) { S.user = user; $('#authorId').value = user.id; setPill('ok', user.username); }
        else { S.user = null; setPill('bad'); }
    };
    $('#getGC').onclick = () => fillGuildChannel(true);
    $('#redact').onchange = () => {
        const on = $('#redact').checked;
        popup.document.body.classList.toggle('redact', on);
        if (on) popup.alert(tRaw('blurOn'));
    };
    $('#verbose').onchange = () => logArea.classList.toggle('hideVerb', !$('#verbose').checked);
    $('#lang').value = LANG;
    $('#lang').onchange = () => { LANG = $('#lang').value; applyLang(); };

    const setScope = s => {
        S.scope = s;
        popup.document.querySelectorAll('#seg button').forEach(b => b.classList.toggle('on', b.dataset.scope === s));
        $('#chanRow').classList.toggle('hide', s !== 'ids');
        $('#guildRow').classList.toggle('hide', s !== 'guild');
    };
    popup.document.querySelectorAll('#seg button').forEach(b => { b.onclick = () => setScope(b.dataset.scope); });
    setScope('ids');

    applyLang();
    setPill('idle');
    fillGuildChannel(false);
    // silent pre-fill: only accept a token that actually works
    (async () => {
        const f = await findValidToken(4000);
        if (f && !$('#authToken').value) acceptAccount(f.token, f.user);
    })();

    return 'Discord Message Cleaner v3.0 hazır';
})();
