const leadForm = document.getElementById("leadForm");
const leadList = document.getElementById("leadList");

const API_URL = "/api/leads";

async function displayLeads() {
    try {
        const response = await fetch(API_URL);
        const leads = await response.json();

        leadList.innerHTML = "";

        if (leads.length === 0) {
            leadList.innerHTML = "<p>No leads added yet.</p>";
            return;
        }

        leads.forEach(lead => {
            const card = document.createElement("div");
            card.className = "lead-card";

            card.innerHTML = `
                <h3>${escapeHTML(lead.name)}</h3>
                <p>Email: ${escapeHTML(lead.email)}</p>
                <p>Source: ${escapeHTML(lead.source)}</p>

                <label>Status:</label>
                <select class="status-select" data-id="${lead.id}">
                    ${["New", "Contacted", "Converted"].map(status =>
                        `<option ${lead.status === status ? "selected" : ""}>${status}</option>`
                    ).join("")}
                </select>

                <label>Notes / Follow-up:</label>
                <textarea class="notes-input" data-id="${lead.id}"
                    placeholder="Write notes here...">${escapeHTML(lead.notes || "")}</textarea>

                <button class="delete-btn" data-id="${lead.id}">Delete Lead</button>
            `;

            leadList.appendChild(card);
        });
    } catch (error) {
        leadList.innerHTML = "<p>Could not load leads. Check whether the server is running.</p>";
    }
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

leadForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const source = document.getElementById("source").value.trim();

    if (!name || !email || !source) return;

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, source })
        });

        if (!response.ok) {
            alert("Could not add lead. Please try again.");
            return;
        }

        leadForm.reset();
        await displayLeads();
    } catch (error) {
        alert("Server connection failed. Make sure the server is running.");
    }
});

leadList.addEventListener("change", async function(event) {
    const id = event.target.dataset.id;
    if (!id) return;

    let data;

    if (event.target.matches(".status-select")) {
        data = { status: event.target.value };
    } else if (event.target.matches(".notes-input")) {
        data = { notes: event.target.value };
    } else {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        if (!response.ok) alert("Could not update lead.");
    } catch (error) {
        alert("Server connection failed.");
    }
});

leadList.addEventListener("click", async function(event) {
    if (!event.target.matches(".delete-btn")) return;

    const id = event.target.dataset.id;

    if (!confirm("Are you sure you want to delete this lead?")) return;

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            alert("Could not delete lead.");
            return;
        }

        await displayLeads();
    } catch (error) {
        alert("Server connection failed.");
    }
});

displayLeads();