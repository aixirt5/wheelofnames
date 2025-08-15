/* Wheel of Names - Vanilla JS */
(function(){
  const qs = (sel, el=document) => el.querySelector(sel);
  const qsa = (sel, el=document) => Array.from(el.querySelectorAll(sel));

  // Elements
  const namesInput = qs('#namesInput');
  const namesCount = qs('#namesCount');
  const applyNamesBtn = qs('#applyNames');
  const shuffleNamesBtn = qs('#shuffleNames');
  const randomizeColorsBtn = qs('#randomizeColors');
  const spinBtn = qs('#spinBtn');
  const resetBtn = qs('#resetBtn');
  const canvas = qs('#wheelCanvas');
  const ctx = canvas.getContext('2d');
  const confettiCanvas = qs('#confettiCanvas');
  const resultsPanel = qs('#resultsPanel');
  const winnerAnnouncement = qs('#winnerAnnouncement');
  const spinAgainBtn = qs('#spinAgain');
  const closeResultsBtn = qs('#closeResults');
  const removeWinnerBtn = qs('#removeWinner');
  const spinBtnOverlay = qs('#spinBtnOverlay');
  const pointerEl = qs('.pointer');
  
  const toggleSettingsBtn = qs('#toggleSettings');
  const controlsPanel = qs('#controlsPanel');
  const appMain = qs('.app-main');
  const wheelSection = qs('.wheel-section');
  const selectionModeToggle = qs('#selectionModeToggle');
  const winnerModeRow = qs('#winnerModeRow');

  const modeRandom = qs('#modeRandom');
  const modeFixed = qs('#modeFixed');
  const fixedChoiceSel = qs('#fixedChoice');
  const modeLms = qs('#modeLms');
  const lmsProtectedSel = qs('#lmsProtected');
  const saveSelectionBtn = qs('#saveSelection');
  const spinTurnsInput = qs('#spinTurns');

  // Timer elements
  const timerBtn = qs('#timerBtn');
  const timerDisplay = qs('#timerDisplay');
  const timerInput = qs('#timerInput');
  const timerMinutes = qs('#timerMinutes');
  const timerSeconds = qs('#timerSeconds');
  const startTimer = qs('#startTimer');
  const cancelTimer = qs('#cancelTimer');
  const timerNotification = qs('#timerNotification');
  const closeNotification = qs('#closeNotification');

  // Sounds engine
  function createSoundEngine() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    let ctx;
    const ensure = () => { ctx = ctx || new AudioCtx(); return ctx; };

    function clickTick() {
      const ac = ensure();
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'triangle';
      o.frequency.value = 880;
      g.gain.value = 0.0;
      o.connect(g).connect(ac.destination);
      const t = ac.currentTime;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      o.start();
      o.stop(t + 0.06);
    }

    // Try to use local audio assets if available
    let cheerEl = null;
    let shoutEl = null;
    try {
      const cheers = ['assets/winner.mp3', 'assets/cheer.mp3', 'assets/applause.mp3'];
      const shouts = ['assets/shout.mp3', 'assets/crowd.mp3'];
      for (const u of cheers) { const a = new Audio(u); a.preload = 'auto'; cheerEl = a; break; }
      for (const u of shouts) { const a = new Audio(u); a.preload = 'auto'; shoutEl = a; break; }
    } catch {}

    function playCheerFiles() {
      const plays = [];
      if (cheerEl) {
        try { cheerEl.currentTime = 0; cheerEl.volume = 0.9; plays.push(cheerEl.play()); } catch(e) {}
      }
      if (shoutEl) {
        try { shoutEl.currentTime = 0; shoutEl.volume = 0.9; plays.push(shoutEl.play()); } catch(e) {}
      }
      if (plays.length === 0) {
        return Promise.reject(new Error('no-audio-elements'));
      }
      return Promise.allSettled(plays).then((results) => {
        const ok = results.some(r => r.status === 'fulfilled');
        if (!ok) throw new Error('playback-failed');
      });
    }

    // Synth fallback: applause claps + crowd shouting (no melodic fireworks)
    function celebrateSynth() {
      const ac = ensure();
      const t0 = ac.currentTime;
      const master = ac.createGain();
      master.gain.value = 0.8;
      master.connect(ac.destination);

      function clap(at) {
        const length = Math.floor(ac.sampleRate * 0.08);
        const buf = ac.createBuffer(1, length, ac.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < length; i++) {
          const env = Math.pow(1 - i / length, 3);
          data[i] = (Math.random() * 2 - 1) * env;
        }
        const src = ac.createBufferSource();
        src.buffer = buf;
        const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(0.8, at + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 0.1);
        src.connect(g).connect(master);
        src.start(at);
        src.stop(at + 0.12);
      }

      // Crowd shout noise
      function shoutNoise(at, duration) {
        const len = Math.floor(ac.sampleRate * duration);
        const buf = ac.createBuffer(1, len, ac.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) {
          // band-limited noise envelope to resemble crowd voice band
          const env = 0.3 + 0.7 * Math.pow(1 - i / len, 1.5);
          data[i] = (Math.random() * 2 - 1) * env;
        }
        const src = ac.createBufferSource();
        src.buffer = buf;
        const bp = ac.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1200;
        bp.Q.value = 0.7;
        const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(0.25, at + 0.05);
        g.gain.exponentialRampToValueAtTime(0.08, at + duration * 0.6);
        g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
        src.connect(bp).connect(g).connect(master);
        src.start(at);
        src.stop(at + duration);
      }

      // Sprinkle claps over ~1.4s
      for (let i = 0; i < 32; i++) {
        clap(t0 + Math.random() * 1.4);
      }
      // Layer 2-3 crowd shouts of various lengths
      shoutNoise(t0 + 0.05, 1.1);
      shoutNoise(t0 + 0.25, 0.9);
      if (Math.random() > 0.5) shoutNoise(t0 + 0.55, 0.8);
    }

    function celebrate() {
      // Prefer files if present; otherwise synth fallback. If file playback fails, fallback too.
      if (cheerEl || shoutEl) {
        playCheerFiles().catch(() => { celebrateSynth(); });
        return;
      }
      celebrateSynth();
    }

    return { clickTick, celebrate };
  }
  let muted = false;
  const sounds = createSoundEngine();

  // Timer functionality
  let timerInterval = null;
  let timerTimeLeft = 0;
  let timerRunning = false;

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function updateTimerDisplay() {
    if (timerDisplay) {
      timerDisplay.textContent = formatTime(timerTimeLeft);
    }
  }

  function startTimerCountdown() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
      timerTimeLeft--;
      updateTimerDisplay();
      
      if (timerTimeLeft <= 0) {
        stopTimer();
        // Play a sound when timer ends
        if (!muted) sounds.clickTick();
        // Show styled notification
        showTimerNotification();
      }
    }, 1000);
    
    timerRunning = true;
    timerDisplay.classList.remove('hidden');
    timerInput.classList.add('hidden');
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    timerRunning = false;
    timerDisplay.classList.add('hidden');
    timerInput.classList.add('hidden');
    timerBtn.classList.remove('hidden');
  }

  function resetTimer() {
    timerTimeLeft = 0;
    updateTimerDisplay();
    stopTimer();
  }

  function showTimerNotification() {
    if (timerNotification) {
      timerNotification.classList.remove('hidden');
      // Auto-hide after 5 seconds
      setTimeout(() => {
        hideTimerNotification();
      }, 5000);
    }
  }

  function hideTimerNotification() {
    if (timerNotification) {
      timerNotification.classList.add('hidden');
    }
  }

  function showValidationNotification(message) {
    if (timerNotification) {
      const notificationText = timerNotification.querySelector('.notification-text');
      if (notificationText) {
        notificationText.textContent = message;
      }
      timerNotification.classList.remove('hidden');
      // Auto-hide after 3 seconds for validation messages
      setTimeout(() => {
        hideTimerNotification();
        // Reset the text back to "Timer Finished!"
        if (notificationText) {
          notificationText.textContent = 'Timer Finished!';
        }
      }, 3000);
    }
  }

  // Confetti
  let confetti;
  function createConfetti() {
    const ctx2 = confettiCanvas.getContext('2d');
    let W, H;
    function resize() { W = confettiCanvas.width = confettiCanvas.offsetWidth; H = confettiCanvas.height = confettiCanvas.offsetHeight; }
    resize();
    const pieces = Array.from({length: 200}).map(() => ({
      x: Math.random()*W,
      y: -20 - Math.random()*H,
      r: 4 + Math.random()*5,
      c: `hsl(${Math.random()*360},85%,60%)`,
      s: 1 + Math.random()*2,
      a: Math.random()*Math.PI*2
    }));
    let raf;
    function draw() {
      ctx2.clearRect(0,0,W,H);
      pieces.forEach(p => {
        p.y += p.s;
        p.x += Math.sin(p.y/20)*0.8;
        p.a += 0.04;
        ctx2.save();
        ctx2.translate(p.x, p.y);
        ctx2.rotate(p.a);
        ctx2.fillStyle = p.c;
        ctx2.fillRect(-p.r/2, -p.r/2, p.r, p.r);
        ctx2.restore();
      });
      raf = requestAnimationFrame(draw);
    }
    confetti = { stop() { cancelAnimationFrame(raf); ctx2.clearRect(0,0,W,H); }, start: () => { draw(); } };
    return confetti;
  }

  // Wheel state
  let entries = [];
  let colors = [];
  let angle = 0; // radians
  let spinning = false;
  let lastTickSector = -1;

  function parseNames(text) {
    return text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  }

  function randomColor(i) {
    const hue = (i * 360 / Math.max(6, entries.length)) % 360;
    return `hsl(${hue}, 80%, 55%)`;
  }

  function randomizeColors() {
    colors = entries.map((_, i) => `hsl(${Math.random()*360}, 80%, 55%)`);
  }

  function applyNames() {
    entries = parseNames(namesInput.value);
    if (entries.length === 0) entries = ['—'];
    if (colors.length !== entries.length) {
      colors = entries.map((_, i) => randomColor(i));
    }
    populateFixedSelect();
    drawWheel();
    if (namesCount) namesCount.textContent = String(entries.length);
    // After repopulating selects, restore selection if saved
    restoreSelection();
    // Persist again so the selection (by name) maps to the new indices after shuffle/apply
    try { persistSelection(); } catch {}
  }

  function shuffleArray(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

  function populateFixedSelect() {
    fixedChoiceSel.innerHTML = '';
    lmsProtectedSel.innerHTML = '';
    entries.forEach((name, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = name;
      fixedChoiceSel.appendChild(opt);
      const opt2 = document.createElement('option');
      opt2.value = String(i);
      opt2.textContent = name;
      lmsProtectedSel.appendChild(opt2);
    });
    fixedChoiceSel.disabled = !modeFixed.checked;
    lmsProtectedSel.disabled = !modeLms.checked;
  }

  function syncCanvasSize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    const px = Math.floor(size * dpr);
    if (canvas.width !== px || canvas.height !== px) {
      canvas.width = px;
      canvas.height = px;
    }
  }

  function drawWheel() {
    syncCanvasSize();
    const W = canvas.width, H = canvas.height; const cx = W/2, cy = H/2; const r = Math.min(W, H)/2 - Math.max(8, W*0.01);
    ctx.clearRect(0,0,W,H);

    const n = entries.length;
    if (n === 0) return;
    const arc = (Math.PI * 2) / n;

    // pointer alignment with canvas padding
    try {
      const stage = canvas.parentElement;
      const padTop = parseFloat(getComputedStyle(stage).paddingTop) || 0;
      pointerEl.style.top = `${padTop}px`;
    } catch {}

    // draw slices
    for (let i=0; i<n; i++) {
      const start = angle + i*arc;
      const end = start + arc;
      // slice
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length] || randomColor(i);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.15)';
      ctx.lineWidth = n > 16 ? 1 : 2;
      ctx.stroke();

      // text: vertical stack along the slice radius
      const mid = start + arc/2;
      const inner = r * 0.22;
      const outer = r * 0.9;
      const widthRadius = (inner + outer) / 2;
      const allowedWidth = 2 * Math.sin(arc/2) * widthRadius * 0.9;

      let fontSize = Math.min(26, Math.max(10, Math.floor(r * 0.11)));
      ctx.font = `bold ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
      let maxCharWidth = ctx.measureText('W').width;
      while (maxCharWidth > allowedWidth && fontSize > 10) {
        fontSize -= 1;
        ctx.font = `bold ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
        maxCharWidth = ctx.measureText('W').width;
      }

      const spacing = Math.ceil(fontSize * 1.05);
      const availableRadial = outer - inner;
      let chars = Array.from(entries[i]);
      while (chars.length * spacing > availableRadial && fontSize > 10) {
        fontSize -= 1;
        ctx.font = `bold ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
      }
      // truncate with ellipsis if still too tall
      while (chars.length * spacing > availableRadial && chars.length > 1) {
        chars.pop();
        if (chars.length > 0) chars[chars.length - 1] = '…';
      }

      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let ci = 0; ci < chars.length; ci++) {
        const radiusPos = outer - (ci * spacing) - spacing * 0.5;
        const x = cx + Math.cos(mid) * radiusPos;
        const y = cy + Math.sin(mid) * radiusPos;
        ctx.fillText(chars[ci], x, y);
      }
    }

    // center cap
    ctx.beginPath();
    ctx.arc(cx, cy, r*0.08, 0, Math.PI*2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.stroke();
  }

  function sectorAtPointer() {
    const n = entries.length;
    const arc = (Math.PI*2)/n;
    const pointerAngle = -Math.PI/2; // top, arrow points downward on canvas
    // normalize sector index so that angle 0 is at +x; adjust offset
    let a = (pointerAngle - angle) % (Math.PI*2);
    if (a < 0) a += Math.PI*2;
    const idx = Math.floor(a / arc);
    return ((idx % n) + n) % n;
  }

  function spinTo(targetIndex) {
    const n = entries.length;
    const arc = (Math.PI*2)/n;
    const pointerAngle = -Math.PI/2; // must match sectorAtPointer
    const currentAtPointer = sectorAtPointer();

    // Completely random spin duration from 5 to 30 seconds for maximum excitement!
    const duration = Math.random() * 25 + 5; // Random between 5-30 seconds
    
    // Dynamic spins based on duration for smooth speed transitions
    let spins;
    if (duration < 5) {
      // Very fast spin: maximum rotations for excitement
      spins = Math.floor(Math.random() * 6) + 8; // 8-13 spins
    } else if (duration < 7) {
      // Fast spin: high rotations
      spins = Math.floor(Math.random() * 4) + 6; // 6-9 spins
    } else if (duration < 9) {
      // Medium spin: balanced rotations
      spins = Math.floor(Math.random() * 3) + 4; // 4-6 spins
    } else {
      // Slow spin: fewer rotations for suspense
      spins = Math.floor(Math.random() * 4) + 2; // 2-5 spins
    }

    // Simple but effective randomness for exciting spins!
    const targetAngleForIndex = (idx) => {
      const center = pointerAngle - (idx + 0.5) * arc;
      
      // Maximum randomness - can land anywhere in the slice, even at the very edges!
      // This ensures the wheel never lands in the boring center position
      const jitter = (Math.random() - 0.5) * (arc * 2.0); // Full slice width randomness!
      return center + jitter;
    };

    // Add full spins forward to ensure nice rotation
    const currentAngle = angle;
    let finalAngle = targetAngleForIndex(targetIndex);
    // ensure finalAngle is forward by adding multiples of 2PI
    while (finalAngle <= currentAngle) finalAngle += Math.PI*2;
    
    finalAngle += spins * (Math.PI*2);

    const startTime = performance.now();
    const startAngle = angle;
    spinning = true; lastTickSector = -1;

    function easeOutCubic(t) { return 1 - Math.pow(1-t, 3); }

    function step(ts) {
      const t = Math.min(1, (ts - startTime) / (duration * 1000));
      const eased = easeOutCubic(t);
      angle = startAngle + (finalAngle - startAngle) * eased;
      drawWheel();

      // tick sound when crossing sector boundary
      const currentSector = sectorAtPointer();
      if (currentSector !== lastTickSector) {
        lastTickSector = currentSector;
        if (!muted) sounds.clickTick();
      }

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        spinning = false;
        // Determine the actual winner based on where the wheel actually stopped
        const actualWinnerIndex = sectorAtPointer();
        onFinish(actualWinnerIndex);
      }
    }

    requestAnimationFrame(step);
  }

  function onFinish(index) {
    const name = entries[index] || '—';
    winnerAnnouncement.textContent = `Winner: ${name}`;
    resultsPanel.classList.remove('hidden');
    if (resetBtn) resetBtn.disabled = false;
    // Hide spin controls once the game starts and on finish
    spinBtn.classList.add('hidden');
    spinBtnOverlay.classList.add('hidden');
    // Move focus to dialog primary action for accessibility
    try { spinAgainBtn.focus({ preventScroll: true }); } catch {}
    try { if (!muted) sounds.celebrate(); } catch {}

    if (!confetti) createConfetti();
    confetti.start();

    // Last Man Standing: continue until only one name remains (the survivor)
    if (modeLms.checked) {
      if (entries.length > 1) {
        // Still have multiple names - continue the game
        spinAgainBtn.disabled = true;
        try { removeWinnerBtn.focus({ preventScroll: true }); } catch {}
      } else if (entries.length === 1) {
        // Only one name remains - they are the Last Man Standing!
        const survivor = entries[0];
        winnerAnnouncement.textContent = `🏆 LAST MAN STANDING: ${survivor}!`;
        spinAgainBtn.disabled = true;
        removeWinnerBtn.disabled = true;
        try { removeWinnerBtn.focus({ preventScroll: true }); } catch {}
      } else {
        // Something went wrong
        spinAgainBtn.disabled = true;
        removeWinnerBtn.disabled = true;
      }
    }
  }

  // Actions
  applyNamesBtn.addEventListener('click', () => { applyNames(); });
  
  // Debounced input handler to avoid excessive calls while typing
  let inputTimeout;
  namesInput.addEventListener('input', () => {
    clearTimeout(inputTimeout);
    inputTimeout = setTimeout(() => {
      applyNames();
    }, 500); // Wait 500ms after user stops typing
  });
  
  shuffleNamesBtn.addEventListener('click', () => {
    const list = parseNames(namesInput.value);
    shuffleArray(list);
    namesInput.value = list.join('\n');
    applyNames();
  });
  randomizeColorsBtn.addEventListener('click', () => { randomizeColors(); drawWheel(); });
  spinBtnOverlay.addEventListener('click', () => spinBtn.click());

  // Toggle Selection Mode visibility in settings (button inside settings footer)
  selectionModeToggle && selectionModeToggle.addEventListener('click', () => {
    const hidden = winnerModeRow.classList.toggle('collapsible-hidden');
    selectionModeToggle.textContent = hidden ? 'Show Selection Mode' : 'Hide Selection Mode';
    selectionModeToggle.setAttribute('aria-expanded', String(!hidden));
    // Ensure settings panel is visible so the toggle has context
    if (controlsPanel.classList.contains('hidden')) {
      controlsPanel.classList.remove('hidden');
      appMain.classList.remove('full-width');
      wheelSection.classList.add('hidden');
      wheelSection.setAttribute('aria-hidden', 'true');
      toggleSettingsBtn.textContent = 'Hide Settings';
      toggleSettingsBtn.setAttribute('aria-expanded', 'true');
    }
  });

  function syncModeUI() {
    fixedChoiceSel.disabled = !modeFixed.checked;
    lmsProtectedSel.disabled = !modeLms.checked;
    // Drop any auto-protected state when switching modes
    if (!modeLms.checked) delete window.__lmsProtectedIndex;
    // Persist immediately when switching modes
    try { persistSelection(); } catch {}
  }
  modeRandom.addEventListener('change', syncModeUI);
  modeFixed.addEventListener('change', syncModeUI);
  modeLms.addEventListener('change', syncModeUI);

  // Persist selection mode and pick
  function persistSelection() {
    const mode = modeFixed.checked ? 'fixed' : (modeLms.checked ? 'lms' : 'random');
    const fixedName = fixedChoiceSel.selectedOptions?.[0]?.textContent || null;
    const lmsName = lmsProtectedSel.selectedOptions?.[0]?.textContent || null;
    const payload = { mode, fixedName, lmsName };
    try { localStorage.setItem('selectionMode', JSON.stringify(payload)); } catch {}
  }
  function restoreSelection() {
    try {
      const raw = localStorage.getItem('selectionMode');
      if (!raw) return;
      const { mode, fixedName, lmsName } = JSON.parse(raw);
      
      // Restore the mode first
      if (mode === 'fixed') modeFixed.checked = true; 
      else if (mode === 'lms') modeLms.checked = true; 
      else modeRandom.checked = true;
      
      syncModeUI();
      
      // Try to restore the selected names by matching text content
      let fixedRestored = false;
      let lmsRestored = false;
      
      if (fixedName && fixedChoiceSel.options.length > 0) {
        // Try exact match first
        for (let opt of fixedChoiceSel.options) {
          if (opt.textContent === fixedName) {
            fixedChoiceSel.value = opt.value;
            fixedRestored = true;
            break;
          }
        }
        
        // If exact match fails, try partial match (for cases where names might have been modified)
        if (!fixedRestored) {
          for (let opt of fixedChoiceSel.options) {
            if (opt.textContent.toLowerCase().includes(fixedName.toLowerCase()) || 
                fixedName.toLowerCase().includes(opt.textContent.toLowerCase())) {
              fixedChoiceSel.value = opt.value;
              fixedRestored = true;
              break;
            }
          }
        }
      }
      
      if (lmsName && lmsProtectedSel.options.length > 0) {
        // Try exact match first
        for (let opt of lmsProtectedSel.options) {
          if (opt.textContent === lmsName) {
            lmsProtectedSel.value = opt.value;
            lmsRestored = true;
            break;
          }
        }
        
        // If exact match fails, try partial match
        if (!lmsRestored) {
          for (let opt of lmsProtectedSel.options) {
            if (opt.textContent.toLowerCase().includes(lmsName.toLowerCase()) || 
                lmsName.toLowerCase().includes(opt.textContent.toLowerCase())) {
              lmsProtectedSel.value = opt.value;
              lmsRestored = true;
              break;
            }
          }
        }
      }
      
      // If we successfully restored selections, persist them to update any indices
      if (fixedRestored || lmsRestored) {
        try { persistSelection(); } catch {}
      }
    } catch {}
  }
  saveSelectionBtn && saveSelectionBtn.addEventListener('click', () => {
    persistSelection();
    // brief visual feedback by flashing the button
    saveSelectionBtn.disabled = true;
    setTimeout(() => { saveSelectionBtn.disabled = false; }, 500);
  });

  // Persist selection whenever dropdowns change so shuffle keeps the intended names
  fixedChoiceSel.addEventListener('change', () => { try { persistSelection(); } catch {} });
  lmsProtectedSel.addEventListener('change', () => { try { persistSelection(); } catch {} });

  spinBtn.addEventListener('click', () => {
    if (spinning) return;
    resultsPanel.classList.add('hidden');
    if (confetti) confetti.stop();
    if (resetBtn) resetBtn.disabled = true;
    // Hide spin buttons during the spin
    spinBtn.classList.add('hidden');
    spinBtnOverlay.classList.add('hidden');

    let targetIndex;
    if (modeFixed.checked) {
      targetIndex = parseInt(fixedChoiceSel.value, 10) || 0;
    } else if (modeLms.checked) {
      // Last Man Standing: Select any name EXCEPT the protected one
      // The protected name will be eliminated, and the survivor becomes Last Man Standing
      const protectedIdx = parseInt(lmsProtectedSel.value, 10);
      const validProtected = Number.isFinite(protectedIdx) ? protectedIdx : -1;
      
      if (entries.length <= 1) {
        // Only one name left - this is the Last Man Standing!
        targetIndex = 0;
      } else {
        // Select any name EXCEPT the protected one for elimination
        do {
          targetIndex = Math.floor(Math.random() * entries.length);
        } while (targetIndex === validProtected);
      }
    } else {
      targetIndex = Math.floor(Math.random()*entries.length);
    }
    spinTo(targetIndex);
  });

  // Proceed button removed

  spinAgainBtn.addEventListener('click', () => {
    resultsPanel.classList.add('hidden');
    if (confetti) confetti.stop();
    spinBtn.click();
  });

  // Close winner dialog
  function closeResults() {
    resultsPanel.classList.add('hidden');
    if (confetti) confetti.stop();
    spinBtn.classList.remove('hidden');
    spinBtnOverlay.classList.remove('hidden');
    try { (spinBtnOverlay.offsetParent ? spinBtnOverlay : spinBtn).focus({ preventScroll: true }); } catch {}
  }
  closeResultsBtn.addEventListener('click', closeResults);

  // Remove winner: delete selected winner from entries and names input, then allow next spin
  removeWinnerBtn.addEventListener('click', () => {
    const currentWinner = winnerAnnouncement.textContent.replace(/^Winner:\s*/, '');
    const list = parseNames(namesInput.value);
    const idx = list.findIndex(n => n === currentWinner);
    
    if (idx !== -1) {
      list.splice(idx, 1);
      namesInput.value = list.join('\n');
      applyNames();
    }
    
    // Always close and prepare for next spin
    resultsPanel.classList.add('hidden');
    if (confetti) confetti.stop();
    // Allow next spin
    spinBtn.classList.remove('hidden');
    spinBtnOverlay.classList.remove('hidden');
    spinAgainBtn.disabled = false;
    removeWinnerBtn.disabled = false;
    try { (spinBtnOverlay.offsetParent ? spinBtnOverlay : spinBtn).focus({ preventScroll: true }); } catch {}
  });

  // Last Man Standing mode helpers
  function removeNameByIndex(idx) {
    const list = parseNames(namesInput.value);
    if (idx >= 0 && idx < list.length) {
      list.splice(idx, 1);
      namesInput.value = list.join('\n');
      applyNames();
    }
  }

  // After finish, if LMS has no protected index yet, set it to the first picked name
  // Remove earlier auto-protect behavior; LMS relies solely on the selected dropdown value now

  // Timer event listeners
  timerBtn.addEventListener('click', () => {
    timerInput.classList.remove('hidden');
    timerBtn.classList.add('hidden');
    timerMinutes.focus();
  });

  startTimer.addEventListener('click', () => {
    const minutes = parseInt(timerMinutes.value) || 0;
    const seconds = parseInt(timerSeconds.value) || 0;
    const totalSeconds = minutes * 60 + seconds;
    
    if (totalSeconds <= 0) {
      showValidationNotification('Please enter a valid time!');
      return;
    }
    
    if (totalSeconds > 3600) { // Max 1 hour
      showValidationNotification('Please enter a time less than 1 hour!');
      return;
    }
    
    timerTimeLeft = totalSeconds;
    startTimerCountdown();
    
    // Clear inputs
    timerMinutes.value = '';
    timerSeconds.value = '';
  });

  cancelTimer.addEventListener('click', () => {
    timerInput.classList.add('hidden');
    timerBtn.classList.remove('hidden');
    timerMinutes.value = '';
    timerSeconds.value = '';
  });

  // Input validation for timer
  timerMinutes.addEventListener('input', (e) => {
    let value = parseInt(e.target.value);
    if (value > 59) e.target.value = 59;
    if (value < 0) e.target.value = 0;
  });

  timerSeconds.addEventListener('input', (e) => {
    let value = parseInt(e.target.value);
    if (value > 59) e.target.value = 59;
    if (value < 0) e.target.value = 0;
  });

  // Close notification event listener
  closeNotification.addEventListener('click', hideTimerNotification);

  // Allow Enter key to start timer
  timerMinutes.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      startTimer.click();
    }
  });

  timerSeconds.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      startTimer.click();
    }
  });

  // Keyboard shortcuts for better UX (ignore while typing in inputs/textarea)
  window.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName || '').toLowerCase();
    const isEditing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.isComposing;
    if (isEditing) return;
    const k = (e.key || '').toLowerCase();
    if (k === ' ' || k === 'enter') {
      // If dialog open and Enter pressed → Spin Again
      if (!resultsPanel.classList.contains('hidden') && k === 'enter') {
        e.preventDefault();
        spinAgainBtn.click();
        return;
      }
      // If not spinning and dialog closed → start spin
      if (!spinning && resultsPanel.classList.contains('hidden')) {
        e.preventDefault();
        spinBtn.click();
      }
    }
    if (k === 'escape' && !resultsPanel.classList.contains('hidden')) closeResults();
  });

  

  // Populate fixed select initially
  function initFromText() {
    applyNames();
    restoreSelection();
  }

  // Resize confetti canvas on window resize
  window.addEventListener('resize', () => {
    drawWheel();
    if (confetti) { confetti.stop(); confetti.start(); }
  });

  // Settings toggle: when settings are visible, hide the wheel entirely
  toggleSettingsBtn.addEventListener('click', () => {
    const settingsHidden = controlsPanel.classList.toggle('hidden');
    if (!settingsHidden) {
      // Show settings only
      appMain.classList.add('full-width');
      wheelSection.classList.add('hidden');
      wheelSection.setAttribute('aria-hidden', 'true');
      // Hide Spin button from settings area
      spinBtn.classList.add('hidden');
    } else {
      // Hide settings, show wheel
      appMain.classList.add('full-width');
      wheelSection.classList.remove('hidden');
      wheelSection.removeAttribute('aria-hidden');
      // Restore Spin button visibility when settings are hidden
      spinBtn.classList.remove('hidden');
      // redraw wheel to adapt to space
      drawWheel();
    }
    toggleSettingsBtn.textContent = settingsHidden ? 'Show Settings' : 'Hide Settings';
    toggleSettingsBtn.setAttribute('aria-expanded', String(!settingsHidden));
  });

  initFromText();
  syncModeUI();
  drawWheel();
})();
