/**
 * sound.js - ESL V2 Daily Routine 時間作息大冒險 音效與語音核心模組
 * 包含：
 * 1. Web Audio API 合成音效（鬧鐘鈴響、機械滴答聲、配對成功音、組句積木選取音、答錯提示音、通關號角）
 * 2. 教材真人發音播放（英文單字與中文語義）
 * 3. 瀏覽器 Web Speech API (TTS) 完整句型道地英文朗讀
 * 4. 舒緩溫馨的背景音樂合成器
 */

class SoundSystem {
  constructor() {
    this.audioCtx = null;
    this.currentVoice = null;
    this.isMuted = false;
    this.bgmGain = null;
    this.bgmTimer = null;
    this.speechSynth = window.speechSynthesis || null;
    this.preferredVoice = null;

    // 初始化語音清單
    if (this.speechSynth) {
      this.initVoices();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  // 初始化 Web Audio Context（需使用者互動後啟用）
  initAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  // 尋找最佳英文 TTS 語音（美語優先）
  initVoices() {
    if (!this.speechSynth) return;
    const voices = this.speechSynth.getVoices();
    this.preferredVoice =
      voices.find(v => v.lang === 'en-US' && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Jenny'))) ||
      voices.find(v => v.lang.startsWith('en')) ||
      voices[0];
  }

  // 切換靜音
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      if (this.currentVoice) this.currentVoice.pause();
      if (this.speechSynth) this.speechSynth.cancel();
      this.stopBgm();
    }
    return this.isMuted;
  }

  // 播放教材真人英文發音
  playWordAudio(wordId, onEnded = null) {
    if (this.isMuted) {
      if (onEnded) setTimeout(onEnded, 200);
      return;
    }

    if (this.currentVoice) {
      this.currentVoice.pause();
      this.currentVoice.currentTime = 0;
    }

    const fileName = `V2_${wordId}.mp3`;
    const audioPath = `V2_flashcards_audios/${fileName}`;
    const audio = new Audio(encodeURI(audioPath));
    this.currentVoice = audio;

    audio.onended = () => {
      if (onEnded) onEnded();
    };

    audio.onerror = () => {
      console.warn(`無法載入語音檔案 ${audioPath}，改用 Web Speech TTS 備援`);
      this.speakTTS(wordId, onEnded);
    };

    audio.play().catch(() => {
      this.speakTTS(wordId, onEnded);
    });
  }

  // 播放教材真人中文語音
  playZhAudio(wordId, onEnded = null) {
    if (this.isMuted) {
      if (onEnded) setTimeout(onEnded, 200);
      return;
    }

    if (this.currentVoice) {
      this.currentVoice.pause();
      this.currentVoice.currentTime = 0;
    }

    const fileName = `V2_${wordId}_zh.mp3`;
    const audioPath = `V2_flashcards_audios/${fileName}`;
    const audio = new Audio(encodeURI(audioPath));
    this.currentVoice = audio;

    audio.onended = () => {
      if (onEnded) onEnded();
    };

    audio.onerror = () => {
      console.warn(`無法載入中文語音檔案 ${audioPath}，改用語音合成`);
      this.speakTTSZh(wordId, onEnded);
    };

    audio.play().catch(() => {
      this.speakTTSZh(wordId, onEnded);
    });
  }

  // 播放完整英文句子（使用 Google Cloud Neural2 最高級預錄音檔）
  speakSentence(sentenceText, onEnded = null) {
    if (this.isMuted) {
      if (onEnded) setTimeout(onEnded, 300);
      return;
    }

    const enMap = {
      "I wake up.": "audios/routine_en_wake_up.mp3",
      "I wash my face.": "audios/routine_en_wash_face.mp3",
      "I brush my teeth.": "audios/routine_en_brush_teeth.mp3",
      "I take a shower.": "audios/routine_en_take_shower.mp3",
      "You eat your breakfast.": "audios/routine_en_eat_breakfast.mp3",
      "You comb your hair.": "audios/routine_en_comb_hair.mp3",
      "You take the bus.": "audios/routine_en_take_bus.mp3",
      "You go to school.": "audios/routine_en_go_school.mp3"
    };

    const path = enMap[sentenceText];
    if (path) {
      const audio = new Audio(path);
      audio.onended = () => { if (onEnded) onEnded(); };
      audio.onerror = () => { if (onEnded) onEnded(); };
      audio.play().catch(() => { if (onEnded) onEnded(); });
    } else {
      if (onEnded) setTimeout(onEnded, 400);
    }
  }

  // 播放鬧鐘任務中文提示語音（使用 Google Cloud 台灣正體中文 WaveNet-A 預錄音檔）
  speakTTSZh(zhText, onEnded = null) {
    if (this.isMuted) {
      if (onEnded) setTimeout(onEnded, 300);
      return;
    }

    const zhMap = {
      "早晨起床了！伸個大懶腰": "audios/routine_zh_wake_up.mp3",
      "走進浴室，洗洗臉更清醒！": "audios/routine_zh_wash_face.mp3",
      "擠上牙膏，上上下下刷刷牙！": "audios/routine_zh_brush_teeth.mp3",
      "沖個舒服的溫水澡，神清氣爽！": "audios/routine_zh_take_shower.mp3",
      "坐在餐桌前，享用美味早餐！": "audios/routine_zh_eat_breakfast.mp3",
      "站在鏡子前，把頭髮梳得整整齊齊！": "audios/routine_zh_comb_hair.mp3",
      "校車來了！跟同伴一起搭公車！": "audios/routine_zh_take_bus.mp3",
      "抵達學校大門，開始快樂的一天！": "audios/routine_zh_go_school.mp3"
    };

    const path = zhMap[zhText];
    if (path) {
      const audio = new Audio(path);
      audio.onended = () => { if (onEnded) onEnded(); };
      audio.onerror = () => { if (onEnded) onEnded(); };
      audio.play().catch(() => { if (onEnded) onEnded(); });
    } else {
      if (onEnded) setTimeout(onEnded, 400);
    }
  }

  // 備援方法相容性
  speakTTS(text, onEnded = null) {
    this.speakSentence(text, onEnded);
  }

  // Web Audio 即時音效：鬧鐘鈴響 (Alarm Ring)
  playAlarmRing() {
    if (this.isMuted || !this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    
    // 雙金屬鈴鐺顫音
    for (let i = 0; i < 6; i++) {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400 + (i % 2 === 0 ? 80 : -80), now + i * 0.08);
      
      gain.gain.setValueAtTime(0.18, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.07);
      
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.075);
    }
  }

  // Web Audio 即時音效：機械滴答聲 (Tick-Tock)
  playTick(isTock = false) {
    if (this.isMuted || !this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isTock ? 600 : 800, now);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  // Web Audio 即時音效：配對正確金幣音 (Match Success)
  playSuccessSound() {
    if (this.isMuted || !this.audioCtx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const now = this.audioCtx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.16, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.22);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.24);
    });
  }

  // Web Audio 即時音效：答錯提示音 (Error / Try Again)
  playWrongSound() {
    if (this.isMuted || !this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(140, now + 0.25);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  // Web Audio 即時音效：單字積木點擊選取音 (Block Click)
  playBlockClick(pitchIndex = 0) {
    if (this.isMuted || !this.audioCtx) return;
    const baseFreqs = [440, 523, 587, 659, 740, 830];
    const freq = baseFreqs[pitchIndex % baseFreqs.length];
    const now = this.audioCtx.currentTime;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  // Web Audio 即時音效：全通關歡慶大號角 (Victory Fanfare)
  playVictoryFanfare() {
    if (this.isMuted || !this.audioCtx) return;
    const melody = [
      { f: 523.25, d: 0.14 },
      { f: 659.25, d: 0.14 },
      { f: 783.99, d: 0.14 },
      { f: 1046.50, d: 0.35 }
    ];
    let offset = 0;
    const now = this.audioCtx.currentTime;

    melody.forEach(m => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(m.f, now + offset);

      gain.gain.setValueAtTime(0.2, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + m.d);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + m.d + 0.05);
      offset += m.d;
    });
  }

  // 輕巧背景音樂
  startBgm() {
    if (this.isMuted || !this.audioCtx || this.bgmTimer) return;
    const chords = [
      [261.63, 329.63, 392.00], // C
      [220.00, 261.63, 329.63], // Am
      [174.61, 220.00, 261.63], // F
      [196.00, 246.94, 293.66]  // G
    ];
    let step = 0;

    const playChord = () => {
      if (this.isMuted || !this.audioCtx) return;
      const currentChord = chords[step % chords.length];
      const now = this.audioCtx.currentTime;

      currentChord.forEach(f => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);

        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.0005, now + 1.8);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 1.85);
      });

      step++;
      this.bgmTimer = setTimeout(playChord, 2000);
    };

    playChord();
  }

  stopBgm() {
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

// 導出全局單例
window.soundSystem = new SoundSystem();
