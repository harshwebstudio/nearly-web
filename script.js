/* ==========================================
NEARLY WEB APP
SCRIPT.JS — PART 1/2
========================================== */

(() => {
"use strict";

const STORAGE_KEY = "nearly_workspace_v1";

const $ = (selector, parent = document) =>
    parent.querySelector(selector);

const $$ = (selector, parent = document) =>
    [...parent.querySelectorAll(selector)];

const escapeHTML = (value = "") =>
    String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);

const makeId = () =>
    `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const today = () =>
    new Date().toISOString().slice(0, 10);

const defaultData = {
    settings: {
        workspace: "NEARLY Workspace",
        userName: "Workspace Owner",
        currency: "INR"
    },
    clients: [],
    projects: [],
    tasks: [],
    finance: []
};

function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) return structuredClone(defaultData);

        const parsed = JSON.parse(saved);

        return {
            ...structuredClone(defaultData),
            ...parsed,
            settings: {
                ...defaultData.settings,
                ...(parsed.settings || {})
            },
            clients: Array.isArray(parsed.clients) ? parsed.clients : [],
            projects: Array.isArray(parsed.projects) ? parsed.projects : [],
            tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
            finance: Array.isArray(parsed.finance) ? parsed.finance : []
        };
    } catch (error) {
        console.error("NEARLY storage loading error:", error);
        return structuredClone(defaultData);
    }
}

let data = loadData();

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error("NEARLY storage saving error:", error);
        showToast("Could not save data on this device.");
        return false;
    }
}

function formatMoney(amount = 0) {
    const currency = data.settings.currency || "INR";

    try {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency,
            maximumFractionDigits: 2
        }).format(Number(amount) || 0);
    } catch {
        return `${currency} ${Number(amount) || 0}`;
    }
}

function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2600);
}

function showPage(pageName) {
    $$(".page-section").forEach(section => {
        section.classList.toggle(
            "active",
            section.id === `${pageName}Page`
        );
    });

    $$(".nav-link").forEach(link => {
        link.classList.toggle(
            "active",
            link.dataset.page === pageName
        );
    });

    const sidebar = $(".sidebar");
    if (sidebar) sidebar.classList.remove("open");

    const overlay = $("#sidebarOverlay");
    if (overlay) overlay.classList.remove("show");

    const titles = {
        dashboard: "Dashboard",
        crm: "CRM & Clients",
        projects: "Projects & Tasks",
        finance: "Finance",
        reports: "Reports",
        settings: "Settings"
    };

    const pageTitle = $("#pageTitle");
    if (pageTitle) {
        pageTitle.textContent = titles[pageName] || "Dashboard";
    }

    renderAll();
}

function setupNavigation() {
    $$(".nav-link").forEach(link => {
        link.addEventListener("click", event => {
            event.preventDefault();
            showPage(link.dataset.page || "dashboard");
        });
    });

    const menuToggle = $("#menuToggle");
    const sidebar = $(".sidebar");
    const overlay = $("#sidebarOverlay");

    if (menuToggle && sidebar) {
        menuToggle.addEventListener("click", () => {
            sidebar.classList.toggle("open");
            if (overlay) overlay.classList.toggle("show");
        });
    }

    if (overlay) {
        overlay.addEventListener("click", () => {
            sidebar?.classList.remove("open");
            overlay.classList.remove("show");
        });
    }

    $$("[data-page-target]").forEach(button => {
        button.addEventListener("click", () => {
            showPage(button.dataset.pageTarget);
        });
    });
}

function getTotals() {
    const income = data.finance
        .filter(item => item.type === "Income")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const expenses = data.finance
        .filter(item => item.type === "Expense")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const outstanding = data.finance
        .filter(item =>
            item.type === "Invoice" &&
            item.status !== "Paid"
        )
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return {
        income,
        expenses,
        balance: income - expenses,
        outstanding
    };
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function renderDashboard() {
    const totals = getTotals();

    setText("totalRevenue", formatMoney(totals.income));
    setText("totalExpenses", formatMoney(totals.expenses));
    setText("netBalance", formatMoney(totals.balance));
    setText("outstandingTotal", formatMoney(totals.outstanding));

    setText("totalClients", data.clients.length);
    setText("totalProjects", data.projects.length);
    setText("totalTasks", data.tasks.length);

    const completedTasks = data.tasks.filter(task => task.completed).length;
    setText("completedTasks", completedTasks);

    const recentBody = $("#recentActivity");
    if (recentBody) {
        const recent = [...data.finance]
            .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
            .slice(0, 5);

        recentBody.innerHTML = recent.length
            ? recent.map(item => `
                <tr>
                    <td>${escapeHTML(item.title)}</td>
                    <td>${escapeHTML(item.type)}</td>
                    <td>${formatMoney(item.amount)}</td>
                    <td>${escapeHTML(item.date || "—")}</td>
                </tr>
            `).join("")
            : `<tr><td colspan="4">No financial activity yet.</td></tr>`;
    }
}

function renderClients() {
    const body = $("#clientsTable");
    if (!body) return;

    const search = ($("#clientSearch")?.value || "").toLowerCase().trim();
    const filter = $("#clientFilter")?.value || "All";

    const clients = data.clients.filter(client => {
        const text = [
            client.name,
            client.email,
            client.phone,
            client.business
        ].join(" ").toLowerCase();

        const matchesSearch = text.includes(search);
        const matchesFilter = filter === "All" || client.status === filter;

        return matchesSearch && matchesFilter;
    });

    body.innerHTML = clients.length
        ? clients.map(client => `
            <tr>
                <td>${escapeHTML(client.name)}</td>
                <td>${escapeHTML(client.business || "—")}</td>
                <td>${escapeHTML(client.email || "—")}</td>
                <td>${escapeHTML(client.phone || "—")}</td>
                <td><span class="status-badge">${escapeHTML(client.status || "Lead")}</span></td>
                <td>
                    <button class="btn btn-small btn-danger"
                        data-delete="client"
                        data-id="${escapeHTML(client.id)}">
                        Delete
                    </button>
                </td>
            </tr>
        `).join("")
        : `<tr><td colspan="6">No clients found. Add your first client.</td></tr>`;

    setText("clientCount", data.clients.length);
}

function renderProjects() {
    const container = $("#projectsList");
    if (!container) return;

    container.innerHTML = data.projects.length
        ? data.projects.map(project => {
            const progress = Math.max(
                0,
                Math.min(100, Number(project.progress) || 0)
            );

            return `
                <article class="project-card">
                    <div class="project-card-header">
                        <h3>${escapeHTML(project.name)}</h3>
                        <span class="status-badge">${escapeHTML(project.status || "Planning")}</span>
                    </div>
                    <p>${escapeHTML(project.client || "No client assigned")}</p>
                    <div class="progress-track">
                        <div class="progress-fill" style="width:${progress}%"></div>
                    </div>
                    <p>${progress}% complete</p>
                    <button class="btn btn-small"
                        data-progress="${escapeHTML(project.id)}">
                        Update Progress
                    </button>
                    <button class="btn btn-small btn-danger"
                        data-delete="project"
                        data-id="${escapeHTML(project.id)}">
                        Delete
                    </button>
                </article>
            `;
        }).join("")
        : `<p class="empty-state">No projects yet. Create your first project.</p>`;
}

function renderTasks() {
    const container = $("#taskList");
    if (!container) return;

    container.innerHTML = data.tasks.length
        ? data.tasks.map(task => `
            <div class="task-item">
                <label>
                    <input type="checkbox"
                        data-task-toggle="${escapeHTML(task.id)}"
                        ${task.completed ? "checked" : ""}>
                    <span class="${task.completed ? "task-completed" : ""}">
                        ${escapeHTML(task.title)}
                    </span>
                </label>
                <small>${escapeHTML(task.dueDate || "No deadline")}</small>
                <button class="btn btn-small btn-danger"
                    data-delete="task"
                    data-id="${escapeHTML(task.id)}">
                    Delete
                </button>
            </div>
        `).join("")
        : `<p class="empty-state">No tasks yet. Add a task to get started.</p>`;
}

function renderFinance() {
    const body = $("#financeTable");
    if (!body) return;

    body.innerHTML = data.finance.length
        ? [...data.finance]
            .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
            .map(item => `
                <tr>
                    <td>${escapeHTML(item.title)}</td>
                    <td>${escapeHTML(item.type)}</td>
                    <td>${formatMoney(item.amount)}</td>
                    <td>${escapeHTML(item.date || "—")}</td>
                    <td>${escapeHTML(item.status || "Recorded")}</td>
                    <td>
                        ${item.type === "Invoice" && item.status !== "Paid"
                            ? `<button class="btn btn-small" data-mark-paid="${escapeHTML(item.id)}">Mark Paid</button>`
                            : ""}
                        <button class="btn btn-small btn-danger"
                            data-delete="finance"
                            data-id="${escapeHTML(item.id)}">
                            Delete
                        </button>
                    </td>
                </tr>
            `).join("")
        : `<tr><td colspan="6">No financial records yet.</td></tr>`;
}

function renderReports() {
    const totals = getTotals();

    setText("reportRevenue", formatMoney(totals.income));
    setText("reportExpenses", formatMoney(totals.expenses));
    setText("reportBalance", formatMoney(totals.balance));
    setText("reportOutstanding", formatMoney(totals.outstanding));
    setText("reportClientCount", data.clients.length);
    setText("reportProjectCount", data.projects.length);
}

function renderSettings() {
    const workspace = $("#workspaceName");
    const userName = $("#userName");
    const currency = $("#currency");

    if (workspace && document.activeElement !== workspace) {
        workspace.value = data.settings.workspace;
    }

    if (userName && document.activeElement !== userName) {
        userName.value = data.settings.userName;
    }

    if (currency && document.activeElement !== currency) {
        currency.value = data.settings.currency;
    }

    setText("brandWorkspace", data.settings.workspace);
    setText("profileName", data.settings.userName);
}

function renderAll() {
    renderDashboard();
    renderClients();
    renderProjects();
    renderTasks();
    renderFinance();
    renderReports();
    renderSettings();
}

function closeModal() {
    const backdrop = $("#modalBackdrop");
    if (backdrop) backdrop.classList.remove("show");

    const form = $("#recordForm");
    if (form) form.reset();

    const fields = $("#modalFields");
    if (fields) fields.innerHTML = "";
}

function openModal(title, fields, onSave) {
    const backdrop = $("#modalBackdrop");
    const heading = $("#modalTitle");
    const container = $("#modalFields");
    const form = $("#recordForm");

    if (!backdrop || !heading || !container || !form) {
        showToast("Form interface not found in index.html.");
        return;
    }

    heading.textContent = title;
    container.innerHTML = "";

    fields.forEach(field => {
        const wrapper = document.createElement("div");
        wrapper.className = "form-group";

        const label = document.createElement("label");
        label.textContent = field.label;
        label.htmlFor = `field-${field.name}`;
        wrapper.appendChild(label);

        let input;

        if (field.type === "select") {
            input = document.createElement("select");

            (field.options || []).forEach(option => {
                const optionElement = document.createElement("option");
                optionElement.value = option.value;
                optionElement.textContent = option.label;
                input.appendChild(optionElement);
            });
        } else if (field.type === "textarea") {
            input = document.createElement("textarea");
            input.rows = 3;
        } else {
            input = document.createElement("input");
            input.type = field.type || "text";
        }

        input.id = `field-${field.name}`;
        input.name = field.name;
        input.required = Boolean(field.required);

        if (field.value !== undefined) {
            input.value = field.value;
        }

        if (field.placeholder) {
            input.placeholder = field.placeholder;
        }

        wrapper.appendChild(input);
        container.appendChild(wrapper);
    });

    form.onsubmit = event => {
        event.preventDefault();

        const values = Object.fromEntries(
            fields.map(field => {
                const input = form.elements.namedItem(field.name);
                return [
                    field.name,
                    input ? input.value.trim() : ""
                ];
            })
        );

        onSave(values);
        closeModal();
    };

    backdrop.classList.add("show");
}

function addClient() {
    openModal("Add New Client", [
        { name: "name", label: "Client Name", required: true },
        { name: "business", label: "Business Name" },
        { name: "email", label: "Email Address", type: "email" },
        { name: "phone", label: "Phone Number", type: "tel" },
        {
            name: "status",
            label: "Client Status",
            type: "select",
            options: [
                { value: "Lead", label: "Lead" },
                { value: "Active", label: "Active" },
                { value: "Inactive", label: "Inactive" }
            ]
        }
    ], values => {
        data.clients.push({
            id: makeId(),
            ...values,
            createdAt: today()
        });

        saveData();
        renderAll();
        showToast("Client added successfully.");
    });
}

function addProject() {
    openModal("Create Project", [
        { name: "name", label: "Project Name", required: true },
        { name: "client", label: "Client Name" },
        {
            name: "status",
            label: "Project Status",
            type: "select",
            options: [
                { value: "Planning", label: "Planning" },
                { value: "In Progress", label: "In Progress" },
                { value: "On Hold", label: "On Hold" },
                { value: "Completed", label: "Completed" }
            ]
        },
        {
            name: "progress",
            label: "Progress (%)",
            type: "number",
            value: "0"
        },
        { name: "dueDate", label: "Deadline", type: "date" }
    ], values => {
        const progress = Math.max(
            0,
            Math.min(100, Number(values.progress) || 0)
        );

        data.projects.push({
            id: makeId(),
            ...values,
            progress,
            createdAt: today()
        });

        saveData();
        renderAll();
        showToast("Project created successfully.");
    });
}

function addTask() {
    openModal("Add Task", [
        { name: "title", label: "Task Name", required: true },
        { name: "dueDate", label: "Deadline", type: "date" },
        {
            name: "priority",
            label: "Priority",
            type: "select",
            options: [
                { value: "Low", label: "Low" },
                { value: "Medium", label: "Medium" },
                { value: "High", label: "High" }
            ]
        }
    ], values => {
        data.tasks.push({
            id: makeId(),
            ...values,
            completed: false,
            createdAt: today()
        });

        saveData();
        renderAll();
        showToast("Task added successfully.");
    });
}

function addFinanceRecord() {
    openModal("Add Financial Record", [
        { name: "title", label: "Description", required: true },
        {
            name: "type",
            label: "Record Type",
            type: "select",
            options: [
                { value: "Income", label: "Income" },
                { value: "Expense", label: "Expense" },
                { value: "Invoice", label: "Invoice" }
            ]
        },
        {
            name: "amount",
            label: "Amount",
            type: "number",
            required: true
        },
        {
            name: "date",
            label: "Date",
            type: "date",
            value: today(),
            required: true
        },
        {
            name: "status",
            label: "Payment Status",
            type: "select",
            options: [
                { value: "Recorded", label: "Recorded" },
                { value: "Unpaid", label: "Unpaid" },
                { value: "Paid", label: "Paid" }
            ]
        }
    ], values => {
        const amount = Number(values.amount);

        if (!Number.isFinite(amount) || amount < 0) {
            showToast("Enter a valid amount.");
            return;
        }

        data.finance.push({
            id: makeId(),
            ...values,
            amount,
            status: values.type === "Invoice"
                ? values.status
                : "Recorded",
            createdAt: new Date().toISOString()
        });

        saveData();
        renderAll();
        showToast("Financial record added.");
    });
}

function deleteRecord(type, id) {
    const collectionMap = {
        client: "clients",
        project: "projects",
        task: "tasks",
        finance: "finance"
    };

    const collection = collectionMap[type];
    if (!collection) return;

    if (!confirm("Are you sure you want to delete this record?")) {
        return;
    }

    data[collection] = data[collection].filter(
        item => String(item.id) !== String(id)
    );

    saveData();
    renderAll();
    showToast("Record deleted.");
}

function updateProjectProgress(id) {
    const project = data.projects.find(
        item => String(item.id) === String(id)
    );

    if (!project) return;

    const current = Number(project.progress) || 0;
    const entered = prompt(
        "Enter project progress from 0 to 100:",
        String(current)
    );

    if (entered === null || entered.trim() === "") return;

    const progress = Number(entered);

    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
        showToast("Enter a number between 0 and 100.");
        return;
    }

    project.progress = progress;

    if (progress === 100) {
        project.status = "Completed";
    } else if (progress > 0 && project.status === "Planning") {
        project.status = "In Progress";
    }

    saveData();
    renderAll();
    showToast("Project progress updated.");
}

function exportCSV() {
    const records = data.finance;

    if (!records.length) {
        showToast("There are no financial records to export.");
        return;
    }

    const headers = ["Description", "Type", "Amount", "Date", "Status"];

    const escapeCSV = value =>
        `"${String(value ?? "").replace(/"/g, '""')}"`;

    const rows = records.map(item => [
        item.title,
        item.type,
        item.amount,
        item.date,
        item.status
    ]);

    const csv = [
        headers,
        ...rows
    ].map(row => row.map(escapeCSV).join(",")).join("\r\n");

    const blob = new Blob(
        ["\uFEFF", csv],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "nearly-finance-report.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
    showToast("CSV report exported.");
}

function backupData() {
    const blob = new Blob(
        [JSON.stringify(data, null, 2)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "nearly-backup.json";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
    showToast("Backup downloaded.");
}

function restoreData() {
    const input = $("#restoreFile");
    if (input) input.click();
}

function setupRestore() {
    const input = $("#restoreFile");
    if (!input) return;

    input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (!file) return;

        try {
            const restored = JSON.parse(await file.text());

            if (
                !restored ||
                !Array.isArray(restored.clients) ||
                !Array.isArray(restored.projects) ||
                !Array.isArray(restored.tasks) ||
                !Array.isArray(restored.finance)
            ) {
                throw new Error("Invalid backup structure.");
            }

            if (!confirm("Restore this backup? Current local data will be replaced.")) {
                input.value = "";
                return;
            }

            data = {
                ...structuredClone(defaultData),
                ...restored,
                settings: {
                    ...defaultData.settings,
                    ...(restored.settings || {})
                }
            };

            saveData();
            renderAll();
            showToast("Backup restored.");
        } catch (error) {
            console.error(error);
            showToast("Invalid backup file.");
        }

        input.value = "";
    });
}

function setupSettings() {
    const form = $("#settingsForm");
    if (!form) return;

    form.addEventListener("submit", event => {
        event.preventDefault();

        data.settings.workspace =
            $("#workspaceName")?.value.trim() ||
            "NEARLY Workspace";

        data.settings.userName =
            $("#userName")?.value.trim() ||
            "Workspace Owner";

        data.settings.currency =
            $("#currency")?.value || "INR";

        saveData();
        renderAll();
        showToast("Settings saved.");
    });
}

function setupSearch() {
    $("#clientSearch")?.addEventListener("input", renderClients);
    $("#clientFilter")?.addEventListener("change", renderClients);
}

function setupButtons() {
    $("#addClientBtn")?.addEventListener("click", addClient);
    $("#addProjectBtn")?.addEventListener("click", addProject);
    $("#addTaskBtn")?.addEventListener("click", addTask);
    $("#addFinanceBtn")?.addEventListener("click", addFinanceRecord);

    $("#quickAddBtn")?.addEventListener("click", () => {
        const choice = prompt(
            "What would you like to add?\n1. Client\n2. Project\n3. Task\n4. Finance Record"
        );

        switch (choice) {
            case "1": addClient(); break;
            case "2": addProject(); break;
            case "3": addTask(); break;
            case "4": addFinanceRecord(); break;
            case null:
            case "":
                break;
            default:
                showToast("Choose 1, 2, 3 or 4.");
        }
    });

    $("#exportCSVBtn")?.addEventListener("click", exportCSV);
    $("#backupBtn")?.addEventListener("click", backupData);
    $("#restoreBtn")?.addEventListener("click", restoreData);

    $("#closeModal")?.addEventListener("click", closeModal);
    $("#cancelModal")?.addEventListener("click", closeModal);

    $("#modalBackdrop")?.addEventListener("click", event => {
        if (event.target === event.currentTarget) closeModal();
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeModal();
    });

    document.addEventListener("click", event => {
        const target = event.target.closest(
            "[data-delete], [data-progress], [data-mark-paid]"
        );

        if (!target) return;

        if (target.dataset.delete) {
            deleteRecord(
                target.dataset.delete,
                target.dataset.id
            );
        }

        if (target.dataset.progress) {
            updateProjectProgress(target.dataset.progress);
        }

        if (target.dataset.markPaid) {
            const invoice = data.finance.find(
                item => String(item.id) === String(target.dataset.markPaid)
            );

            if (invoice) {
                invoice.status = "Paid";
                saveData();
                renderAll();
                showToast("Invoice marked as paid.");
            }
        }
    });

    document.addEventListener("change", event => {
        const id = event.target.dataset.taskToggle;
        if (!id) return;

        const task = data.tasks.find(
            item => String(item.id) === String(id)
        );

        if (!task) return;

        task.completed = event.target.checked;
        saveData();
        renderAll();
    });
}

function init() {
    setupNavigation();
    setupSearch();
    setupButtons();
    setupSettings();
    setupRestore();
    renderAll();
    showPage("dashboard");

    console.log("NEARLY Web App initialized.");
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}

})();
