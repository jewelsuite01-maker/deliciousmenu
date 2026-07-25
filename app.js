import { db, auth } from './firebase-config.js';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  writeBatch 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

let allMenuItems = [];
const menuRef = collection(db, "menu_items");

// 1. REAL-TIME MENU LISTENER
onSnapshot(menuRef, (snapshot) => {
  allMenuItems = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  renderCustomerMenu();
  renderAdminList();
});

// 2. RENDER CUSTOMER MENU
window.renderCustomerMenu = function (filteredItems = null) {
  const itemsToRender = (filteredItems || allMenuItems).filter(item => item.isAvailable);
  const container = document.getElementById('categories-container');
  container.innerHTML = '';

  if (itemsToRender.length === 0) {
    container.innerHTML = `<p style="text-align:center; color: var(--gold-solid); padding: 20px;">No dishes available matching your search.</p>`;
    return;
  }

  const categories = {};
  itemsToRender.forEach(item => {
    if (!categories[item.category]) categories[item.category] = [];
    categories[item.category].push(item);
  });

  for (const [category, items] of Object.entries(categories)) {
    const isOpen = filteredItems ? 'open' : '';
    const categoryHtml = `
      <div class="category-group ${isOpen}">
        <div class="category-header" onclick="this.parentElement.classList.toggle('open')">
          <h2 class="category-title gold-text">${category}</h2>
          <span class="category-toggle-icon">▼</span>
        </div>
        <div class="items-container">
          ${items.map(item => `
            <div class="item-card">
              <img src="${item.image}" alt="${item.name}" class="item-image" />
              <div class="item-content">
                <div>
                  <div class="item-header">
                    <h3 class="item-name">${item.name}</h3>
                    <span class="item-weight">${item.weight}</span>
                  </div>
                  <p class="item-description">${item.description}</p>
                </div>
                <div class="item-tags">
                  ${item.ingredients.map(ing => `<span class="tag-chip">${ing.trim()}</span>`).join('')}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    container.innerHTML += categoryHtml;
  }
};

// 3. SEARCH / INGREDIENT FILTER LOGIC
document.getElementById('ingredientSearch').addEventListener('keyup', (e) => {
  const query = e.target.value.toLowerCase().trim();
  if (!query) {
    renderCustomerMenu();
    return;
  }

  const searchTerms = query.split(',').map(term => term.trim()).filter(Boolean);
  const filtered = allMenuItems.filter(item => {
    if (!item.isAvailable) return false;
    const itemIngredients = item.ingredients.map(i => i.toLowerCase());
    return searchTerms.every(term => 
      itemIngredients.some(ing => ing.includes(term)) || 
      item.name.toLowerCase().includes(term)
    );
  });

  renderCustomerMenu(filtered);
});

// 4. BULK UPLOAD FUNCTIONALITY (EXCEL / CSV)
window.handleBulkUpload = async function() {
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
      
      // Convert sheet rows into JSON objects
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        alert("The uploaded file is empty.");
        return;
      }

      // Batch Write to Firebase
      const batch = writeBatch(db);
      let count = 0;

      jsonData.forEach(row => {
        if (row.category && row.name) {
          const newDocRef = doc(collection(db, "menu_items"));
          
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
};

// DOWNLOAD SAMPLE TEMPLATE
window.downloadSampleTemplate = function() {
  const sampleData = [
    {
      category: "Starters",
      name: "Paneer Tikka",
      weight: "250g",
      description: "Charcoal grilled paneer marinated in spices",
      ingredients: "Paneer, Garlic, Spices, Butter",
      image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&q=80",
      isAvailable: "TRUE"
    },
    {
      category: "Main Course",
      name: "Garlic Naan",
      weight: "1 Piece",
      description: "Butter garlic refined flour bread",
      ingredients: "Garlic, Butter, Flour",
      image: "https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?w=500&q=80",
      isAvailable: "TRUE"
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Menu Sample");
  XLSX.writeFile(workbook, "menu_bulk_upload_sample.csv");
};

// 5. ADMIN DASHBOARD - RENDER ALL ITEMS
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
        <button class="edit-btn" onclick="populateEditForm('${item.id}')">Edit</button>
        <button class="delete-btn" onclick="deleteMenuItem('${item.id}')">Delete</button>
      </div>
    `;
    adminContainer.appendChild(card);
  });
}

// 6. SINGLE ITEM ADD/UPDATE
document.getElementById('menuForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const editId = document.getElementById('editItemId').value;
  const itemData = {
    category: document.getElementById('categoryName').value.trim(),
    name: document.getElementById('itemName').value.trim(),
    weight: document.getElementById('weightQuantity').value.trim(),
    description: document.getElementById('description').value.trim(),
    ingredients: document.getElementById('ingredients').value.split(',').map(i => i.trim()),
    image: document.getElementById('imageUrl').value.trim(),
    isAvailable: document.getElementById('isAvailable').checked
  };

  try {
    if (editId) {
      await updateDoc(doc(db, "menu_items", editId), itemData);
      alert('Item updated successfully!');
    } else {
      await addDoc(menuRef, itemData);
      alert('New item added!');
    }
    resetForm();
  } catch (err) {
    alert('Error saving item: ' + err.message);
  }
});

window.populateEditForm = function(id) {
  const item = allMenuItems.find(i => i.id === id);
  if (!item) return;

  document.getElementById('editItemId').value = item.id;
  document.getElementById('categoryName').value = item.category;
  document.getElementById('itemName').value = item.name;
  document.getElementById('weightQuantity').value = item.weight;
  document.getElementById('description').value = item.description;
  document.getElementById('ingredients').value = item.ingredients.join(', ');
  document.getElementById('imageUrl').value = item.image;
  document.getElementById('isAvailable').checked = item.isAvailable;

  document.getElementById('form-title').innerText = "Edit Menu Item";
  document.getElementById('save-btn').innerText = "Update Item";
  document.getElementById('cancel-edit-btn').style.display = "inline-block";
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.resetForm = function() {
  document.getElementById('menuForm').reset();
  document.getElementById('editItemId').value = "";
  document.getElementById('form-title').innerText = "Add New Item Manually";
  document.getElementById('save-btn').innerText = "Save Item";
  document.getElementById('cancel-edit-btn').style.display = "none";
};

window.deleteMenuItem = async function(id) {
  if (confirm("Are you sure you want to delete this menu item?")) {
    try {
      await deleteDoc(doc(db, "menu_items", id));
      alert("Item deleted.");
    } catch (err) {
      alert("Error deleting item: " + err.message);
    }
  }
};

// 7. ADMIN AUTHENTICATION
window.openAdminAuth = function() {
  document.getElementById('auth-modal').style.display = 'flex';
};

window.closeAdminAuth = function() {
  document.getElementById('auth-modal').style.display = 'none';
};

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('adminEmail').value;
  const pass = document.getElementById('adminPassword').value;

  try {
    await signInWithEmailAndPassword(auth, email, pass);
    closeAdminAuth();
  } catch (err) {
    alert("Login failed: " + err.message);
  }
});

window.handleLogout = function() {
  signOut(auth);
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById('menu-section').classList.remove('active');
    document.getElementById('admin-section').classList.add('active');
  } else {
    document.getElementById('admin-section').classList.remove('active');
    document.getElementById('menu-section').classList.add('active');
  }
});
