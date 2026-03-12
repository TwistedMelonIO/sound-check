document.addEventListener("DOMContentLoaded", function () {
  // =============================================================================
  // Round definitions (mirror of server)
  // =============================================================================
  const ROUNDS = [
    { id: 0, name: "OPENING", displayName: "Opening", shortName: "Open", duration: "3-4 min" },
    { id: 1, name: "SHOUT", displayName: "Round 1 - Shout", shortName: "R1", duration: "6 min" },
    { id: 2, name: "EVERYBODY_DANCE_NOW", displayName: "Round 2 - Everybody Dance Now", shortName: "R2", duration: "6-7 min" },
    { id: 3, name: "SING_IT_BACK", displayName: "Round 3 - Sing It Back", shortName: "R3", duration: "7 min" },
    { id: 4, name: "MID_SCORE_REVEAL", displayName: "Mid Show Score Reveal", shortName: "Mid", duration: "2-3 min" },
    { id: 5, name: "LET_ME_ENTERTAIN_YOU", displayName: "Round 4 - Let Me Entertain You", shortName: "R4", duration: "7 min" },
    { id: 6, name: "DO_YOU_REMEMBER", displayName: "Round 5 - Do You Remember The Time", shortName: "R5", duration: "5-6 min" },
    { id: 7, name: "ONE_MORE_TIME", displayName: "Final Round - One More Time", shortName: "Final", duration: "7-8 min" },
    { id: 8, name: "FINAL_SCORE_REVEAL", displayName: "Final Score Reveal", shortName: "End", duration: "3-4 min" },
  ];

  // =============================================================================
  // State
  // =============================================================================
  let currentState = null;
  let statePollingInterval = null;

  // =============================================================================
  // Socket.IO Connection
  // =============================================================================
  const socket = io();

  socket.on("connect", () => {
    console.log("[WS] Connected");
    updateConnectionStatus(true);
    stopStatePolling();
  });

  socket.on("disconnect", () => {
    console.log("[WS] Disconnected");
    updateConnectionStatus(false);
    startStatePolling();
  });

  socket.on("stateUpdate", (state) => {
    currentState = state;
    updateAllUI(state);
  });

  socket.on("scoreChanged", ({ score, delta }) => {
    flashScore(delta);
  });

  socket.on("roundChanged", ({ round, roundInfo }) => {
    updateTimeline(round);
  });

  socket.on("benchmarkReveal", ({ benchmark }) => {
    console.log(`Benchmark revealed: ${benchmark}`);
  });

  socket.on("scoreReveal", ({ score }) => {
    console.log(`Score revealed: ${score}`);
  });

  socket.on("gameReset", () => {
    console.log("Game reset");
  });

  socket.on("packChanged", ({ packId, packInfo }) => {
    if (packInfo) {
      document.getElementById("headerPack").textContent = packInfo.name;
    }
  });

  // =============================================================================
  // State Polling Fallback
  // =============================================================================
  function startStatePolling() {
    if (statePollingInterval) return;
    statePollingInterval = setInterval(() => {
      fetch("/api/state")
        .then((r) => r.json())
        .then((state) => {
          currentState = state;
          updateAllUI(state);
        })
        .catch(() => {});
    }, 2000);
  }

  function stopStatePolling() {
    if (statePollingInterval) {
      clearInterval(statePollingInterval);
      statePollingInterval = null;
    }
  }

  // =============================================================================
  // UI Updates
  // =============================================================================
  function updateAllUI(state) {
    updateScore(state.score);
    updateBenchmark(state.score, state.benchmark);
    updateTimeline(state.currentRound);
    updateRoundPanel(state);
    updateShowStatus(state.isActive);
    if (state.currentPackInfo) {
      document.getElementById("headerPack").textContent = state.currentPackInfo.name;
    }
  }

  function updateConnectionStatus(connected) {
    const footerStatus = document.getElementById("connectionStatus");
    if (footerStatus) {
      footerStatus.className = connected ? "connection-status connected" : "connection-status disconnected";
      const msg = footerStatus.querySelector(".message");
      if (msg) msg.textContent = connected ? "Connected to server" : "Disconnected from server";
    }
  }

  function updateScore(score) {
    const el = document.getElementById("scoreValue");
    const currentDisplayed = parseInt(el.textContent) || 0;
    if (currentDisplayed !== score) {
      animateValue(el, currentDisplayed, score, 400);
    }
  }

  function animateValue(el, start, end, duration) {
    const range = end - start;
    const startTime = performance.now();

    function step(timestamp) {
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(start + range * eased);
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  }

  function flashScore(delta) {
    const el = document.getElementById("scoreValue");
    el.classList.remove("flash-add", "flash-sub");
    void el.offsetWidth;

    const cls = delta > 0 ? "flash-add" : "flash-sub";
    if (delta !== 0) {
      el.classList.add(cls);
      setTimeout(() => el.classList.remove(cls), 600);
    }

    // Ripple effect
    if (delta !== 0) {
      const hero = document.getElementById("scoreHero");
      const ripple = document.createElement("div");
      ripple.className = "score-ripple";
      ripple.style.borderColor = delta > 0
        ? "var(--accent-success)"
        : "var(--accent-danger)";
      hero.appendChild(ripple);
      setTimeout(() => ripple.remove(), 750);
    }
  }

  function updateBenchmark(score, benchmark) {
    const fill = document.getElementById("benchmarkFill");
    const target = document.getElementById("benchmarkTarget");
    const proximity = document.getElementById("scoreProximity");
    const hero = document.getElementById("scoreHero");
    const ambientBg = document.querySelector(".ambient-bg");

    if (benchmark <= 0) {
      fill.style.width = "0%";
      target.textContent = "Target: Not Set";
      fill.classList.remove("beating");
      proximity.className = "score-proximity hidden";
      proximity.innerHTML = "";
      hero.classList.remove("benchmark-beaten");
      ambientBg.classList.remove("beating-mode");
      return;
    }

    const pct = Math.min((score / benchmark) * 100, 100);
    fill.style.width = pct + "%";
    target.textContent = `Target: ${benchmark}`;

    if (score >= benchmark) {
      fill.classList.add("beating");
      proximity.className = "score-proximity beating";
      proximity.innerHTML = '<i data-lucide="check-circle" style="width:16px;height:16px;"></i> BENCHMARK BEATEN';
      hero.classList.add("benchmark-beaten");
      ambientBg.classList.add("beating-mode");
      lucide.createIcons();
    } else {
      fill.classList.remove("beating");
      const diff = benchmark - score;
      proximity.className = "score-proximity deficit";
      proximity.innerHTML = `<i data-lucide="trending-up" style="width:16px;height:16px;"></i> ${diff} point${diff !== 1 ? "s" : ""} to beat benchmark`;
      hero.classList.remove("benchmark-beaten");
      ambientBg.classList.remove("beating-mode");
      lucide.createIcons();
    }
  }

  function updateTimeline(currentRound) {
    const rail = document.getElementById("timelineRail");
    rail.innerHTML = "";

    ROUNDS.forEach((round, i) => {
      if (i > 0) {
        const connector = document.createElement("div");
        connector.className = "timeline-connector" + (i <= currentRound ? " past" : "");
        rail.appendChild(connector);
      }

      const pill = document.createElement("div");
      let stateClass = "future";
      if (i < currentRound) stateClass = "past";
      if (i === currentRound) stateClass = "current";
      pill.className = `timeline-pill ${stateClass}`;
      pill.onclick = () => jumpToRound(i);

      pill.innerHTML = `
        <span class="pill-number">${i}</span>
        <span>${round.shortName}</span>
      `;
      rail.appendChild(pill);
    });

    setTimeout(() => {
      const current = rail.querySelector(".timeline-pill.current");
      if (current) {
        current.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }, 100);
  }

  function updateRoundPanel(state) {
    // Round bar elements removed from UI — no-op
  }

  function updateShowStatus(isActive) {
    const status = document.getElementById("showStatus");
    const dot = document.getElementById("showStatusDot");
    const text = document.getElementById("showStatusText");

    if (isActive) {
      status.className = "show-status active";
      dot.className = "status-dot connected";
      text.textContent = "Live";
    } else {
      status.className = "show-status inactive";
      dot.className = "status-dot disconnected";
      text.textContent = "Standby";
    }
  }

  // =============================================================================
  // Actions (exposed globally)
  // =============================================================================
  window.addPoints = function (points) {
    socket.emit("addScore", points);
  };

  window.subtractPoints = function (points) {
    socket.emit("subtractScore", points);
  };

  window.addCustomPoints = function () {
    const input = document.getElementById("customPoints");
    const val = parseInt(input.value);
    if (val && val > 0) {
      socket.emit("addScore", val);
      input.value = "";
    }
  };

  window.subtractCustomPoints = function () {
    const input = document.getElementById("customPoints");
    const val = parseInt(input.value);
    if (val && val > 0) {
      socket.emit("subtractScore", val);
      input.value = "";
    }
  };

  window.nextRound = function () {
    socket.emit("nextRound");
  };

  window.previousRound = function () {
    socket.emit("previousRound");
  };

  window.jumpToRound = function (roundNumber) {
    socket.emit("setRound", roundNumber);
  };

  window.revealBenchmark = function () {
    fetch("/api/benchmark/reveal", { method: "POST" }).catch(() => {});
  };

  window.revealScore = function () {
    fetch("/api/score/reveal", { method: "POST" }).catch(() => {});
  };

  window.toggleShow = function () {
    if (currentState && currentState.isActive) {
      fetch("/api/stop", { method: "POST" }).catch(() => {});
    } else {
      fetch("/api/start", { method: "POST" }).catch(() => {});
    }
  };

  window.showResetModal = function () {
    document.getElementById("resetModal").classList.add("active");
  };

  window.closeResetModal = function () {
    document.getElementById("resetModal").classList.remove("active");
  };

  window.executeReset = function () {
    socket.emit("reset");
    closeResetModal();
  };

  // Close modal on overlay click or Escape
  document.getElementById("resetModal").addEventListener("click", function (e) {
    if (e.target === this) closeResetModal();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeResetModal();
  });

  // =============================================================================
  // Initial load
  // =============================================================================
  fetch("/api/state")
    .then((r) => r.json())
    .then((state) => {
      currentState = state;
      updateAllUI(state);
    })
    .catch(() => {});
});
