const SERVICE_A = "http://localhost:8080";
const SERVICE_B = "http://localhost:8081";
let lastPatientId = null;
let lastPatientName = null;

// ── NAV ──
document.querySelectorAll(".nav-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    document.querySelectorAll(".nav-tab").forEach((t) => t.classList.remove("active"));
    const page = tab.dataset.page;
    document.getElementById("page-" + page).classList.add("active");
    tab.classList.add("active");
    if (page === "patients") loadPatients();
    if (page === "records") loadRecords();
  });
});

// ── TOAST ──
function showToast(msg, type = "success") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show " + type;
  setTimeout(() => t.classList.remove("show"), 3500);
}

// ── FORMAT TANGGAL ──
function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}
function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) + " " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

// ── REGISTRASI ──
document.getElementById("reg-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("reg-btn");
  btn.disabled = true;
  btn.textContent = "Mendaftarkan...";

  const fd = new FormData(e.target);
  const allergyCode = (fd.get("allergyCode") || "").toString().trim();
  const allergyLabel = (fd.get("allergyLabel") || "").toString().trim();

  const payload = {
    name: fd.get("name"),
    dateOfBirth: fd.get("dateOfBirth"),
    gender: fd.get("gender"),
    visitDate: fd.get("visitDate"),
    clinicCode: fd.get("clinicCode"),
    requireRealtimeValidation: true,
    medical: {
      diagnosis: (fd.get("diagnosis") || "").toString().trim() || null,
      notes: (fd.get("notes") || "").toString().trim() || null,
      allergies:
        allergyCode && allergyLabel
          ? [
              {
                code: allergyCode,
                label: allergyLabel,
                is_critical: fd.get("allergyCritical") === "on",
              },
            ]
          : [],
      visit: {
        visit_date: fd.get("visitDate"),
        clinic_code: fd.get("clinicCode"),
        diagnosis: (fd.get("visitDiagnosis") || "").toString().trim() || null,
        doctor_notes: (fd.get("doctorNotes") || "").toString().trim() || null,
      },
    },
  };

  const resultBox = document.getElementById("reg-result");
  const resultHeader = document.getElementById("reg-result-header");
  const resultBody = document.getElementById("reg-result-body");
  const viewBtn = document.getElementById("view-record-btn");

  try {
    const res = await fetch(`${SERVICE_A}/registrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    resultBody.textContent = JSON.stringify(data, null, 2);
    resultBox.classList.add("show");

    if (res.ok) {
      resultHeader.className = "result-header success";
      resultHeader.textContent = "✓ Registrasi Berhasil";
      lastPatientId = data.patientId;
      lastPatientName = data.name || payload.name;
      viewBtn.classList.add("show");
      viewBtn.textContent = `🏥 Lihat Rekam Medis — ${lastPatientName} →`;
      showToast("Pasien berhasil didaftarkan!", "success");
    } else {
      resultHeader.className = "result-header error";
      resultHeader.textContent = "✕ Registrasi Gagal";
      viewBtn.classList.remove("show");
      showToast("Registrasi gagal: " + (data.message || ""), "error");
    }
  } catch (err) {
    resultBody.textContent = "Error: " + err.message;
    resultBox.classList.add("show");
    resultHeader.className = "result-header error";
    resultHeader.textContent = "✕ Koneksi Gagal";
    viewBtn.classList.remove("show");
    showToast("Tidak bisa terhubung ke Service A", "error");
  }

  btn.disabled = false;
  btn.textContent = "Daftarkan Pasien";
});

document.getElementById("view-record-btn").addEventListener("click", () => {
  if (!lastPatientId) return;
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.querySelectorAll(".nav-tab").forEach((t) => t.classList.remove("active"));
  document.getElementById("page-rec").classList.add("active");
  document.querySelector('[data-page="rec"]').classList.add("active");
  document.getElementById("pid-input").value = lastPatientId;
  fetchRecord();
});

// ── DAFTAR PASIEN ──
async function loadPatients() {
  const container = document.getElementById("patients-container");
  const countEl = document.getElementById("patient-count");
  container.innerHTML = `<div class="loading"><div class="spinner"></div>Memuat data pasien...</div>`;

  try {
    const res = await fetch(`${SERVICE_A}/patients`);
    const data = await res.json();
    const patients = data.patients || [];
    countEl.textContent = `${patients.length} pasien terdaftar`;

    if (patients.length === 0) {
      container.innerHTML = `<div class="list-table-wrap" style="padding:40px;text-align:center">
        <div style="font-size:2rem;margin-bottom:8px">👥</div>
        <div style="color:var(--ink-soft)">Belum ada pasien yang mendaftar</div>
      </div>`;
      return;
    }

    container.innerHTML = `
      <div class="list-table-wrap">
        <table class="list-table patients-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nama Pasien</th>
              <th>Kelamin</th>
              <th>Tgl Lahir</th>
              <th>Kunjungan</th>
              <th>Klinik</th>
              <th>Terdaftar</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${patients
              .map(
                (p, i) => `
              <tr onclick="goToRecordByPatient('${escJsString(p.id)}', '${escJsString(p.name)}')">
                <td style="color:var(--ink-soft);font-size:0.8rem">${i + 1}</td>
                <td>
                  <div class="name-cell">${escHtml(p.name)}</div>
                  <div class="id-cell">${p.id}</div>
                </td>
                <td><span class="gender-badge gender-${p.gender}">${p.gender === "M" ? "L" : "P"}</span></td>
                <td style="font-size:0.83rem">${fmtDate(p.date_of_birth)}</td>
                <td style="font-size:0.83rem">${p.visit_date ? fmtDate(p.visit_date) : '<span style="color:var(--ink-soft)">—</span>'}</td>
                <td>${p.clinic_code ? `<span class="clinic-badge">${escHtml(p.clinic_code)}</span>` : "—"}</td>
                <td style="font-size:0.78rem;color:var(--ink-soft)">${fmtDateTime(p.created_at)}</td>
                <td><button class="action-btn" onclick="event.stopPropagation();goToRecordByPatient('${escJsString(p.id)}','${escJsString(p.name)}')">Rekam</button></td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    countEl.textContent = "Gagal memuat";
    container.innerHTML = `<div class="list-table-wrap" style="padding:40px;text-align:center">
      <div style="font-size:2rem;margin-bottom:8px">⚠️</div>
      <div style="font-weight:600;color:var(--red)">Gagal terhubung ke Service A</div>
      <div style="color:var(--ink-soft);font-size:0.88rem;margin-top:4px">${err.message}</div>
    </div>`;
    showToast("Tidak bisa terhubung ke Service A", "error");
  }
}

// ── CACHE data rekam medis terakhir ──
let cachedRecords = null;
let cachedRecordTime = null;

// ── DAFTAR REKAM MEDIS ──
async function loadRecords() {
  const container = document.getElementById("records-container");
  const countEl = document.getElementById("record-count");
  container.innerHTML = `<div class="loading"><div class="spinner"></div>Memuat rekam medis...</div>`;

  try {
    const [recRes, patRes] = await Promise.allSettled([fetch(`${SERVICE_B}/medical-records`), fetch(`${SERVICE_A}/patients`)]);

    let records = null;
    let totalPatients = null;
    const serviceBOnline = recRes.status === "fulfilled" && recRes.value.ok;

    if (serviceBOnline) {
      const data = await recRes.value.json();
      records = data.records || [];
      cachedRecords = records;
      cachedRecordTime = new Date();
    } else {
      // Pakai cache kalau ada
      records = cachedRecords;
    }

    if (patRes.status === "fulfilled" && patRes.value.ok) {
      const data = await patRes.value.json();
      totalPatients = data.total;
    }

    // Banner status Service B
    const statusBanner = !serviceBOnline
      ? `
      <div class="comparison-bar" style="border-left:4px solid var(--red);margin-bottom:16px">
        <div style="font-size:1.4rem">🔴</div>
        <div>
          <div style="font-weight:700;color:var(--red);margin-bottom:2px">Service B Sedang Mati</div>
          <div style="font-size:0.85rem;color:var(--ink-soft)">
            Data rekam medis di bawah adalah ${cachedRecordTime ? `cache terakhir (${fmtDateTime(cachedRecordTime.toISOString())})` : "tidak tersedia"}.
            Pesan di RabbitMQ akan diproses otomatis saat Service B hidup kembali.
          </div>
        </div>
      </div>`
      : "";

    const displayRecords = records || [];
    countEl.textContent = serviceBOnline ? `${displayRecords.length} rekam medis` : `${cachedRecords ? cachedRecords.length : "?"} rekam medis (cache)`;

    // Comparison bar
    const diff = totalPatients !== null && records !== null ? totalPatients - displayRecords.length : null;
    const comparisonHtml =
      totalPatients !== null && records !== null
        ? `
      <div class="comparison-bar">
        <div class="cmp-item">
          <div class="cmp-num teal">${totalPatients}</div>
          <div class="cmp-label">Pasien (Service A)</div>
        </div>
        <div class="cmp-divider">→</div>
        <div class="cmp-item">
          <div class="cmp-num ${diff === 0 ? "teal" : "gold"}">${displayRecords.length}</div>
          <div class="cmp-label">Rekam Medis${!serviceBOnline ? " (cache)" : ""}</div>
        </div>
        ${
          diff > 0
            ? `
        <div class="cmp-divider">=</div>
        <div class="cmp-item">
          <div class="cmp-num red">${diff}</div>
          <div class="cmp-label">Belum Diproses</div>
        </div>
        <div class="cmp-note">⚠️ Ada <strong>${diff} pasien</strong> yang rekam medisnya belum dibuat — pesan sudah antri di RabbitMQ dan akan diproses otomatis saat Service B aktif.</div>
        `
            : `<div class="cmp-note">✅ Semua rekam medis sudah sinkron.</div>`
        }
      </div>
    `
        : totalPatients !== null
          ? `
      <div class="comparison-bar">
        <div class="cmp-item"><div class="cmp-num teal">${totalPatients}</div><div class="cmp-label">Pasien (Service A)</div></div>
        <div class="cmp-note" style="color:var(--ink-soft)">Data rekam medis belum tersedia — Service B mati dan belum ada cache.</div>
      </div>`
          : "";

    if (displayRecords.length === 0) {
      container.innerHTML =
        statusBanner +
        comparisonHtml +
        `<div class="list-table-wrap" style="padding:40px;text-align:center">
        <div style="font-size:2rem;margin-bottom:8px">🗂️</div>
        <div style="color:var(--ink-soft)">${!serviceBOnline && !cachedRecords ? "Service B mati, tidak ada data cache" : "Belum ada rekam medis yang dibuat"}</div>
      </div>`;
      return;
    }

    container.innerHTML =
      statusBanner +
      comparisonHtml +
      `
      <div class="list-table-wrap">
        <table class="list-table records-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nama Pasien</th>
              <th>Kunjungan Terakhir</th>
              <th>Dibuat</th>
              <th>Diperbarui</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${displayRecords
              .map((r, i) => {
                return `
                <tr onclick="goToRecordByPatient('${escJsString(r.patient_id)}', '${escJsString(r.patient_name || "")}')">
                <td style="color:var(--ink-soft);font-size:0.8rem">${i + 1}</td>
                <td>
                  <div class="name-cell">${escHtml(r.patient_name || "—")}</div>
                  <div class="id-cell">${r.patient_id}</div>
                </td>
                <td style="font-size:0.85rem">${fmtDateTime(r.last_visit_at)}</td>
                <td style="font-size:0.8rem;color:var(--ink-soft)">${fmtDateTime(r.created_at)}</td>
                <td style="font-size:0.8rem;color:var(--ink-soft)">${fmtDateTime(r.updated_at)}</td>
                  <td><button class="action-btn" onclick="event.stopPropagation();goToRecordByPatient('${escJsString(r.patient_id)}','${escJsString(r.patient_name || "")}')">Detail</button></td>
              </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    countEl.textContent = "Gagal memuat";
    container.innerHTML = `<div class="list-table-wrap" style="padding:40px;text-align:center">
      <div style="font-size:2rem;margin-bottom:8px">⚠️</div>
      <div style="font-weight:600;color:var(--red)">Gagal terhubung ke Service B</div>
      <div style="color:var(--ink-soft);font-size:0.88rem;margin-top:4px">${err.message}</div>
    </div>`;
    showToast("Tidak bisa terhubung ke Service B", "error");
  }
}

// ── NAVIGASI KE REKAM MEDIS ──
function goToRecordByPatient(patientId, name) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.querySelectorAll(".nav-tab").forEach((t) => t.classList.remove("active"));
  document.getElementById("page-rec").classList.add("active");
  document.querySelector('[data-page="rec"]').classList.add("active");
  document.getElementById("pid-input").value = patientId;
  fetchRecord(name);
}

function goToRecordById(patientId) {
  goToRecordByPatient(patientId, null);
}

function getCurrentPatientId() {
  return document.getElementById("pid-input").value.trim();
}

// ── DETAIL REKAM MEDIS ──
async function fetchRecord(patientName) {
  const pid = document.getElementById("pid-input").value.trim();
  if (!pid) {
    showToast("Masukkan Patient ID dulu", "error");
    return;
  }

  const container = document.getElementById("record-container");
  container.innerHTML = `<div class="loading"><div class="spinner"></div>Mengambil rekam medis...</div>`;

  try {
    const res = await fetch(`${SERVICE_B}/medical-records/${pid}`);
    const data = await res.json();

    if (!res.ok) {
      container.innerHTML = `<div class="card" style="text-align:center;padding:40px">
        <div style="font-size:2rem;margin-bottom:12px">🔍</div>
        <div style="font-weight:600;color:var(--ink);margin-bottom:6px">Rekam Medis Tidak Ditemukan</div>
        <div style="color:var(--ink-soft);font-size:0.9rem">${data.message || "Patient ID tidak ditemukan di Service B"}</div>
        ${patientName ? `<div style="margin-top:12px;font-size:0.85rem;color:var(--ink-soft)">Pasien <strong>${escHtml(patientName)}</strong> sudah terdaftar di Service A, tapi rekam medisnya belum dibuat — kemungkinan Service B sedang mati saat pendaftaran.</div>` : ""}
      </div>`;
      return;
    }

    const allergiesHtml =
      data.allergies && data.allergies.length > 0
        ? data.allergies
            .map(
              (a) => `<div class="allergy-row">
            <span class="allergy-tag ${a.is_critical ? "critical" : "normal"}">
              ${a.is_critical ? "⚠️ " : ""}${escHtml(a.label)} <small>(${escHtml(a.code)})</small>
            </span>
            <button class="mini-danger-btn" type="button" onclick="deleteAllergy('${escJsString(a.id)}')">Hapus</button>
          </div>`,
            )
            .join("")
        : `<span class="empty-state">Tidak ada data alergi</span>`;

    const visitsHtml =
      data.visit_history && data.visit_history.length > 0
        ? `<table class="visit-table">
          <thead><tr><th>Tanggal</th><th>Klinik</th><th>Diagnosis</th><th>Catatan Dokter</th><th>Dibuat</th></tr></thead>
          <tbody>
            ${data.visit_history
              .map(
                (v) => `<tr>
              <td><span class="visit-date-badge">${fmtDate(v.visit_date)}</span></td>
              <td><span class="clinic-badge">${escHtml(v.clinic_code)}</span></td>
              <td>${v.diagnosis ? escHtml(v.diagnosis) : '<span style="color:var(--ink-soft);font-style:italic">—</span>'}</td>
              <td>${v.doctor_notes ? escHtml(v.doctor_notes) : '<span style="color:var(--ink-soft);font-style:italic">—</span>'}</td>
              <td style="color:var(--ink-soft);font-size:0.8rem">${fmtDateTime(v.created_at)}</td>
            </tr>`,
              )
              .join("")}
          </tbody>
        </table>`
        : `<span class="empty-state">Belum ada riwayat kunjungan</span>`;

    const displayName = patientName || data.patient_name || "Pasien";

    container.innerHTML = `
      <form id="detail-form" onsubmit="submitMedicalDetail(event)">
      <div class="record-hero">
        <div class="record-hero-name">${escHtml(displayName)}</div>
        <div class="record-hero-id">RECORD ID</div>
        <div class="record-hero-pid">${data.id}</div>
        <div class="record-hero-id">PATIENT ID</div>
        <div class="record-hero-pid">${data.patient_id}</div>
        <div class="record-meta">
          <div class="record-meta-item"><label>Kunjungan Terakhir</label><span>${fmtDateTime(data.last_visit_at)}</span></div>
          <div class="record-meta-item"><label>Dibuat</label><span>${fmtDateTime(data.created_at)}</span></div>
          <div class="record-meta-item"><label>Diperbarui</label><span>${fmtDateTime(data.updated_at)}</span></div>
        </div>
      </div>
        <div class="card section">
        <div class="section-title">📝 Catatan & Diagnosis</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div>
            <div style="font-size:0.78rem;color:var(--ink-soft);text-transform:uppercase;font-weight:600;margin-bottom:6px">Diagnosis</div>
            <div>${data.diagnosis ? escHtml(data.diagnosis) : '<span style="color:var(--ink-soft);font-style:italic">Belum ada diagnosis</span>'}</div>
          </div>
          <div>
            <div style="font-size:0.78rem;color:var(--ink-soft);text-transform:uppercase;font-weight:600;margin-bottom:6px">Catatan</div>
            <div>${data.notes ? escHtml(data.notes) : '<span style="color:var(--ink-soft);font-style:italic">Belum ada catatan</span>'}</div>
          </div>
        </div>
          <div class="record-form-grid">
            <div class="field full">
              <label>Diagnosis</label>
              <input id="update-diagnosis" placeholder="Contoh: Hipertensi ringan" value="${escHtml(data.diagnosis || "")}" />
            </div>
            <div class="field full">
              <label>Catatan</label>
              <textarea id="update-notes" rows="3" placeholder="Tambahkan catatan klinis...">${escHtml(data.notes || "")}</textarea>
            </div>
          </div>
      </div>
      <div class="card section">
        <div class="section-title">💊 Alergi</div>
        <div class="allergy-list">${allergiesHtml}</div>
          <div class="record-inline-form">
            <div class="field">
              <label>Kode</label>
              <input id="allergy-code" placeholder="Contoh: PEN" />
            </div>
            <div class="field">
              <label>Label</label>
              <input id="allergy-label" placeholder="Contoh: Penicillin" />
            </div>
            <div class="field" style="padding-top:24px">
              <label style="text-transform:none;letter-spacing:0;font-size:0.84rem">
                <input id="allergy-critical" type="checkbox" style="margin-right:6px" /> Alergi kritis
              </label>
            </div>
          </div>
      </div>
      <div class="card section">
        <div class="section-title">📅 Riwayat Kunjungan (${data.visit_history ? data.visit_history.length : 0})</div>
          <div class="record-form-grid">
            <div class="field">
              <label>Tanggal Kunjungan</label>
              <input id="visit-date" type="date" value="${new Date().toISOString().slice(0, 10)}" />
            </div>
            <div class="field">
              <label>Kode Klinik</label>
              <input id="visit-clinic" placeholder="Contoh: GEN" />
            </div>
            <div class="field full">
              <label>Diagnosis Kunjungan</label>
              <input id="visit-diagnosis" placeholder="Diagnosis saat kunjungan ini" />
            </div>
            <div class="field full">
              <label>Catatan Dokter</label>
              <textarea id="visit-doctor-notes" rows="3" placeholder="Catatan dari dokter..."></textarea>
            </div>
          </div>
        ${visitsHtml}
      </div>
      <div class="card section">
        <button type="submit" class="btn btn-primary">Simpan</button>
      </div>
      </form>
    `;
    showToast("Rekam medis ditemukan", "success");
  } catch (err) {
    container.innerHTML = `<div class="card" style="text-align:center;padding:40px">
      <div style="font-size:2rem;margin-bottom:12px">⚠️</div>
      <div style="font-weight:600;color:var(--red)">Gagal terhubung ke Service B</div>
      <div style="color:var(--ink-soft);font-size:0.9rem;margin-top:6px">${err.message}</div>
    </div>`;
    showToast("Tidak bisa terhubung ke Service B", "error");
  }
}

document.getElementById("pid-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") fetchRecord();
});

async function submitMedicalDetail(event) {
  event.preventDefault();
  const patientId = getCurrentPatientId();
  if (!patientId) {
    showToast("Patient ID tidak ditemukan", "error");
    return;
  }

  const diagnosis = (document.getElementById("update-diagnosis")?.value || "").trim();
  const notes = (document.getElementById("update-notes")?.value || "").trim();
  const allergyCode = (document.getElementById("allergy-code")?.value || "").trim();
  const allergyLabel = (document.getElementById("allergy-label")?.value || "").trim();
  const allergyCritical = Boolean(document.getElementById("allergy-critical")?.checked);
  const visitDate = document.getElementById("visit-date")?.value;
  const clinicCode = (document.getElementById("visit-clinic")?.value || "").trim();
  const visitDiagnosis = (document.getElementById("visit-diagnosis")?.value || "").trim();
  const doctorNotes = (document.getElementById("visit-doctor-notes")?.value || "").trim();

  if ((allergyCode && !allergyLabel) || (!allergyCode && allergyLabel)) {
    showToast("Kode dan label alergi harus diisi berpasangan", "error");
    return;
  }

  if ((visitDate && !clinicCode) || (!visitDate && clinicCode)) {
    showToast("Tanggal kunjungan dan kode klinik harus diisi berpasangan", "error");
    return;
  }

  try {
    const patchRes = await fetch(`${SERVICE_B}/medical-records/${patientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diagnosis, notes }),
    });
    const patchData = await patchRes.json();
    if (!patchRes.ok) {
      throw new Error(patchData.message || "Gagal menyimpan catatan");
    }

    if (allergyCode && allergyLabel) {
      const allergyRes = await fetch(`${SERVICE_B}/medical-records/${patientId}/allergies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: allergyCode, label: allergyLabel, is_critical: allergyCritical }),
      });
      const allergyData = await allergyRes.json();
      if (!allergyRes.ok) {
        throw new Error(allergyData.message || "Gagal menambah alergi");
      }
    }

    if (visitDate && clinicCode) {
      const visitRes = await fetch(`${SERVICE_B}/medical-records/${patientId}/visits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visit_date: visitDate,
          clinic_code: clinicCode,
          diagnosis: visitDiagnosis || null,
          doctor_notes: doctorNotes || null,
        }),
      });
      const visitData = await visitRes.json();
      if (!visitRes.ok) {
        throw new Error(visitData.message || "Gagal menambah kunjungan");
      }
    }

    showToast("Perubahan rekam medis berhasil disimpan", "success");
    await fetchRecord();
  } catch (err) {
    showToast(err.message || "Gagal menyimpan perubahan", "error");
  }
}

// ── HELPER ──
function escHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function escJsString(str) {
  if (str === null || str === undefined) return "";
  return String(str).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/</g, "\\x3C");
}

// Default visit date = hari ini
document.querySelector('input[name="visitDate"]').valueAsDate = new Date();

// ── Expose ke global scope agar bisa dipanggil dari onclick di HTML (Vite ES Module) ──
window.loadPatients = loadPatients;
window.loadRecords = loadRecords;
window.fetchRecord = fetchRecord;
window.goToRecordByPatient = goToRecordByPatient;
window.goToRecordById = goToRecordById;
window.submitMedicalDetail = submitMedicalDetail;
window.deleteAllergy = deleteAllergy;
