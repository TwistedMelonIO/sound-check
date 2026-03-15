document.addEventListener("DOMContentLoaded", function () {
  let currentPack = "";
  let selectedPack = "";
  let allPacks = [];
  let currentState = { score: 0, benchmark: 0 };

  // =============================================================================
  // Load initial data
  // =============================================================================
  Promise.all([
    fetch("/api/packs").then((r) => r.json()),
    fetch("/api/pack-settings").then((r) => r.json()),
    fetch("/api/state").then((r) => r.json()),
    fetch("/api/benchmark-history").then((r) => r.json()),
    fetch("/api/activity?limit=1000").then((r) => r.json()),
  ]).then(([packs, packSettings, state, benchHistory, activity]) => {
    allPacks = packs;
    currentPack = packSettings.currentPack;
    selectedPack = currentPack;
    renderPackSelection(packs, currentPack);
    currentState = state;
    document.getElementById("currentBenchmark").textContent = state.benchmark;
    document.getElementById("currentScore").textContent = state.score;
    updateBenchmarkProgress(state.score, state.benchmark);
    renderBenchmarkHistory(benchHistory);
    renderActivityStats(activity);
  });

  // =============================================================================
  // Pack Selection
  // =============================================================================
  function renderPackSelection(packs, current) {
    const container = document.getElementById("packSelection");
    container.innerHTML = packs
      .map(
        (pack, i) => `
      <div class="pack-card ${pack.id === current ? "selected" : ""}"
           data-pack="${pack.id}"
           onclick="selectPack('${pack.id}')">
        <div class="pack-card-num">${String(i + 1).padStart(2, "0")}</div>
        <div class="pack-card-info">
          <div class="pack-card-title">${pack.name}</div>
          <div class="pack-card-desc">${pack.description}</div>
        </div>
        <div class="pack-card-check"></div>
      </div>
    `
      )
      .join("");
  }

  window.selectPack = function (packId) {
    selectedPack = packId;
    const cards = document.querySelectorAll(".pack-card");
    cards.forEach((card) => {
      card.classList.toggle("selected", card.dataset.pack === packId);
    });
    fetch("/api/pack-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPack: selectedPack }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          currentPack = selectedPack;
          renderPackSelection(allPacks, currentPack);
          showNotification("Pack saved");
        }
      })
      .catch(() => showNotification("Failed to save pack", true));
  };

  // =============================================================================
  // Benchmark
  // =============================================================================
  function updateBenchmarkProgress(score, benchmark) {
    const fill = document.getElementById("benchProgressFill");
    const pct = document.getElementById("benchProgressPct");
    if (!fill || !pct) return;
    const ratio = benchmark > 0 ? Math.min(score / benchmark, 1) : 0;
    const display = benchmark > 0 ? Math.round((score / benchmark) * 100) : 0;
    fill.style.width = ratio * 100 + "%";
    fill.classList.toggle("over", score >= benchmark && benchmark > 0);
    pct.textContent = display + "%";
  }

  window.setBenchmark = function () {
    const input = document.getElementById("benchmarkInput");
    const value = parseInt(input.value);
    if (isNaN(value) || value < 0) return;

    fetch("/api/benchmark/set", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          document.getElementById("currentBenchmark").textContent = data.benchmark;
          currentState.benchmark = data.benchmark;
          updateBenchmarkProgress(currentState.score, data.benchmark);
          input.value = "";
          showNotification(`Benchmark set to ${data.benchmark}`);
          fetch("/api/benchmark-history")
            .then((r) => r.json())
            .then((h) => renderBenchmarkHistory(h));
        }
      })
      .catch(() => showNotification("Failed to set benchmark", true));
  };

  function renderBenchmarkHistory(history) {
    const container = document.getElementById("benchmarkHistory");
    if (!history || history.length === 0) {
      container.innerHTML = '<p style="font-size:0.75rem;color:var(--text-tertiary);">No benchmark history yet</p>';
      return;
    }

    container.innerHTML = `
      <table class="history-table">
        <thead>
          <tr><th>Date</th><th>Previous</th><th>New</th><th>Pack</th></tr>
        </thead>
        <tbody>
          ${[...history]
            .reverse()
            .map(
              (entry) => `
            <tr>
              <td>${new Date(entry.timestamp).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
              <td>${entry.previousBenchmark}</td>
              <td style="color:var(--accent-success);font-weight:600;">${entry.newBenchmark}</td>
              <td>${entry.packUsed || "-"}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
  }

  // =============================================================================
  // Activity stats (summary only)
  // =============================================================================
  function renderActivityStats(activities) {
    const totalEl = document.getElementById("activityTotalCount");
    const scoreEl = document.getElementById("activityScoreCount");
    if (totalEl) totalEl.textContent = activities.length;
    if (scoreEl) scoreEl.textContent = activities.filter((a) => a.type.includes("score")).length;
  }

  // =============================================================================
  // Full Reset
  // =============================================================================
  window.fullReset = function () {
    if (confirm("Are you sure you want to reset the game? If you beat the benchmark, a new one will be set.")) {
      fetch("/api/reset", { method: "POST" })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            showNotification("Game reset complete");
            fetch("/api/state")
              .then((r) => r.json())
              .then((state) => {
                currentState = state;
                document.getElementById("currentBenchmark").textContent = state.benchmark;
                document.getElementById("currentScore").textContent = state.score;
                updateBenchmarkProgress(state.score, state.benchmark);
              });
            fetch("/api/benchmark-history")
              .then((r) => r.json())
              .then((h) => renderBenchmarkHistory(h));
          }
        })
        .catch(() => showNotification("Failed to reset game", true));
    }
  };

  // =============================================================================
  // Notifications
  // =============================================================================
  function showNotification(message, isError = false) {
    const existing = document.querySelector(".notification");
    if (existing) existing.remove();

    const div = document.createElement("div");
    div.className = "notification";
    div.style.cssText = `
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      padding: 0.75rem 1.25rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 500;
      z-index: 2000;
      animation: fadeIn 0.3s ease;
      background: ${isError ? "var(--accent-danger)" : "var(--accent-success)"};
      color: white;
    `;
    div.textContent = message;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
  }
});
