const DARK_THEME = {
  background0:  "#0F0F0F",
  background1:  "#1F1F1F",
  background2:  "#2F2F2F",
  background3:  "#3F3F3F",
  background4:  "#4F4F4F",
  background5:  "#5F5F5F",
  background6:  "#6F6F6F",
  background7:  "#7F7F7F",
  background8:  "#8F8F8F",
  background9:  "#9F9F9F",
  background10: "#AFAFAF",
  
  foreground0:  "#F0F0F0",
  foreground1:  "#E0E0E0",
  foreground2:  "#D0D0D0",
  foreground3:  "#C0C0C0",
  foreground4:  "#B0B0B0",
  foreground5:  "#A0A0A0",
  foreground6:  "#909090",
  foreground7:  "#808080",
  foreground8:  "#707070",
  foreground9:  "#606060",
  foreground10: "#505050",

  accent0: "#4BA9FB",
  accent1: "#48A6FB",
  accent2: "#45A2FA",
  accent3: "#439FFA",
  accent4: "#409CFA",
  accent5: "#3D99FA",
  accent6: "#3A95F9",
  accent7: "#3792F9",
  accent8: "#358FF9",
  accent9: "#328BF8",
  accent10: "#2F88F8",
}

const LIGHT_THEME = {
  background0:  "#F0F0F0",
  foreground0:  "#0F0F0F",
  background1:  "#E0E0E0",
  background2:  "#D0D0D0",
  background3:  "#C0C0C0",
  background4:  "#B0B0B0",
  background5:  "#A0A0A0",
  background6:  "#909090",
  background7:  "#808080",
  background8:  "#707070",
  background9:  "#606060",
  background10: "#505050",

  foreground1:  "#1F1F1F",
  foreground2:  "#2F2F2F",
  foreground3:  "#3F3F3F",
  foreground4:  "#4F4F4F",
  foreground5:  "#5F5F5F",
  foreground6:  "#6F6F6F",
  foreground7:  "#7F7F7F",
  foreground8:  "#8F8F8F",
  foreground9:  "#9F9F9F",
  foreground10: "#AFAFAF",

  accent0: "#4BA9FB",
  accent1: "#48A6FB",
  accent2: "#45A2FA",
  accent3: "#439FFA",
  accent4: "#409CFA",
  accent5: "#3D99FA",
  accent6: "#3A95F9",
  accent7: "#3792F9",
  accent8: "#358FF9",
  accent9: "#328BF8",
  accent10: "#2F88F8",
}

const timer = ms => new Promise(res => setTimeout(res, ms))


// Check Theme in LocalStorage
if (localStorage.getItem("theme") == null) {
  localStorage.setItem("theme", "light");
}
applyTheme();


document.querySelector("#title-bar #window-buttons #minimize").addEventListener("click", async () => {
  await window.app.window_minimize();
});

document.querySelector("#title-bar #window-buttons #maximize").addEventListener("click", async () => {
  await window.app.window_maximize();
  if (await window.app.window_is_maximized()) {
    document.querySelector("#title-bar #window-buttons #maximize").src = "./assets/minimize.svg";
  } else {
    document.querySelector("#title-bar #window-buttons #maximize").src = "./assets/maximize.svg";
  }
});

document.querySelector("#title-bar #window-buttons #close").addEventListener("click", async () => {
  await window.app.window_close();
});

document.querySelector("#content #theme-toggle").addEventListener("click", () => {
  if (localStorage.getItem("theme") == "dark") {
    localStorage.setItem("theme", "light");
    document.querySelector("#content #theme-toggle").src = "./assets/sun.svg";
    applyTheme();
  } else {
    localStorage.setItem("theme", "dark");
    document.querySelector("#content #theme-toggle").src = "./assets/moon.svg";
    applyTheme();
  }
});

function applyTheme() {
  const theme = localStorage.getItem("theme");
  const root = document.documentElement;
  const body = document.body;
  var selected_theme;

  if (theme == "dark") { selected_theme = DARK_THEME; }
  else { selected_theme = LIGHT_THEME; }

  for (const [key, value] of Object.entries(selected_theme)) {
    root.style.setProperty(`--${key}`, value);
    body.setAttribute("class", theme);
  }
}

function updateUsername(username) {
  const avatar = document.querySelector("#content #sidebar #account #avatar");
  const name = document.querySelector("#content #sidebar #account #name");
  avatar.innerHTML = username.slice(0, 1).toUpperCase();
  name.innerHTML = username;
}

// --- API and Logic ---

// Modal Elements
const modalsSection = document.getElementById("modals");
const loginModal = document.getElementById("login-modal");
const registerModal = document.getElementById("register-modal");
const errorModal = document.getElementById("error-modal");

const loginBtn = document.getElementById("login-btn");
const registerBtn = document.getElementById("register-btn");
const retryBtn = document.getElementById("retry-btn");

const switchToRegister = document.getElementById("switch-to-register");
const switchToLogin = document.getElementById("switch-to-login");

function showModal(modalElement) {
  modalsSection.classList.remove("hidden");
  document.querySelectorAll(".modal").forEach(m => m.classList.add("hidden"));
  modalElement.classList.remove("hidden");
}

function hideModals() {
  modalsSection.classList.add("hidden");
}

switchToRegister.addEventListener("click", () => showModal(registerModal));
switchToLogin.addEventListener("click", () => showModal(loginModal));
retryBtn.addEventListener("click", () => checkConnectionAndInit());

async function checkConnectionAndInit() {
  try {
    await window.app.health();
    
    // Connection OK
    const isLoggedIn = await window.app.auth.isLoggedIn();
    if (isLoggedIn) {
      try {
        const userData = await window.app.users.getCurrent();
        updateUsername(userData.username);
        hideModals();
        loadFolders();
        loadTodos();
      } catch (e) {
        showModal(loginModal);
      }
    } else {
      showModal(loginModal);
    }
  } catch (error) {
    console.log(error);
    showModal(errorModal);
  }
}

// Login
loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  const errorText = document.getElementById("login-error");
  errorText.innerText = "";

  try {
    await window.app.auth.login({ email, password });
    checkConnectionAndInit();
  } catch (err) {
    errorText.innerText = err.message || "Login failed.";
  }
});

// Register
registerBtn.addEventListener("click", async () => {
  const username = document.getElementById("register-username").value;
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;
  const errorText = document.getElementById("register-error");
  errorText.innerText = "";

  try {
    await window.app.auth.register({ username, email, password });
    checkConnectionAndInit();
  } catch (err) {
    errorText.innerText = err.message || "Registration failed.";
  }
});

let currentTodos = [];
let currentFolders = [];
let currentFolderId = "all";

async function loadFolders() {
  try {
    const data = await window.app.folders.list();
    currentFolders = data.data || [];
    renderFolders();
  } catch(err) {
    console.error("Failed to load folders", err);
  }
}

function renderFolders() {
  const foldersDiv = document.getElementById("folders");
  foldersDiv.innerHTML = "";
  
  const folderSelect = document.getElementById("todo-folder-input");
  folderSelect.innerHTML = '<option value="">None</option>';

  const folderParentSelect = document.getElementById("folder-parent-input");
  folderParentSelect.innerHTML = '<option value="">None</option>';

  const folderMap = {};
  currentFolders.forEach(f => folderMap[f.id] = {...f, children: []});
  const roots = [];
  currentFolders.forEach(f => {
    if (f.parent && folderMap[f.parent]) {
      folderMap[f.parent].children.push(folderMap[f.id]);
    } else {
      roots.push(folderMap[f.id]);
    }
  });

  const renderTree = (folders, depth = 0) => {
    folders.forEach(f => {
      const fDiv = document.createElement("div");
      fDiv.className = `sidebar-item ${currentFolderId === f.id ? "active" : ""}`;
      fDiv.style.paddingLeft = `${15 + depth * 15}px`;

      const nameSpan = document.createElement("span");
      nameSpan.innerText = f.name;
      nameSpan.style.flexGrow = "1";
      nameSpan.addEventListener("click", (e) => {
        e.stopPropagation();
        document.querySelectorAll(".sidebar-item").forEach(i => i.classList.remove("active"));
        fDiv.classList.add("active");
        currentFolderId = f.id;
        loadTodos();
      });

      const editBtnTxt = document.createElement("img");
      editBtnTxt.src = "./assets/pen-line.svg";
      editBtnTxt.title = "Edit Folder";
      editBtnTxt.style.width = "16px";
      editBtnTxt.style.cursor = "pointer";
      editBtnTxt.addEventListener("click", (e) => {
        e.stopPropagation();
        openFolderModal(f);
      });

      fDiv.appendChild(nameSpan);
      fDiv.appendChild(editBtnTxt);
      foldersDiv.appendChild(fDiv);

      const prefix = "- ".repeat(depth);
      const opt = document.createElement("option");
      opt.value = f.id;
      opt.innerText = prefix + f.name;
      folderSelect.appendChild(opt);

      const optParent = document.createElement("option");
      optParent.value = f.id;
      optParent.innerText = prefix + f.name;
      folderParentSelect.appendChild(optParent);

      renderTree(f.children, depth + 1);
    });
  };

  renderTree(roots);
}

async function loadTodos() {
  try {
    const filters = {};
    if (currentFolderId !== "all") {
      filters.folder = currentFolderId;
    }
    const data = await window.app.todos.list(filters);
    currentTodos = data.data || [];
    renderTodos();
  } catch (err) {
    console.error("Failed to load todos:", err);
  }
}

function renderTodos() {
  const listSection = document.getElementById("todos-list");
  if (!listSection) return;
  listSection.innerHTML = "";

  const sortVal = document.getElementById("sort-todos-select").value;
  let sortedTodos = [...currentTodos];

  if (sortVal === "date-desc") sortedTodos.sort((a, b) => new Date(b.date) - new Date(a.date));
  if (sortVal === "date-asc") sortedTodos.sort((a, b) => new Date(a.date) - new Date(b.date));
  if (sortVal === "title-asc") sortedTodos.sort((a, b) => a.title.localeCompare(b.title));
  if (sortVal === "title-desc") sortedTodos.sort((a, b) => b.title.localeCompare(a.title));
  if (sortVal === "status") sortedTodos.sort((a, b) => a.status.localeCompare(b.status));

  const container = document.createElement("div");
  container.className = "todo-container";

  sortedTodos.forEach(todo => {
    const card = document.createElement("div");
    card.className = "todo-card";
    card.addEventListener("click", () => openTodoModal(todo));

    const header = document.createElement("div");
    header.className = "todo-header";
    
    const title = document.createElement("div");
    title.className = "todo-title";
    title.innerText = todo.title;

    const status = document.createElement("div");
    status.className = `todo-status status-${todo.status}`;
    status.innerText = todo.status.replace("_", " ");

    header.appendChild(title);
    header.appendChild(status);

    const content = document.createElement("div");
    content.className = "todo-content";
    content.innerText = todo.content;

    const footer = document.createElement("div");
    footer.className = "todo-footer";
    
    const dateStr = new Date(todo.date).toLocaleString();
    const dateEl = document.createElement("span");
    dateEl.innerText = `Created: ${dateStr}`;

    const deleteBtn = document.createElement("img");
    deleteBtn.className = "todo-delete-btn";
    deleteBtn.src = "./assets/trash.svg";
    deleteBtn.title = "Delete Todo";
    deleteBtn.style.width = "16px";
    deleteBtn.style.cursor = "pointer";
    deleteBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        await window.app.todos.delete(todo.id);
        loadTodos();
      } catch(err) {
        console.error("Failed to delete todo", err);
      }
    });

    footer.appendChild(dateEl);
    footer.appendChild(deleteBtn);

    card.appendChild(header);
    card.appendChild(content);
    card.appendChild(footer);

    container.appendChild(card);
  });

  listSection.appendChild(container);
}

// Event Listeners for New Features
const accountModal = document.getElementById("account-modal");
const todoModal = document.getElementById("todo-modal");
const folderModal = document.getElementById("folder-modal");

document.getElementById("all").addEventListener("click", (e) => {
  document.querySelectorAll(".sidebar-item").forEach(i => i.classList.remove("active"));
  e.currentTarget.classList.add("active");
  currentFolderId = "all";
  loadTodos();
});

document.getElementById("add-folder-btn").addEventListener("click", () => {
  openFolderModal();
});

function openFolderModal(folder = null) {
  document.getElementById("folder-modal-error").innerText = "";
  document.getElementById("folder-modal-title").innerText = folder ? "Edit Folder" : "Create Folder";
  document.getElementById("save-folder-btn").innerText = folder ? "Update" : "Create";
  document.getElementById("folder-id").value = folder ? folder.id : "";
  document.getElementById("folder-name-input").value = folder ? folder.name : "";
  document.getElementById("folder-parent-input").value = (folder && folder.parent) ? folder.parent : "";
  
  const parentSelect = document.getElementById("folder-parent-input");
  Array.from(parentSelect.options).forEach(opt => {
    if (folder && opt.value == folder.id) {
      opt.disabled = true;
    } else {
      opt.disabled = false;
    }
  });
  
  const delBtn = document.getElementById("delete-folder-btn");
  if (folder) {
    delBtn.classList.remove("hidden");
    delBtn.onclick = async () => {
      try {
        await window.app.folders.delete(folder.id);
        hideModals();
        loadFolders();
        if (currentFolderId === folder.id) {
          currentFolderId = "all";
          loadTodos();
        }
      } catch(e) {
        console.error("Failed to delete folder", e);
      }
    };
  } else {
    delBtn.classList.add("hidden");
  }

  showModal(folderModal);
}

document.getElementById("save-folder-btn").addEventListener("click", async () => {
  const id = document.getElementById("folder-id").value;
  const name = document.getElementById("folder-name-input").value;
  const parent = document.getElementById("folder-parent-input").value || null;
  const errorText = document.getElementById("folder-modal-error");
  errorText.innerText = "";
  
  if (!name) return errorText.innerText = "Folder Name is required.";
  
  try {
    const payload = { name, parent: parent ? parseInt(parent) : null };
    if (id) {
      await window.app.folders.update(id, payload);
    } else {
      await window.app.folders.create(payload);
    }
    hideModals();
    loadFolders();
  } catch(e) {
    errorText.innerText = "Failed to save folder: " + e.message;
  }
});

document.getElementById("account").addEventListener("click", () => {
  const statusText = document.getElementById("account-clear-status");
  statusText.innerText = "";
  statusText.classList.remove("success-text");
  showModal(accountModal);
});

async function listEveryTodo() {
  const todos = [];
  const seenTodoIds = new Set();
  const limit = 100;
  let page = 1;

  while (true) {
    const response = await window.app.todos.list({ page, limit });
    const pageTodos = response.data || [];
    const newTodos = pageTodos.filter(todo => !seenTodoIds.has(String(todo.id)));

    newTodos.forEach(todo => {
      seenTodoIds.add(String(todo.id));
      todos.push(todo);
    });

    if (pageTodos.length < limit || newTodos.length === 0) return todos;
    page += 1;
  }
}

function getFolderDepth(folder, foldersById, visited = new Set()) {
  const folderId = String(folder.id);
  if (!folder.parent || visited.has(folderId)) return 0;

  const parent = foldersById.get(String(folder.parent));
  if (!parent) return 0;

  const nextVisited = new Set(visited);
  nextVisited.add(folderId);
  return 1 + getFolderDepth(parent, foldersById, nextVisited);
}

function getTodoDepth(todo, todosById, visited = new Set()) {
  const todoId = String(todo.id);
  if (visited.has(todoId)) return 0;

  const nextVisited = new Set(visited);
  nextVisited.add(todoId);
  const parentDepths = (todo.parents || [])
    .map(parentId => todosById.get(String(parentId)))
    .filter(Boolean)
    .map(parent => getTodoDepth(parent, todosById, nextVisited));

  return parentDepths.length === 0 ? 0 : 1 + Math.max(...parentDepths);
}

document.getElementById("clear-account-data-btn").addEventListener("click", async () => {
  const clearButton = document.getElementById("clear-account-data-btn");
  const statusText = document.getElementById("account-clear-status");
  const confirmed = window.confirm(
    "Permanently delete every todo, tag, and folder? Your account will remain, but this cannot be undone."
  );

  if (!confirmed) return;

  clearButton.disabled = true;
  clearButton.innerText = "Clearing data…";
  statusText.innerText = "";
  statusText.classList.remove("success-text");

  try {
    const [todos, folderResponse] = await Promise.all([
      listEveryTodo(),
      window.app.folders.list()
    ]);
    const folders = folderResponse.data || [];
    const todosById = new Map(todos.map(todo => [String(todo.id), todo]));
    const todosDeepestFirst = [...todos].sort((first, second) =>
      getTodoDepth(second, todosById) - getTodoDepth(first, todosById)
    );

    for (const todo of todosDeepestFirst) {
      await window.app.todos.delete(todo.id);
    }

    const foldersById = new Map(folders.map(folder => [String(folder.id), folder]));
    const foldersDeepestFirst = [...folders].sort((first, second) =>
      getFolderDepth(second, foldersById) - getFolderDepth(first, foldersById)
    );

    for (const folder of foldersDeepestFirst) {
      await window.app.folders.delete(folder.id);
    }

    currentFolderId = "all";
    await Promise.all([loadFolders(), loadTodos()]);
    statusText.innerText = "Account data cleared successfully.";
    statusText.classList.add("success-text");
  } catch (error) {
    statusText.innerText = "Failed to clear account data: " + error.message;
  } finally {
    clearButton.disabled = false;
    clearButton.innerText = "Clear account data";
  }
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  try {
    await window.app.auth.logout();
    checkConnectionAndInit();
  } catch (err) {
    console.error(err);
  }
});

document.querySelectorAll(".close-modal-btn").forEach(btn => {
  btn.addEventListener("click", hideModals);
});

document.getElementById("sort-todos-select").addEventListener("change", () => renderTodos());

document.getElementById("create-todo-btn").addEventListener("click", () => openTodoModal());

// Tags autocomplete event listeners
document.getElementById("todo-tags-input").addEventListener("input", (e) => {
  const inputValue = e.target.value;
  const currentTags = inputValue.split(",").map(t => t.trim()).filter(t => t);
  const lastTag = currentTags[currentTags.length - 1] || "";
  
  if (inputValue && (inputValue.endsWith(",") || inputValue.endsWith(", "))) {
    populateTagsAutocomplete("", currentTags);
  } else {
    populateTagsAutocomplete(lastTag, currentTags.slice(0, -1));
  }
});

document.getElementById("todo-tags-input").addEventListener("blur", () => {
  setTimeout(() => {
    document.getElementById("tags-autocomplete").classList.add("hidden");
  }, 200);
});

document.getElementById("todo-tags-input").addEventListener("focus", () => {
  const inputValue = document.getElementById("todo-tags-input").value;
  if (inputValue) {
    const currentTags = inputValue.split(",").map(t => t.trim()).filter(t => t);
    const lastTag = currentTags[currentTags.length - 1] || "";
    populateTagsAutocomplete(lastTag, currentTags.slice(0, -1));
  }
});

function todoDependsOn(todoId, targetId, todosById, visited = new Set()) {
  const normalizedTodoId = String(todoId);
  const normalizedTargetId = String(targetId);

  if (normalizedTodoId === normalizedTargetId) return true;
  if (visited.has(normalizedTodoId)) return false;
  visited.add(normalizedTodoId);

  const todo = todosById.get(normalizedTodoId);
  return (todo?.parents || []).some(parentId =>
    todoDependsOn(parentId, normalizedTargetId, todosById, visited)
  );
}

function populateParentsPicker(todos, editedTodo = null) {
  const parentOptions = document.getElementById("todo-parent-options");
  const selectedParents = new Set((editedTodo?.parents || []).map(String));
  const editedTodoId = editedTodo ? String(editedTodo.id) : null;
  const todosById = new Map(todos.map(todo => [String(todo.id), todo]));
  const availableParents = todos
    .filter(todo => {
      if (!editedTodoId) return true;
      return String(todo.id) !== editedTodoId &&
        !todoDependsOn(todo.id, editedTodoId, todosById);
    })
    .sort((first, second) => first.title.localeCompare(second.title));

  parentOptions.innerHTML = "";

  if (availableParents.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "todo-parent-empty";
    emptyState.textContent = "No eligible parent notes";
    parentOptions.appendChild(emptyState);
    updateParentsSummary();
    return;
  }

  availableParents.forEach(todo => {
    const optionLabel = document.createElement("label");
    optionLabel.className = "todo-parent-option";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = todo.id;
    checkbox.checked = selectedParents.has(String(todo.id));

    const title = document.createElement("span");
    title.textContent = todo.title;

    optionLabel.appendChild(checkbox);
    optionLabel.appendChild(title);
    checkbox.addEventListener("change", updateParentsSummary);
    parentOptions.appendChild(optionLabel);
  });

  updateParentsSummary();
}

function updateParentsSummary() {
  const selectedCount = document.querySelectorAll('#todo-parent-options input[type="checkbox"]:checked').length;
  document.getElementById("todo-parents-summary").textContent = selectedCount === 0
    ? "Choose parent notes"
    : `${selectedCount} parent note${selectedCount === 1 ? "" : "s"} selected`;
}

function closeParentsPicker() {
  document.getElementById("todo-parent-options").classList.add("hidden");
  document.getElementById("todo-parents-trigger").setAttribute("aria-expanded", "false");
}

document.getElementById("todo-parents-trigger").addEventListener("click", () => {
  const parentOptions = document.getElementById("todo-parent-options");
  const willOpen = parentOptions.classList.contains("hidden");
  parentOptions.classList.toggle("hidden", !willOpen);
  document.getElementById("todo-parents-trigger").setAttribute("aria-expanded", String(willOpen));
});

document.addEventListener("click", event => {
  if (!document.getElementById("todo-parents-input").contains(event.target)) {
    closeParentsPicker();
  }
});

function populateTagsAutocomplete(inputValue, excludeTags = []) {
  const autocompleteDiv = document.getElementById("tags-autocomplete");
  autocompleteDiv.innerHTML = "";
  
  const allTags = new Set();
  currentTodos.forEach(todo => {
    if (todo.tags) {
      todo.tags.forEach(tag => allTags.add(tag));
    }
  });
  
  const matchingTags = Array.from(allTags).filter(tag => 
    tag.toLowerCase().includes(inputValue.toLowerCase()) && 
    !excludeTags.includes(tag)
  );
  
  if (matchingTags.length === 0 || inputValue === "") {
    autocompleteDiv.classList.add("hidden");
    return;
  }
  
  matchingTags.forEach(tag => {
    const tagElement = document.createElement("div");
    tagElement.textContent = tag;
    tagElement.style.padding = "8px 15px";
    tagElement.style.cursor = "pointer";
    tagElement.addEventListener("click", () => {
      const tagsInput = document.getElementById("todo-tags-input");
      const completedTags = tagsInput.value
        .split(",")
        .slice(0, -1)
        .map(currentTag => currentTag.trim())
        .filter(currentTag => currentTag && currentTag !== tag);

      tagsInput.value = [...completedTags, tag].join(", ");
      autocompleteDiv.classList.add("hidden");
      tagsInput.focus();
    });
    tagElement.addEventListener("mouseover", () => {
      tagElement.style.background = "var(--background3)";
    });
    tagElement.addEventListener("mouseout", () => {
      tagElement.style.background = "";
    });
    autocompleteDiv.appendChild(tagElement);
  });
  
  autocompleteDiv.classList.remove("hidden");
}

async function openTodoModal(todo = null) {
  document.getElementById("todo-modal-error").innerText = "";
  document.getElementById("todo-modal-title").innerText = todo ? "Edit Todo" : "Create Todo";
  document.getElementById("save-todo-btn").innerText = todo ? "Update" : "Create";
  document.getElementById("todo-id").value = todo ? todo.id : "";
  document.getElementById("todo-title-input").value = todo ? todo.title : "";
  document.getElementById("todo-content-input").value = todo ? todo.content : "";
  document.getElementById("todo-status-input").value = todo ? todo.status : "pending";
  document.getElementById("todo-folder-input").value = (todo && todo.folder) ? todo.folder : "";
  document.getElementById("todo-tags-input").value = (todo && todo.tags) ? todo.tags.join(", ") : "";
  
  const parentOptions = document.getElementById("todo-parent-options");
  closeParentsPicker();
  document.getElementById("todo-parents-summary").textContent = "Loading notes…";
  parentOptions.innerHTML = '<div class="todo-parent-empty">Loading notes…</div>';

  try {
    const data = await window.app.todos.list();
    populateParentsPicker(data.data || [], todo);
  } catch (err) {
    populateParentsPicker(currentTodos, todo);
    document.getElementById("todo-modal-error").innerText = "Could not load every note; showing currently loaded notes.";
  }
  
  showModal(todoModal);
}

document.getElementById("save-todo-btn").addEventListener("click", async () => {
  const id = document.getElementById("todo-id").value;
  const title = document.getElementById("todo-title-input").value;
  const content = document.getElementById("todo-content-input").value;
  const status = document.getElementById("todo-status-input").value;
  const folder = document.getElementById("todo-folder-input").value || null;
  const tagsStr = document.getElementById("todo-tags-input").value;
  const parentsPicker = document.getElementById("todo-parents-input");

  const errorText = document.getElementById("todo-modal-error");
  errorText.innerText = "";

  if (!title || !content) return errorText.innerText = "Title and Content are required.";

  const tags = tagsStr.split(",").map(t => t.trim()).filter(t => t);
  
  const parents = Array.from(parentsPicker.querySelectorAll('input[type="checkbox"]:checked')).map(input => {
    const value = parseInt(input.value);
    return isNaN(value) ? input.value : value;
  }).filter(p => p !== "" && p !== null);

  const payload = { title, content, status, folder, tags, parents };

  try {
    if (id) {
      await window.app.todos.update(id, payload);
    } else {
      await window.app.todos.create(payload);
    }
    hideModals();
    loadTodos();
  } catch (err) {
    errorText.innerText = "Failed to save todo: " + err.message;
  }
});

// Start sequence
checkConnectionAndInit();
