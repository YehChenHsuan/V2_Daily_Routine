# ESL V2 Daily Routine ⏰ 晨間作息時鐘大冒險

> **教材依據**：ESL Lesson 2 (課本 Page 04-05 單字認讀與 Page 06-07 句型會話)  
> **技術特色**：純前端靜態網頁、2.5D 擬物化大鬧鐘介面、左右各 3 槽位作息卡、Google MediaPipe Hands AI 食指尖隔空體感操作、時間軸推進、作息圖文配對、課文句型文字積木組合（Sentence Builder）。

---

## 遊戲簡介與核心亮點

1. **2.5D 擬物化大鬧鐘**：
   - 具有金屬光澤雙鈴鐺、液晶數字時間顯示螢幕（如 `07:00 AM`）、任務中文說明與發音播放鈕。
   - 鬧鐘指針與液晶時間依據一日晨間作息時間軸循序推進。

2. **左右 6 卡人體工學佈局**：
   - 左側 3 卡、右側 3 卡，完美配合玩家站在視訊鏡頭前的雙手伸展視野。
   - 支援 3D 透視微傾斜效果與懸停光暈。

3. **AI 影像指尖隔空操作**：
   - 透過 Google MediaPipe Hands 辨識食指尖座標。
   - 具備水平鏡像校正、360 度指尖懸停蓄力圈（0.6 秒填滿選取）、星芒粒子拖尾與防連擊冷卻。
   - 同時支援滑鼠游標與平板觸控 100% 降級相容。

4. **句型文字積木組合（Sentence Builder - 參考 V2 06-07 頁）**：
   - 配對成功後展開立體積木操作盤。
   - 依序拼裝完整句型（如 `I wake up.`、`I wash my face.`、`You take the bus.`）。
   - 拼裝完成後播放道地英文朗讀。

---

## 檔案結構

```
V2_Daily_Routine/
├── index.html                  # 遊戲主要 DOM 結構與視圖
├── style.css                   # 2.5D 擬物化與立體透視樣式表
├── game.js                     # 狀態機、時間軸與關卡數據
├── hand_tracker.js             # MediaPipe 手勢辨識與動態差分感應
├── sound.js                    # Web Audio 音效與語音朗讀合成模組
├── thumbnail.png               # 平台標準 600x375 縮圖 (<150KB)
├── thumbnail.webp              # 輕量化 WebP 縮圖 (<30KB)
├── assets/                     # 鬧鐘與角色高畫質 2.5D 圖素
├── V2_flashcards_images/       # 教材單字卡圖檔
└── V2_flashcards_audios/       # 教材中英文真人發音檔
```

---

## 授權與宣告
本遊戲為 ESL 兒童英語教學數位輔助教材，圖片素材與語音由教材與 AI 輔助生成。
