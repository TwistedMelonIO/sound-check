document.addEventListener("DOMContentLoaded", function () {
  let currentFilter = "all";
  let allActivities = [];

  fetch("/api/activity?limit=1000")
    .then((r) => r.json())
    .then((activities) => {
      allActivities = activities;
      renderActivityLog(activities);
    });

  function renderActivityLog(activities) {
    const body = document.getElementById("activityLogBody");
    const filtered =
      currentFilter === "all"
        ? activities
        : activities.filter((a) => a.type.includes(currentFilter));

    document.getElementById("entryCount").textContent =
      filtered.length + " entries";

    if (filtered.length === 0) {
      body.innerHTML =
        '<tr><td colspan="4" style="text-align:center;color:var(--text-tertiary);padding:2rem;">No activity entries</td></tr>';
      return;
    }

    body.innerHTML = [...filtered]
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
    document
      .querySelectorAll(".filter-btn[data-filter]")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    renderActivityLog(allActivities);
  };

  window.exportActivityLog = function () {
    const csv =
      "Timestamp,Type,Details,Source,Round\n" +
      allActivities
        .map(
          (a) =>
            `"${a.timestamp}","${a.type}","${a.details}","${a.source}","${a.round !== undefined ? a.round : ""}"`
        )
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sound-check-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
          allActivities = [];
          renderActivityLog([]);
          showNotification("Activity log reset");
        } else {
          showNotification(data.message || "Failed to reset log", true);
        }
      })
      .catch(() => showNotification("Failed to reset log", true));
  };

  document
    .getElementById("resetLogModal")
    .addEventListener("click", function (e) {
      if (e.target === this) closeResetLogModal();
    });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeResetLogModal();
  });

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
