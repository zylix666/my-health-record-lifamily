# 手機離線安裝驗收

這個 app 是 PWA。手機要真正離線使用，第一次安裝必須透過 HTTPS 網址完成，因為 service worker 只能在 secure origin 註冊。

`http://192.168.x.x:4173` 只能做手機畫面與功能測試，不能做離線安裝驗收。

## 最簡單驗收方式：部署 dist 到 HTTPS

1. 在電腦建置：

   ```powershell
   npm.cmd run build
   ```

2. 把 `dist` 資料夾部署到任何 HTTPS 靜態網站服務。

   可用服務：

   - Cloudflare Pages
   - Netlify
   - Vercel
   - GitHub Pages

3. 用手機 Chrome 開啟 HTTPS 網址，例如：

   ```text
   https://your-health-record.pages.dev
   ```

4. 進入 app 的「設定」，確認「離線狀態」顯示：

   ```text
   安全來源：是
   瀏覽器支援：是
   快取服務：已啟用
   ```

5. 在 Chrome 選單選「安裝應用程式」或「加入主畫面」。

6. 安裝後先從主畫面打開一次，等畫面完整載入。

7. 開啟手機飛航模式。

8. 再從主畫面打開「健康紀錄」。

驗收成功時，即使沒有網路，app 仍會打開，既有資料也會從手機瀏覽器的 IndexedDB 讀出。

## 不要用這個方式驗收離線

```powershell
npm.cmd run preview -- --host 192.168.x.x
```

手機可以連上這個網址，也可能可以加入主畫面，但它是 HTTP LAN 位址。Chrome 不會讓 service worker 接管，因此電腦伺服器一停，手機捷徑就會失效。

## 如果一定要在區網本機測 HTTPS

可以，但手機必須信任本機 HTTPS 憑證。流程通常是：

1. 用 mkcert 或其他工具建立本機憑證。
2. 把 root CA 安裝到手機並設定信任。
3. 用 HTTPS server 服務 `dist`。
4. 手機打開 `https://192.168.x.x`。
5. 確認設定頁的「離線狀態」三項都是可用。

這條路比較麻煩；正式測 MVP 建議直接部署到 HTTPS 靜態網站。
