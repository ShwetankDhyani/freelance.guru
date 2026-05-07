const API_BASE_URL = window.location.origin;

function setStatus(el, message, ok = true) {
    if (!el) return;
    el.textContent = message;
    el.classList.remove("status-success", "status-error");
    el.classList.add(ok ? "status-success" : "status-error");
}

async function createOrder(planName, amount) {
    const response = await fetch(`${API_BASE_URL}/api/payment/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planName, amount })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || "Unable to create payment order.");
    }
    return data;
}

function setupPlanPayments() {
    const buttons = document.querySelectorAll(".js-pay-plan");
    const paymentStatus = document.getElementById("payment-status");
    if (!buttons.length) return;

    buttons.forEach((btn) => {
        btn.addEventListener("click", async () => {
            const planName = btn.dataset.plan;
            const amount = Number(btn.dataset.amount);
            btn.disabled = true;
            setStatus(paymentStatus, "Preparing secure checkout...", true);

            try {
                const paymentData = await createOrder(planName, amount);

                if (!window.Razorpay) {
                    throw new Error("Razorpay checkout failed to load.");
                }

                const options = {
                    key: paymentData.keyId,
                    amount: paymentData.amount,
                    currency: paymentData.currency,
                    name: "freelance.guru",
                    description: planName,
                    order_id: paymentData.orderId,
                    prefill: {
                        name: "",
                        email: "",
                        contact: ""
                    },
                    theme: { color: "#7c3aed" },
                    handler() {
                        setStatus(paymentStatus, "Payment successful. We will contact you shortly.", true);
                    }
                };

                const rzp = new Razorpay(options);
                rzp.on("payment.failed", () => {
                    setStatus(paymentStatus, "Payment was not completed. Please try again.", false);
                });
                rzp.open();
            } catch (error) {
                setStatus(paymentStatus, error.message, false);
            } finally {
                btn.disabled = false;
            }
        });
    });
}

function setupContactForm() {
    const form = document.getElementById("contact-form");
    const statusEl = document.getElementById("contact-status");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const payload = {
            name: document.getElementById("name")?.value?.trim(),
            email: document.getElementById("email")?.value?.trim(),
            company: document.getElementById("company")?.value?.trim(),
            budget: document.getElementById("budget")?.value?.trim(),
            message: document.getElementById("message")?.value?.trim()
        };

        if (!payload.name || !payload.email || !payload.message) {
            setStatus(statusEl, "Please fill name, email, and project details.", false);
            return;
        }

        setStatus(statusEl, "Sending your inquiry...", true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/contact`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Could not send inquiry.");
            }

            form.reset();
            setStatus(statusEl, "Inquiry sent successfully. We will get back within one business day.", true);
        } catch (error) {
            setStatus(statusEl, error.message, false);
        }
    });
}

function setupNavToggle() {
    const nav = document.querySelector(".main-nav");
    const toggle = document.querySelector(".nav-toggle");
    if (!nav || !toggle) return;

    function closeMenu() {
        nav.classList.remove("open");
        toggle.classList.remove("active");
        toggle.setAttribute("aria-expanded", "false");
    }

    toggle.addEventListener("click", () => {
        const isOpen = nav.classList.toggle("open");
        toggle.classList.toggle("active", isOpen);
        toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    nav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", closeMenu);
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 980) closeMenu();
    });
}

function addChatMessage(target, text, type) {
    const item = document.createElement("div");
    item.className = `chat-msg ${type}`;
    item.textContent = text;
    target.appendChild(item);
    target.scrollTop = target.scrollHeight;
}

function setupChatWidget() {
    const widget = document.createElement("section");
    widget.className = "chat-widget";
    widget.innerHTML = `
        <button class="chat-toggle" type="button" aria-label="Open support chat">
            <img src="logo-guru.png" alt="Guru" class="chat-toggle-logo" />
            <span>Ask Guru</span>
        </button>
        <div class="chat-panel" aria-hidden="true">
            <div class="chat-header">
                <div class="chat-header-brand">
                    <img src="logo-guru.png" alt="Guru" class="chat-header-logo" />
                    <h3>freelance.guru Assistant</h3>
                </div>
                <button class="chat-close" type="button" aria-label="Close chat">x</button>
            </div>
            <div class="chat-body"></div>
            <form class="chat-form">
                <input class="chat-input" type="text" placeholder="Ask about pricing, timeline, support..." />
                <button class="btn btn-primary chat-send" type="submit">Send</button>
            </form>
        </div>
    `;

    document.body.appendChild(widget);

    const toggle = widget.querySelector(".chat-toggle");
    const panel = widget.querySelector(".chat-panel");
    const close = widget.querySelector(".chat-close");
    const form = widget.querySelector(".chat-form");
    const input = widget.querySelector(".chat-input");
    const body = widget.querySelector(".chat-body");

    addChatMessage(body, "Hi! I can help with pricing, timelines, payments, and project process.", "bot");

    function openChat() {
        panel.classList.add("open");
        panel.setAttribute("aria-hidden", "false");
        input.focus();
    }

    function closeChat() {
        panel.classList.remove("open");
        panel.setAttribute("aria-hidden", "true");
    }

    toggle.addEventListener("click", openChat);
    close.addEventListener("click", closeChat);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const text = input.value.trim();
        if (!text) return;

        addChatMessage(body, text, "user");
        input.value = "";

        try {
            const response = await fetch(`${API_BASE_URL}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Sorry, I could not answer right now.");
            }
            addChatMessage(body, data.reply, "bot");
        } catch (error) {
            addChatMessage(body, error.message, "bot");
        }
    });
}

setupPlanPayments();
setupContactForm();
setupNavToggle();
setupChatWidget();
