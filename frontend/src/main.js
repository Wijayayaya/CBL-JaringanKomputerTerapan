const form = document.getElementById("registration-form");
const result = document.getElementById("result");

const SERVICE_A_URL = "http://localhost:8080";

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  result.textContent = "Submitting...";

  const formData = new FormData(form);
  const payload = {
    name: formData.get("name"),
    dateOfBirth: formData.get("dateOfBirth"),
    gender: formData.get("gender"),
    visitDate: formData.get("visitDate"),
    clinicCode: formData.get("clinicCode"),
    requireRealtimeValidation: formData.get("requireRealtimeValidation") === "on"
  };

  try {
    const res = await fetch(`${SERVICE_A_URL}/registrations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    result.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    result.textContent = `Request failed: ${error.message}`;
  }
});
