document.addEventListener("DOMContentLoaded", function () {
  let currentPack = "";
  let selectedPack = "";
  let allPacks = [];
  let currentFilter = "all";

  // =============================================================================
  // Load initial data
  // =============================================================================
  Promise.all([
    fetch("/api/packs").then((r) => r.json()),
    fetch("/api/pack-settings").then((r) => r.json()),
    fetch("/api/state").then((r) => r.json()),
    fetch("/api/benchmark-history").then((r) => r.json()),
    fetch("/api/activity?limit=200").then((r) => r.json()),
  ]).then(([packs, packSettings, state, benchHistory, activity]) => {
    allPacks = packs;
    currentPack = packSettings.currentPack;
    selectedPack = currentPack;
    renderPackSelection(packs, currentPack);
    document.getElementById("currentBenchmark").textContent = state.benchmark;
    document.getElementById("currentScore").textContent = state.score;
    renderBenchmarkHistory(benchHistory);
    renderActivityLog(activity);
  });

  // =============================================================================
  // Pack Selection
  // =============================================================================
  function renderPackSelection(packs, current) {
    const container = document.getElementById("packSelection");
    container.innerHTML = packs
      .map(
        (pack) => `
      <div class="pack-card ${pack.id === current ? "selected" : ""}"
           data-pack="${pack.id}"
           onclick="selectPack('${pack.id}')">
        <div class="pack-card-title">${pack.name}</div>
        <div class="pack-card-desc">${pack.description}</div>
        ${pack.id === current ? '<div class="pack-card-badge">Current</div>' : ""}
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
  };

  window.savePack = function () {
    if (!selectedPack) return;
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
          showNotification("Pack saved successfully");
        }
      })
      .catch(() => showNotification("Failed to save pack", true));
  };

  // =============================================================================
  // Benchmark
  // =============================================================================
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
          input.value = "";
          showNotification(`Benchmark set to ${data.benchmark}`);
        }
      })
      .catch(() => showNotification("Failed to set benchmark", true));
  };

  function renderBenchmarkHistory(history) {
    const container = document.getElementById("benchmarkHistory");
    if (!history || history.length === 0) {
      container.innerHTML = '<p style="font-size:0.8rem;color:var(--text-tertiary);">No benchmark history yet</p>';
      return;
    }

    container.innerHTML = `
      <table class="history-table">
        <thead>
          <tr><th>Date</th><th>Previous</th><th>New</th><th>Pack</th></tr>
        </thead>
        <tbody>
          ${history
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
  // Activity Log
  // =============================================================================
  function renderActivityLog(activities) {
    const body = document.getElementById("activityLogBody");
    const filtered = currentFilter === "all" ? activities : activities.filter((a) => a.type.includes(currentFilter));

    if (filtered.length === 0) {
      body.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-tertiary);padding:2rem;">No activity entries</td></tr>';
      return;
    }

    body.innerHTML = filtered
      .reverse()
      .map(
        (entry) => `
      <tr>
        <td style="white-space:nowrap;font-variant-numeric:tabular-nums;">${new Date(entry.timestamp).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</td>
        <td><span class="activity-type ${getTypeClass(entry.type)}">${entry.type}</span></td>
        <td>${entry.details}</td>
        <td>${entry.source}</td>
      </tr>
    `
      )
      .join("");
  }

  function getTypeClass(type) {
    if (type.includes("score")) return "score";
    if (type.includes("round")) return "round";
    if (type.includes("track")) return "track";
    return "system";
  }

  window.setFilter = function (filter, btn) {
    currentFilter = filter;
    document.querySelectorAll(".filter-btn[data-filter]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    fetch(`/api/activity?limit=200`)
      .then((r) => r.json())
      .then((activities) => renderActivityLog(activities));
  };

  window.exportActivityLog = function () {
    fetch("/api/activity?limit=1000")
      .then((r) => r.json())
      .then((activities) => {
        const csv =
          "Timestamp,Type,Details,Source,Round\n" +
          activities
            .map((a) => `"${a.timestamp}","${a.type}","${a.details}","${a.source}","${a.round !== undefined ? a.round : ""}"`)
            .join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `sound-check-activity-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      });
  };

  window.showResetLogModal = function () {
    document.getElementById("resetLogModal").classList.add("active");
    document.getElementById("resetLogPassword").value = "";
  };

  window.closeResetLogModal = function () {
    document.getElementById("resetLogModal").classList.remove("active");
  };

  window.executeResetLog = function () {
    const password = document.getElementById("resetLogPassword").value;
    fetch("/api/activity/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          closeResetLogModal();
          renderActivityLog([]);
          showNotification("Activity log reset");
        } else {
          showNotification(data.message || "Failed to reset log", true);
        }
      })
      .catch(() => showNotification("Failed to reset log", true));
  };

  // Close modals
  document.getElementById("resetLogModal").addEventListener("click", function (e) {
    if (e.target === this) closeResetLogModal();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeResetLogModal();
  });

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
            // Refresh data
            fetch("/api/state")
              .then((r) => r.json())
              .then((state) => {
                document.getElementById("currentBenchmark").textContent = state.benchmark;
                document.getElementById("currentScore").textContent = state.score;
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
