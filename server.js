const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const Razorpay = require("razorpay");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const leadsPath = path.join(__dirname, "data", "leads.json");

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function ensureLeadsFile() {
    const dataDir = path.join(__dirname, "data");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(leadsPath)) fs.writeFileSync(leadsPath, "[]", "utf-8");
}

function getRazorpayClient() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return null;
    return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

app.post("/api/contact", (req, res) => {
    const { name, email, company, budget, message } = req.body || {};

    if (!name || !email || !message) {
        return res.status(400).json({ error: "Name, email, and message are required." });
    }

    ensureLeadsFile();
    const existing = JSON.parse(fs.readFileSync(leadsPath, "utf-8"));
    existing.push({
        id: Date.now(),
        name,
        email,
        company: company || "",
        budget: budget || "",
        message,
        createdAt: new Date().toISOString()
    });
    fs.writeFileSync(leadsPath, JSON.stringify(existing, null, 2), "utf-8");
    return res.json({ ok: true });
});

app.post("/api/payment/order", async (req, res) => {
    try {
        const { planName, amount } = req.body || {};
        if (!planName || !amount) {
            return res.status(400).json({ error: "Plan name and amount are required." });
        }

        const razorpay = getRazorpayClient();
        if (!razorpay) {
            return res.status(500).json({
                error: "Payment gateway not configured yet. Add Razorpay keys in .env."
            });
        }

        const order = await razorpay.orders.create({
            amount: Number(amount) * 100,
            currency: "INR",
            receipt: `rcpt_${Date.now()}`
        });

        return res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        return res.status(500).json({ error: "Unable to create payment order." });
    }
});

app.post("/api/chat", (req, res) => {
    const message = (req.body?.message || "").toString().trim();
    if (!message) {
        return res.status(400).json({ error: "Message is required." });
    }

    const q = message.toLowerCase();
    let reply = "Great question. Please share a bit more detail, or use the contact form and our team will reply within one business day.";

    if (q.includes("price") || q.includes("cost") || q.includes("plan")) {
        reply = "Our most popular plans are INR 14,999 (Local Business Starter), INR 34,999 (Lead Generation Pro), and INR 69,999 (E-commerce or Premium Brand Site).";
    } else if (q.includes("time") || q.includes("timeline") || q.includes("delivery")) {
        reply = "Typical delivery: Starter 7-10 days, Growth 2-3 weeks, Premium 4-6 weeks. Timelines can vary based on content readiness and revisions.";
    } else if (q.includes("web development") || q.includes("web app") || q.includes("custom website")) {
        reply = "Yes, custom web development is our core service. We build complete websites and web apps, then layer SEO, automation, and conversion add-ons as needed.";
    } else if (q.includes("best") || q.includes("demand") || q.includes("high demand") || q.includes("bang for time")) {
        reply = "Best high-demand services right now: lead-generation websites, ad landing pages, local SEO upgrades, e-commerce setup, and maintenance retainers.";
    } else if (q.includes("payment") || q.includes("razorpay")) {
        reply = "Yes, we support secure online payments via Razorpay checkout. You can book a plan directly from the Services page.";
    } else if (q.includes("seo") || q.includes("speed") || q.includes("performance")) {
        reply = "Yes. Every package includes responsive design and core optimization. Growth and Premium include stronger performance and technical SEO optimization.";
    } else if (q.includes("support") || q.includes("maintenance")) {
        reply = "We provide maintenance and growth support retainers for updates, fixes, and optimization after launch.";
    } else if (q.includes("contact") || q.includes("call") || q.includes("email")) {
        reply = "You can use the Contact page form, and we usually respond within one business day. You can also book a discovery call directly.";
    } else if (q.includes("stack") || q.includes("technology") || q.includes("tech")) {
        reply = "We commonly work with modern stacks like React, Next.js, Node.js, Shopify, WordPress, and cloud platforms based on project goals.";
    }

    return res.json({ reply });
});

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
