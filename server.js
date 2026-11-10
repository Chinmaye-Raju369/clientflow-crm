require("dotenv").config();
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(
    session({
        name: "clientflow.sid",
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax",
            secure: false,
            maxAge: 30 * 60 * 1000
        }
    })
);

// Admin login
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            message: "Username and password are required"
        });
    }

    const validUsername =
        username === process.env.ADMIN_USERNAME;

    const validPassword =
        process.env.ADMIN_PASSWORD_HASH &&
        await bcrypt.compare(
            password,
            process.env.ADMIN_PASSWORD_HASH
        );

    if (!validUsername || !validPassword) {
        return res.status(401).json({
            message: "Invalid username or password"
        });
    }

    req.session.regenerate((err) => {
        if (err) {
            return res.status(500).json({
                message: "Login failed"
            });
        }

        req.session.isAdmin = true;

        req.session.save((err) => {
            if (err) {
                return res.status(500).json({
                    message: "Could not save session"
                });
            }

            res.json({ message: "Login successful" });
        });
    });
});

// Check login status
app.get("/api/auth/status", (req, res) => {
    res.json({
        authenticated: req.session.isAdmin === true
    });
});

// Admin logout
app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                message: "Logout failed"
            });
        }

        res.clearCookie("clientflow.sid");
        res.json({ message: "Logged out successfully" });
    });
});

// Protect lead-management APIs
function requireAdmin(req, res, next) {
    if (req.session.isAdmin !== true) {
        return res.status(401).json({
            message: "Please log in as admin"
        });
    }

    next();
}

const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "leads.json");

let leads = [];
let nextId = 1;

if (fs.existsSync(DATA_FILE)) {
    try {
        const savedData = JSON.parse(
            fs.readFileSync(DATA_FILE, "utf8")
        );

        leads = Array.isArray(savedData.leads)
            ? savedData.leads
            : [];

        nextId = Number.isInteger(savedData.nextId)
            ? savedData.nextId
            : leads.reduce(
                (max, lead) => Math.max(max, Number(lead.id) || 0),
                0
            ) + 1;
    } catch (error) {
        console.error("Could not load saved leads:", error.message);
    }
}

function saveLeads() {
    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify({ leads, nextId }, null, 2),
        "utf8"
    );
}

app.get("/api", (req, res) => {
    res.json({
        message: "ClientFlow CRM backend is running!"
    });
});

// Get all leads
app.get("/api/leads", requireAdmin, (req, res) => {
    res.json(leads);
});

// Add a new lead
app.post("/api/leads", requireAdmin, (req, res) => {
    const { name, email, source } = req.body;

    if (!name || !email || !source) {
        return res.status(400).json({
            message: "Name, email and source are required"
        });
    }

    const lead = {
        id: nextId++,
        name,
        email,
        source,
        status: "New",
        notes: ""
    };

    leads.push(lead);
    saveLeads();
    res.status(201).json(lead);
});

// Update lead status or notes
app.patch("/api/leads/:id", requireAdmin, (req, res) => {
    const lead = leads.find(
        item => item.id === Number(req.params.id)
    );

    if (!lead) {
        return res.status(404).json({
            message: "Lead not found"
        });
    }

    const { status, notes } = req.body;

    if (status !== undefined) {
        if (!["New", "Contacted", "Converted"].includes(status)) {
            return res.status(400).json({
                message: "Invalid status"
            });
        }

        lead.status = status;
    }

    if (notes !== undefined) {
        lead.notes = String(notes);
    }

    res.json(lead);
});

// Delete a lead
app.delete("/api/leads/:id", requireAdmin, (req, res) => {
    const index = leads.findIndex(
        item => item.id === Number(req.params.id)
    );

    if (index === -1) {
        return res.status(404).json({
            message: "Lead not found"
        });
    }

    leads.splice(index, 1);

    res.json({
        message: "Lead deleted successfully"
    });
});

if (
    !process.env.SESSION_SECRET ||
    !process.env.ADMIN_USERNAME ||
    !process.env.ADMIN_PASSWORD_HASH
) {
    console.error(
        "Set SESSION_SECRET, ADMIN_USERNAME and ADMIN_PASSWORD_HASH before starting."
    );
    process.exit(1);
}

app.listen(PORT, () => {
    console.log(
        `ClientFlow server running at http://localhost:${PORT}`
    );
});