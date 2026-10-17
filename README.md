# Discord Message Cleaner

> Kendi Discord mesajlarını ve tepkilerini tarayıcıdan, kurulum gerektirmeden toplu sil.
> Delete your own Discord messages and reactions in bulk, straight from the browser. No install needed.

**[Türkçe](#türkçe) · [English](#english)**

> ⚠️ **Uyarı / Warning**
> Kullanıcı hesabını otomatikleştirmek Discord Hizmet Şartları'na aykırıdır. Hesabın kısıtlanabilir. Sorumluluk sana aittir. Silinen mesajlar geri alınamaz.
> Automating a user account violates Discord's Terms of Service and may get your account restricted. Use at your own risk. Deleted messages cannot be recovered.

---

## Türkçe

### Nedir?

Tek dosyalık bir tarayıcı betiği. Discord'u masaüstü tarayıcıda açıp Console'a yapıştırırsın, karşına bir kontrol paneli çıkar. Panelden **sadece kendi** mesajlarını ve istersen tepkilerini silersin.

### Neden v3?

Discord'un `/messages/search` uç noktası sık sık `total_results > 0` ama boş sayfa döndürüyor, bu yüzden eski betikler hemen duruyordu. Bu sürüm aramayı kullanmaz, kanal geçmişini doğrudan sayfa sayfa tarar.

### Özellikler

- **Doğrulanmış token:** Token kullanılmadan önce `/users/@me` ile test edilir. Geçersizse localStorage, webpack ve ağ isteklerinden bulunan adaylar tek tek denenir. 401 hatası net bir mesajla işlemi durdurur.
- **Otomatik Yazar ID:** Token'ın sahibinden alınır, elle yanlış girilirse uyarır.
- **Kapsam:** Seçili kanallar, tüm DM'ler veya bir sunucunun tüm kanalları.
- **Filtreler:** Tarih aralığı, "şundan eski (gün)", mesaj ID aralığı, metin içeriği, sadece link, sadece dosya, sabitlenenleri dahil et.
- **Tepkiler:** İstersen kendi tepkilerini de kaldırır.
- **Güvenlik:** Deneme modu (hiçbir şey silmez), silmeden önce JSON yedeği, uygulama içi onay penceresi ve önizleme. 500 ve üzeri öğede `DELETE` yazman gerekir.
- **Rate limit dostu:** 429 yanıtında bekler ve silme aralığını kendisi artırır. 5xx ve ağ hatalarında yeniden dener. Rastgele sapma eklenebilir.
- **Kontrol:** Başlat, duraklat, devam et, durdur. Canlı istatistikler, kalan süre ve ilerleme çubuğu.
- **Gizlilik modu:** Ekran görüntüsü için ID ve içerikleri bulanıklaştırır.
- **Dil:** Türkçe ve İngilizce, tarayıcı diline göre otomatik seçilir.
- **Kolaylıklar:** Kanal alanına link yapıştırabilirsin, JSON dışa aktarma ve zaman damgalı log vardır.

### Kullanım

1. [`[discord-message-cleaner-v3.js`](https://github.com/mymarius/Discord-Message-Cleaner/blob/main/discord%20message%20cleaner.js)] dosyasının içeriğini kopyala.
2. Discord'u **masaüstü tarayıcıda** aç: `https://discord.com/app`. Temizlemek istediğin kanala gir.
3. `F12` ile Developer Tools'u aç ve **Console** sekmesine geç.
4. Kodu yapıştırıp `Enter`'a bas. Açılan popup için **popup iznini ver**.
5. Token alanını boş bırakıp **Bul**'a tıkla. "Geçerli: kullanıcıadı" etiketi görünmeli.
6. Kapsamı ve filtreleri seç. İlk seferde **Deneme modu**nu açıp tara.
7. Sonuçtan memnunsan Deneme modunu kapat, **Başlat**'a bas ve onay penceresinde önizlemeyi kontrol et.

> Resmî Discord masaüstü uygulamasında DevTools kapalı olabilir. Tarayıcı sürümünü kullan.

### Sık karşılaşılan sorunlar

| Sorun | Çözüm |
|---|---|
| `401 Unauthorized` | Token geçersiz. Sayfayı yenile, bir kanala tıkla, **Bul**'a bas. Olmazsa token'ı elle yapıştır. |
| Taranan çok, bulunan 0 | Yanlış kanal olabilir ya da filtreler çok dar. Tarih ve metin filtrelerini kontrol et. |
| Popup açılmıyor | Tarayıcıda `discord.com` için popup iznini aç. |
| Çok yavaş | Rate limit'i tetiklememek için bilerek yavaş. Silme aralığı en az 300 ms'dir. Düşürmek hesabını riske atar. |
| Arşivlenmiş thread'ler | Sunucu kapsamı thread'leri listelemez. Thread ID'sini "Kanallar" kapsamında elle gir. |

### Gizlilik

- Token'ın yalnızca tarayıcı sekmende, `discord.com` API'sine yapılan isteklerde kullanılır. Hiçbir üçüncü taraf sunucuya gönderilmez.
- Token'ını **asla** kimseyle paylaşma ve ekran görüntüsünde gösterme. Gizlilik modunu açık tut.
- Betik yalnızca kendi mesajlarını siler. Başkalarının mesajlarına dokunmaz.

### Katkı

Hata bildirimleri ve pull request'ler açıktır. Lütfen sorun açarken token, kullanıcı ID'si ya da kanal ID'si paylaşma.

### Lisans ve emeği geçenler

[MIT](./LICENSE). Fikir olarak [victornpb/deleteDiscordMessages]([https://github.com/mymarius/Discord-Message-Cleaner](https://github.com/mymarius/Discord-Message-Cleaner)) (MIT) projesinden esinlenilmiştir. Kod bağımsız olarak yeniden yazılmıştır. Discord ile bağlantısı yoktur.

---

## English

### What is it?

A single-file browser script. Paste it into the Discord web app's console and a control panel opens. Use it to delete **only your own** messages and, optionally, your reactions.

### Why v3?

Discord's `/messages/search` endpoint often reports `total_results > 0` yet returns an empty page, which made older scripts stop immediately. This version skips search and walks the channel history page by page.

### Features

- **Validated token:** The token is tested against `/users/@me` before use. If it is invalid, candidates from localStorage, webpack and network requests are tried one by one. A 401 stops the run with a clear message.
- **Automatic Author ID:** Taken from the token owner, with a warning if a wrong ID is entered.
- **Scope:** Selected channels, all DMs, or every channel of a server.
- **Filters:** Date range, older than N days, message ID range, text contains, only links, only files, include pinned.
- **Reactions:** Optionally removes your own reactions too.
- **Safety:** Dry run (deletes nothing), JSON backup before deleting, in-app confirmation with preview. Type `DELETE` for 500 or more items.
- **Rate-limit friendly:** Waits on 429 and raises the delay automatically. Retries on 5xx and network errors. Optional random jitter.
- **Control:** Start, pause, resume, stop. Live stats, time left and a progress bar.
- **Privacy mode:** Blurs IDs and content for screenshots.
- **Languages:** Turkish and English, picked from the browser language.
- **Extras:** Paste channel links into the channel field, JSON export, timestamped log.

### Usage

1. Copy the contents of [`discord-message-cleaner-v3.js`](./discord-message-cleaner-v3.js).
2. Open Discord in a **desktop browser**: `https://discord.com/app`, and go to the channel you want to clean.
3. Press `F12` to open Developer Tools and switch to **Console**.
4. Paste the code and press `Enter`. **Allow the popup** when asked.
5. Leave the token field empty and click **Find**. You should see "Valid: username".
6. Pick the scope and filters. On the first run, enable **Dry run** and scan.
7. If the results look right, disable Dry run, press **Start** and check the preview in the confirmation dialog.

> DevTools may be disabled in the official Discord desktop app. Use the browser version.

### Troubleshooting

| Problem | Fix |
|---|---|
| `401 Unauthorized` | The token is invalid. Refresh, click a channel, press **Find**. Otherwise paste the token manually. |
| Many scanned, 0 found | Wrong channel, or filters too narrow. Check date and text filters. |
| Popup does not open | Allow popups for `discord.com` in your browser. |
| Very slow | Slow on purpose to avoid rate limits. The minimum delay is 300 ms. Lowering it puts your account at risk. |
| Archived threads | Server scope does not list threads. Enter the thread ID manually in the "Channels" scope. |

### Privacy

- Your token is only used inside your browser tab for requests to the `discord.com` API. It is never sent to any third-party server.
- **Never** share your token or show it in screenshots. Keep privacy mode on.
- The script only deletes your own messages. It does not touch other people's messages.

### Contributing

Bug reports and pull requests are welcome. Please do not post tokens, user IDs or channel IDs in issues.

### License and credits

[MIT](./LICENSE). Inspired by [victornpb/deleteDiscordMessages](https://github.com/victornpb/deleteDiscordMessages) (MIT). The code is an independent rewrite. Not affiliated with Discord.

---

### Repo ayarları / Repo settings

**Description:** `Kendi Discord mesajlarını toplu sil: doğrulanmış token, filtreler, deneme modu, yedek ve şık panel. / Bulk-delete your own Discord messages from the browser.`

**Topics:** `discord`, `message-cleaner`, `bulk-delete`, `userscript`, `browser-script`, `javascript`, `privacy`, `turkish`
