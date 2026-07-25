import { 
  db, 
  menuCollectionRef, 
  loginAdmin, 
  logoutAdmin, 
  onAdminAuthStateChange,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch
} from './firebase-config.js';

let allMenuItems = [];
let currentView = 'full'; // 'full' or 'visual'

// ==========================================
// 1. REAL-TIME MENU LISTENER
// ==========================================
onSnapshot(menuCollectionRef, (snapshot) => {
  allMenuItems = snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data()
  }));

  renderFullTextMenu();
  renderVisualMenu();
  renderAdminList();
});

// ==========================================
// 2. VIEW TAB TOGGLING
// ==========================================
const tabFullMenu = document.getElementById('tabFullMenu');
const tabVisualMenu = document.getElementById('tabVisualMenu');
const fullMenuView = document.getElementById('full-menu-view');
const visualMenuView = document.getElementById('visual-menu-view');

tabFullMenu?.addEventListener('click', () => {
  currentView = 'full';
  tabFullMenu.classList.add('active');
  tabVisualMenu.classList.remove('active');
  fullMenuView.style.display = 'block';
  visualMenuView.style.display = 'none';
});

tabVisualMenu?.addEventListener('click', () => {
  currentView = 'visual';
  tabVisualMenu.classList.add('active');
  tabFullMenu.classList.remove('active');
  visualMenuView.style.display = 'block';
  fullMenuView.style.display = 'none';
});

// ==========================================
// 3. RENDER TEXT-ONLY FULL MENU (NO IMAGES OR SEARCH FILTER)
// ==========================================
function renderFullTextMenu() {
  const container = document.getElementById('text-categories-container');
  if (!container) return;

  const activeItems = allMenuItems.filter(item => item.isAvailable);
  container.innerHTML = '';

  if (activeItems.length === 0) {
    container.innerHTML = `<p style="text-align:center; color: var(--gold-solid); padding: 20px;">No items currently available.</p>`;
    return;
  }

  // Group by category
  const categories = {};
  activeItems.forEach(item => {
    if (!categories[item.category]) categories[item.category] = [];
    categories[item.category].push(item);
  });

  for (const [category, items] of Object.entries(categories)) {
    const categoryGroup = document.createElement('div');
    categoryGroup.className = 'category-group open'; // Default open for easy scanning

    categoryGroup.innerHTML = `
      <div class="category-header">
        <h2 class="category-title gold-text">${category}</h2>
        <span class="category-toggle-icon">▼</span>
      </div>
      <div class="items-container" style="display: block; padding: 15px 20px;">
        ${items.map(item => `
          <div style="border-bottom: 1px solid var(--gold-border); padding: 12px 0; display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h3 style="color: var(--gold-solid); font-size: 1.1rem; margin-bottom: 4px;">${item.name}</h3>
              <p style="font-size: 0.85rem; color: #d1d5db; margin-bottom: 4px;">${item.description}</p>
              <div class="item-tags">
                ${(item.ingredients || []).map(ing => `<span class="tag-chip">${ing.trim()}</span>`).join('')}
              </div>
            </div>
            <span class="item-weight" style="white-space: nowrap; margin-left: 15px;">${item.weight}</span>
          </div>
        `).join('')}
      </div>
    `;

    categoryGroup.querySelector('.category-header').addEventListener('click', () => {
      categoryGroup.classList.toggle('open');
      const itemsBox = categoryGroup.querySelector('.items-container');
      itemsBox.style.display = categoryGroup.classList.contains('open') ? 'block' : 'none';
    });

    container.appendChild(categoryGroup);
  }
}

// ==========================================
// 4. RENDER VISUAL MENU (WITH IMAGES & FILTER)
// ==========================================
function renderVisualMenu(filteredItems = null) {
  const itemsToRender = (filteredItems || allMenuItems).filter(item => item.isAvailable);
  const container = document.getElementById('categories-container');
  if (!container) return;
  
  container.innerHTML = '';

  if (itemsToRender.length === 0) {
    container.innerHTML = `<p style="text-align:center; color: var(--gold-solid); padding: 20px;">No dishes available matching your selection.</p>`;
    return;
  }

  const categories = {};
  itemsToRender.forEach(item => {
    if (!categories[item.category]) categories[item.category] = [];
    categories[item.category].push(item);
  });

  for (const [category, items] of Object.entries(categories)) {
    const isOpen = filteredItems ? 'open' : '';
    const categoryGroup = document.createElement('div');
    categoryGroup.className = `category-group ${isOpen}`;

    categoryGroup.innerHTML = `
      <div class="category-header">
        <h2 class="category-title gold-text">${category}</h2>
        <span class="category-toggle-icon">▼</span>
      </div>
      <div class="items-container">
        ${items.map(item => `
          <div class="item-card">
            <img src="${item.image || 'https://via.placeholder.com/300x180?text=No+Image'}" alt="${item.name}" class="item-image" />
            <div class="item-content">
              <div>
                <div class="item-header">
                  <h3 class="item-name">${item.name}</h3>
                  <span class="item-weight">${item.weight}</span>
                </div>
                <p class="item-description">${item.description}</p>
              </div>
              <div class="item-tags">
                ${(item.ingredients || []).map(ing => `<span class="tag-chip">${ing.trim()}</span>`).join('')}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    categoryGroup.querySelector('.category-header').addEventListener('click', () => {
      categoryGroup.classList.toggle('open');
    });

    container.appendChild(categoryGroup);
  }
}

// INGREDIENT FILTER FOR VISUAL VIEW
document.getElementById('ingredientSearch')?.addEventListener('keyup', (e) => {
  const query = e.target.value.toLowerCase().trim();
  
  if (!query) {
    renderVisualMenu();
    return;
  }

  const searchTerms = query.split(',').map(term => term.trim()).filter(Boolean);
  
  const filtered = allMenuItems.filter(item => {
    if (!item.isAvailable) return false;
    const itemIngredients = (item.ingredients || []).map(i => i.toLowerCase());
    
    return searchTerms.every(term => 
      itemIngredients.some(ing => ing.includes(term)) || 
      item.name.toLowerCase().includes(term)
    );
  });

  renderVisualMenu(filtered);
});

// ==========================================
// 5. ADMIN DASHBOARD - MANAGE ITEMS
// ==========================================
function renderAdminList() {
  const adminContainer = document.getElementById('admin-items-list');
  if (!adminContainer) return;

  adminContainer.innerHTML = '';

  allMenuItems.forEach(item => {
    const card = document.createElement('div');
    card.className = 'admin-item-card';
    card.innerHTML = `
      <div>
        <span class="admin-item-status ${item.isAvailable ? 'status-available' : 'status-hidden'}">
          ${item.isAvailable ? 'Visible' : 'Hidden / Unavailable'}
        </span>
        <h4 style="color: var(--gold-solid);">${item.name} (${item.category})</h4>
        <p style="font-size:0.8rem; color:#aaa;">Qty: ${item.weight}</p>
      </div>
      <div class="admin-btn-group">
        <button type="button" class="edit-btn" data-id="${item.id}">Edit</button>
        <button type="button" class="delete-btn" data-id="${item.id}">Delete</button>
      </div>
    `;

    card.querySelector('.edit-btn').addEventListener('click', () => populateEditForm(item.id));
    card.querySelector('.delete-btn').addEventListener('click', () => deleteMenuItem(item.id));

    adminContainer.appendChild(card);
  });
}

function populateEditForm(id) {
  const item = allMenuItems.find(i => i.id === id);
  if (!item) return;

  document.getElementById('editItemId').value = item.id;
  document.getElementById('categoryName').value = item.category || '';
  document.getElementById('itemName').value = item.name || '';
  document.getElementById('weightQuantity').value = item.weight || '';
  document.getElementById('description').value = item.description || '';
  document.getElementById('ingredients').value = (item.ingredients || []).join(', ');
  document.getElementById('imageUrl').value = item.image || '';
  document.getElementById('isAvailable').checked = item.isAvailable ?? true;

  document.getElementById('form-title').innerText = "Edit Menu Item";
  document.getElementById('save-btn').innerText = "Update Item";
  document.getElementById('cancel-edit-btn').style.display = "inline-block";
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
  document.getElementById('menuForm').reset();
  document.getElementById('editItemId').value = "";
  document.getElementById('form-title').innerText = "Add New Item Manually";
  document.getElementById('save-btn').innerText = "Save Item";
  document.getElementById('cancel-edit-btn').style.display = "none";
}

document.getElementById('cancel-edit-btn')?.addEventListener('click', resetForm);

document.getElementById('menuForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const editId = document.getElementById('editItemId').value;
  const itemData = {
    category: document.getElementById('categoryName').value.trim(),
    name: document.getElementById('itemName').value.trim(),
    weight: document.getElementById('weightQuantity').value.trim(),
    description: document.getElementById('description').value.trim(),
    ingredients: document.getElementById('ingredients').value.split(',').map(i => i.trim()).filter(Boolean),
    image: document.getElementById('imageUrl').value.trim(),
    isAvailable: document.getElementById('isAvailable').checked
  };

  try {
    if (editId) {
      await updateDoc(doc(db, "menu_items", editId), itemData);
      alert('Item updated successfully!');
    } else {
      await addDoc(menuCollectionRef, itemData);
      alert('New item added!');
    }
    resetForm();
  } catch (err) {
    alert('Error saving item: ' + err.message);
  }
});

async function deleteMenuItem(id) {
  if (confirm("Are you sure you want to delete this menu item?")) {
    try {
      await deleteDoc(doc(db, "menu_items", id));
      alert("Item deleted successfully.");
    } catch (err) {
      alert("Error deleting item: " + err.message);
    }
  }
}

// BULK UPLOAD
document.getElementById('bulkUploadBtn')?.addEventListener('click', async () => {
  const fileInput = document.getElementById('bulkFileInput');
  const file = fileInput.files[0];

  if (!file) {
    alert("Please select a CSV or Excel file first.");
    return;
  }

  const reader = new FileReader();

  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        alert("The uploaded file is empty.");
        return;
      }

      const batch = writeBatch(db);
      let count = 0;

      jsonData.forEach(row => {
        if (row.category && row.name) {
          const newDocRef = doc(menuCollectionRef);
          
          const ingredientsArray = typeof row.ingredients === 'string' 
            ? row.ingredients.split(',').map(i => i.trim()) 
            : [String(row.ingredients || '')];

          batch.set(newDocRef, {
            category: String(row.category).trim(),
            name: String(row.name).trim(),
            weight: String(row.weight || '').trim(),
            description: String(row.description || '').trim(),
            ingredients: ingredientsArray,
            image: String(row.image || '').trim(),
            isAvailable: row.isAvailable === false || String(row.isAvailable).toLowerCase() === 'false' ? false : true
          });
          count++;
        }
      });

      await batch.commit();
      alert(`Successfully uploaded ${count} items in bulk!`);
      fileInput.value = '';
    } catch (err) {
      alert("Error parsing file: " + err.message);
    }
  };

  reader.readAsArrayBuffer(file);
});

document.getElementById('downloadTemplateBtn')?.addEventListener('click', () => {
  const sampleData = [
    {
      category: "Starters",
      name: "Paneer Tikka",
      weight: "250g",
      description: "Charcoal grilled paneer marinated in spices",
      ingredients: "Paneer, Garlic, Spices, Butter",
      image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&q=80",
      isAvailable: "TRUE"
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Menu Sample");
  XLSX.writeFile(workbook, "menu_bulk_upload_sample.csv");
});

// AUTHENTICATION
const authModal = document.getElementById('auth-modal');

document.getElementById('openAuthModalBtn')?.addEventListener('click', () => {
  if (authModal) authModal.style.display = 'flex';
});

document.getElementById('closeAuthModalBtn')?.addEventListener('click', () => {
  if (authModal) authModal.style.display = 'none';
});

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('adminEmail').value;
  const pass = document.getElementById('adminPassword').value;

  try {
    await loginAdmin(email, pass);
    if (authModal) authModal.style.display = 'none';
    document.getElementById('loginForm').reset();
  } catch (err) {
    alert("Login failed: " + err.message);
  }
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  logoutAdmin();
});

onAdminAuthStateChange((user) => {
  const menuSec = document.getElementById('menu-section');
  const adminSec = document.getElementById('admin-section');

  if (user) {
    menuSec?.classList.remove('active');
    adminSec?.classList.add('active');
  } else {
    adminSec?.classList.remove('active');
    menuSec?.classList.add('active');
  }
});
