/**
 * game.js - ESL V2 Daily Routine 核心遊戲邏輯與狀態機
 * 包含：
 * 1. 一日晨間時間軸 (07:00 ~ 08:30) 闖關速度挑戰 (Speedrun Timer)
 * 2. 移除血值，看誰最快完成任務，登錄排行榜 (LocalStorage)
 * 3. 鬧鐘出題 (中文任務 TTS 發音完全一致) 與左右 6 卡 3D 配對
 * 4. 句型文字積木組合 (Sentence Builder - 排序由上而下：選項 -> 空格 -> 工具列/提示按鈕/重排)
 * 5. 全面支援手勢指尖辨識懸停 (重排按鈕、提示按鈕、聽發音按鈕、單字積木、配對卡片)
 */

// 8 大核心日常作息題庫 (對應課本 V2_04-05 & V2_06-07)
const ROUTINE_DATA = [
  {
    id: 'wake_up',
    timeStr: '07:00 AM',
    hourDeg: 210,
    minDeg: 0,
    zhTask: '早晨起床了！伸個大懶腰',
    enText: 'wake up',
    audioWord: 'wake up',
    image: 'V2_flashcards_images/V2_wake up.webp',
    sentenceTarget: 'I wake up.',
    sentenceBlocks: ['I', 'wake', 'up.'],
    distractors: ['You', 'eat']
  },
  {
    id: 'wash_face',
    timeStr: '07:15 AM',
    hourDeg: 217.5,
    minDeg: 90,
    zhTask: '走進浴室，洗洗臉更清醒！',
    enText: 'wash your face',
    audioWord: 'wash',
    image: 'V2_flashcards_images/V2_wash.webp',
    sentenceTarget: 'I wash my face.',
    sentenceBlocks: ['I', 'wash', 'my', 'face.'],
    distractors: ['teeth', 'comb']
  },
  {
    id: 'brush_teeth',
    timeStr: '07:25 AM',
    hourDeg: 222.5,
    minDeg: 150,
    zhTask: '擠上牙膏，上上下下刷刷牙！',
    enText: 'brush your teeth',
    audioWord: 'brush',
    image: 'V2_flashcards_images/V2_brush.webp',
    sentenceTarget: 'I brush my teeth.',
    sentenceBlocks: ['I', 'brush', 'my', 'teeth.'],
    distractors: ['your', 'face']
  },
  {
    id: 'take_shower',
    timeStr: '07:35 AM',
    hourDeg: 227.5,
    minDeg: 210,
    zhTask: '沖個舒服的溫水澡，神清氣爽！',
    enText: 'take a shower',
    audioWord: 'shower',
    image: 'V2_flashcards_images/V2_shower.webp',
    sentenceTarget: 'I take a shower.',
    sentenceBlocks: ['I', 'take', 'a', 'shower.'],
    distractors: ['the', 'bus']
  },
  {
    id: 'eat_breakfast',
    timeStr: '07:50 AM',
    hourDeg: 235,
    minDeg: 300,
    zhTask: '坐在餐桌前，享用美味早餐！',
    enText: 'eat breakfast',
    audioWord: 'breakfast',
    image: 'V2_flashcards_images/V2_breakfast.webp',
    sentenceTarget: 'You eat your breakfast.',
    sentenceBlocks: ['You', 'eat', 'your', 'breakfast.'],
    distractors: ['I', 'dinner']
  },
  {
    id: 'comb_hair',
    timeStr: '08:05 AM',
    hourDeg: 242.5,
    minDeg: 30,
    zhTask: '站在鏡子前，把頭髮梳得整整齊齊！',
    enText: 'comb your hair',
    audioWord: 'comb',
    image: 'V2_flashcards_images/V2_comb.webp',
    sentenceTarget: 'You comb your hair.',
    sentenceBlocks: ['You', 'comb', 'your', 'hair.'],
    distractors: ['teeth', 'brush']
  },
  {
    id: 'take_bus',
    timeStr: '08:15 AM',
    hourDeg: 247.5,
    minDeg: 90,
    zhTask: '校車來了！跟同伴一起搭公車！',
    enText: 'take the bus',
    audioWord: 'take',
    image: 'V2_flashcards_images/V2_bus.webp',
    sentenceTarget: 'You take the bus.',
    sentenceBlocks: ['You', 'take', 'the', 'bus.'],
    distractors: ['school', 'go']
  },
  {
    id: 'go_school',
    timeStr: '08:30 AM',
    hourDeg: 255,
    minDeg: 180,
    zhTask: '抵達學校大門，開始快樂的一天！',
    enText: 'go to school',
    audioWord: 'school',
    image: 'V2_flashcards_images/V2_school.webp',
    sentenceTarget: 'You go to school.',
    sentenceBlocks: ['You', 'go', 'to', 'school.'],
    distractors: ['home', 'the']
  }
];

class DailyRoutineGame {
  constructor() {
    this.state = 'LANDING'; // LANDING, MATCHING, SENTENCE_BUILDING, VICTORY
    this.currentLevelIndex = 0;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.controlMode = 'hand'; // 'hand' or 'mouse'

    // 計時器 (Speedrun Stopwatch)
    this.startTime = 0;
    this.elapsedMs = 0;
    this.timerInterval = null;

    // 句型拼字暫存
    this.currentSentenceWords = [];
    this.selectedWords = [];

    // DOM 節點
    this.landingScreen = document.getElementById('landing-screen');
    this.gameStage = document.getElementById('game-stage');
    this.victoryModal = document.getElementById('victory-modal');
    this.leaderboardModal = document.getElementById('leaderboard-modal');

    // 鬧鐘元件
    this.alarmClockEl = document.getElementById('alarm-clock');
    this.digitalTimeEl = document.getElementById('digital-time');
    this.taskZhEl = document.getElementById('task-zh-text');
    this.clockAudioBtn = document.getElementById('clock-audio-btn');
    this.hourHand = document.getElementById('clock-hour-hand');
    this.minuteHand = document.getElementById('clock-minute-hand');

    // 6 卡槽
    this.leftCardsContainer = document.getElementById('left-cards-col');
    this.rightCardsContainer = document.getElementById('right-cards-col');

    // 句型拼裝盤 (由上而下：選項池 -> 空格 -> 工具列/提示/重排)
    this.sentencePanel = document.getElementById('sentence-panel');
    this.wordBlocksContainer = document.getElementById('word-blocks');
    this.sentenceSlotsContainer = document.getElementById('sentence-slots');
    this.toggleHintBtn = document.getElementById('toggle-hint-btn');
    this.sentenceTargetHint = document.getElementById('sentence-target-hint');
    this.clearSentenceBtn = document.getElementById('clear-sentence-btn');

    // HUD 節點
    this.hudTimerEl = document.getElementById('hud-timer');
    this.scoreValEl = document.getElementById('hud-score');
    this.comboValEl = document.getElementById('hud-combo');
    this.levelIndicatorEl = document.getElementById('level-indicator');
    this.timelineProgress = document.getElementById('timeline-progress-bar');
    this.statusTipEl = document.getElementById('status-tip');

    // 初始化 HandTracker
    this.tracker = new HandTracker({
      videoElement: document.getElementById('webcam-video'),
      stageElement: this.gameStage,
      cursorCanvas: document.getElementById('cursor-canvas'),
      onTargetSelect: (el) => this.handleInteractiveSelect(el),
      onStatusChange: (msg) => this.updateStatusTip(msg)
    });

    this.bindEvents();
    window.addEventListener('resize', () => {
      this.tracker.resizeCanvas();
    });
  }

  bindEvents() {
    // 首頁按鈕
    document.getElementById('start-hand-btn').addEventListener('click', () => {
      this.startGame('hand');
    });
    document.getElementById('start-mouse-btn').addEventListener('click', () => {
      this.startGame('mouse');
    });
    document.getElementById('landing-leaderboard-btn').addEventListener('click', () => {
      this.openLeaderboardModal();
    });

    // 頂部導航
    document.getElementById('btn-home').addEventListener('click', () => {
      this.returnToHome();
    });
    document.getElementById('btn-sound').addEventListener('click', (e) => {
      const isMuted = window.soundSystem.toggleMute();
      e.currentTarget.textContent = isMuted ? '🔇' : '🔊';
    });
    document.getElementById('btn-camera-toggle').addEventListener('click', () => {
      this.toggleCamera();
    });
    document.getElementById('btn-leaderboard').addEventListener('click', () => {
      this.openLeaderboardModal();
    });
    document.getElementById('btn-fullscreen').addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    // 鬧鐘任務語音播放按鈕 (播放中文任務)
    this.clockAudioBtn.addEventListener('click', () => {
      this.playCurrentLevelAudio();
    });

    // 提示答案按鈕
    if (this.toggleHintBtn) {
      this.toggleHintBtn.addEventListener('click', () => {
        this.toggleHint();
      });
    }

    // 清除句型重選按鈕
    if (this.clearSentenceBtn) {
      this.clearSentenceBtn.addEventListener('click', () => {
        this.resetCurrentSentenceBlocks();
      });
    }

    // 勝利彈窗重玩
    document.getElementById('btn-restart').addEventListener('click', () => {
      this.victoryModal.classList.remove('active');
      this.startGame(this.controlMode);
    });

    // 登錄排行榜按鈕
    document.getElementById('save-record-btn').addEventListener('click', () => {
      this.saveCurrentRecord();
    });

    // 關閉排行榜視窗
    document.getElementById('close-leaderboard-btn').addEventListener('click', () => {
      this.closeLeaderboardModal();
    });
  }

  // 啟動遊戲
  async startGame(mode = 'hand') {
    this.controlMode = mode;
    window.soundSystem.initAudioContext();
    window.soundSystem.startBgm();

    this.landingScreen.classList.remove('active');
    this.gameStage.classList.add('active');
    this.tracker.resizeCanvas();

    if (mode === 'hand') {
      const ok = await this.tracker.initCamera();
      if (!ok) {
        this.updateStatusTip('鏡頭未就緒，已自動切換至滑鼠/觸控模式');
      }
    } else {
      this.tracker.stopCamera();
      this.updateStatusTip('滑鼠 / 觸控模式已啟動');
    }

    this.currentLevelIndex = 0;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.renderHUD();

    // 啟動闖關計時器
    this.startStopwatch();

    this.loadLevel(this.currentLevelIndex);
  }

  // 啟動闖關碼錶計時器
  startStopwatch() {
    this.stopStopwatch();
    this.startTime = Date.now();
    this.elapsedMs = 0;

    this.timerInterval = setInterval(() => {
      this.elapsedMs = Date.now() - this.startTime;
      this.renderTimer();
    }, 100);
  }

  stopStopwatch() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  renderTimer() {
    if (this.hudTimerEl) {
      this.hudTimerEl.textContent = this.formatTime(this.elapsedMs);
    }
  }

  formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${tenths}`;
  }

  // 回到首頁
  returnToHome() {
    this.state = 'LANDING';
    this.stopStopwatch();
    this.tracker.stopCamera();
    this.gameStage.classList.remove('active');
    this.victoryModal.classList.remove('active');
    this.leaderboardModal.classList.remove('active');
    this.landingScreen.classList.add('active');
    window.soundSystem.stopBgm();
  }

  // 切換攝影機
  async toggleCamera() {
    if (this.tracker.cameraReady) {
      this.tracker.stopCamera();
      this.controlMode = 'mouse';
      this.updateStatusTip('已關閉視訊鏡頭（滑鼠/觸控模式）');
    } else {
      this.controlMode = 'hand';
      await this.tracker.initCamera();
    }
  }

  // 載入特定關卡
  loadLevel(index) {
    if (index >= ROUTINE_DATA.length) {
      this.triggerVictory();
      return;
    }

    this.state = 'MATCHING';
    this.currentLevelIndex = index;
    const item = ROUTINE_DATA[index];

    // 更新鬧鐘面板
    this.digitalTimeEl.textContent = item.timeStr;
    this.taskZhEl.textContent = item.zhTask;

    // 動態旋轉指針
    if (this.hourHand) this.hourHand.style.transform = `rotate(${item.hourDeg}deg)`;
    if (this.minuteHand) this.minuteHand.style.transform = `rotate(${item.minDeg}deg)`;

    // 鬧鐘搖晃與鈴聲
    this.alarmClockEl.classList.remove('ring-active');
    void this.alarmClockEl.offsetWidth; // 強制重繪
    this.alarmClockEl.classList.add('ring-active');
    window.soundSystem.playAlarmRing();

    // 隱藏句型面板
    this.sentencePanel.classList.remove('active');

    // 準備 6 個卡片選項（1 正確 + 5 干擾）
    this.renderMatchingCards(item);

    // 更新進度與指示
    this.renderHUD();
    this.updateStatusTip(`【${item.timeStr}】${item.zhTask}！`);

    // 自動使用瀏覽器 TTS 朗讀跟任務一樣的中文文字
    setTimeout(() => {
      this.playCurrentLevelAudio();
    }, 600);
  }

  // 播放任務文字發音 (使用瀏覽器 TTS 發出跟任務一樣的文字)
  playCurrentLevelAudio() {
    const item = ROUTINE_DATA[this.currentLevelIndex];
    if (!item) return;
    this.clockAudioBtn.classList.add('pulsing');
    window.soundSystem.speakTTSZh(item.zhTask, () => {
      this.clockAudioBtn.classList.remove('pulsing');
    });
  }

  // 渲染左右 6 個選項卡片
  renderMatchingCards(currentItem) {
    this.leftCardsContainer.innerHTML = '';
    this.rightCardsContainer.innerHTML = '';

    // 選取 5 個干擾項目
    const otherItems = ROUTINE_DATA.filter(it => it.id !== currentItem.id);
    const shuffledOthers = this.shuffleArray([...otherItems]).slice(0, 5);

    // 合併正確項並打亂
    const candidates = this.shuffleArray([currentItem, ...shuffledOthers]);

    // 分配到左 3 卡、右 3 卡
    candidates.forEach((cand, idx) => {
      const card = document.createElement('div');
      card.className = 'routine-card interactive-target';
      card.dataset.itemId = cand.id;
      card.dataset.isCorrect = cand.id === currentItem.id ? 'true' : 'false';

      card.innerHTML = `
        <div class="card-inner">
          <div class="card-img-wrap">
            <img src="${cand.image}" alt="${cand.enText}" loading="lazy" />
          </div>
          <div class="card-title">${cand.enText}</div>
          <div class="card-badge">${idx + 1}</div>
        </div>
      `;

      // 支援滑鼠/觸控直接點擊
      card.addEventListener('click', () => {
        this.handleInteractiveSelect(card);
      });

      if (idx < 3) {
        this.leftCardsContainer.appendChild(card);
      } else {
        this.rightCardsContainer.appendChild(card);
      }
    });
  }

  // 處理互動選取事件 (手勢指尖懸停或滑鼠點擊)
  handleInteractiveSelect(el) {
    if (!el) return;

    // 1. 重排按鈕 (支援指尖懸停與點擊)
    if (el.id === 'clear-sentence-btn' || el.closest('#clear-sentence-btn')) {
      this.resetCurrentSentenceBlocks();
      window.soundSystem.playTick(true);
      return;
    }

    // 2. 提示答案按鈕 (支援指尖懸停與點擊)
    if (el.id === 'toggle-hint-btn' || el.closest('#toggle-hint-btn')) {
      this.toggleHint();
      return;
    }

    // 3. 鬧鐘聽發音按鈕 (支援指尖懸停與點擊)
    if (el.id === 'clock-audio-btn' || el.closest('#clock-audio-btn')) {
      this.playCurrentLevelAudio();
      return;
    }

    // 4. 空格退回單字 (支援指尖懸停與點擊)
    if (el.classList.contains('sentence-slot')) {
      const idx = parseInt(el.dataset.slotIndex, 10);
      this.unslotWord(idx);
      return;
    }

    // 5. 配對階段卡片選取
    if (this.state === 'MATCHING' && el.classList.contains('routine-card')) {
      this.handleCardMatch(el);
      return;
    }

    // 6. 句型積木單字選取
    if (this.state === 'SENTENCE_BUILDING' && el.classList.contains('word-block')) {
      this.handleWordBlockSelect(el);
      return;
    }

    // 7. 再挑戰一次按鈕
    if (el.id === 'btn-restart' || el.closest('#btn-restart')) {
      this.victoryModal.classList.remove('active');
      this.startGame(this.controlMode);
      return;
    }

    // 8. 登錄排行榜按鈕
    if (el.id === 'save-record-btn' || el.closest('#save-record-btn')) {
      this.saveCurrentRecord();
      return;
    }

    // 9. 關閉排行榜按鈕
    if (el.id === 'close-leaderboard-btn' || el.closest('#close-leaderboard-btn')) {
      this.closeLeaderboardModal();
      return;
    }
  }

  // 驗證卡片配對 (無血值扣除，答錯純提醒繼續嘗試)
  handleCardMatch(cardEl) {
    if (this.state !== 'MATCHING') return;
    const isCorrect = cardEl.dataset.isCorrect === 'true';
    const currentItem = ROUTINE_DATA[this.currentLevelIndex];

    if (isCorrect) {
      // 答對處理
      this.state = 'MATCH_SUCCESS';
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      const gain = 100 + (this.combo - 1) * 20;
      this.score += gain;

      cardEl.classList.add('match-correct');
      window.soundSystem.playSuccessSound();
      window.soundSystem.playWordAudio(currentItem.audioWord);

      this.updateStatusTip(`✨ 太棒了！答對了：${currentItem.enText} (+${gain}分)`);
      this.renderHUD();

      // 暫停所有卡片交互
      document.querySelectorAll('.routine-card').forEach(c => c.classList.add('disabled'));

      // 1 秒後展開句型積木時間
      setTimeout(() => {
        this.startSentenceBuilding(currentItem);
      }, 1000);

    } else {
      // 答錯處理 (無血值！答錯只歸零連擊並鼓勵)
      this.combo = 0;
      cardEl.classList.add('match-wrong');
      window.soundSystem.playWrongSound();

      setTimeout(() => cardEl.classList.remove('match-wrong'), 500);

      this.updateStatusTip(`再試一次喔！找找看【${currentItem.zhTask}】`);
      this.renderHUD();
    }
  }

  // 進入句型積木拼裝階段 (排序：1.選項池 -> 2.空格 -> 3.工具列/提示按鈕/重排)
  startSentenceBuilding(item) {
    this.state = 'SENTENCE_BUILDING';
    this.sentencePanel.classList.add('active');

    this.wordBlocksContainer.innerHTML = '';
    this.sentenceSlotsContainer.innerHTML = '';
    this.selectedWords = [];

    // 設定答案文字並預設隱藏 (不直接劇透答案)
    this.sentenceTargetHint.textContent = item.sentenceTarget;
    this.sentenceTargetHint.classList.add('hidden-hint');
    if (this.toggleHintBtn) this.toggleHintBtn.textContent = '💡 提示答案';

    // 目標單字組
    this.currentSentenceWords = [...item.sentenceBlocks];

    // 1. 最上方：渲染選項單字積木池 (單排不換行)
    const pool = this.shuffleArray([...item.sentenceBlocks, ...item.distractors]);
    pool.forEach((word) => {
      const btn = document.createElement('div');
      btn.className = 'word-block interactive-target';
      btn.dataset.word = word;
      btn.textContent = word;

      btn.addEventListener('click', () => {
        this.handleInteractiveSelect(btn);
      });

      this.wordBlocksContainer.appendChild(btn);
    });

    // 2. 中間：渲染填空格位
    this.currentSentenceWords.forEach((_, idx) => {
      const slot = document.createElement('div');
      slot.className = 'sentence-slot interactive-target';
      slot.dataset.slotIndex = idx;
      slot.innerHTML = `<span class="slot-placeholder">?</span>`;
      slot.addEventListener('click', () => {
        this.unslotWord(idx);
      });
      this.sentenceSlotsContainer.appendChild(slot);
    });

    this.updateStatusTip('請動動手指，由左至右依序點選單字積木！');
  }

  // 切換答案提示顯示/隱藏
  toggleHint() {
    if (!this.sentenceTargetHint) return;
    const isHidden = this.sentenceTargetHint.classList.contains('hidden-hint');
    if (isHidden) {
      this.sentenceTargetHint.classList.remove('hidden-hint');
      if (this.toggleHintBtn) this.toggleHintBtn.textContent = '🙈 隱藏答案';
      window.soundSystem.playTick(false);
    } else {
      this.sentenceTargetHint.classList.add('hidden-hint');
      if (this.toggleHintBtn) this.toggleHintBtn.textContent = '💡 提示答案';
      window.soundSystem.playTick(true);
    }
  }

  // 點選/懸停單字積木
  handleWordBlockSelect(blockEl) {
    if (this.state !== 'SENTENCE_BUILDING') return;
    if (blockEl.classList.contains('used') || blockEl.classList.contains('disabled')) return;

    const word = blockEl.dataset.word;
    const targetLen = this.currentSentenceWords.length;

    if (this.selectedWords.length >= targetLen) return;

    const targetIndex = this.selectedWords.length;
    this.selectedWords.push({ word, element: blockEl });
    blockEl.classList.add('used');

    window.soundSystem.playBlockClick(targetIndex);

    const slot = this.sentenceSlotsContainer.children[targetIndex];
    if (slot) {
      slot.innerHTML = `<span class="filled-word">${word}</span>`;
      slot.classList.add('filled');
    }

    if (this.selectedWords.length === targetLen) {
      this.checkSentenceCompletion();
    }
  }

  // 退回特定空格的單字
  unslotWord(slotIdx) {
    if (this.state !== 'SENTENCE_BUILDING') return;
    if (slotIdx >= this.selectedWords.length) return;

    const item = this.selectedWords[slotIdx];
    if (item && item.element) {
      item.element.classList.remove('used');
    }

    this.selectedWords.splice(slotIdx, 1);
    this.refreshSentenceSlots();
    window.soundSystem.playTick(true);
  }

  refreshSentenceSlots() {
    const slots = this.sentenceSlotsContainer.children;
    for (let i = 0; i < slots.length; i++) {
      if (i < this.selectedWords.length) {
        slots[i].innerHTML = `<span class="filled-word">${this.selectedWords[i].word}</span>`;
        slots[i].classList.add('filled');
      } else {
        slots[i].innerHTML = `<span class="slot-placeholder">?</span>`;
        slots[i].classList.remove('filled');
      }
    }
  }

  // 重設目前句型 (重排)
  resetCurrentSentenceBlocks() {
    this.selectedWords.forEach(it => {
      if (it.element) it.element.classList.remove('used');
    });
    this.selectedWords = [];
    this.refreshSentenceSlots();
  }

  // 驗證完整句型順序
  checkSentenceCompletion() {
    const currentItem = ROUTINE_DATA[this.currentLevelIndex];
    const userSentence = this.selectedWords.map(w => w.word).join(' ');
    const expectedSentence = currentItem.sentenceBlocks.join(' ');

    if (userSentence === expectedSentence) {
      this.state = 'SENTENCE_SUCCESS';
      this.score += 150;
      this.renderHUD();

      this.sentenceSlotsContainer.classList.add('glow-success');
      window.soundSystem.playSuccessSound();

      this.updateStatusTip(`✨ 完美造句：${currentItem.sentenceTarget}`);
      window.soundSystem.speakSentence(currentItem.sentenceTarget, () => {
        setTimeout(() => {
          this.sentenceSlotsContainer.classList.remove('glow-success');
          this.loadLevel(this.currentLevelIndex + 1);
        }, 800);
      });

    } else {
      window.soundSystem.playWrongSound();
      this.sentenceSlotsContainer.classList.add('shake-error');
      this.updateStatusTip('順序不太對喔！點擊空格或重排即可再試');

      setTimeout(() => {
        this.sentenceSlotsContainer.classList.remove('shake-error');
        this.resetCurrentSentenceBlocks();
      }, 1000);
    }
  }

  // 觸發全通關 (結算通關時間與榮譽稱號)
  triggerVictory() {
    this.state = 'VICTORY';
    this.stopStopwatch();
    window.soundSystem.playVictoryFanfare();
    this.sentencePanel.classList.remove('active');

    const finalTimeStr = this.formatTime(this.elapsedMs);
    document.getElementById('final-time').textContent = finalTimeStr;
    document.getElementById('final-score').textContent = this.score;
    document.getElementById('final-combo').textContent = this.maxCombo;

    // 評定稱號
    let title = '準時時間達人 ⏰';
    if (this.elapsedMs < 60000) {
      title = '超光速神童 ⚡';
    } else if (this.elapsedMs < 90000) {
      title = '晨間飛毛腿 🚀';
    }
    document.getElementById('final-rank-title').textContent = title;

    // 渲染結算排行榜
    this.renderLeaderboardTable('victory-leaderboard-list');

    this.victoryModal.classList.add('active');
    this.updateStatusTip(`🎉 恭喜！你以 ${finalTimeStr} 完成一日晨間挑戰！`);
  }

  // 儲存目前紀錄至排行榜
  saveCurrentRecord() {
    const input = document.getElementById('player-name-input');
    let name = input ? input.value.trim() : 'Player';
    if (!name) name = 'Player';

    const records = this.getLeaderboard();
    const newRecord = {
      name: name,
      timeMs: this.elapsedMs,
      timeStr: this.formatTime(this.elapsedMs),
      score: this.score,
      date: new Date().toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })
    };

    records.push(newRecord);
    records.sort((a, b) => a.timeMs - b.timeMs); // 時間最少排在前面

    localStorage.setItem('esl_v2_routine_leaderboard', JSON.stringify(records.slice(0, 10)));
    this.renderLeaderboardTable('victory-leaderboard-list');
    this.renderLeaderboardTable('modal-leaderboard-list');

    const btn = document.getElementById('save-record-btn');
    if (btn) {
      btn.textContent = '✅ 已成功登錄！';
      btn.disabled = true;
    }
    window.soundSystem.playSuccessSound();
  }

  // 取得排行榜資料
  getLeaderboard() {
    try {
      const data = localStorage.getItem('esl_v2_routine_leaderboard');
      if (data) return JSON.parse(data);
    } catch (_) {}

    // 預設示範榜單
    return [
      { name: 'Alex', timeMs: 48500, timeStr: '00:48.5', score: 2200, date: '09/09' },
      { name: 'Emma', timeMs: 58200, timeStr: '00:58.2', score: 2050, date: '09/09' },
      { name: 'Lucas', timeMs: 74100, timeStr: '01:14.1', score: 1850, date: '09/09' },
      { name: 'Sophia', timeMs: 89600, timeStr: '01:29.6', score: 1700, date: '09/09' }
    ];
  }

  // 渲染排行榜表格
  renderLeaderboardTable(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const list = this.getLeaderboard();
    let html = '';

    list.forEach((item, idx) => {
      let rankBadge = `${idx + 1}`;
      let topClass = '';
      if (idx === 0) { rankBadge = '🥇'; topClass = 'top-1'; }
      else if (idx === 1) { rankBadge = '🥈'; topClass = 'top-2'; }
      else if (idx === 2) { rankBadge = '🥉'; topClass = 'top-3'; }

      html += `
        <div class="leader-item">
          <span class="leader-rank ${topClass}">${rankBadge}</span>
          <span class="leader-name">${item.name}</span>
          <span class="leader-time">${item.timeStr}</span>
          <span class="leader-date">${item.date}</span>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // 開啟獨立排行榜
  openLeaderboardModal() {
    this.renderLeaderboardTable('modal-leaderboard-list');
    this.leaderboardModal.classList.add('active');
  }

  closeLeaderboardModal() {
    this.leaderboardModal.classList.remove('active');
  }

  // 更新 HUD
  renderHUD() {
    this.scoreValEl.textContent = this.score;
    this.comboValEl.textContent = this.combo;
    this.levelIndicatorEl.textContent = `${this.currentLevelIndex + 1} / ${ROUTINE_DATA.length}`;

    const pct = Math.min(100, Math.round(((this.currentLevelIndex) / ROUTINE_DATA.length) * 100));
    if (this.timelineProgress) {
      this.timelineProgress.style.width = `${pct}%`;
    }
  }

  updateStatusTip(msg) {
    if (this.statusTipEl) {
      this.statusTipEl.textContent = msg;
    }
  }

  // 洗牌輔助函式
  shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

// 啟動遊戲實例
window.addEventListener('DOMContentLoaded', () => {
  window.game = new DailyRoutineGame();
});
