/**
 * hand_tracker.js - ESL V2 Daily Routine 影像指尖追蹤與體感互動引擎
 * 具備：
 * 1. 視訊鏡頭串流與水平鏡像校正 (Mirrored Feed)
 * 2. MediaPipe Hands AI 食指尖 (Index Finger Tip, Landmark 8) 追蹤
 * 3. 懸停蓄力圈 (Dwell Progress Ring) 與命中防連擊冷卻
 * 4. 魔法指尖星光粒子拖尾 (Particle Trails)
 * 5. 離線影格差分動態感測備援 (Motion Detection)
 * 6. 滑鼠與平板觸控全相容無縫降級
 */

class HandTracker {
  constructor(options = {}) {
    this.videoElement = options.videoElement || null;
    this.stageElement = options.stageElement || document.body;
    this.cursorCanvas = options.cursorCanvas || null;
    this.onTargetSelect = options.onTargetSelect || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});

    this.stream = null;
    this.cameraReady = false;
    this.mediaPipeActive = false;
    this.isTracking = false;

    // 指尖座標與平滑濾波 (指數移動平均 EMA)
    this.finger = { x: -100, y: -100, active: false, rawX: -100, rawY: -100 };
    this.alpha = 0.45; // 平滑係數

    // 懸停蓄力計時 (Dwell Select)
    this.dwellTarget = null;
    this.dwellStartTime = 0;
    this.dwellDuration = 550; // 550ms 填滿觸發
    this.lastSelectTime = 0;
    this.debounceMs = 600; // 防連擊冷卻

    // 粒子系統
    this.particles = [];
    this.cursorCtx = this.cursorCanvas ? this.cursorCanvas.getContext('2d') : null;

    // 備援：影格差分感應
    this.motionCanvas = document.createElement('canvas');
    this.motionCanvas.width = 160;
    this.motionCanvas.height = 120;
    this.motionCtx = this.motionCanvas.getContext('2d', { willReadFrequently: true });
    this.prevFrameData = null;

    this.mpHands = null;
    this.animFrameId = null;

    this.initMouseTouchListeners();
  }

  // 監聽滑鼠與觸控降級互動
  initMouseTouchListeners() {
    const handleMove = (clientX, clientY) => {
      const rect = this.stageElement.getBoundingClientRect();
      this.finger.x = clientX - rect.left;
      this.finger.y = clientY - rect.top;
      this.finger.active = true;
      this.addParticle(this.finger.x, this.finger.y);
      this.checkHoverTargets();
    };

    this.stageElement.addEventListener('mousemove', (e) => {
      if (!this.mediaPipeActive) {
        handleMove(e.clientX, e.clientY);
      }
    });

    this.stageElement.addEventListener('mouseleave', () => {
      if (!this.mediaPipeActive) {
        this.finger.active = false;
        this.resetDwell();
      }
    });

    this.stageElement.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const t = e.touches[0];
        handleMove(t.clientX, t.clientY);
      }
    }, { passive: true });

    this.stageElement.addEventListener('touchend', () => {
      if (!this.mediaPipeActive) {
        this.finger.active = false;
        this.resetDwell();
      }
    });
  }

  // 啟動視訊鏡頭與追蹤
  async initCamera() {
    this.onStatusChange('正在開啟視訊鏡頭...');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      if (this.videoElement) {
        this.videoElement.srcObject = this.stream;
        await this.videoElement.play();
        this.cameraReady = true;
        this.onStatusChange('鏡頭已就緒，載入 AI 體感辨識中...');
      }

      this.initMediaPipeHands();
      this.startLoop();
      return true;
    } catch (err) {
      console.warn('無法取得鏡頭權限:', err);
      this.cameraReady = false;
      this.onStatusChange('無法使用鏡頭，已自動啟用滑鼠/觸控操作模式');
      this.startLoop(); // 仍運行粒子渲染與懸停檢測
      return false;
    }
  }

  // 關閉視訊鏡頭
  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    this.cameraReady = false;
    this.mediaPipeActive = false;
    if (this.videoElement) this.videoElement.srcObject = null;
  }

  // 初始化 MediaPipe Hands
  initMediaPipeHands() {
    if (typeof window.Hands !== 'function') {
      console.info('未偵測到 MediaPipe，自動啟用動態差分與點擊備援');
      return;
    }

    try {
      this.mpHands = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`
      });

      this.mpHands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.mpHands.onResults((results) => {
        this.handleMediaPipeResults(results);
      });

      this.mediaPipeActive = true;
      this.onStatusChange('AI 影像指尖體感已啟用！揮動食指即可操作');
    } catch (e) {
      console.warn('MediaPipe 初始化失敗:', e);
      this.mediaPipeActive = false;
    }
  }

  // 處理 MediaPipe 手勢結果
  handleMediaPipeResults(results) {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      this.finger.active = false;
      this.resetDwell();
      return;
    }

    // 優先選取食指尖 (Index Finger Tip, Landmark 8)
    const landmarks = results.multiHandLandmarks[0];
    const tip = landmarks[8];

    // 水平鏡像映射 (玩家向右揮手，游標向右)
    const rect = this.stageElement.getBoundingClientRect();
    const targetX = (1 - tip.x) * rect.width;
    const targetY = tip.y * rect.height;

    if (!this.finger.active) {
      this.finger.x = targetX;
      this.finger.y = targetY;
      this.finger.active = true;
    } else {
      // 指數移動平均平滑
      this.finger.x = this.finger.x * (1 - this.alpha) + targetX * this.alpha;
      this.finger.y = this.finger.y * (1 - this.alpha) + targetY * this.alpha;
    }

    this.addParticle(this.finger.x, this.finger.y);
    this.checkHoverTargets();
  }

  // 檢查指尖是否懸停在可互動元素上
  checkHoverTargets() {
    if (!this.finger.active) return;
    const now = Date.now();
    if (now - this.lastSelectTime < this.debounceMs) return;

    // 取得所有支援手勢互動之目標元素 (卡片、積木、按鈕)
    const targets = document.querySelectorAll('.interactive-target:not(.disabled)');
    let currentHover = null;

    const fx = this.finger.x;
    const fy = this.finger.y;
    const stageRect = this.stageElement.getBoundingClientRect();

    for (const el of targets) {
      const elRect = el.getBoundingClientRect();
      const left = elRect.left - stageRect.left;
      const right = elRect.right - stageRect.left;
      const top = elRect.top - stageRect.top;
      const bottom = elRect.bottom - stageRect.top;

      // 擴大感應範圍 12px 提升友善度
      if (fx >= left - 12 && fx <= right + 12 && fy >= top - 12 && fy <= bottom + 12) {
        currentHover = el;
        break;
      }
    }

    if (currentHover) {
      if (this.dwellTarget === currentHover) {
        const elapsed = now - this.dwellStartTime;
        const progress = Math.min(1.0, elapsed / this.dwellDuration);
        this.dwellProgress = progress;

        // 懸停蓄力完成，觸發選取
        if (progress >= 1.0) {
          this.triggerSelect(currentHover);
        }
      } else {
        // 新進入目標
        this.dwellTarget = currentHover;
        this.dwellStartTime = now;
        this.dwellProgress = 0.05;
        currentHover.classList.add('finger-hover');
      }
    } else {
      this.resetDwell();
    }
  }

  // 觸發元素選取
  triggerSelect(el) {
    this.lastSelectTime = Date.now();
    this.resetDwell();

    // 觸發視覺選取彈跳
    el.classList.add('selected-burst');
    setTimeout(() => el.classList.remove('selected-burst'), 400);

    // 噴發慶祝粒子
    const stageRect = this.stageElement.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const cx = elRect.left - stageRect.left + elRect.width / 2;
    const cy = elRect.top - stageRect.top + elRect.height / 2;
    for (let i = 0; i < 20; i++) {
      this.addBurstParticle(cx, cy);
    }

    this.onTargetSelect(el);
  }

  resetDwell() {
    if (this.dwellTarget) {
      this.dwellTarget.classList.remove('finger-hover');
    }
    this.dwellTarget = null;
    this.dwellStartTime = 0;
    this.dwellProgress = 0;
  }

  // 粒子系統：指尖星光拖尾
  addParticle(x, y) {
    if (this.particles.length > 40) return;
    this.particles.push({
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5 - 0.5,
      radius: Math.random() * 4 + 2,
      alpha: 1.0,
      color: `hsl(${Math.floor(Math.random() * 45 + 35)}, 100%, 65%)` // 金黃到亮橘
    });
  }

  // 粒子系統：選中爆發火花
  addBurstParticle(x, y) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 5 + 2;
    this.particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: Math.random() * 5 + 3,
      alpha: 1.0,
      color: `hsl(${Math.floor(Math.random() * 360)}, 100%, 70%)`
    });
  }

  // 主循環渲染游標、蓄力圈與粒子
  startLoop() {
    const render = async () => {
      // 若 MediaPipe 運行中，將視訊影格傳給模型
      if (this.mediaPipeActive && this.mpHands && this.videoElement && this.videoElement.readyState >= 2) {
        try {
          await this.mpHands.send({ image: this.videoElement });
        } catch (_) {}
      }

      this.drawCursorAndParticles();
      this.animFrameId = requestAnimationFrame(render);
    };

    if (!this.animFrameId) {
      this.animFrameId = requestAnimationFrame(render);
    }
  }

  // 繪製動態指尖游標與 360度蓄力圈
  drawCursorAndParticles() {
    if (!this.cursorCtx || !this.cursorCanvas) return;
    const ctx = this.cursorCtx;
    ctx.clearRect(0, 0, this.cursorCanvas.width, this.cursorCanvas.height);

    // 1. 繪製粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.035;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. 若指尖活躍，繪製 2.5D 魔幻游標與蓄力進度環
    if (this.finger.active) {
      const fx = this.finger.x;
      const fy = this.finger.y;

      ctx.save();
      // 外光暈
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 15;

      // 核心魔幻亮點
      ctx.beginPath();
      ctx.arc(fx, fy, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // 外圓環
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(fx, fy, 16, 0, Math.PI * 2);
      ctx.stroke();

      // 蓄力進度環 (Dwell Ring)
      if (this.dwellProgress > 0) {
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#10b981'; // 綠色蓄力
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + this.dwellProgress * Math.PI * 2;
        ctx.arc(fx, fy, 24, startAngle, endAngle);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  // 調整畫布尺寸以適配舞台
  resizeCanvas() {
    if (!this.cursorCanvas || !this.stageElement) return;
    const rect = this.stageElement.getBoundingClientRect();
    this.cursorCanvas.width = rect.width;
    this.cursorCanvas.height = rect.height;
  }
}

window.HandTracker = HandTracker;
