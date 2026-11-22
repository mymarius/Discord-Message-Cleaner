/**
 * Discord Message Cleaner v7.0 (Ultra Pro Edition)
 * YOUR OWN messages (and optionally reactions) in channels, DMs or a server.
 *
 * Kullanım: discord.com/app'i masaüstü tarayıcıda aç -> F12 -> Console -> dosyayı yapıştır -> Enter.
 * Kısayollar: Alt+C göster/gizle | Alt+K komut paleti | Alt+X durdur | Esc modalı kapat.
 *
 * v7.0 Yenilikleri:
 *  - Modern cam efektli (glassmorphic) arayüz, Discord avatar rozeti, nabız animasyonlu durum göstergesi.
 *  - Etkileşimli 3 sekmeli İnceleme Modalı: Mesajlar (Seçimi tersine çevir dahil), Görsel Analiz (CSS bar grafikler + 7x24 ısı haritası), Özet.
 *  - Gizlilik Modu (Overwrite): Silmeden önce mesaj içeriğini rastgele/sabit metinle üzerine yazma (PATCH).
 *  - Hızlı Hız Profilleri (Güvenli / Dengeli / Hızlı) & Hızlı Başlangıç Senaryoları.
 *  - Gelişmiş PII tarayıcısı (API anahtarları: AIza, ghp_, sk- dahil) & Markdown (.md) dışa aktarma.
 *  - Ayarları JSON olarak yedekleme / içe aktarma.
 *
 * UYARI: Kullanıcı hesabını otomatikleştirmek Discord Hizmet Şartları'na aykırıdır. Sorumluluk sana aittir.
 * Silinen mesajlar geri alınamaz. Token'ını kimseyle paylaşma.
 */
(function () {
    'use strict';

    if (window.__dmcRoot) {
        window.__dmcRoot.style.display = window.__dmcRoot.style.display === 'none' ? '' : 'none';
        return 'toggle';
    }

    const API = 'https://discord.com/api/v9';
    const DELETABLE = new Set([0, 6, 19, 20, 23]);
    const TEXT_TYPES = new Set([0, 2, 5, 10, 11, 12, 13]);
    const EPOCH = 1420070400000n;
    const CAP = window.__dmcCap || (window.__dmcCap = new Set());
    const SK = 'dmc7_settings';
    const QK = 'dmc5_queue';
    const LEGACY_SKS = ['dmc6_settings', 'dmc5_settings'];

    // ------------------------------------------------------------ storage (Discord removes window.localStorage)
    const store = (() => {
        try {
            if (window.localStorage && typeof window.localStorage.getItem === 'function') {
                window.localStorage.getItem('__dmc_probe');
                return window.localStorage;
            }
        } catch (e) { /* fall through to iframe */ }
        try {
            const f = document.createElement('iframe');
            f.style.cssText = 'display:none;width:0;height:0;border:0;position:absolute;visibility:hidden';
            f.setAttribute('aria-hidden', 'true');
            f.tabIndex = -1;
            document.body.appendChild(f);
            const ls = f.contentWindow && f.contentWindow.localStorage;
            if (ls) {
                ls.getItem('__dmc_probe');
                return ls;
            }
            f.remove();
        } catch (e) { /* fallback to memory */ }
        const m = Object.create(null);
        return {
            getItem: k => (k in m ? m[k] : null),
            setItem: (k, v) => { m[k] = String(v); },
            removeItem: k => { delete m[k]; },
        };
    })();

    const jget = (k, d) => { try { const v = store.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
    const jset = (k, v) => { try { store.setItem(k, JSON.stringify(v)); } catch (e) { /* quota */ } };

    // ------------------------------------------------------------ i18n
    const I = {
        tr: {
            tMain: 'Başla', tFilter: 'Filtre', tSet: 'Ayar', tLog: 'Log',
            preset: 'Hazır akıllı filtre', pNight: 'Gece kuşu (00:00–05:00)', pCaps: 'BAĞIRANLAR (hepsi büyük harf)', pOne: 'Tek kelimelik mesajlar', pEmoji: 'Sadece emoji', pLink: 'Sadece link', pGif: 'GIF’ler', pQ: 'Soru işaretiyle bitenler', pLong: 'Roman gibi (500+ karakter)',
            randPct: 'Şans modu: bulunanların sadece %N’ini sil', countdown: '5 sn geri sayımla başla',
            cdTick: 'Başlıyor: {n}… (Durdur ile iptal)', cdCancel: 'Geri sayım iptal edildi.', randKept: 'Şans modu: {n} mesaj rastgele ayrıldı (silinmeyecek).',
            fHours: 'Saat dağılımı (yerel)', fEmoji: 'Favori emojiler', fLong: 'En uzun mesaj (karakter)', fOld: 'En eski mesaj', fChars: 'Toplam karakter',
            pPii: 'Kişisel veri & API anahtarı (e-posta, IBAN, TC, token…)', pAnniv: 'Bugünün yıldönümü (yıllar önce bugün)', pRegret: 'Pişmanlık radarı (öfke/özür kelimeleri)',
            regretWords: 'Pişmanlık radarı kelimeleri (virgülle, boşsa varsayılan)', dupMin: 'Tekrar avcısı: aynı mesaj ≥N kez → ilkini koru', maxDel: 'En fazla N mesaj sil (en eskiden)',
            fx: 'Konfeti', cardBtn: 'Kart (PNG)', hmTitle: 'Isı haritası (gün × saat)', dupInfo: 'Tekrar avcısı: {g} grupta {n} fazlalık mesaj bulundu.',
            capInfo: 'Üst sınır: en eski {n} mesajla sınırlandı.', fwReport: '🪦 Veda: {n} mesaj, {w} kelime (≈{m} dk okuma) uçtu. {line}', palPh: 'Komut ara…',
            sub: 'v7.0 Ultra Pro', secScope: 'Kapsam', secTime: 'Zaman aralığı', secOpts: 'Çalışma seçenekleri', secQuick: 'Hızlı senaryolar',
            qNight: '🌙 Gece temizliği', qPii: '🛡️ PII tara', qMedia: '🔗 Link & Dosya', qAll: '🧹 Sıfırla',
            secText: 'Metin eşleştirme', secType: 'Mesaj türü', secFun: 'Akıllı filtreler', secKeep: 'Koruma kuralları', secLimits: 'Sınırlar ve örnekleme', secSpeed: 'Hız ve güvenlik',
            tos: 'Kullanıcı hesabını otomatikleştirmek Discord Hizmet Şartları’na aykırıdır. Silinen mesajlar geri alınamaz.',
            cur: 'Bu kanal', guild: 'Sunucu', dms: 'DM’ler', ids: 'ID',
            idsPh: 'Kanal ID veya link (virgül/boşlukla ayır)', guildPh: 'Sunucu ID', pick: 'Kanallar…',
            older: 'Şundan eski', all: 'Hepsi', h1: '1 saat', d1: '1 gün', d7: '7 gün', d30: '30 gün',
            fast: 'Hızlı mod', dry: 'Deneme', rx: 'Tepkilerim', review: 'İnceleme',
            overwrite: 'Silmeden önce üzerine yaz (Gizlilik)', overwritePh: 'Üzerine yazılacak metin (boşsa rastgele)',
            spSafe: 'Güvenli', spBal: 'Dengeli', spFast: 'Hızlı',
            start: 'Başlat', pause: 'Duraklat', resume: 'Devam', stop: 'Durdur', resumeQ: 'Kuyruğa devam ({n})',
            sScan: 'Taranan', sFound: 'Bulunan', sDel: 'Silinen', sFail: 'Hata', eta: 'Kalan',
            contains: 'İçerdiği metin', regex: 'Regex', exclude: 'İçermediği metin',
            keepLast: 'Son N mesajımı koru (kanal başı)', keepTerms: 'Şu kelimeleri içerenleri koru (virgülle)', keepReact: 'Tepki alan mesajları koru',
            minLen: 'Min. uzunluk', maxLen: 'Maks. uzunluk', link: 'Link', file: 'Dosya', embed: 'Embed', reply: 'Yanıt', pinned: 'Sabitliler dahil',
            after: 'Sonra', before: 'Önce', resetF: 'Filtreleri sıfırla', fResetOk: 'Filtreler sıfırlandı.',
            delay: 'Silme aralığı (ms)', jitter: 'Rastgele sapma', adaptive: 'Uyarlanabilir hız', backup: 'Önce JSON yedeği indir', beep: 'Bitince ses',
            auto: 'Otomatik temizlik', autoEvery: 'Her (saat)', autoOlder: 'Şundan eski (gün)', autoOn: 'Aç', autoOff: 'Kapat',
            autoState: 'Otomatik temizlik açık: her {h} saatte, {d} günden eski. Sonraki: {n}',
            autoConfirm: 'Seçili kapsamda {d} günden eski mesajların her {h} saatte bir ONAYSIZ silinmesini istiyorsan AUTO yaz. Sekme açık kalmalı.',
            clear: 'Temizle', copyLog: 'Kopyala', logCopied: 'Log panoya kopyalandı.', logAll: 'Tümü', logWarn: 'Uyarı/Hata',
            exp: 'Dışa aktar', cfgTitle: 'Ayar profili', cfgExp: 'Ayarları dışa aktar', cfgImp: 'Ayarları içe aktar', cfgLoaded: 'Ayarlar içe aktarıldı.', cfgBad: 'Geçersiz ayar dosyası.',
            lang: 'Dil', pillIdle: 'Doğrulanmadı', pillBad: 'Geçersiz token',
            tokFind: 'Token aranıyor ve doğrulanıyor...', tokOk: 'Token doğrulandı: {u}',
            tokFail: 'Geçerli token bulunamadı. Discord’da bir kanala tıkla ve tekrar dene.',
            noScope: 'İşlenecek kanal yok.', noGuild: 'Sunucu ID bulunamadı. Bir sunucu kanalı aç veya ID gir.',
            resolving: 'Kanallar çözümleniyor...', resolved: '{n} kanal taranacak.', scanning: '{name} taranıyor...', scanG: 'Sunucu aranıyor (hızlı mod)...',
            fastOff: 'Tepki kaldırma açık: tam tarama yapılacak.',
            fastFallback: '{name}: Search API yanıt vermedi (HTTP {c}), tam taramaya geçiliyor...',
            chDone: '{name}: {f} mesaj, {r} tepki ({s} tarandı)',
            noMine: '{name}: {s} mesaj tarandı, hiçbiri senin değil.',
            skip: '{name}: erişilemedi (HTTP {c}).',
            unauth: 'HTTP 401: token reddedildi. Durduruldu.',
            summary: 'Tarama bitti. Taranan {s}, silinecek {f}, tepki {r}.',
            kept: 'Koruma kuralları {n} mesajı dışarıda bıraktı.',
            nothing: 'Silinecek bir şey yok.',
            rvTitle: 'İncele ve onayla', rvSel: '{n} / {m} seçili', rvSearch: 'Mesajlarda ara...', rvAll: 'Hepsi', rvNone: 'Hiçbiri', rvInv: 'Ters çevir',
            rvTabMsg: 'Mesajlar', rvTabChart: 'Analiz', rvTabSum: 'Özet',
            rvStats: 'İstatistik', rvCh: 'En aktif kanallar', rvMonth: 'Aylık dağılım', rvWords: 'Sık kelimeler', rvEta: 'Tahmini süre: {eta}',
            typeDel: 'Büyük işlem. Devam için DELETE yaz.', ok: 'Sil', cancel: 'Vazgeç', aborted: 'İptal edildi.',
            backupSaved: 'Yedek indirildi ({n}).', dryDone: 'Deneme bitti, hiçbir şey silinmedi. Dışa aktarabilirsin.',
            deleting: '{i}/{n} {p}', rate: 'Rate limit: {ms} ms bekleniyor, aralık {d} ms.',
            done: 'Bitti. Silinen {d}, tepki {rx}, hata {f}, rate limit {r}, süre {t}.',
            stopped: 'Durduruldu.', paused: 'Duraklatıldı.', resumed: 'Devam.', failStreak: 'Üst üste {n} hata, güvenlik için durduruldu.',
            netErr: 'Ağ hatası: {e}', badDate: 'Geçersiz tarih yok sayıldı: {v}', badRe: 'Geçersiz regex: {v}',
            running: 'Zaten çalışıyor.', exNone: 'Dışa aktarılacak bir şey yok.', pickCount: '{n} kanal listelendi.',
            pkTitle: 'Kanal seç (hiçbiri seçili değilse hepsi)', pkSearch: 'Kanal ara...', resumedQ: 'Kuyruktan {n} mesaja devam ediliyor.',
            autoRun: 'Otomatik temizlik çalışıyor...', autoNeedScope: 'Otomatik temizlik için kapsam “DM’ler” dışında olmalı ve kanal/sunucu belli olmalı.',
            modalBusy: 'Önce açık onay penceresini tamamla.',
        },
        en: {
            tMain: 'Start', tFilter: 'Filter', tSet: 'Settings', tLog: 'Log',
            preset: 'Smart preset filter', pNight: 'Night owl (00:00–05:00)', pCaps: 'SHOUTING (all caps)', pOne: 'One-word messages', pEmoji: 'Emoji only', pLink: 'Link only', pGif: 'GIFs', pQ: 'Ending with a question mark', pLong: 'Novels (500+ chars)',
            randPct: 'Lucky mode: delete only N% of what was found', countdown: 'Start with a 5 s countdown',
            cdTick: 'Starting: {n}… (Stop to cancel)', cdCancel: 'Countdown cancelled.', randKept: 'Lucky mode: {n} message(s) randomly spared.',
            fHours: 'Hour of day (local)', fEmoji: 'Favourite emoji', fLong: 'Longest message (chars)', fOld: 'Oldest message', fChars: 'Total characters',
            pPii: 'Personal data & API keys (email, IBAN, ID, token…)', pAnniv: 'Today’s anniversary (this day, years ago)', pRegret: 'Regret radar (anger/apology words)',
            regretWords: 'Regret radar words (comma separated, default if empty)', dupMin: 'Duplicate hunter: same message ≥N times → keep the first', maxDel: 'Delete at most N messages (oldest first)',
            fx: 'Confetti', cardBtn: 'Card (PNG)', hmTitle: 'Heatmap (day × hour)', dupInfo: 'Duplicate hunter: {n} extra message(s) in {g} group(s).',
            capInfo: 'Cap: limited to the oldest {n} message(s).', fwReport: '🪦 Farewell: {n} messages, {w} words (≈{m} min of reading) gone. {line}', palPh: 'Search commands…',
            sub: 'v7.0 Ultra Pro', secScope: 'Scope', secTime: 'Time range', secOpts: 'Run options', secQuick: 'Quick scenarios',
            qNight: '🌙 Night cleanup', qPii: '🛡️ Scan PII', qMedia: '🔗 Links & Files', qAll: '🧹 Reset',
            secText: 'Text matching', secType: 'Message type', secFun: 'Smart filters', secKeep: 'Keep rules', secLimits: 'Limits and sampling', secSpeed: 'Speed and safety',
            tos: 'Automating a user account is against Discord’s Terms of Service. Deleted messages cannot be recovered.',
            cur: 'This channel', guild: 'Server', dms: 'DMs', ids: 'IDs',
            idsPh: 'Channel ID or link (comma/space separated)', guildPh: 'Server ID', pick: 'Channels…',
            older: 'Older than', all: 'All', h1: '1 hour', d1: '1 day', d7: '7 days', d30: '30 days',
            fast: 'Fast mode', dry: 'Dry run', rx: 'My reactions', review: 'Review',
            overwrite: 'Overwrite before delete (Privacy)', overwritePh: 'Replacement text (random if empty)',
            spSafe: 'Safe', spBal: 'Balanced', spFast: 'Fast',
            start: 'Start', pause: 'Pause', resume: 'Resume', stop: 'Stop', resumeQ: 'Resume queue ({n})',
            sScan: 'Scanned', sFound: 'Found', sDel: 'Deleted', sFail: 'Failed', eta: 'Left',
            contains: 'Containing text', regex: 'Regex', exclude: 'Not containing',
            keepLast: 'Keep my last N messages (per channel)', keepTerms: 'Keep messages containing (comma separated)', keepReact: 'Keep messages with reactions',
            minLen: 'Min length', maxLen: 'Max length', link: 'Links', file: 'Files', embed: 'Embeds', reply: 'Replies', pinned: 'Include pinned',
            after: 'After', before: 'Before', resetF: 'Reset filters', fResetOk: 'Filters reset.',
            delay: 'Delete delay (ms)', jitter: 'Random jitter', adaptive: 'Adaptive speed', backup: 'Download JSON backup first', beep: 'Beep when done',
            auto: 'Auto clean', autoEvery: 'Every (hours)', autoOlder: 'Older than (days)', autoOn: 'Enable', autoOff: 'Disable',
            autoState: 'Auto clean on: every {h} h, older than {d} days. Next: {n}',
            autoConfirm: 'Type AUTO to delete messages older than {d} days in the selected scope every {h} h WITHOUT confirmation. The tab must stay open.',
            clear: 'Clear', copyLog: 'Copy', logCopied: 'Log copied to clipboard.', logAll: 'All', logWarn: 'Warn/Error',
            exp: 'Export', cfgTitle: 'Settings profile', cfgExp: 'Export settings', cfgImp: 'Import settings', cfgLoaded: 'Settings imported.', cfgBad: 'Invalid settings file.',
            lang: 'Language', pillIdle: 'Not verified', pillBad: 'Invalid token',
            tokFind: 'Looking for a token and verifying it...', tokOk: 'Token verified: {u}',
            tokFail: 'No valid token found. Click any channel in Discord and retry.',
            noScope: 'Nothing to process.', noGuild: 'No server ID. Open a server channel or enter one.',
            resolving: 'Resolving channels...', resolved: '{n} channel(s) to scan.', scanning: 'Scanning {name}...', scanG: 'Searching server (fast mode)...',
            fastOff: 'Reaction removal is on: doing a full scan.',
            fastFallback: '{name}: Search API unavailable (HTTP {c}), falling back to full scan...',
            chDone: '{name}: {f} message(s), {r} reaction(s) ({s} scanned)',
            noMine: '{name}: scanned {s}, none are yours.',
            skip: '{name}: not accessible (HTTP {c}).',
            unauth: 'HTTP 401: token rejected. Stopped.',
            summary: 'Scan finished. Scanned {s}, to delete {f}, reactions {r}.',
            kept: 'Keep rules excluded {n} message(s).',
            nothing: 'Nothing to delete.',
            rvTitle: 'Review and confirm', rvSel: '{n} / {m} selected', rvSearch: 'Search messages...', rvAll: 'All', rvNone: 'None', rvInv: 'Invert',
            rvTabMsg: 'Messages', rvTabChart: 'Analytics', rvTabSum: 'Summary',
            rvStats: 'Stats', rvCh: 'Top channels', rvMonth: 'Monthly distribution', rvWords: 'Top words', rvEta: 'Estimated time: {eta}',
            typeDel: 'Large operation. Type DELETE to continue.', ok: 'Delete', cancel: 'Cancel', aborted: 'Aborted.',
            backupSaved: 'Backup downloaded ({n}).', dryDone: 'Dry run finished, nothing deleted. You can export the list.',
            deleting: '{i}/{n} {p}', rate: 'Rate limited: waiting {ms} ms, delay {d} ms.',
            done: 'Done. Deleted {d}, reactions {rx}, failed {f}, rate limits {r}, time {t}.',
            stopped: 'Stopped.', paused: 'Paused.', resumed: 'Resumed.', failStreak: '{n} failures in a row, stopped for safety.',
            netErr: 'Network error: {e}', badDate: 'Invalid date ignored: {v}', badRe: 'Invalid regex: {v}',
            running: 'Already running.', exNone: 'Nothing to export.', pickCount: '{n} channel(s) listed.',
            pkTitle: 'Pick channels (none checked = all)', pkSearch: 'Search channels...', resumedQ: 'Resuming {n} message(s) from the queue.',
            autoRun: 'Auto clean running...', autoNeedScope: 'Auto clean needs a scope other than “DMs” with a known channel/server.',
            modalBusy: 'Complete the open confirmation dialog first.',
        },
    };
    let LANG = (navigator.language || 'en').toLowerCase().startsWith('tr') ? 'tr' : 'en';
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
    const tr = (k, v = {}) => String((I[LANG] && I[LANG][k]) ?? I.en[k] ?? k).replace(/\{(\w+)\}/g, (_, n) => v[n] ?? '');
    const t = (k, v = {}) => tr(k, Object.fromEntries(Object.entries(v).map(([a, b]) => [a, esc(b)])));

    // ------------------------------------------------------------ panel (Shadow DOM)
    const host = document.createElement('div');
    host.id = '__dmc';
    host.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:2147483647;';
    document.body.appendChild(host);
    window.__dmcRoot = host;
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = /*html*/`
<style>
:host{all:initial;color-scheme:dark;
  --bg:#090b10;--panel:rgba(17,20,30,.94);--panelSolid:#11141e;--raised:#181c2a;--raised2:#22283b;--line:#262d42;--line2:#333c57;
  --text:#f0f2f8;--muted:#8d96ad;--accent:#5865f2;--accent2:#8b5cf6;--accentSoft:rgba(88,101,242,.18);--accentGlow:rgba(88,101,242,.38);
  --ok:#10b981;--warn:#f59e0b;--bad:#ef4444;--info:#38bdf8;
  --shadow:0 28px 72px -12px rgba(0,0,0,.72),0 0 0 1px rgba(255,255,255,.06)}
:host(.light){color-scheme:light;
  --bg:#f2f4f9;--panel:rgba(255,255,255,.95);--panelSolid:#ffffff;--raised:#f7f8fc;--raised2:#eaedf6;--line:#dfe3ef;--line2:#cbd3e4;
  --text:#0f172a;--muted:#64748b;--accent:#4f46e5;--accent2:#7c3aed;--accentSoft:rgba(79,70,229,.1);--accentGlow:rgba(79,70,229,.25);
  --shadow:0 24px 60px -12px rgba(15,23,42,.2),0 0 0 1px rgba(15,23,42,.06)}
*{box-sizing:border-box;scrollbar-width:thin;scrollbar-color:var(--line2) transparent}
#panel,#pill,#modal,#toast{font:13px/1.45 "Inter","Segoe UI",system-ui,-apple-system,sans-serif;color:var(--text);-webkit-font-smoothing:antialiased}
.hide{display:none!important}
.sp{flex:1}

#panel{width:476px;height:700px;min-width:390px;min-height:480px;max-width:96vw;max-height:96vh;resize:both;overflow:hidden;
  display:flex;flex-direction:column;background:var(--panel);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  border:1px solid var(--line);border-radius:18px;box-shadow:var(--shadow)}

#hd{display:flex;align-items:center;gap:10px;padding:12px 14px;cursor:move;user-select:none;border-bottom:1px solid var(--line);
  background:linear-gradient(180deg,var(--raised),transparent);box-shadow:inset 0 1px 0 rgba(255,255,255,.05)}
.logo{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;flex:none;
  background:linear-gradient(135deg,var(--accent),var(--accent2));box-shadow:0 4px 16px var(--accentGlow),inset 0 1px 0 rgba(255,255,255,.28)}
.logo svg{width:18px;height:18px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.tt b{display:block;font-size:13.5px;font-weight:700;letter-spacing:-.015em}
.tt span{display:block;font-size:10.5px;font-weight:600;color:var(--accent);margin-top:-1px;letter-spacing:.02em}
.chip{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;padding:3px 10px 3px 6px;border-radius:99px;
  background:var(--raised2);border:1px solid var(--line);color:var(--muted);max-width:144px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.chip i{width:8px;height:8px;border-radius:50%;background:currentColor;flex:none;margin-left:3px}
.chip img{width:18px;height:18px;border-radius:50%;object-fit:cover;flex:none}
.chip.ok{color:var(--ok);background:rgba(16,185,129,.12);border-color:rgba(16,185,129,.28)}
.chip.bad{color:var(--bad);background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.28)}
.ib{width:29px;height:29px;padding:0;display:grid;place-items:center;border:1px solid transparent;background:transparent;color:var(--muted);border-radius:8px;cursor:pointer;transition:all .15s}
.ib svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.ib:hover{background:var(--raised2);color:var(--text);border-color:var(--line)}

button{font:inherit;color:inherit;background:var(--raised2);border:1px solid var(--line);border-radius:9px;padding:7px 13px;cursor:pointer;font-weight:550;transition:all .14s}
button:hover:not(:disabled){border-color:var(--line2);background:var(--raised)}
button:active:not(:disabled){transform:translateY(1px)}
button:disabled{opacity:.4;cursor:not-allowed}
button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
button.pri{background:linear-gradient(135deg,var(--accent),var(--accent2));border-color:transparent;color:#fff;font-weight:650;box-shadow:0 4px 16px var(--accentGlow)}
button.pri:hover:not(:disabled){filter:brightness(1.08);box-shadow:0 6px 20px var(--accentGlow)}
button.dan{background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.4);color:var(--bad)}
button.dan:hover:not(:disabled){background:rgba(239,68,68,.2)}
button.ghost{background:transparent;border-color:transparent;color:var(--muted)}
button.ghost:hover:not(:disabled){background:var(--raised2);color:var(--text)}
button.mini{padding:5px 10px;font-size:12px;border-radius:8px}

#tabs{display:flex;gap:4px;padding:8px 12px 0;border-bottom:1px solid var(--line)}
#tabs button{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;border:0;border-radius:10px 10px 0 0;background:none;color:var(--muted);padding:9px 6px;font-weight:600;font-size:12.5px;position:relative}
#tabs button svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
#tabs button:hover{color:var(--text);background:var(--raised)}
#tabs button.on{color:var(--text)}
#tabs button.on::after{content:"";position:absolute;left:10px;right:10px;bottom:-1px;height:2.5px;border-radius:2px;background:linear-gradient(90deg,var(--accent),var(--accent2))}
.badge{font-size:10px;font-weight:700;padding:1px 6px;border-radius:99px;background:var(--accentSoft);color:var(--accent);line-height:1.4}
.badge.warn{background:rgba(239,68,68,.16);color:var(--bad)}

#body{flex:1;min-height:0;overflow:auto;padding:12px 14px;display:flex;flex-direction:column;gap:11px;background:var(--bg)}
.tab{display:none;flex-direction:column;gap:11px}.tab.on{display:flex}
#t_logt.on{flex:1;min-height:0}

.card{background:var(--panelSolid);border:1px solid var(--line);border-radius:13px;padding:12px 14px;display:flex;flex-direction:column;gap:10px;box-shadow:0 2px 6px rgba(0,0,0,.08)}
.ct{display:flex;align-items:center;justify-content:space-between;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:700}

input[type=text],input[type=number],input[type=datetime-local],select{width:100%;background:var(--bg);border:1px solid var(--line);border-radius:9px;padding:8px 10px;color:var(--text);font:inherit;transition:border-color .15s,box-shadow .15s}
input::placeholder{color:var(--muted);opacity:.6}
input:focus,select:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accentSoft)}
label.f{display:block;color:var(--muted);font-size:11.5px;font-weight:550}
label.f input,label.f select{margin-top:5px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.inline{display:flex;gap:7px;align-items:center}.inline input{flex:1}

.seg{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:3px;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:3px}
.seg button{border:0;background:none;color:var(--muted);padding:6px 4px;font-weight:600;border-radius:7px;font-size:12.5px}
.seg button:hover{color:var(--text)}
.seg button.on{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;box-shadow:0 2px 10px var(--accentGlow)}
.chips{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.chips span{color:var(--muted);font-size:11.5px;font-weight:550;margin-right:2px}
.chips button{padding:4px 11px;border-radius:99px;font-size:12px;background:var(--bg);border-color:var(--line)}
.chips button.on{background:linear-gradient(135deg,var(--accent),var(--accent2));border-color:transparent;color:#fff;font-weight:650}

.sw{display:grid;grid-template-columns:1fr 1fr;gap:7px 14px}.sw.one{grid-template-columns:1fr}
.ck{display:flex;align-items:center;gap:9px;cursor:pointer;font-size:12.5px;min-height:26px;margin:0;user-select:none}
.ck input{appearance:none;-webkit-appearance:none;flex:none;width:34px;height:20px;margin:0;border-radius:99px;background:var(--raised2);border:1px solid var(--line2);position:relative;cursor:pointer;transition:background .15s,border-color .15s}
.ck input::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:var(--muted);transition:left .15s,background .15s}
.ck input:checked{background:var(--accent);border-color:var(--accent)}
.ck input:checked::after{left:16px;background:#fff}
.ck input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}

.note{color:var(--warn);font-size:11.5px;line-height:1.4}
.tos{color:var(--muted);font-size:11px;padding:2px 4px;line-height:1.45;opacity:.85}
.acts{display:flex;gap:7px;align-items:center}.acts .pri{flex:1}

#foot{border-top:1px solid var(--line);padding:10px 14px 12px;display:flex;flex-direction:column;gap:9px;background:linear-gradient(0deg,var(--raised),transparent)}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.stat{background:var(--panelSolid);border:1px solid var(--line);border-radius:10px;padding:7px 10px;border-top:2.5px solid var(--line2)}
.stat b{display:block;font-size:17px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.2}
.stat span{color:var(--muted);font-size:10.5px;font-weight:600}
.stat.f{border-top-color:var(--info)}.stat.f b{color:var(--info)}
.stat.d{border-top-color:var(--ok)}.stat.d b{color:var(--ok)}
.stat.x{border-top-color:var(--bad)}.stat.x b{color:var(--bad)}
#bar{height:7px;border-radius:99px;background:var(--raised2);overflow:hidden}
#fill{height:100%;width:0;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:99px;transition:width .25s;box-shadow:0 0 10px var(--accentGlow)}
#bar.ind #fill{width:35%;animation:sl 1.1s ease-in-out infinite alternate}
@keyframes sl{from{margin-left:0}to{margin-left:65%}}
@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.35);opacity:.65}}
@media (prefers-reduced-motion:reduce){#bar.ind #fill{animation:none;width:100%;opacity:.5}*{animation:none!important}}
#bi{display:flex;justify-content:space-between;color:var(--muted);font-size:11.5px;min-height:16px;font-variant-numeric:tabular-nums}
#foot .acts button{padding:9px 14px}
#foot .acts .pri{padding:10px 14px;font-size:13.5px}

#log{flex:1;min-height:140px;overflow:auto;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:8px 10px;font:11.5px/1.6 Consolas,Menlo,monospace;white-space:pre-wrap;word-break:break-word}
#log div{border-left:2px solid transparent;padding-left:8px;margin-bottom:2px}#log .ts{color:var(--muted);opacity:.65;margin-right:7px;font-size:10.5px}
#log .info{color:var(--info);border-color:var(--info)}#log .verb{color:var(--muted)}#log .warn{color:var(--warn);border-color:var(--warn)}
#log .error{color:var(--bad);border-color:var(--bad)}#log .success{color:var(--ok);border-color:var(--ok)}

#pill{display:none;align-items:center;gap:9px;background:var(--panelSolid);border:1px solid var(--line);border-radius:99px;padding:8px 16px 8px 12px;cursor:pointer;box-shadow:var(--shadow);font-weight:600}
#pill i{width:9px;height:9px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2))}
#pill.run i{animation:pulse 1.2s ease-in-out infinite}

#modal{position:fixed;inset:0;background:rgba(6,8,14,.72);backdrop-filter:blur(5px);display:none;place-items:center;padding:16px;z-index:10}
#modal.on{display:grid}
#mb{width:min(640px,100%);max-height:92vh;overflow:auto;background:var(--panelSolid);border:1px solid var(--line);border-radius:18px;padding:18px;display:flex;flex-direction:column;gap:12px;box-shadow:var(--shadow)}
#mb h3{margin:0;font-size:16px;font-weight:700}
.kpis{display:flex;flex-wrap:wrap;gap:8px}
.kpi{background:var(--raised);border:1px solid var(--line);border-radius:9px;padding:5px 10px;font-size:12px;font-weight:600}
.kpi span{color:var(--muted);font-weight:500;margin-right:4px}
.mtabs{display:flex;gap:4px;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:3px}
.mtabs button{flex:1;border:0;background:none;color:var(--muted);padding:6px 8px;border-radius:7px;font-size:12px;font-weight:600}
.mtabs button.on{background:var(--raised2);color:var(--text)}
.list{max-height:240px;overflow:auto;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:6px 10px}
.list label{display:flex;gap:8px;align-items:flex-start;margin:4px 0;cursor:pointer;color:var(--text);font-size:12px;padding:4px 6px;border-radius:7px}
.list label:hover{background:var(--raised)}
.list input{margin-top:2px;accent-color:var(--accent);flex:none}
.list .m{color:var(--muted);white-space:nowrap;font-size:11px}
.list .tag{display:inline-block;background:rgba(245,158,11,.16);color:var(--warn);border-radius:4px;padding:0 5px;font-size:10.5px;font-weight:600;margin-left:4px}
.chartBox{background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:10px;max-height:290px;overflow:auto}
.chartSec h4{margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.brow{display:grid;grid-template-columns:110px 1fr 44px;gap:8px;align-items:center;font-size:11.5px;margin:3px 0}
.brow .lbl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text)}
.brow .track{height:7px;border-radius:99px;background:var(--raised2);overflow:hidden}
.brow .fill{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--accent),var(--accent2))}
.brow .val{text-align:right;color:var(--muted);font-variant-numeric:tabular-nums}
.hm{display:grid;grid-template-columns:34px repeat(24,1fr);gap:2px;align-items:center;font-size:10px}
.hm .d{color:var(--muted);font-weight:600}
.hm .cell{aspect-ratio:1;border-radius:2px;background:var(--raised2)}
.mbtn{display:flex;justify-content:flex-end;gap:7px;margin-top:4px;flex-wrap:wrap}

#toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(16px);background:var(--raised);border:1px solid var(--line2);color:var(--text);
  padding:8px 15px;border-radius:99px;font-size:12.5px;font-weight:600;box-shadow:var(--shadow);opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;z-index:20}
#toast.on{opacity:1;transform:translateX(-50%) translateY(0)}
</style>
<div id="pill"><i></i><span id="pillTxt">Cleaner</span></div>
<div id="panel">
  <div id="hd">
    <div class="logo"><svg viewBox="0 0 24 24"><path d="M5 19l6-6M9 9l6 6M16 3l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/></svg></div>
    <div class="tt"><b>Message Cleaner</b><span data-i="sub"></span></div>
    <span class="sp"></span>
    <span class="chip" id="acct"></span>
    <button class="ib" id="bPal" title="Alt+K"><svg viewBox="0 0 24 24"><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/></svg></button>
    <button class="ib" id="bTheme" title="Theme"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 3v18a9 9 0 0 0 0-18z" fill="currentColor" stroke="none"/></svg></button>
    <button class="ib" id="bSize" title="Size"><svg viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg></button>
    <button class="ib" id="bLang" title="TR/EN"><svg viewBox="0 0 24 24"><path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6"/></svg></button>
    <button class="ib" id="bMin" title="Alt+C"><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button>
  </div>
  <div id="tabs">
    <button data-t="main" class="on"><svg viewBox="0 0 24 24"><path d="M7 5l12 7-12 7z"/></svg><span data-i="tMain"></span></button>
    <button data-t="filter"><svg viewBox="0 0 24 24"><path d="M3 5h18l-7 8v6l-4-2v-4z"/></svg><span data-i="tFilter"></span><span class="badge hide" id="fBadge">0</span></button>
    <button data-t="set"><svg viewBox="0 0 24 24"><path d="M4 6h8M18 6h2M4 12h2M12 12h8M4 18h10M20 18h0"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/></svg><span data-i="tSet"></span></button>
    <button data-t="logt"><svg viewBox="0 0 24 24"><path d="M4 6l6 6-6 6M12 18h8"/></svg><span data-i="tLog"></span><span class="badge warn hide" id="lBadge">0</span></button>
  </div>
  <div id="body">
    <div class="tab on" id="t_main">
      <div class="card">
        <div class="ct"><span data-i="secScope"></span></div>
        <div class="seg" id="seg"><button data-s="cur" data-i="cur"></button><button data-s="guild" data-i="guild"></button><button data-s="dms" data-i="dms"></button><button data-s="ids" data-i="ids"></button></div>
        <input type="text" id="idsIn" class="hide">
        <div class="inline" id="guildRow"><input type="text" id="guildIn"><button class="mini" id="bPick" data-i="pick"></button></div>
      </div>
      <div class="card">
        <div class="ct"><span data-i="secTime"></span></div>
        <div class="chips" id="olderChips"><span data-i="older"></span>
          <button data-ms="0" class="on" data-i="all"></button><button data-ms="3600000" data-i="h1"></button><button data-ms="86400000" data-i="d1"></button><button data-ms="604800000" data-i="d7"></button><button data-ms="2592000000" data-i="d30"></button></div>
      </div>
      <div class="card">
        <div class="ct"><span data-i="secQuick"></span></div>
        <div class="chips" id="quickScenarios">
          <button data-q="night" data-i="qNight"></button>
          <button data-q="pii" data-i="qPii"></button>
          <button data-q="media" data-i="qMedia"></button>
          <button data-q="clear" data-i="qAll"></button>
        </div>
      </div>
      <div class="card">
        <div class="ct"><span data-i="secOpts"></span></div>
        <div class="sw">
          <label class="ck"><input type="checkbox" id="fast" checked><span data-i="fast"></span></label>
          <label class="ck"><input type="checkbox" id="dry"><span data-i="dry"></span></label>
          <label class="ck"><input type="checkbox" id="rx"><span data-i="rx"></span></label>
          <label class="ck"><input type="checkbox" id="review" checked><span data-i="review"></span></label>
        </div>
      </div>
      <div class="tos" data-i="tos"></div>
    </div>

    <div class="tab" id="t_filter">
      <div class="card">
        <div class="ct"><span data-i="secText"></span><button class="ghost mini" id="bResetF" data-i="resetF"></button></div>
        <label class="f"><span data-i="contains"></span><input type="text" id="content"></label>
        <div class="sw"><label class="ck"><input type="checkbox" id="regex"><span data-i="regex"></span></label></div>
        <label class="f"><span data-i="exclude"></span><input type="text" id="exclude"></label>
      </div>
      <div class="card">
        <div class="ct"><span data-i="secType"></span></div>
        <div class="sw">
          <label class="ck"><input type="checkbox" id="hasLink"><span data-i="link"></span></label>
          <label class="ck"><input type="checkbox" id="hasFile"><span data-i="file"></span></label>
          <label class="ck"><input type="checkbox" id="hasEmbed"><span data-i="embed"></span></label>
          <label class="ck"><input type="checkbox" id="onlyReply"><span data-i="reply"></span></label>
          <label class="ck"><input type="checkbox" id="pinned"><span data-i="pinned"></span></label>
        </div>
      </div>
      <div class="card">
        <div class="ct"><span data-i="secFun"></span></div>
        <label class="f"><span data-i="preset"></span><select id="preset"><option value="">–</option><option value="night" data-i="pNight"></option><option value="caps" data-i="pCaps"></option><option value="one" data-i="pOne"></option><option value="emoji" data-i="pEmoji"></option><option value="link" data-i="pLink"></option><option value="gif" data-i="pGif"></option><option value="q" data-i="pQ"></option><option value="long" data-i="pLong"></option><option value="pii" data-i="pPii"></option><option value="anniv" data-i="pAnniv"></option><option value="regret" data-i="pRegret"></option></select></label>
        <label class="f"><span data-i="regretWords"></span><input type="text" id="regretWords"></label>
      </div>
      <div class="card">
        <div class="ct"><span data-i="secKeep"></span></div>
        <label class="f"><span data-i="keepLast"></span><input type="number" id="keepLast" min="0" placeholder="0"></label>
        <label class="f"><span data-i="keepTerms"></span><input type="text" id="keepTerms"></label>
        <div class="sw one"><label class="ck"><input type="checkbox" id="keepReact"><span data-i="keepReact"></span></label></div>
      </div>
      <div class="card">
        <div class="ct"><span data-i="secLimits"></span></div>
        <div class="two"><label class="f"><span data-i="minLen"></span><input type="number" id="minLen" min="0"></label><label class="f"><span data-i="maxLen"></span><input type="number" id="maxLen" min="0"></label></div>
        <div class="two"><label class="f"><span data-i="after"></span><input type="datetime-local" id="minDate"></label><label class="f"><span data-i="before"></span><input type="datetime-local" id="maxDate"></label></div>
        <div class="two"><label class="f"><span data-i="dupMin"></span><input type="number" id="dupMin" min="0" placeholder="0"></label><label class="f"><span data-i="maxDel"></span><input type="number" id="maxDel" min="0" placeholder="∞"></label></div>
        <label class="f"><span data-i="randPct"></span><input type="number" id="randPct" min="1" max="100" placeholder="100"></label>
      </div>
    </div>

    <div class="tab" id="t_set">
      <div class="card">
        <div class="ct"><span data-i="secSpeed"></span></div>
        <div class="chips" id="speedPresets">
          <button data-ms="1800" data-i="spSafe"></button>
          <button data-ms="1200" data-i="spBal" class="on"></button>
          <button data-ms="750" data-i="spFast"></button>
        </div>
        <label class="f"><span data-i="delay"></span><input type="number" id="delay" value="1200" min="300" step="100"></label>
        <div class="sw">
          <label class="ck"><input type="checkbox" id="jitter" checked><span data-i="jitter"></span></label>
          <label class="ck"><input type="checkbox" id="adaptive" checked><span data-i="adaptive"></span></label>
          <label class="ck"><input type="checkbox" id="backup" checked><span data-i="backup"></span></label>
          <label class="ck"><input type="checkbox" id="countdown"><span data-i="countdown"></span></label>
          <label class="ck"><input type="checkbox" id="beepOn" checked><span data-i="beep"></span></label>
          <label class="ck"><input type="checkbox" id="fx" checked><span data-i="fx"></span></label>
        </div>
        <div class="sw one"><label class="ck"><input type="checkbox" id="overwrite"><span data-i="overwrite"></span></label></div>
        <input type="text" id="overwriteTxt" class="hide">
      </div>
      <div class="card">
        <div class="ct"><span data-i="auto"></span></div>
        <div class="two"><label class="f"><span data-i="autoEvery"></span><input type="number" id="autoH" value="6" min="1"></label><label class="f"><span data-i="autoOlder"></span><input type="number" id="autoD" value="7" min="0"></label></div>
        <div class="acts"><button id="bAuto" data-i="autoOn"></button></div>
        <div class="note" id="autoSt"></div>
      </div>
      <div class="card">
        <div class="ct"><span data-i="exp"></span></div>
        <div class="acts"><button id="eJson">JSON</button><button id="eCsv">CSV</button><button id="eHtml">HTML</button><button id="eMd">MD</button></div>
      </div>
      <div class="card">
        <div class="ct"><span data-i="cfgTitle"></span></div>
        <div class="acts"><button id="cfgExp" data-i="cfgExp"></button><button id="cfgImp" data-i="cfgImp"></button><input type="file" id="cfgFile" accept=".json" class="hide"></div>
      </div>
    </div>

    <div class="tab" id="t_logt">
      <div class="chips" id="logFilter">
        <button data-lf="all" class="on" data-i="logAll"></button>
        <button data-lf="warn" data-i="logWarn"></button>
        <span class="sp"></span>
        <label class="ck" style="margin:0"><input type="checkbox" id="verb" checked><span>verbose</span></label>
      </div>
      <div id="log"></div>
      <div class="acts"><button class="mini" id="bClear" data-i="clear"></button><button class="mini" id="bCopyLog" data-i="copyLog"></button></div>
    </div>
  </div>
  <div id="foot">
    <div class="stats">
      <div class="stat"><b id="vScan">0</b><span data-i="sScan"></span></div>
      <div class="stat f"><b id="vFound">0</b><span data-i="sFound"></span></div>
      <div class="stat d"><b id="vDel">0</b><span data-i="sDel"></span></div>
      <div class="stat x"><b id="vFail">0</b><span data-i="sFail"></span></div>
    </div>
    <div id="bar"><div id="fill"></div></div>
    <div id="bi"><span id="phase"></span><span id="pct"></span></div>
    <div class="acts"><button class="pri" id="bStart" data-i="start"></button><button id="bPause" disabled data-i="pause"></button><button class="dan" id="bStop" disabled data-i="stop"></button></div>
    <button id="bQueue" class="hide mini"></button>
  </div>
</div>
<div id="modal"><div id="mb"></div></div>
<div id="toast"></div>`;

    const $ = s => root.querySelector(s);
    const $$ = s => [...root.querySelectorAll(s)];
    const logEl = $('#log');

    // ------------------------------------------------------------ state
    const S = {
        running: false, stop: false, paused: false, phase: 'idle', scope: 'cur', olderMs: 0,
        token: '', authorId: '', delay: 1200, baseDelay: 1200, ping: 0, okStreak: 0, failStreak: 0,
        scanned: 0, found: [], seenIds: new Set(), reactions: [], deleted: 0, rxRemoved: 0, failed: 0, throttled: 0,
        user: null, chList: [], delStart: 0, auto: null, autoTimer: null, silent: false,
        logFilter: 'all', warnCount: 0, modalResolver: null, modalLock: false,
    };

    // ------------------------------------------------------------ helpers
    const sleep0 = ms => new Promise(r => setTimeout(r, ms));
    const pad = n => String(n).padStart(2, '0');
    const fmtDur = ms => {
        const h = (ms / 3.6e6) | 0, m = ((ms % 3.6e6) / 6e4) | 0, s = ((ms % 6e4) / 1000) | 0;
        if (LANG === 'tr') return h ? `${h}sa ${m}dk` : m ? `${m}dk ${s}sn` : `${s}sn`;
        return h ? `${h}h ${m}m` : m ? `${m}m ${s}s` : `${s}s`;
    };
    const msToSnow = ms => { const x = (BigInt(Math.floor(ms)) - EPOCH) << 22n; return x < 0n ? 0n : x; };
    const active = () => S.found.filter(m => !m.skip);

    let toastTimer = null;
    function toast(msg) {
        const el = $('#toast');
        el.textContent = msg;
        el.classList.add('on');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('on'), 2400);
    }

    function applyLogVisibility(el) {
        const type = el.dataset.type;
        if (S.logFilter === 'warn') {
            el.style.display = (type === 'warn' || type === 'error') ? '' : 'none';
        } else {
            el.style.display = (type === 'verb' && !$('#verb').checked) ? 'none' : '';
        }
    }

    function updateLogBadge() {
        const b = $('#lBadge');
        b.textContent = S.warnCount > 99 ? '99+' : String(S.warnCount);
        b.classList.toggle('hide', S.warnCount === 0);
    }

    function log(type, html) {
        const d = document.createElement('div');
        const n = new Date();
        d.className = type;
        d.dataset.type = type;
        d.innerHTML = `<span class="ts">${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}</span>${html}`;
        applyLogVisibility(d);
        logEl.appendChild(d);
        while (logEl.childElementCount > 2000) logEl.firstElementChild.remove();
        logEl.scrollTop = logEl.scrollHeight;
        if (type === 'warn' || type === 'error') {
            S.warnCount++;
            updateLogBadge();
        }
    }

    $('#verb').onchange = () => $$('#log div').forEach(applyLogVisibility);
    $$('#logFilter button').forEach(b => {
        b.onclick = () => {
            S.logFilter = b.dataset.lf;
            $$('#logFilter button').forEach(x => x.classList.toggle('on', x === b));
            $$('#log div').forEach(applyLogVisibility);
        };
    });

    function beep() {
        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return;
            const c = new Ctx(), o = c.createOscillator(), g = c.createGain();
            o.connect(g); g.connect(c.destination);
            o.frequency.value = 880;
            g.gain.setValueAtTime(0.08, c.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
            o.start();
            setTimeout(() => { try { o.stop(); c.close(); } catch (e) { /* ignore */ } }, 280);
        } catch (e) { /* ignore */ }
    }

    function updateFilterBadge() {
        let count = 0;
        if ($('#content').value.trim()) count++;
        if ($('#exclude').value.trim()) count++;
        if ($('#regex').checked) count++;
        if ($('#hasLink').checked) count++;
        if ($('#hasFile').checked) count++;
        if ($('#hasEmbed').checked) count++;
        if ($('#onlyReply').checked) count++;
        if ($('#pinned').checked) count++;
        if ($('#preset').value) count++;
        if ($('#regretWords').value.trim()) count++;
        if ((parseInt($('#keepLast').value, 10) || 0) > 0) count++;
        if ($('#keepTerms').value.trim()) count++;
        if ($('#keepReact').checked) count++;
        if ((parseInt($('#minLen').value, 10) || 0) > 0) count++;
        if ((parseInt($('#maxLen').value, 10) || 0) > 0) count++;
        if ($('#minDate').value) count++;
        if ($('#maxDate').value) count++;
        if ((parseInt($('#dupMin').value, 10) || 0) >= 2) count++;
        if ((parseInt($('#maxDel').value, 10) || 0) > 0) count++;
        const rp = parseFloat($('#randPct').value);
        if (rp > 0 && rp < 100) count++;
        const b = $('#fBadge');
        b.textContent = String(count);
        b.classList.toggle('hide', count === 0);
    }

    function applyLang() {
        $$('[data-i]').forEach(el => { el.textContent = tr(el.dataset.i); });
        $('#idsIn').placeholder = tr('idsPh');
        $('#guildIn').placeholder = tr('guildPh');
        $('#overwriteTxt').placeholder = tr('overwritePh');
        $('#bPause').textContent = tr(S.paused ? 'resume' : 'pause');
        $('#bAuto').textContent = tr(S.auto ? 'autoOff' : 'autoOn');
        setAcct();
        updateStats();
        refreshQueueBtn();
        refreshAutoState();
        updatePickBtnLabel();
    }

    function setAcct(state) {
        const a = $('#acct');
        if (S.user) {
            a.className = 'chip ok';
            if (S.user.avatar) {
                a.innerHTML = `<img src="https://cdn.discordapp.com/avatars/${esc(S.user.id)}/${esc(S.user.avatar)}.png?size=64" alt=""><span>${esc(S.user.username)}</span>`;
            } else {
                a.innerHTML = `<i></i><span>${esc(S.user.username)}</span>`;
            }
            return;
        }
        state = state || a.dataset.st || 'idle';
        a.dataset.st = state;
        a.className = 'chip' + (state === 'bad' ? ' bad' : '');
        a.innerHTML = `<i></i><span>${esc(tr(state === 'bad' ? 'pillBad' : 'pillIdle'))}</span>`;
    }

    function updateStats() {
        const act = active();
        const total = act.length + S.reactions.length;
        const done = S.deleted + S.rxRemoved + S.failed;
        $('#vScan').textContent = S.scanned;
        $('#vFound').textContent = act.length;
        $('#vDel').textContent = S.deleted + S.rxRemoved;
        $('#vFail').textContent = S.failed;
        const bar = $('#bar');
        const remaining = Math.max(0, total - done);
        const okDone = S.deleted + S.rxRemoved;
        const el = S.delStart ? (Date.now() - S.delStart) / 6e4 : 0;
        let pct = '';
        if (S.phase === 'delete' && total) {
            bar.classList.remove('ind');
            $('#fill').style.width = Math.round(done / total * 100) + '%';
            const unit = LANG === 'tr' ? '/dk' : '/min';
            const sp = el > 0.05 && okDone ? Math.round(okDone / el) + unit + ' · ' : '';
            pct = `${done}/${total} · ${sp}${tr('eta')} ${remaining ? fmtDur(remaining * (S.delay * (S.jitter ? 1.2 : 1) + (S.ping || 250))) : '–'}`;
        } else if (S.phase === 'scan') {
            bar.classList.add('ind');
        } else {
            bar.classList.remove('ind');
            $('#fill').style.width = S.phase === 'done' ? '100%' : '0';
        }
        $('#phase').textContent = { idle: '', scan: tr('scanning', { name: '' }).replace(/\s*\.\.\.$/, '…'), delete: tr('ok') + '…', done: '✓' }[S.phase] || '';
        $('#pct').textContent = pct;
        $('#pill').classList.toggle('run', S.running);
        $('#pillTxt').textContent = S.phase === 'delete' ? `${done}/${total}` : S.phase === 'scan' ? `${S.scanned}…` : S.phase === 'done' ? '✓' : 'Cleaner';
    }

    function setRunUi(on) {
        $('#bStart').disabled = on;
        $('#bStop').disabled = !on;
        $('#bPause').disabled = !on;
        if (!on) {
            S.paused = false;
            $('#bPause').textContent = tr('pause');
        }
    }

    function parseSnow(v) {
        v = (v || '').trim();
        if (!v) return null;
        if (/^\d{15,}$/.test(v)) return BigInt(v);
        const ms = new Date(v).getTime();
        if (isNaN(ms)) { log('warn', t('badDate', { v })); return null; }
        return msToSnow(ms);
    }

    async function gate() { while (S.paused && !S.stop) await sleep0(250); }
    async function sleep(ms) {
        const end = Date.now() + ms;
        while (Date.now() < end) {
            await gate();
            if (S.stop) return;
            await sleep0(Math.max(0, Math.min(250, end - Date.now())));
        }
    }

    // central request helper: 429, x-ratelimit headers, 202 search indexing, 5xx retries, 401 stop, JSON body for PATCH
    async function req(method, path, body) {
        let netAttempt = 0, indexAttempt = 0;
        while (netAttempt < 6 && indexAttempt < 16) {
            await gate();
            if (S.stop) return { aborted: true };
            let r;
            const t0 = Date.now();
            const headers = { Authorization: S.token };
            const init = { method, headers };
            if (body !== undefined) {
                headers['Content-Type'] = 'application/json';
                init.body = JSON.stringify(body);
            }
            try {
                r = await fetch(API + path, init);
            } catch (e) {
                netAttempt++;
                log('warn', t('netErr', { e: e.message }));
                await sleep(1500 * netAttempt);
                continue;
            }
            S.ping = S.ping ? S.ping * 0.8 + (Date.now() - t0) * 0.2 : Date.now() - t0;
            if (r.status === 401) {
                log('error', t('unauth'));
                setAcct('bad');
                S.user = null;
                S.stop = true;
                return { aborted: true, status: 401 };
            }
            if (r.status === 429) {
                let ra = 1;
                try { ra = (await r.json()).retry_after; } catch (e) { /* ignore */ }
                const hdrRa = parseFloat(r.headers.get('retry-after'));
                const sec = Math.max(0.2, Number(ra) || hdrRa || 1);
                const w = Math.ceil(sec * 1000) + 300;
                S.throttled++;
                S.okStreak = 0;
                S.delay = Math.min(Math.round(S.delay * 1.25), 10000);
                log('warn', t('rate', { ms: w, d: S.delay }));
                await sleep(w);
                continue;
            }
            if (r.status >= 500) {
                netAttempt++;
                await sleep(1500 * netAttempt);
                continue;
            }
            let data = null;
            if (r.status !== 204) { try { data = await r.json(); } catch (e) { /* ignore */ } }
            if (r.status === 202 && data && data.retry_after != null) {
                indexAttempt++;
                await sleep(Math.ceil(Math.max(0.5, Number(data.retry_after)) * 1000) + 250);
                continue;
            }
            const rem = r.headers.get('x-ratelimit-remaining'), rst = r.headers.get('x-ratelimit-reset-after');
            if (rem === '0' && rst) await sleep(Math.ceil(parseFloat(rst) * 1000) + 120);
            return { ok: r.ok, status: r.status, data };
        }
        return { ok: false, status: 0 };
    }

    // ------------------------------------------------------------ export
    function saveFile(name, text, type) {
        const url = URL.createObjectURL(new Blob([text], { type }));
        const a = document.createElement('a');
        a.href = url; a.download = name;
        root.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 15000);
    }
    const dlJson = (n, o) => saveFile(n, JSON.stringify(o, null, 2), 'application/json');
    function toCsv(rows) {
        const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
        return '\ufeff' + [['id', 'channel_id', 'channel', 'timestamp', 'content', 'attachments'].join(','),
            ...rows.map(r => [r.id, r.channel_id, r.channel, r.timestamp, r.content, (r.attachments || []).join(' ')].map(q).join(','))].join('\n');
    }
    function toHtml(rows) {
        const tr_ = rows.map(r => `<tr><td>${esc(new Date(r.timestamp).toLocaleString())}</td><td>${esc(r.channel)}</td><td>${esc(r.content)}${(r.attachments || []).map(u => `<br><a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a>`).join('')}</td></tr>`).join('');
        return `<!DOCTYPE html><meta charset="utf-8"><title>Discord Archive</title><style>body{font:14px system-ui;margin:24px;background:#090b10;color:#f0f2f8}table{border-collapse:collapse;width:100%}td,th{border:1px solid #262d42;padding:8px 10px;vertical-align:top;text-align:left}td:nth-child(3){white-space:pre-wrap;word-break:break-word}a{color:#5865f2}</style><h2>Discord Archive (${rows.length})</h2><table><tr><th>Date</th><th>Channel</th><th>Message</th></tr>${tr_}</table>`;
    }
    function toMd(rows) {
        const lines = [`# Discord Archive (${rows.length})`, ''];
        for (const r of rows) {
            lines.push(`### ${new Date(r.timestamp).toLocaleString()} — ${r.channel}`);
            if (r.content) lines.push(r.content);
            if (r.attachments && r.attachments.length) lines.push(...r.attachments.map(u => `- [attachment](${u})`));
            lines.push('');
        }
        return lines.join('\n');
    }
    const exportGuard = () => {
        if (!S.found.length && !S.reactions.length) { toast(tr('exNone')); log('warn', t('exNone')); return false; }
        return true;
    };
    $('#eJson').onclick = () => exportGuard() && dlJson(`discord-export-${Date.now()}.json`, { exportedAt: new Date().toISOString(), items: S.found, reactions: S.reactions });
    $('#eCsv').onclick = () => exportGuard() && saveFile(`discord-export-${Date.now()}.csv`, toCsv(S.found), 'text/csv;charset=utf-8');
    $('#eHtml').onclick = () => exportGuard() && saveFile(`discord-export-${Date.now()}.html`, toHtml(S.found), 'text/html;charset=utf-8');
    $('#eMd').onclick = () => exportGuard() && saveFile(`discord-export-${Date.now()}.md`, toMd(S.found), 'text/markdown;charset=utf-8');

    // ------------------------------------------------------------ token (validated)
    const cleanTok = v => String(v || '').trim().replace(/^["'\s]+|["'\s]+$/g, '');
    const looksTok = v => typeof v === 'string' && v.length > 20 && !/^(Bearer|Bot|Basic)\s/i.test(v);

    function tokenCandidates() {
        const out = new Set();
        try {
            window.dispatchEvent(new Event('beforeunload'));
            const f = document.createElement('iframe');
            f.style.display = 'none';
            document.body.appendChild(f);
            const raw = f.contentWindow && f.contentWindow.localStorage && f.contentWindow.localStorage.token;
            f.remove();
            if (raw) { try { out.add(cleanTok(JSON.parse(raw))); } catch (e) { out.add(cleanTok(raw)); } }
        } catch (e) { /* ignore */ }
        const saved = {}, ms = ['log', 'info', 'warn', 'error', 'debug', 'trace'];
        ms.forEach(k => { saved[k] = console[k]; console[k] = () => {}; });
        try {
            if (window.webpackChunkdiscord_app && typeof window.webpackChunkdiscord_app.push === 'function') {
                window.webpackChunkdiscord_app.push([[Symbol()], {}, r2 => {
                    for (const m of Object.values(r2.c || {})) {
                        try {
                            const ex = m && m.exports; if (!ex || typeof ex !== 'object') continue;
                            for (const c of [ex, ex.default, ...Object.values(ex)]) {
                                if (!c || (typeof c !== 'object' && typeof c !== 'function')) continue;
                                if (typeof c.getToken === 'function' && typeof c.getId === 'function') {
                                    const tk = c.getToken();
                                    if (looksTok(tk)) out.add(cleanTok(tk));
                                }
                            }
                        } catch (e) { /* getters may throw */ }
                    }
                }]);
            }
        } catch (e) { /* ignore */ } finally { ms.forEach(k => { console[k] = saved[k]; }); }
        CAP.forEach(v => out.add(v));
        return [...out].filter(looksTok);
    }

    if (!window.__dmcHooked) {
        window.__dmcHooked = true;
        try {
            const of = window.fetch;
            window.fetch = function (input, init) {
                try {
                    const h = (init && init.headers) || (input && input.headers);
                    const a = h && typeof h.get === 'function' ? h.get('authorization') : h && (h.Authorization || h.authorization);
                    if (looksTok(a)) CAP.add(cleanTok(a));
                } catch (e) { /* ignore */ }
                return of.apply(this, arguments);
            };
            const os = XMLHttpRequest.prototype.setRequestHeader;
            XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
                try { if (/^authorization$/i.test(k) && looksTok(v)) CAP.add(cleanTok(v)); } catch (e) { /* ignore */ }
                return os.apply(this, arguments);
            };
        } catch (e) { /* ignore */ }
    }

    async function validateToken(tk) {
        if (!tk) return null;
        try {
            const r = await fetch(`${API}/users/@me`, { headers: { Authorization: tk } });
            if (r.ok) return await r.json();
        } catch (e) { /* network */ }
        return null;
    }

    async function findValidToken(timeout = 20000) {
        const tried = new Set(), t0 = Date.now();
        while (Date.now() - t0 < timeout) {
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

    async function ensureAccount() {
        if (S.user && S.token) return true;
        log('info', t('tokFind'));
        const f = await findValidToken();
        if (f) {
            S.token = f.token; S.user = f.user; S.authorId = f.user.id;
            setAcct();
            log('success', t('tokOk', { u: f.user.username }));
            return true;
        }
        setAcct('bad');
        log('error', t('tokFail'));
        return false;
    }

    // ------------------------------------------------------------ scope helpers
    const urlIds = () => { const m = location.href.match(/channels\/([\w@]+)\/(\d+)/); return m ? { g: m[1], c: m[2] } : null; };
    const pickedIds = () => S.chList.filter(c => c.on).map(c => c.id);
    function updatePickBtnLabel() {
        const n = pickedIds().length;
        const base = tr('pick').replace('…', '');
        $('#bPick').textContent = n ? `${base} (${n})` : tr('pick');
    }
    function setScope(s) {
        S.scope = s;
        $$('#seg button').forEach(b => b.classList.toggle('on', b.dataset.s === s));
        $('#idsIn').classList.toggle('hide', s !== 'ids');
        $('#guildRow').style.display = s === 'guild' ? 'flex' : 'none';
        S.chList = [];
        updatePickBtnLabel();
        if (s === 'guild') {
            const u = urlIds();
            if (u && u.g !== '@me' && !$('#guildIn').value.trim()) $('#guildIn').value = u.g;
        }
    }
    const getGuildId = () => ($('#guildIn').value.match(/\d{15,}/) || [''])[0] || (urlIds() && urlIds().g !== '@me' ? urlIds().g : '');

    async function fetchChannelList(scope) {
        if (scope === 'dms') {
            const r = await req('GET', '/users/@me/channels');
            if (r.aborted) return [];
            if (!r.ok || !Array.isArray(r.data)) { log('error', t('skip', { name: 'DMs', c: r.status })); return []; }
            return r.data
                .filter(c => c.type === 1 || c.type === 3)
                .map(c => ({ id: c.id, name: c.name || (c.recipients || []).map(u => u.username).join(', ') || c.id }));
        }
        const gid = getGuildId();
        if (!gid) { log('warn', t('noGuild')); return []; }
        const r = await req('GET', `/guilds/${gid}/channels`);
        if (r.aborted) return [];
        if (!r.ok || !Array.isArray(r.data)) { log('error', t('skip', { name: gid, c: r.status })); return []; }
        const out = r.data.filter(c => TEXT_TYPES.has(c.type)).map(c => ({ id: c.id, name: '#' + c.name }));
        const th = await req('GET', `/guilds/${gid}/threads/active`);
        if (th.ok && th.data && Array.isArray(th.data.threads)) {
            const seen = new Set(out.map(x => x.id));
            th.data.threads.forEach(c => { if (!seen.has(c.id)) out.push({ id: c.id, name: '↳ ' + c.name }); });
        }
        return out;
    }

    async function resolveChannels() {
        if (S.scope === 'cur') {
            const u = urlIds(); if (!u) return [];
            const r = await req('GET', `/channels/${u.c}`);
            if (r.aborted) return [];
            const nm = r.ok && r.data ? (r.data.name ? '#' + r.data.name : (r.data.recipients || []).map(x => x.username).join(', ') || u.c) : '#' + u.c;
            return [{ id: u.c, name: nm }];
        }
        if (S.scope === 'ids') {
            const raw = $('#idsIn').value;
            const links = raw.match(/channels\/[\w@]+\/\d+/g);
            const ids = links ? [...new Set(links.map(l => l.split('/').pop()))] : [...new Set(raw.match(/\d{15,}/g) || [])];
            const list = [];
            for (const id of ids) {
                const r = await req('GET', `/channels/${id}`);
                if (r.aborted) return [];
                list.push({ id, name: r.ok && r.data && r.data.name ? '#' + r.data.name : '#' + id });
            }
            return list;
        }
        let list = await fetchChannelList(S.scope);
        const p = new Set(pickedIds());
        if (p.size) list = list.filter(c => p.has(c.id));
        return list;
    }

    // ------------------------------------------------------------ modal (safe promise lifecycle)
    const modal = $('#modal'), mb = $('#mb');
    function openModal(html, opts = {}) {
        if (S.modalResolver && !opts.replace) return false;
        if (S.modalResolver) { const r = S.modalResolver; S.modalResolver = null; r(false); }
        S.modalLock = !!opts.lock;
        S.modalResolver = opts.resolver || null;
        mb.innerHTML = html;
        modal.classList.add('on');
        return true;
    }
    function closeModal(result = false) {
        modal.classList.remove('on');
        mb.innerHTML = '';
        S.modalLock = false;
        if (S.modalResolver) { const r = S.modalResolver; S.modalResolver = null; r(result); }
    }
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(false); });

    $('#bPick').onclick = async () => {
        if (S.scope === 'cur' || S.scope === 'ids') return;
        if (S.modalLock) return toast(tr('modalBusy'));
        if (!(await ensureAccount())) return;
        $('#bPick').disabled = true;
        const prev = new Set(pickedIds());
        const list = await fetchChannelList(S.scope);
        $('#bPick').disabled = false;
        S.chList = list.map(c => ({ ...c, on: prev.has(c.id) }));
        log('info', t('pickCount', { n: S.chList.length }));
        openModal(`<h3>${esc(tr('pkTitle'))}</h3><input type="text" id="pkq" placeholder="${esc(tr('pkSearch'))}"><div class="list" id="pkl" style="max-height:320px"></div>
          <div class="mbtn"><button id="pkA">${esc(tr('rvAll'))}</button><button id="pkN">${esc(tr('rvNone'))}</button><button class="pri" id="pkO">OK</button></div>`);
        const render = () => {
            const q = mb.querySelector('#pkq').value.trim().toLowerCase();
            mb.querySelector('#pkl').innerHTML = S.chList.map((c, i) => (!q || c.name.toLowerCase().includes(q)) ? `<label><input type="checkbox" data-k="${i}" ${c.on ? 'checked' : ''}><span>${esc(c.name)}</span></label>` : '').join('');
        };
        render();
        mb.querySelector('#pkq').oninput = render;
        mb.querySelector('#pkl').onchange = e => { const k = e.target.dataset.k; if (k != null) S.chList[+k].on = e.target.checked; };
        mb.querySelector('#pkA').onclick = () => { const q = mb.querySelector('#pkq').value.trim().toLowerCase(); S.chList.forEach(c => { if (!q || c.name.toLowerCase().includes(q)) c.on = true; }); render(); };
        mb.querySelector('#pkN').onclick = () => { S.chList.forEach(c => { c.on = false; }); render(); };
        mb.querySelector('#pkO').onclick = () => { updatePickBtnLabel(); closeModal(true); };
    };

    // ------------------------------------------------------------ options
    function readOptions(opts = {}) {
        S.content = $('#content').value.trim(); S.regex = null;
        if (S.content && $('#regex').checked) { try { S.regex = new RegExp(S.content, 'i'); } catch (e) { log('warn', t('badRe', { v: S.content })); } }
        S.contentLc = S.content.toLowerCase();
        S.exclude = $('#exclude').value.trim().toLowerCase();
        S.keepLast = parseInt($('#keepLast').value, 10) || 0;
        S.keepTerms = $('#keepTerms').value.split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
        S.keepReact = $('#keepReact').checked;
        S.preset = $('#preset').value;
        S.randPct = parseFloat($('#randPct').value) || 100;
        S.countdown = $('#countdown').checked;
        S.regretList = $('#regretWords').value.split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
        S.dupMin = parseInt($('#dupMin').value, 10) || 0;
        S.maxDel = parseInt($('#maxDel').value, 10) || 0;
        S.fx = $('#fx').checked;
        S.overwrite = $('#overwrite').checked;
        S.overwriteTxt = $('#overwriteTxt').value.trim();
        S.minLen = parseInt($('#minLen').value, 10) || 0;
        const ml = parseInt($('#maxLen').value, 10);
        S.maxLen = ml > 0 ? ml : Infinity;
        S.hasLink = $('#hasLink').checked; S.hasFile = $('#hasFile').checked; S.hasEmbed = $('#hasEmbed').checked;
        S.onlyReply = $('#onlyReply').checked; S.includePinned = $('#pinned').checked;
        S.removeReactions = $('#rx').checked; S.dryRun = $('#dry').checked; S.backup = $('#backup').checked;
        S.fast = $('#fast').checked && !S.removeReactions;
        if ($('#fast').checked && S.removeReactions) log('info', t('fastOff'));
        S.adaptive = $('#adaptive').checked; S.beepOn = $('#beepOn').checked; S.jitter = $('#jitter').checked;
        S.baseDelay = Math.max(300, parseInt($('#delay').value, 10) || 1200);
        S.delay = S.baseDelay;
        S.okStreak = 0; S.failStreak = 0;
        S.minSnow = parseSnow($('#minDate').value) ?? 0n;
        const maxes = [parseSnow($('#maxDate').value)].filter(x => x !== null);
        const olderMs = opts.olderMs != null ? opts.olderMs : S.olderMs;
        if (olderMs > 0) maxes.push(msToSnow(Date.now() - olderMs));
        S.maxSnow = maxes.length ? maxes.reduce((a, b) => (a < b ? a : b)) : null;
        S.scanned = 0; S.found = []; S.seenIds = new Set(); S.reactions = [];
        S.deleted = 0; S.rxRemoved = 0; S.failed = 0; S.throttled = 0; S.delStart = 0;
    }

    const REGRET = ['nefret', 'aptal', 'salak', 'gerizekalı', 'bıktım', 'pişman', 'özür', 'lanet', 'kavga', 'hate', 'stupid', 'idiot', 'shut up', 'sorry', 'regret', 'wtf'];
    function luhn(s) { let sum = 0, alt = false; for (let i = s.length - 1; i >= 0; i--) { let d = +s[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } sum += d; alt = !alt; } return sum % 10 === 0; }
    function tckn(s) {
        if (!/^[1-9]\d{10}$/.test(s)) return false;
        const d = s.split('').map(Number);
        const a = ((d[0] + d[2] + d[4] + d[6] + d[8]) * 7 - (d[1] + d[3] + d[5] + d[7])) % 10;
        return ((a + 10) % 10) === d[9] && d.slice(0, 10).reduce((x, y) => x + y, 0) % 10 === d[10];
    }
    function piiHits(c) {
        const h = [];
        if (/[\w.+-]+@[\w-]+\.[\w.-]+/.test(c)) h.push('e-posta');
        for (const m of c.match(/\+?\d[\d\s().-]{8,16}\d/g) || []) { const n = m.replace(/\D/g, '').length; if (n >= 10 && n <= 13) { h.push('telefon'); break; } }
        if (/\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,4})?\b/.test(c)) h.push('IBAN');
        for (const m of c.match(/\b\d{4}[ -]\d{4}[ -]\d{4}[ -]\d{1,7}\b/g) || []) if (luhn(m.replace(/\D/g, ''))) { h.push('kart'); break; }
        for (const m of c.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || []) if (m.split('.').every(x => +x <= 255)) { h.push('IP'); break; }
        for (const m of c.match(/\b\d{11}\b/g) || []) if (tckn(m)) { h.push('TC kimlik'); break; }
        if (/[\w-]{24,28}\.[\w-]{6}\.[\w-]{27,}/.test(c)) h.push('token');
        if (/\b(AIza[0-9A-Za-z_-]{35}|ghp_[0-9A-Za-z]{36}|sk-[0-9A-Za-z]{20,})\b/.test(c)) h.push('API key');
        if (/(şifre|sifre|password|parola|pass)\s*[:=]\s*\S+/i.test(c)) h.push('şifre');
        return h;
    }
    function presetOk(m) {
        const c = (m.content || '').trim();
        switch (S.preset) {
            case 'night': return new Date(m.timestamp).getHours() < 5;
            case 'caps': return c.length >= 4 && /\p{L}/u.test(c) && c === c.toUpperCase() && c !== c.toLowerCase();
            case 'one': return c.length > 0 && !/\s/.test(c);
            case 'emoji': {
                const custom = /<a?:\w+:\d+>/.test(c);
                const x = c.replace(/<a?:\w+:\d+>/g, '').trim();
                return c.length > 0 && !/[\p{L}\p{N}]/u.test(x) && (custom || /\p{Extended_Pictographic}/u.test(x));
            }
            case 'link': return /^https?:\/\/\S+$/i.test(c);
            case 'gif': return /(tenor\.com|giphy\.com|\.gif(\?|$))/i.test(c) || (m.embeds || []).some(e => e.type === 'gifv');
            case 'q': return /\?\s*$/.test(c);
            case 'long': return c.length >= 500;
            case 'pii': return piiHits(c).length > 0;
            case 'anniv': { const d = new Date(m.timestamp), n = new Date(); return d.getMonth() === n.getMonth() && d.getDate() === n.getDate() && d.getFullYear() < n.getFullYear(); }
            case 'regret': { const lc = c.toLowerCase(); return (S.regretList.length ? S.regretList : REGRET).some(w => lc.includes(w)); }
            default: return true;
        }
    }
    function matches(m) {
        if (!DELETABLE.has(m.type)) return false;
        if (m.pinned && !S.includePinned) return false;
        if (S.preset && !presetOk(m)) return false;
        const c = m.content || '', lc = c.toLowerCase();
        if (S.regex) { if (!S.regex.test(c)) return false; } else if (S.contentLc && !lc.includes(S.contentLc)) return false;
        if (S.exclude && lc.includes(S.exclude)) return false;
        if (S.keepTerms.length && S.keepTerms.some(k => lc.includes(k))) return false;
        if (S.keepReact && Array.isArray(m.reactions) && m.reactions.some(r => r.count > 0)) return false;
        if (c.length < S.minLen || c.length > S.maxLen) return false;
        if (S.hasLink && !/https?:\/\//i.test(c)) return false;
        if (S.hasFile && !(m.attachments && m.attachments.length)) return false;
        if (S.hasEmbed && !(m.embeds && m.embeds.length)) return false;
        if (S.onlyReply && !m.message_reference) return false;
        return true;
    }
    function pushFound(m, chName, chId) {
        if (S.seenIds.has(m.id)) return false;
        S.seenIds.add(m.id);
        S.found.push({
            id: m.id,
            channel_id: m.channel_id || chId,
            channel: chName,
            timestamp: m.timestamp,
            content: m.content || '',
            attachments: (m.attachments || []).map(a => a.url),
            deleted: false,
            skip: false,
            tag: S.preset === 'pii' ? piiHits(m.content || '').join(', ') : '',
        });
        return true;
    }

    // full scan
    async function scanChannel(ch) {
        let before = S.maxSnow !== null ? S.maxSnow.toString() : undefined;
        let scanned = 0, foundHere = 0, rxHere = 0, mine = 0;
        while (true) {
            const r = await req('GET', `/channels/${ch.id}/messages?limit=100${before ? '&before=' + before : ''}`);
            if (r.aborted) return false;
            if (!r.ok) { log('warn', t('skip', { name: ch.name, c: r.status })); break; }
            const batch = r.data;
            if (!Array.isArray(batch) || !batch.length) break;
            scanned += batch.length; S.scanned += batch.length;
            for (const m of batch) {
                const mid = BigInt(m.id);
                if (mid <= S.minSnow) continue;
                const own = m.author && m.author.id === S.authorId;
                if (own) mine++;
                if (own && matches(m) && pushFound(m, ch.name, ch.id)) foundHere++;
                if (S.removeReactions && Array.isArray(m.reactions)) {
                    for (const rx of m.reactions) {
                        if (!rx.me) continue;
                        S.reactions.push({
                            channel_id: m.channel_id || ch.id,
                            id: m.id,
                            key: rx.emoji.id ? `${rx.emoji.name}:${rx.emoji.id}` : rx.emoji.name,
                        });
                        rxHere++;
                    }
                }
            }
            before = batch[batch.length - 1].id;
            updateStats();
            if (BigInt(before) <= S.minSnow) break;
            await sleep(450);
        }
        if (scanned > 300 && mine === 0) log('warn', t('noMine', { name: ch.name, s: scanned }));
        else log('verb', t('chDone', { name: ch.name, f: foundHere, r: rxHere, s: scanned }));
        return true;
    }

    // fast scan: Search API with automatic fallback
    async function scanSearch(ch, guildWide, nameMap, gid) {
        const base = guildWide ? `/guilds/${gid}/messages/search` : `/channels/${ch.id}/messages/search`;
        let maxId = S.maxSnow !== null ? S.maxSnow.toString() : '';
        let scanned = 0, foundHere = 0;
        const picked = guildWide ? pickedIds() : [];
        while (true) {
            const q = new URLSearchParams({ author_id: S.authorId, sort_by: 'timestamp', sort_order: 'desc', include_nsfw: 'true' });
            if (maxId) q.set('max_id', maxId);
            if (S.minSnow > 0n) q.set('min_id', S.minSnow.toString());
            picked.slice(0, 25).forEach(id => q.append('channel_id', id));
            if (S.hasLink) q.append('has', 'link');
            if (S.hasFile) q.append('has', 'file');
            if (S.hasEmbed) q.append('has', 'embed');
            const r = await req('GET', `${base}?${q}`);
            if (r.aborted) return false;
            if (!r.ok || !r.data) {
                if (!guildWide && (r.status === 400 || r.status === 403 || r.status === 404)) {
                    log('warn', t('fastFallback', { name: ch.name, c: r.status }));
                    return await scanChannel(ch);
                }
                log('warn', t('skip', { name: ch.name, c: r.status }));
                break;
            }
            const msgs = (r.data.messages || []).map(g => g.find(x => x.hit) || g[0]).filter(Boolean);
            if (!msgs.length) break;
            scanned += msgs.length; S.scanned += msgs.length;
            let oldestId = BigInt(msgs[0].id);
            for (const m of msgs) {
                const mid = BigInt(m.id);
                if (mid < oldestId) oldestId = mid;
                if (mid <= S.minSnow) continue;
                if (!m.author || m.author.id !== S.authorId) continue;
                if (matches(m) && pushFound(m, (nameMap && nameMap.get(m.channel_id)) || ch.name || '#' + m.channel_id, m.channel_id)) {
                    foundHere++;
                }
            }
            const nextMax = oldestId - 1n;
            updateStats();
            if (nextMax <= 0n || (S.minSnow > 0n && nextMax <= S.minSnow)) break;
            maxId = nextMax.toString();
            await sleep(950);
        }
        log('verb', t('chDone', { name: ch.name, f: foundHere, r: 0, s: scanned }));
        return true;
    }

    // ------------------------------------------------------------ post-scan filters, visual analytics, review
    function applyKeepLast() {
        if (!S.keepLast) return;
        const before = S.found.length;
        S.found.sort((a, b) => (BigInt(b.id) > BigInt(a.id) ? 1 : BigInt(b.id) < BigInt(a.id) ? -1 : 0));
        const cnt = new Map();
        S.found = S.found.filter(m => { const c = (cnt.get(m.channel_id) || 0) + 1; cnt.set(m.channel_id, c); return c > S.keepLast; });
        log('info', t('kept', { n: before - S.found.length }));
    }
    function applyRandom() {
        if (!(S.randPct > 0 && S.randPct < 100)) return;
        const before = S.found.length;
        S.found = S.found.filter(() => Math.random() * 100 < S.randPct);
        log('info', t('randKept', { n: before - S.found.length }));
    }

    function buildVisualAnalytics() {
        const act = active();
        if (!act.length) return '';
        const ch = new Map(), mo = new Map(), wd = new Map(), em = new Map();
        const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
        for (const m of act) {
            ch.set(m.channel, (ch.get(m.channel) || 0) + 1);
            const d = new Date(m.timestamp);
            const k = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
            mo.set(k, (mo.get(k) || 0) + 1);
            grid[d.getDay()][d.getHours()]++;
            for (const w of (m.content.toLowerCase().match(/[\p{L}\p{N}']{4,}/gu) || [])) wd.set(w, (wd.get(w) || 0) + 1);
            for (const e of (m.content.match(/\p{Extended_Pictographic}|<a?:\w+:\d+>/gu) || [])) em.set(e, (em.get(e) || 0) + 1);
        }
        const bars = (entries, mx) => entries.map(([k, n]) =>
            `<div class="brow"><span class="lbl" title="${esc(k)}">${esc(k)}</span><div class="track"><div class="fill" style="width:${Math.max(4, Math.round(n / mx * 100))}%"></div></div><span class="val">${n}</span></div>`).join('');
        const topCh = [...ch.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
        const topMo = [...mo.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 8);
        const topWd = [...wd.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
        const topEm = [...em.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
        const gmx = Math.max(1, ...grid.flat());
        const dNames = LANG === 'tr' ? ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const hmHtml = [1, 2, 3, 4, 5, 6, 0].map(d => {
            const cells = grid[d].map((n, h) => {
                const alpha = n ? (0.2 + 0.8 * (n / gmx)).toFixed(2) : 0;
                return `<div class="cell" title="${dNames[d]} ${pad(h)}:00 → ${n}" style="${n ? `background:rgba(88,101,242,${alpha})` : ''}"></div>`;
            }).join('');
            return `<div class="d">${dNames[d]}</div>${cells}`;
        }).join('');
        return `<div class="chartBox">
          <div class="chartSec"><h4>${esc(tr('rvCh'))}</h4>${bars(topCh, topCh[0] ? topCh[0][1] : 1)}</div>
          <div class="chartSec"><h4>${esc(tr('rvMonth'))}</h4>${bars(topMo, Math.max(1, ...topMo.map(x => x[1])))}</div>
          <div class="chartSec"><h4>${esc(tr('hmTitle'))}</h4><div class="hm">${hmHtml}</div></div>
          <div class="chartSec"><h4>${esc(tr('rvWords'))}</h4><div class="kpis">${topWd.map(([w, n]) => `<div class="kpi">${esc(w)} <span>×${n}</span></div>`).join('') || '–'}</div></div>
          ${topEm.length ? `<div class="chartSec"><h4>${esc(tr('fEmoji'))}</h4><div class="kpis">${topEm.map(([e, n]) => `<div class="kpi">${esc(e)} <span>×${n}</span></div>`).join('')}</div></div>` : ''}
        </div>`;
    }

    function buildSummaryHtml() {
        const act = active();
        if (!act.length) return '';
        let chars = 0, longest = act[0], oldest = act[0];
        for (const m of act) {
            chars += m.content.length;
            if (m.content.length > longest.content.length) longest = m;
            if (BigInt(m.id) < BigInt(oldest.id)) oldest = m;
        }
        return `<div class="kpis">
          <div class="kpi"><span>${esc(tr('fChars'))}:</span>${chars.toLocaleString()}</div>
          <div class="kpi"><span>${esc(tr('fLong'))}:</span>${longest.content.length} (${esc(new Date(longest.timestamp).toLocaleDateString())})</div>
          <div class="kpi"><span>${esc(tr('fOld'))}:</span>${esc(new Date(oldest.timestamp).toLocaleDateString())}</div>
        </div>`;
    }

    function reviewModalAsk(useList) {
        return new Promise(res => {
            const total = S.found.length + S.reactions.length;
            const mult = S.overwrite ? 2 : 1;
            const eta = fmtDur(total * mult * (S.delay * (S.jitter ? 1.2 : 1) + 300));
            openModal(`<h3>${esc(tr('rvTitle'))}</h3>
              <div class="kpis">
                <div class="kpi"><span>${esc(tr('eta'))}:</span>${esc(eta)}</div>
                <div class="kpi" id="rvC"></div>
                ${S.reactions.length ? `<div class="kpi"><span>${esc(tr('rx'))}:</span>${S.reactions.length}</div>` : ''}
              </div>
              <div class="mtabs" id="rvTabs">
                ${useList ? `<button data-mt="msg" class="on">${esc(tr('rvTabMsg'))}</button>` : ''}
                <button data-mt="chart" class="${useList ? '' : 'on'}">${esc(tr('rvTabChart'))}</button>
                <button data-mt="sum">${esc(tr('rvTabSum'))}</button>
              </div>
              ${useList ? `<div id="mt_msg" style="display:flex;flex-direction:column;gap:8px">
                <input type="text" id="rvQ" placeholder="${esc(tr('rvSearch'))}">
                <div class="list" id="rvL"></div>
                <div class="mbtn" style="margin-top:0">
                  <button class="mini" id="rvA">${esc(tr('rvAll'))}</button>
                  <button class="mini" id="rvN">${esc(tr('rvNone'))}</button>
                  <button class="mini" id="rvInv">${esc(tr('rvInv'))}</button>
                </div>
              </div>` : ''}
              <div id="mt_chart" class="${useList ? 'hide' : ''}">${buildVisualAnalytics()}</div>
              <div id="mt_sum" class="hide">${buildSummaryHtml()}</div>
              <div id="rvT" class="hide"><div class="note">${esc(tr('typeDel'))}</div><input type="text" id="rvI" autocomplete="off"></div>
              <div class="mbtn"><button id="rvCard">🖼 ${esc(tr('cardBtn'))}</button><span class="sp"></span><button id="rvX">${esc(tr('cancel'))}</button><button class="dan" id="rvO">${esc(tr('ok'))}</button></div>`,
              { lock: true, resolver: res });
            const Q = s => mb.querySelector(s);
            const idx = new Map(S.found.map((m, i) => [i, m]));
            mb.querySelectorAll('#rvTabs button').forEach(b => {
                b.onclick = () => {
                    mb.querySelectorAll('#rvTabs button').forEach(x => x.classList.toggle('on', x === b));
                    ['msg', 'chart', 'sum'].forEach(k => {
                        const el = Q('#mt_' + k);
                        if (el) el.classList.toggle('hide', b.dataset.mt !== k);
                    });
                };
            });
            const sync = () => {
                const n = active().length;
                Q('#rvC').textContent = tr('rvSel', { n, m: S.found.length });
                const need = n + S.reactions.length >= 100;
                Q('#rvT').classList.toggle('hide', !need);
                Q('#rvO').disabled = n + S.reactions.length === 0 || (need && Q('#rvI').value.trim() !== 'DELETE');
            };
            const filtered = () => {
                const q = useList ? Q('#rvQ').value.trim().toLowerCase() : '';
                return S.found.map((m, i) => [i, m]).filter(([, m]) => !q || (m.content + ' ' + m.channel).toLowerCase().includes(q));
            };
            const render = () => {
                if (!useList) return;
                Q('#rvL').innerHTML = filtered().slice(0, 300).map(([i, m]) => `<label><input type="checkbox" data-k="${i}" ${m.skip ? '' : 'checked'}><span><span class="m">${esc(new Date(m.timestamp).toLocaleDateString())} ${esc(m.channel)}</span>${m.tag ? `<span class="tag">${esc(m.tag)}</span>` : ''} ${esc(m.content.slice(0, 90)) || (m.attachments.length ? '[file]' : '')}</span></label>`).join('');
            };
            if (useList) {
                Q('#rvQ').oninput = render;
                Q('#rvL').onchange = e => { const k = e.target.dataset.k; if (k != null) { idx.get(+k).skip = !e.target.checked; sync(); } };
                Q('#rvA').onclick = () => { filtered().forEach(([, m]) => { m.skip = false; }); render(); sync(); };
                Q('#rvN').onclick = () => { filtered().forEach(([, m]) => { m.skip = true; }); render(); sync(); };
                Q('#rvInv').onclick = () => { filtered().forEach(([, m]) => { m.skip = !m.skip; }); render(); sync(); };
            }
            Q('#rvI').oninput = sync;
            Q('#rvCard').onclick = reportCard;
            Q('#rvO').onclick = () => closeModal(true);
            Q('#rvX').onclick = () => closeModal(false);
            render(); sync();
        });
    }

    function applyDup() {
        if (!(S.dupMin >= 2)) return;
        const g = new Map();
        for (const m of S.found) {
            const k = m.content.trim().toLowerCase().replace(/\s+/g, ' ');
            if (k.length < 2) continue;
            if (!g.has(k)) g.set(k, []);
            g.get(k).push(m);
        }
        const extra = new Set(); let groups = 0;
        for (const arr of g.values()) {
            if (arr.length < S.dupMin) continue;
            groups++;
            arr.sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1));
            arr.slice(1).forEach(m => extra.add(m));
        }
        S.found = S.found.filter(m => extra.has(m));
        log('info', t('dupInfo', { n: S.found.length, g: groups }));
    }
    function applyCap() {
        if (!(S.maxDel > 0) || S.found.length <= S.maxDel) return;
        S.found.sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : BigInt(a.id) > BigInt(b.id) ? 1 : 0));
        S.found = S.found.slice(0, S.maxDel);
        log('info', t('capInfo', { n: S.maxDel }));
    }
    function reportCard() {
        const act = active(); if (!act.length) return toast(tr('exNone'));
        const hrs = new Array(24).fill(0), wd = new Array(7).fill(0), em = new Map();
        let chars = 0, minT = Infinity, maxT = 0;
        for (const m of act) {
            const d = new Date(m.timestamp), ts = d.getTime();
            hrs[d.getHours()]++; wd[d.getDay()]++; chars += m.content.length;
            if (ts < minT) minT = ts; if (ts > maxT) maxT = ts;
            for (const e of (m.content.match(/\p{Extended_Pictographic}/gu) || [])) em.set(e, (em.get(e) || 0) + 1);
        }
        const tr_ = LANG === 'tr';
        const days = tr_ ? ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'] : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const peakH = hrs.indexOf(Math.max(...hrs)), peakD = wd.indexOf(Math.max(...wd));
        const topEm = [...em.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(x => x[0]).join(' ');
        const c = document.createElement('canvas'); c.width = 960; c.height = 540;
        const x = c.getContext('2d');
        const gr = x.createLinearGradient(0, 0, 960, 540);
        gr.addColorStop(0, '#090b10'); gr.addColorStop(1, '#1b1638');
        x.fillStyle = gr; x.fillRect(0, 0, 960, 540);
        x.strokeStyle = 'rgba(255,255,255,0.08)'; x.lineWidth = 2;
        x.strokeRect(20, 20, 920, 500);
        x.fillStyle = '#8d96ad'; x.font = '600 17px Inter, Segoe UI, sans-serif';
        x.fillText(tr_ ? 'DISCORD MESSAGE CLEANER v7 · ÖZET KART' : 'DISCORD MESSAGE CLEANER v7 · SUMMARY CARD', 48, 62);
        const countStr = act.length.toLocaleString();
        x.fillStyle = '#f0f2f8'; x.font = '700 88px Inter, Segoe UI, sans-serif';
        x.fillText(countStr, 48, 162);
        const numW = x.measureText(countStr).width;
        x.font = '600 26px Inter, Segoe UI, sans-serif'; x.fillStyle = '#8b5cf6';
        x.fillText(tr_ ? 'mesaj' : 'messages', 48 + numW + 16, 162);
        x.fillStyle = '#cbd5e1'; x.font = '400 21px Inter, Segoe UI, sans-serif';
        x.fillText((tr_ ? 'Toplam karakter: ' : 'Total characters: ') + chars.toLocaleString(), 48, 218);
        x.fillText((tr_ ? 'En aktif saat: ' : 'Busiest hour: ') + pad(peakH) + ':00', 48, 252);
        x.fillText((tr_ ? 'En aktif gün: ' : 'Busiest day: ') + days[peakD], 48, 286);
        x.fillStyle = '#8d96ad'; x.font = '400 18px Inter, Segoe UI, sans-serif';
        x.fillText(new Date(minT).toLocaleDateString() + ' → ' + new Date(maxT).toLocaleDateString(), 48, 322);
        if (topEm) { x.font = '36px Segoe UI Emoji, Apple Color Emoji, sans-serif'; x.fillText(topEm, 48, 376); }
        const mx = Math.max(1, ...hrs);
        hrs.forEach((n, i) => {
            const h = Math.max(4, n / mx * 110);
            x.fillStyle = i === peakH ? '#10b981' : '#5865f2';
            x.fillRect(48 + i * 36, 500 - h, 26, h);
        });
        c.toBlob(b => {
            if (!b) return;
            const u = URL.createObjectURL(b);
            const a = document.createElement('a'); a.href = u; a.download = 'cleaner-card.png';
            root.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(u), 15000);
        });
    }
    function farewell(list) {
        const gone = list.filter(m => m.deleted); if (!gone.length) return;
        const words = gone.reduce((a, m) => a + (m.content.trim() ? m.content.trim().split(/\s+/).length : 0), 0);
        const lines = LANG === 'tr' ? ['Dijital toz bile kalmadı.', 'Arşivciler ağlıyor.', 'Geçmişin hafifledi.', 'Sunucular bir an sustu.', 'Artık bunlar bir anı bile değil.']
            : ['Not even digital dust remains.', 'The archivists are weeping.', 'Your past just got lighter.', 'The servers fell silent for a moment.', 'These are not even memories now.'];
        log('success', t('fwReport', { n: gone.length, w: words, m: Math.max(1, Math.round(words / 200)), line: lines[(Math.random() * lines.length) | 0] }));
    }
    function confetti() {
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const cv = document.createElement('canvas'); cv.width = innerWidth; cv.height = innerHeight;
        cv.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647';
        root.appendChild(cv);
        const x = cv.getContext('2d'), cols = ['#5865f2', '#10b981', '#f59e0b', '#ef4444', '#38bdf8'];
        const ps = Array.from({ length: 120 }, () => ({ x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * 0.3, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, s: 4 + Math.random() * 6, c: cols[(Math.random() * cols.length) | 0], r: Math.random() * 6 }));
        const t0 = performance.now();
        (function f(now) {
            x.clearRect(0, 0, cv.width, cv.height);
            for (const p of ps) { p.x += p.vx; p.y += p.vy; p.r += 0.1; x.fillStyle = p.c; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); x.restore(); }
            if (now - t0 < 2800) requestAnimationFrame(f); else cv.remove();
        })(t0);
    }
    function palette() {
        if (S.modalLock) return toast(tr('modalBusy'));
        const L = (a, b) => (LANG === 'tr' ? a : b);
        const cmds = [
            { n: L('Başlat', 'Start'), f: () => $('#bStart').click() },
            { n: L('Durdur', 'Stop'), f: () => $('#bStop').click() },
            { n: L('Deneme modunu aç/kapat', 'Toggle dry run'), f: () => { $('#dry').checked = !$('#dry').checked; saveSettings(); } },
            { n: L('Hızlı modu aç/kapat', 'Toggle fast mode'), f: () => { $('#fast').checked = !$('#fast').checked; saveSettings(); } },
            { n: L('İnceleme tablosunu aç/kapat', 'Toggle review table'), f: () => { $('#review').checked = !$('#review').checked; saveSettings(); } },
            { n: L('Gizlilik (üzerine yaz) modunu aç/kapat', 'Toggle overwrite mode'), f: () => { $('#overwrite').checked = !$('#overwrite').checked; $('#overwriteTxt').classList.toggle('hide', !$('#overwrite').checked); saveSettings(); } },
            { n: L('Kapsam: bu kanal', 'Scope: this channel'), f: () => { setScope('cur'); saveSettings(); } },
            { n: L('Kapsam: sunucu', 'Scope: server'), f: () => { setScope('guild'); saveSettings(); } },
            { n: L('Kapsam: DM’ler', 'Scope: DMs'), f: () => { setScope('dms'); saveSettings(); } },
            { n: L('Kapsam: ID', 'Scope: IDs'), f: () => { setScope('ids'); saveSettings(); } },
            { n: L('Filtreleri sıfırla', 'Reset filters'), f: () => $('#bResetF').click() },
            { n: L('JSON dışa aktar', 'Export JSON'), f: () => $('#eJson').click() },
            { n: L('CSV dışa aktar', 'Export CSV'), f: () => $('#eCsv').click() },
            { n: L('HTML arşivi dışa aktar', 'Export HTML archive'), f: () => $('#eHtml').click() },
            { n: L('Markdown dışa aktar', 'Export Markdown'), f: () => $('#eMd').click() },
            { n: L('Özet kartı (PNG)', 'Summary card (PNG)'), f: reportCard },
            { n: L('Kuyruğa devam', 'Resume queue'), f: resumeQueue },
            { n: L('Otomatik temizliği aç/kapat', 'Toggle auto clean'), f: () => $('#bAuto').click() },
            { n: L('Temayı değiştir (Koyu/Açık)', 'Toggle theme (Dark/Light)'), f: () => $('#bTheme').click() },
            { n: L('Dili değiştir', 'Switch language'), f: () => $('#bLang').click() },
            { n: L('Paneli küçült', 'Minimize panel'), f: () => $('#bMin').click() },
            { n: L('Logu temizle', 'Clear log'), f: () => $('#bClear').click() },
        ];
        [[0, 'all'], [3600000, 'h1'], [86400000, 'd1'], [604800000, 'd7'], [2592000000, 'd30']].forEach(([ms, k]) => cmds.push({ n: `${tr('older')}: ${tr(k)}`, f: () => { setOlder(ms); saveSettings(); } }));
        [['', '–'], ['night', 'pNight'], ['caps', 'pCaps'], ['one', 'pOne'], ['emoji', 'pEmoji'], ['link', 'pLink'], ['gif', 'pGif'], ['q', 'pQ'], ['long', 'pLong'], ['pii', 'pPii'], ['anniv', 'pAnniv'], ['regret', 'pRegret']]
            .forEach(([v, k]) => cmds.push({ n: `${tr('preset')}: ${v ? tr(k) : '–'}`, f: () => { $('#preset').value = v; updateFilterBadge(); saveSettings(); } }));
        openModal(`<input type="text" id="pq" placeholder="${esc(tr('palPh'))}" autocomplete="off"><div class="list" id="pl" style="max-height:320px"></div>`);
        const inp = mb.querySelector('#pq'), lst = mb.querySelector('#pl');
        let sel = 0, shown = [];
        const render = () => {
            const q = inp.value.toLowerCase().split(/\s+/).filter(Boolean);
            shown = cmds.filter(c => q.every(w => c.n.toLowerCase().includes(w)));
            sel = Math.min(sel, Math.max(0, shown.length - 1));
            lst.innerHTML = shown.map((c, i) => `<label data-k="${i}" style="padding:5px 8px;border-radius:7px;${i === sel ? 'background:var(--accentSoft);color:var(--text)' : ''}">${esc(c.n)}</label>`).join('');
            const cur = lst.children[sel]; if (cur) cur.scrollIntoView({ block: 'nearest' });
        };
        const go = i => { const c = shown[i]; if (!c) return; closeModal(); c.f(); };
        inp.oninput = () => { sel = 0; render(); };
        inp.onkeydown = e => {
            if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, shown.length - 1); render(); e.preventDefault(); }
            else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); render(); e.preventDefault(); }
            else if (e.key === 'Enter') { go(sel); e.preventDefault(); }
            else if (e.key === 'Escape') { closeModal(); e.preventDefault(); }
            e.stopPropagation();
        };
        lst.onclick = e => { const k = e.target.closest('[data-k]'); if (k) go(+k.dataset.k); };
        render(); inp.focus();
    }

    // ------------------------------------------------------------ queue (resume)
    function saveQueue(list) {
        const rest = list.filter(m => !m.deleted && !m.skip).slice(0, 20000).map(m => ({ id: m.id, c: m.channel_id }));
        if (rest.length) jset(QK, { at: Date.now(), items: rest }); else store.removeItem(QK);
    }
    function refreshQueueBtn() {
        const q = jget(QK, null), b = $('#bQueue');
        if (q && q.items && q.items.length) { b.textContent = tr('resumeQ', { n: q.items.length }); b.classList.remove('hide'); }
        else b.classList.add('hide');
    }

    // ------------------------------------------------------------ delete phase
    async function deletePhase() {
        S.phase = 'delete'; S.delStart = Date.now(); updateStats();
        const list = S.found.filter(m => !m.skip);
        const total = list.length + S.reactions.length;
        let i = 0;
        const wait = () => sleep(S.delay + (S.jitter ? Math.random() * S.delay * 0.4 : 0));
        const after = ok => {
            if (ok) {
                S.failStreak = 0; S.okStreak++;
                if (S.adaptive && S.okStreak >= 15 && S.delay > S.baseDelay) {
                    S.delay = Math.max(S.baseDelay, Math.round(S.delay * 0.9));
                    S.okStreak = 0;
                }
            } else {
                S.okStreak = 0; S.failStreak++;
                if (S.failStreak >= 8) { log('error', t('failStreak', { n: S.failStreak })); S.stop = true; }
            }
        };
        saveQueue(list);
        for (const m of list) {
            if (S.stop) { saveQueue(list); return log('error', t('stopped')); }
            i++;
            log('verb', t('deleting', { i, n: total, p: m.content.slice(0, 70).replace(/\n/g, ' ') || (m.attachments.length ? '[file]' : '') }));
            if (S.overwrite && m.content) {
                const rep = S.overwriteTxt || Math.random().toString(36).slice(2, 10);
                await req('PATCH', `/channels/${m.channel_id}/messages/${m.id}`, { content: rep });
                if (S.stop) { saveQueue(list); return log('error', t('stopped')); }
                await sleep(350);
            }
            const r = await req('DELETE', `/channels/${m.channel_id}/messages/${m.id}`);
            if (r.aborted) { saveQueue(list); return log('error', t('stopped')); }
            if (r.ok || r.status === 404) { S.deleted++; m.deleted = true; after(true); }
            else {
                S.failed++;
                after(false);
                log('error', esc(`HTTP ${r.status}${r.data && r.data.message ? ' - ' + r.data.message : ''}`));
            }
            if (i % 20 === 0) saveQueue(list);
            updateStats();
            await wait();
        }
        for (const rx of S.reactions) {
            if (S.stop) return log('error', t('stopped'));
            i++;
            const r = await req('DELETE', `/channels/${rx.channel_id}/messages/${rx.id}/reactions/${encodeURIComponent(rx.key)}/@me`);
            if (r.aborted) return log('error', t('stopped'));
            if (r.ok || r.status === 404) { S.rxRemoved++; after(true); } else { S.failed++; after(false); }
            updateStats();
            await wait();
        }
        saveQueue(list);
        S.phase = 'done';
        log('success', t('done', { d: S.deleted, rx: S.rxRemoved, f: S.failed, r: S.throttled, t: fmtDur(Date.now() - S.startedAt) }));
        farewell(list);
        if (S.fx && !S.silent) confetti();
        if (S.beepOn && !S.silent) beep();
    }

    async function pipeline() {
        log('info', t('resolving'));
        S.phase = 'scan'; updateStats();
        if (S.fast && S.scope === 'guild') {
            const gid = getGuildId();
            if (!gid) return log('error', t('noGuild'));
            const list = await fetchChannelList('guild');
            if (S.stop) return log('error', t('stopped'));
            log('info', t('scanG'));
            if (!(await scanSearch({ id: gid, name: 'guild' }, true, new Map(list.map(c => [c.id, c.name])), gid))) return log('error', t('stopped'));
        } else {
            const chs = await resolveChannels();
            if (S.stop) return log('error', t('stopped'));
            if (!chs.length) return log('error', t('noScope'));
            log('info', t('resolved', { n: chs.length }));
            for (const ch of chs) {
                if (S.stop) return log('error', t('stopped'));
                log('info', t('scanning', { name: ch.name }));
                if (!(S.fast ? await scanSearch(ch, false, null, null) : await scanChannel(ch))) return log('error', t('stopped'));
            }
        }
        applyKeepLast();
        applyDup();
        applyRandom();
        applyCap();
        const total = S.found.length + S.reactions.length;
        log('info', t('summary', { s: S.scanned, f: S.found.length, r: S.reactions.length }));
        if (!total) { S.phase = 'idle'; return log('success', t('nothing')); }
        if (S.dryRun) { S.phase = 'idle'; return log('success', t('dryDone')); }
        if (S.backup && S.found.length) {
            dlJson(`discord-backup-${Date.now()}.json`, { exportedAt: new Date().toISOString(), items: S.found });
            log('success', t('backupSaved', { n: S.found.length }));
        }
        if (!S.silent) {
            updateStats();
            if (!(await reviewModalAsk($('#review').checked))) { S.phase = 'idle'; return log('error', t('aborted')); }
        }
        if (S.countdown && !S.silent) {
            for (let n = 5; n > 0; n--) {
                log('warn', t('cdTick', { n }));
                await sleep(1000);
                if (S.stop) return log('error', t('cdCancel'));
            }
        }
        await deletePhase();
    }

    async function run(opts = {}) {
        if (S.running) return log('warn', t('running'));
        S.running = true; S.stop = false; S.paused = false; S.silent = !!opts.silent;
        setRunUi(true);
        try {
            S.startedAt = Date.now();
            if (!(await ensureAccount())) return;
            readOptions(opts);
            saveSettings();
            await pipeline();
        } catch (e) {
            log('error', esc(e && e.stack ? e.stack : e));
        } finally {
            S.running = false;
            if (S.phase !== 'done') S.phase = 'idle';
            setRunUi(false);
            updateStats();
            refreshQueueBtn();
        }
    }

    async function resumeQueue() {
        if (S.running) return log('warn', t('running'));
        const q = jget(QK, null);
        if (!q || !q.items || !q.items.length) return refreshQueueBtn();
        S.running = true; S.stop = false; S.paused = false; S.silent = false;
        setRunUi(true);
        try {
            S.startedAt = Date.now();
            if (!(await ensureAccount())) return;
            readOptions();
            S.found = q.items.map(x => ({
                id: x.id,
                channel_id: x.c,
                channel: '#' + x.c,
                timestamp: new Date(Number((BigInt(x.id) >> 22n) + EPOCH)).toISOString(),
                content: '',
                attachments: [],
                deleted: false,
                skip: false,
            }));
            log('info', t('resumedQ', { n: S.found.length }));
            if (!(await reviewModalAsk(false))) { log('error', t('aborted')); return; }
            await deletePhase();
        } catch (e) {
            log('error', esc(e && e.stack ? e.stack : e));
        } finally {
            S.running = false;
            if (S.phase !== 'done') S.phase = 'idle';
            setRunUi(false);
            updateStats();
            refreshQueueBtn();
        }
    }

    // ------------------------------------------------------------ auto clean
    function refreshAutoState() {
        $('#autoSt').textContent = S.auto ? tr('autoState', { h: S.auto.h, d: S.auto.d, n: new Date(S.auto.next).toLocaleTimeString() }) : '';
        $('#bAuto').textContent = tr(S.auto ? 'autoOff' : 'autoOn');
    }
    function autoStop() { clearTimeout(S.autoTimer); S.auto = null; refreshAutoState(); }
    function autoSchedule() {
        if (!S.auto) return;
        S.auto.next = Date.now() + S.auto.h * 3.6e6;
        refreshAutoState();
        S.autoTimer = setTimeout(async () => {
            if (!S.auto) return;
            if (!S.running) {
                log('info', t('autoRun'));
                await run({ silent: true, olderMs: S.auto.d * 864e5 });
            }
            autoSchedule();
        }, S.auto.h * 3.6e6);
    }
    $('#bAuto').onclick = () => {
        if (S.auto) return autoStop();
        if (S.modalLock) return toast(tr('modalBusy'));
        if (S.scope === 'dms' || (S.scope === 'cur' && !urlIds()) || (S.scope === 'guild' && !getGuildId())) {
            log('warn', t('autoNeedScope'));
            $('[data-t=logt]').click();
            return;
        }
        const h = Math.max(1, parseInt($('#autoH').value, 10) || 6);
        const d = Math.max(0, parseInt($('#autoD').value, 10) || 0);
        openModal(`<h3>${esc(tr('auto'))}</h3><div class="note">${esc(tr('autoConfirm', { h, d }))}</div><input type="text" id="auI" autocomplete="off">
          <div class="mbtn"><button id="auX">${esc(tr('cancel'))}</button><button class="dan" id="auO" disabled>OK</button></div>`, { lock: true });
        mb.querySelector('#auI').oninput = e => { mb.querySelector('#auO').disabled = e.target.value.trim() !== 'AUTO'; };
        mb.querySelector('#auX').onclick = () => closeModal(false);
        mb.querySelector('#auO').onclick = () => {
            closeModal(true);
            if (S.scope === 'cur') { const u = urlIds(); if (u) { $('#idsIn').value = u.c; setScope('ids'); } }
            S.auto = { h, d, next: 0 };
            autoSchedule();
        };
    };

    // ------------------------------------------------------------ settings persistence & export/import
    const FILTER_IDS = ['content', 'regex', 'exclude', 'keepLast', 'keepTerms', 'keepReact', 'minLen', 'maxLen', 'minDate', 'maxDate', 'hasLink', 'hasFile', 'hasEmbed', 'onlyReply', 'pinned', 'preset', 'randPct', 'regretWords', 'dupMin', 'maxDel'];
    const SAVE_IDS = ['idsIn', 'guildIn', 'fast', 'dry', 'rx', 'review', ...FILTER_IDS, 'countdown', 'fx', 'delay', 'jitter', 'adaptive', 'backup', 'beepOn', 'overwrite', 'overwriteTxt', 'autoH', 'autoD'];

    function collectSettings() {
        const o = { _scope: S.scope, _lang: LANG, _older: S.olderMs };
        SAVE_IDS.forEach(id => { const e = $('#' + id); o[id] = e.type === 'checkbox' ? e.checked : e.value; });
        return o;
    }
    function applySettingsObj(o) {
        if (!o || typeof o !== 'object') return;
        SAVE_IDS.forEach(id => {
            if (!(id in o)) return;
            const e = $('#' + id);
            if (e.type === 'checkbox') e.checked = !!o[id];
            else e.value = o[id];
        });
        if (o._lang && I[o._lang]) LANG = o._lang;
        if (o._older != null) setOlder(o._older);
        if (o._scope) setScope(o._scope);
        $('#overwriteTxt').classList.toggle('hide', !$('#overwrite').checked);
        syncSpeedChips();
    }
    function saveSettings() { jset(SK, collectSettings()); }
    function loadSettings() {
        let o = jget(SK, null);
        if (!o) {
            for (const k of LEGACY_SKS) { o = jget(k, null); if (o) break; }
        }
        applySettingsObj(o);
    }
    function setOlder(ms) {
        S.olderMs = ms;
        $$('#olderChips button').forEach(b => b.classList.toggle('on', +b.dataset.ms === ms));
    }
    function syncSpeedChips() {
        const v = parseInt($('#delay').value, 10);
        $$('#speedPresets button').forEach(b => b.classList.toggle('on', +b.dataset.ms === v));
    }

    // ------------------------------------------------------------ wiring
    $$('#tabs button').forEach(b => {
        b.onclick = () => {
            $$('#tabs button').forEach(x => x.classList.toggle('on', x === b));
            $$('.tab').forEach(x => x.classList.toggle('on', x.id === 't_' + b.dataset.t));
        };
    });
    $$('#seg button').forEach(b => { b.onclick = () => { setScope(b.dataset.s); saveSettings(); }; });
    $$('#olderChips button').forEach(b => { b.onclick = () => { setOlder(+b.dataset.ms); saveSettings(); }; });
    $$('#speedPresets button').forEach(b => {
        b.onclick = () => {
            $('#delay').value = b.dataset.ms;
            syncSpeedChips();
            saveSettings();
        };
    });
    $('#delay').oninput = syncSpeedChips;
    $('#overwrite').onchange = () => { $('#overwriteTxt').classList.toggle('hide', !$('#overwrite').checked); };

    function resetFilters() {
        FILTER_IDS.forEach(id => {
            const e = $('#' + id);
            if (e.type === 'checkbox') e.checked = false;
            else e.value = '';
        });
        updateFilterBadge();
        saveSettings();
    }
    $$('#quickScenarios button').forEach(b => {
        b.onclick = () => {
            resetFilters();
            const q = b.dataset.q;
            if (q === 'night') $('#preset').value = 'night';
            else if (q === 'pii') $('#preset').value = 'pii';
            else if (q === 'media') { $('#hasLink').checked = true; $('#hasFile').checked = true; }
            updateFilterBadge();
            saveSettings();
            toast(b.textContent);
        };
    });

    $('#cfgExp').onclick = () => dlJson(`dmc-settings-${Date.now()}.json`, collectSettings());
    $('#cfgImp').onclick = () => $('#cfgFile').click();
    $('#cfgFile').onchange = async e => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        try {
            const obj = JSON.parse(await f.text());
            applySettingsObj(obj);
            applyLang();
            updateFilterBadge();
            saveSettings();
            toast(tr('cfgLoaded'));
        } catch (err) { toast(tr('cfgBad')); }
        e.target.value = '';
    };

    $('#bStart').onclick = () => { S.phase = 'idle'; run(); };
    $('#bStop').onclick = () => { S.stop = true; S.paused = false; };
    $('#bPause').onclick = () => {
        S.paused = !S.paused;
        $('#bPause').textContent = tr(S.paused ? 'resume' : 'pause');
        log('warn', t(S.paused ? 'paused' : 'resumed'));
    };
    $('#bQueue').onclick = resumeQueue;
    $('#bClear').onclick = () => { logEl.innerHTML = ''; S.warnCount = 0; updateLogBadge(); };
    $('#bCopyLog').onclick = async () => {
        const txt = $$('#log div').map(d => d.textContent).join('\n');
        try { await navigator.clipboard.writeText(txt); toast(tr('logCopied')); } catch (e) { /* ignore */ }
    };
    $('#bResetF').onclick = () => { resetFilters(); toast(tr('fResetOk')); };
    $('#bPal').onclick = palette;
    $('#bLang').onclick = () => { LANG = LANG === 'tr' ? 'en' : 'tr'; applyLang(); saveSettings(); };
    root.addEventListener('change', e => {
        if (e.target.closest && e.target.closest('#body') && !e.target.closest('#mb')) {
            updateFilterBadge();
            saveSettings();
        }
    });
    root.addEventListener('input', e => {
        if (e.target.closest && e.target.closest('#t_filter')) updateFilterBadge();
    });

    // minimize / pill
    const panel = $('#panel'), pill = $('#pill');
    const minimize = on => { panel.style.display = on ? 'none' : 'flex'; pill.style.display = on ? 'inline-flex' : 'none'; };
    $('#bMin').onclick = () => minimize(true);
    pill.onclick = () => minimize(false);

    // drag
    (() => {
        let ox = 0, oy = 0, drag = false;
        const move = e => {
            if (!drag) return;
            host.style.left = Math.max(0, Math.min(innerWidth - 80, e.clientX - ox)) + 'px';
            host.style.top = Math.max(0, Math.min(innerHeight - 44, e.clientY - oy)) + 'px';
            host.style.right = 'auto'; host.style.bottom = 'auto';
        };
        $('#hd').addEventListener('mousedown', e => {
            if (e.target.closest('button')) return;
            const r = host.getBoundingClientRect();
            ox = e.clientX - r.left; oy = e.clientY - r.top;
            drag = true;
            e.preventDefault();
        });
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', () => { drag = false; });
    })();

    // position, size (persisted), size presets, theme
    (() => {
        const sz = jget('dmc5_size', null);
        if (sz && sz.w && sz.h) {
            panel.style.width = Math.min(sz.w, innerWidth - 20) + 'px';
            panel.style.height = Math.min(sz.h, innerHeight - 20) + 'px';
        }
        const place = () => {
            const r = host.getBoundingClientRect();
            host.style.left = Math.max(0, Math.min(innerWidth - 80, r.left)) + 'px';
            host.style.top = Math.max(0, Math.min(innerHeight - 50, r.top)) + 'px';
            host.style.right = 'auto'; host.style.bottom = 'auto';
        };
        place();
        window.addEventListener('resize', place);
        new ResizeObserver(() => {
            if (panel.style.display === 'none') return;
            const r = panel.getBoundingClientRect();
            if (r.width > 100) jset('dmc5_size', { w: Math.round(r.width), h: Math.round(r.height) });
        }).observe(panel);
        const sizes = [[400, 560], [476, 700], [650, 830]];
        $('#bSize').onclick = () => {
            const r = panel.getBoundingClientRect();
            const i = sizes.findIndex(([w]) => Math.abs(w - r.width) < 28);
            const [w, h] = sizes[(i + 1) % sizes.length];
            panel.style.width = Math.min(w, innerWidth - 20) + 'px';
            panel.style.height = Math.min(h, innerHeight - 20) + 'px';
            place();
        };
        if (jget('dmc5_theme', 'dark') === 'light') host.classList.add('light');
        $('#bTheme').onclick = () => {
            host.classList.toggle('light');
            jset('dmc5_theme', host.classList.contains('light') ? 'light' : 'dark');
        };
    })();

    // prevent Discord global keydown/keypress hijacking while typing inside Cleaner inputs
    ["keydown", "keypress", "keyup"].forEach(ev => {
        root.addEventListener(ev, e => {
            if (e.altKey) return;
            if (e.key === "Escape" && modal.classList.contains("on")) return;
            e.stopPropagation();
        });
    });

    // hotkeys: Alt+C show/hide, Alt+K palette, Alt+X stop, Escape close modal
    window.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modal.classList.contains('on')) { closeModal(false); e.preventDefault(); return; }
        if (!e.altKey) return;
        const k = e.key.toLowerCase();
        if (k === 'c') { host.style.display = host.style.display === 'none' ? '' : 'none'; e.preventDefault(); }
        if (k === 'k') { palette(); e.preventDefault(); }
        if (k === 'x' && S.running) { S.stop = true; S.paused = false; e.preventDefault(); }
    });

    setScope('cur');
    loadSettings();
    applyLang();
    updateFilterBadge();
    setAcct('idle');
    (async () => {
        const f = await findValidToken(4000);
        if (f && !S.user) { S.token = f.token; S.user = f.user; S.authorId = f.user.id; setAcct(); }
    })();

    return 'Discord Message Cleaner v7.0 hazır (Alt+C: göster/gizle, Alt+K: komut paleti, Alt+X: durdur)';
})();
