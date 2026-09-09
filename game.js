/**
 * game.js - ESL V2 Daily Routine 核心遊戲邏輯與狀態機
 * 依據 V2_04-05 與 V2_06-07 教材：
 * 1. 一日晨間時間軸 (07:00 ~ 08:30)
 * 2. 鬧鐘出題與左右 6 卡 3D 擬物配對
 * 3. 句型文字積木組合 (Sentence Builder)
 * 4. 體感指尖與滑鼠/觸控雙模式控制
 */

// 8 大核心日常作息題庫
const ROUTINE_DATA = [
  {
    id: 'wake_up',
    timeStr: '07:00 AM',
    hourDeg: 210, // 時針角度
    minDeg: 0,    // 分針角度
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
    this.hearts = 5;
    this.controlMode = 'hand'; // 'hand' or 'touch'

    // 句型拼字暫存
    this.currentSentenceWords = [];
    this.selectedWords = [];

    // DOM 節點
    this.landingScreen = document.getElementById('landing-screen');
    this.gameStage = document.getElementById('game-stage');
    this.victoryModal = document.getElementById('victory-modal');

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

    // 句型拼裝盤
    this.sentencePanel = document.getElementById('sentence-panel');
    this.sentenceSlotsContainer = document.getElementById('sentence-slots');
    this.wordBlocksContainer = document.getElementById('word-blocks');
    this.sentenceTargetHint = document.getElementById('sentence-target-hint');
    this.clearSentenceBtn = document.getElementById('clear-sentence-btn');

    // HUD 節點
    this.scoreValEl = document.getElementById('hud-score');
    this.comboValEl = document.getElementById('hud-combo');
    this.heartsContainer = document.getElementById('hud-hearts');
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
    document.getElementById('btn-fullscreen').addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    // 鬧鐘重聽按鈕
    this.clockAudioBtn.addEventListener('click', () => {
      this.playCurrentLevelAudio();
    });

    // 清除句型重選按鈕
    this.clearSentenceBtn.addEventListener('click', () => {
      this.resetCurrentSentenceBlocks();
    });

    // 勝利彈窗重玩
    document.getElementById('btn-restart').addEventListener('click', () => {
      this.victoryModal.classList.remove('active');
      this.startGame(this.controlMode);
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
    this.hearts = 5;
    this.renderHUD();
    this.loadLevel(this.currentLevelIndex);
  }

  // 回到首頁
  returnToHome() {
    this.state = 'LANDING';
    this.tracker.stopCamera();
    this.gameStage.classList.remove('active');
    this.victoryModal.classList.remove('active');
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
    this.updateStatusTip(`請依時間【${item.timeStr}】找出正確的作息卡！`);

    // 自動播放提示語音
    setTimeout(() => {
      this.playCurrentLevelAudio();
    }, 600);
  }

  // 播放當前關卡語音
  playCurrentLevelAudio() {
    const item = ROUTINE_DATA[this.currentLevelIndex];
    if (!item) return;
    this.clockAudioBtn.classList.add('pulsing');
    window.soundSystem.playZhAudio(item.audioWord, () => {
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

  // 處理互動選取事件（手勢懸停或點擊）
  handleInteractiveSelect(el) {
    if (this.state === 'MATCHING' && el.classList.contains('routine-card')) {
      this.handleCardMatch(el);
    } else if (this.state === 'SENTENCE_BUILDING' && el.classList.contains('word-block')) {
      this.handleWordBlockSelect(el);
    }
  }

  // 驗證卡片配對
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

      this.updateStatusTip(`太棒了！答對了：${currentItem.enText} (+${gain}分)`);
      this.renderHUD();

      // 暫停所有卡片交互
      document.querySelectorAll('.routine-card').forEach(c => c.classList.add('disabled'));

      // 1.2 秒後展開句型積木時間
      setTimeout(() => {
        this.startSentenceBuilding(currentItem);
      }, 1200);

    } else {
      // 答錯處理
      this.combo = 0;
      this.hearts--;
      cardEl.classList.add('match-wrong');
      window.soundSystem.playWrongSound();

      setTimeout(() => cardEl.classList.remove('match-wrong'), 600);

      this.updateStatusTip(`再試一次喔！找找看【${currentItem.zhTask}】`);

      if (this.hearts <= 0) {
        // 暖心不中斷：答錯不 Game Over，自動補滿愛心鼓勵孩子
        this.hearts = 3;
        this.updateStatusTip(`沒關係！加滿愛心繼續加油 ❤️`);
      }
      this.renderHUD();
    }
  }

  // 進入句型積木拼裝階段 (Sentence Building - 參考 V2_06-07)
  startSentenceBuilding(item) {
    this.state = 'SENTENCE_BUILDING';
    this.sentencePanel.classList.add('active');

    this.sentenceSlotsContainer.innerHTML = '';
    this.wordBlocksContainer.innerHTML = '';
    this.selectedWords = [];

    // 目標句子與積木打散
    const targetWords = [...item.sentenceBlocks];
    this.currentSentenceWords = targetWords;

    // 提示目標
    this.sentenceTargetHint.textContent = `請拼出句型：${item.sentenceTarget}`;

    // 建立上方空格
    targetWords.forEach((_, idx) => {
      const slot = document.createElement('div');
      slot.className = 'sentence-slot';
      slot.dataset.slotIndex = idx;
      slot.innerHTML = `<span class="slot-placeholder">?</span>`;
      slot.addEventListener('click', () => {
        // 點擊空格可退回該位置的單字
        this.unslotWord(idx);
      });
      this.sentenceSlotsContainer.appendChild(slot);
    });

    // 混合打散正確字塊與干擾字塊
    const pool = this.shuffleArray([...item.sentenceBlocks, ...item.distractors]);

    pool.forEach((word, idx) => {
      const btn = document.createElement('div');
      btn.className = 'word-block interactive-target';
      btn.dataset.word = word;
      btn.textContent = word;

      btn.addEventListener('click', () => {
        this.handleInteractiveSelect(btn);
      });

      this.wordBlocksContainer.appendChild(btn);
    });

    this.updateStatusTip('動動手指或點擊單字積木，拼出完整句子！');
  }

  // 點選/懸停單字積木
  handleWordBlockSelect(blockEl) {
    if (this.state !== 'SENTENCE_BUILDING') return;
    if (blockEl.classList.contains('used') || blockEl.classList.contains('disabled')) return;

    const word = blockEl.dataset.word;
    const targetLen = this.currentSentenceWords.length;

    if (this.selectedWords.length >= targetLen) return;

    // 將單字填入下一個空格
    const targetIndex = this.selectedWords.length;
    this.selectedWords.push({ word, element: blockEl });
    blockEl.classList.add('used');

    window.soundSystem.playBlockClick(targetIndex);

    const slot = this.sentenceSlotsContainer.children[targetIndex];
    if (slot) {
      slot.innerHTML = `<span class="filled-word">${word}</span>`;
      slot.classList.add('filled');
    }

    // 檢查是否填滿所有空格
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

    // 從該處移除並重新渲染空格
    this.selectedWords.splice(slotIdx, 1);
    this.refreshSentenceSlots();
  }

  // 重整空格顯示
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

  // 重設目前句型
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
      // 拼裝成功！
      this.state = 'SENTENCE_SUCCESS';
      this.score += 150;
      this.renderHUD();

      this.sentenceSlotsContainer.classList.add('glow-success');
      window.soundSystem.playSuccessSound();

      // 標準發音朗讀完整句子
      this.updateStatusTip(`✨ 完美造句：${currentItem.sentenceTarget}`);
      window.soundSystem.speakSentence(currentItem.sentenceTarget, () => {
        setTimeout(() => {
          this.sentenceSlotsContainer.classList.remove('glow-success');
          // 進入下一時間點關卡
          this.loadLevel(this.currentLevelIndex + 1);
        }, 800);
      });

    } else {
      // 拼裝順序錯誤
      window.soundSystem.playWrongSound();
      this.sentenceSlotsContainer.classList.add('shake-error');
      this.updateStatusTip('順序不太對喔！點擊空格即可重排');

      setTimeout(() => {
        this.sentenceSlotsContainer.classList.remove('shake-error');
        this.resetCurrentSentenceBlocks();
      }, 1000);
    }
  }

  // 觸發全通關
  triggerVictory() {
    this.state = 'VICTORY';
    window.soundSystem.playVictoryFanfare();
    this.sentencePanel.classList.remove('active');

    document.getElementById('final-score').textContent = this.score;
    document.getElementById('final-combo').textContent = this.maxCombo;
    this.victoryModal.classList.add('active');
    this.updateStatusTip('🎉 恭喜！你完成了今日所有作息挑戰，成為時間大師！');
  }

  // 更新 HUD
  renderHUD() {
    this.scoreValEl.textContent = this.score;
    this.comboValEl.textContent = this.combo;

    // 愛心
    let heartsHtml = '';
    for (let i = 0; i < 5; i++) {
      heartsHtml += i < this.hearts ? '❤️ ' : '🤍 ';
    }
    this.heartsContainer.innerHTML = heartsHtml;

    // 關卡指示
    this.levelIndicatorEl.textContent = `${this.currentLevelIndex + 1} / ${ROUTINE_DATA.length}`;

    // 時間軸進度條
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
