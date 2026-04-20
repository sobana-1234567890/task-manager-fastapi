const API_BASE_URL = "https://your-backend-url.onrender.com";

const authSection = document.getElementById("auth-section");
const taskSection = document.getElementById("task-section");
const messageEl = document.getElementById("message");
const taskList = document.getElementById("task-list");
const filterSelect = document.getElementById("filter-completed");
const loggedInUserEl = document.getElementById("logged-in-user");
const registerBtn = document.getElementById("register-btn");
const loginBtn = document.getElementById("login-btn");
const addTaskBtn = document.getElementById("add-task-btn");
const showLoginTabBtn = document.getElementById("show-login-tab");
const showRegisterTabBtn = document.getElementById("show-register-tab");
const loginPanel = document.getElementById("login-panel");
const registerPanel = document.getElementById("register-panel");

const getToken = () => localStorage.getItem("token");
const setToken = (token) => localStorage.setItem("token", token);
const clearToken = () => localStorage.removeItem("token");
const getUserEmail = () => localStorage.getItem("userEmail");
const setUserEmail = (email) => localStorage.setItem("userEmail", email);
const clearUserEmail = () => localStorage.removeItem("userEmail");

function setMessage(message, isError = true) {
  if (!message) {
    messageEl.classList.add("hidden");
    messageEl.classList.remove("alert-error", "alert-success");
    messageEl.textContent = "";
    return;
  }
  messageEl.classList.remove("hidden");
  messageEl.classList.remove("alert-error", "alert-success");
  messageEl.classList.add(isError ? "alert-error" : "alert-success");
  messageEl.textContent = message;
}

function toggleView() {
  const isLoggedIn = Boolean(getToken());
  authSection.classList.toggle("hidden", isLoggedIn);
  taskSection.classList.toggle("hidden", !isLoggedIn);
  if (isLoggedIn) {
    const userEmail = getUserEmail() || "current user";
    loggedInUserEl.textContent = `Logged in as ${userEmail}`;
    loadTasks();
  } else {
    loggedInUserEl.textContent = "";
  }
}

function showAuthPanel(panel) {
  const showLogin = panel === "login";
  loginPanel.classList.toggle("hidden", !showLogin);
  registerPanel.classList.toggle("hidden", showLogin);
  showLoginTabBtn.classList.toggle("active", showLogin);
  showRegisterTabBtn.classList.toggle("active", !showLogin);
}

function setButtonLoading(button, isLoading, loadingText) {
  if (!button) {
    return;
  }
  if (!button.dataset.defaultText) {
    button.dataset.defaultText = button.textContent;
  }
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : button.dataset.defaultText;
}

async function apiRequest(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return null;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.detail || "Request failed.");
  }
  return payload;
}

document.getElementById("register-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");

  const body = {
    username: document.getElementById("register-username").value.trim(),
    email: document.getElementById("register-email").value.trim(),
    password: document.getElementById("register-password").value,
  };

  setButtonLoading(registerBtn, true, "Registering...");
  try {
    await apiRequest("/register", {
      method: "POST",
      body: JSON.stringify(body),
    });
    setMessage("Registration successful. Please login.", false);
    event.target.reset();
    showAuthPanel("login");
  } catch (error) {
    setMessage(error.message);
  } finally {
    setButtonLoading(registerBtn, false, "");
  }
});

showLoginTabBtn.addEventListener("click", () => showAuthPanel("login"));
showRegisterTabBtn.addEventListener("click", () => showAuthPanel("register"));

document.getElementById("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");

  const body = {
    email: document.getElementById("login-email").value.trim(),
    password: document.getElementById("login-password").value,
  };

  setButtonLoading(loginBtn, true, "Logging in...");
  try {
    const tokenData = await apiRequest("/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
    setToken(tokenData.access_token);
    setUserEmail(body.email);
    setMessage("Logged in successfully.", false);
    event.target.reset();
    toggleView();
  } catch (error) {
    setMessage(error.message);
  } finally {
    setButtonLoading(loginBtn, false, "");
  }
});

document.getElementById("logout-btn").addEventListener("click", () => {
  clearToken();
  clearUserEmail();
  setMessage("Logged out.", false);
  taskList.innerHTML = "";
  toggleView();
});

document.getElementById("task-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");

  const body = {
    title: document.getElementById("task-title").value.trim(),
    description: document.getElementById("task-description").value.trim() || null,
  };

  setButtonLoading(addTaskBtn, true, "Adding...");
  try {
    await apiRequest("/tasks", {
      method: "POST",
      body: JSON.stringify(body),
    });
    event.target.reset();
    setMessage("Task created successfully.", false);
    await loadTasks();
  } catch (error) {
    setMessage(error.message);
  } finally {
    setButtonLoading(addTaskBtn, false, "");
  }
});

filterSelect.addEventListener("change", loadTasks);

async function loadTasks(page = 1, limit = 20) {
  try {
    const completed = filterSelect.value;
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (completed !== "") {
      query.append("completed", completed);
    }

    const tasks = await apiRequest(`/tasks?${query.toString()}`);
    renderTasks(tasks);
  } catch (error) {
    setMessage(error.message);
  }
}

function renderTasks(tasks) {
  taskList.innerHTML = "";
  if (!tasks.length) {
    const emptyState = document.createElement("li");
    emptyState.className = "empty-state";
    emptyState.textContent = "No tasks found.";
    taskList.appendChild(emptyState);
    return;
  }

  tasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = "task-item";

    const main = document.createElement("div");
    main.className = "task-main";

    const title = document.createElement("h3");
    title.className = `task-title${task.completed ? " completed" : ""}`;
    title.textContent = task.title;
    main.appendChild(title);

    const description = document.createElement("p");
    description.className = `task-description${task.completed ? " completed" : ""}`;
    description.textContent = task.description || "No description";
    main.appendChild(description);

    const status = document.createElement("span");
    status.className = `status-badge ${task.completed ? "completed" : "pending"}`;
    status.textContent = task.completed ? "Completed" : "Pending";
    main.appendChild(status);

    const actions = document.createElement("div");
    actions.className = "actions";

    const toggleButton = document.createElement("button");
    toggleButton.dataset.action = "toggle";
    toggleButton.dataset.id = String(task.id);
    toggleButton.textContent = task.completed ? "Mark Pending" : "Mark Complete";

    const deleteButton = document.createElement("button");
    deleteButton.className = "secondary";
    deleteButton.dataset.action = "delete";
    deleteButton.dataset.id = String(task.id);
    deleteButton.textContent = "Delete";

    actions.append(toggleButton, deleteButton);
    li.append(main, actions);
    taskList.appendChild(li);
  });
}

taskList.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const taskId = target.dataset.id;
  const action = target.dataset.action;
  if (!taskId || !action) {
    return;
  }

  try {
    if (action === "toggle") {
      target.disabled = true;
      const task = await apiRequest(`/tasks/${taskId}`);
      await apiRequest(`/tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify({ completed: !task.completed }),
      });
      setMessage("Task status updated.", false);
    } else if (action === "delete") {
      target.disabled = true;
      await apiRequest(`/tasks/${taskId}`, { method: "DELETE" });
      setMessage("Task deleted.", false);
    }
    await loadTasks();
  } catch (error) {
    setMessage(error.message);
  } finally {
    target.disabled = false;
  }
});

toggleView();
showAuthPanel("login");
