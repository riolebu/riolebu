import { db, storage } from './firebase-config.js';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { ref, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-storage.js";

const ADMIN_PASS = "admin123";

// --- VISUAL DEBUGGER REMOVED ---
function logDebug(msg) {
    console.log(`[DEBUG] ${msg}`);
}
logDebug("Iniciando Firebase...");

const defaultProducts = [
    {
        id: 1,
        name: "Excavadora Hidráulica Pro-Class",
        category: "maquinaria",
        price: 85000000,
        oldPrice: 92000000,
        image: "assets/images/products/excavadora.jpg",
        stock: 3
    },
    {
        id: 10,
        name: "Equipamiento Seguridad Completo",
        category: "seguridad",
        price: 42900,
        oldPrice: null,
        image: "assets/images/products/seguridad.jpg",
        stock: 50
    }
];

// State
let products = [];
let cart = []; // Local cart for POS
let movementsHistory = [];
let adminUsers = []; // Will be populated from Firestore

// Firestore Listeners
const productsRef = collection(db, 'products');
onSnapshot(productsRef, (snapshot) => {
    products = snapshot.docs.map(doc => ({
        docId: doc.id,
        ...doc.data()
    }));
    if (itemActiveTab === 'inventory') renderInventory();
});

const movementsRef = collection(db, 'movements');
const movementsQuery = query(movementsRef, orderBy('id', 'desc'));
onSnapshot(movementsQuery, (snapshot) => {
    movementsHistory = snapshot.docs.map(doc => ({
        docId: doc.id,
        ...doc.data()
    }));
    if (itemActiveTab === 'movements') renderMovementsHistory();
});

// Users Listener and Initialization
const usersRef = collection(db, 'users');
logDebug("Conectando a colección 'users'...");

onSnapshot(usersRef, async (snapshot) => {
    logDebug(`Snapshot recibido. Docs: ${snapshot.docs.length}`);
    adminUsers = snapshot.docs.map(doc => ({
        docId: doc.id,
        ...doc.data()
    }));

    logDebug(`Usuarios procesados: ${adminUsers.length}`);

    // Auto-initialize if empty
    if (adminUsers.length === 0) {
        logDebug("Lista vacía. Intentando auto-crear admin...");
        // ... (rest of logic) ...
        const masterAdmin = {
            name: 'Administrador Master',
            email: 'admin@mariomari.cl',
            password: 'admin',
            role: 'admin',
            status: 'active'
        };
        try {
            await addDoc(usersRef, masterAdmin);
            logDebug("Auto-creación enviada.");
        } catch (err) {
            logDebug(`ERROR al crear: ${err.message}`);
            console.error("Error auto-initializing admin:", err);
        }
    }

    populateUserSelect();
    logDebug("Select actualizado.");

}, (error) => {
    logDebug(`ERROR CRÍTICO: ${error.message} (${error.code})`);
    console.error("Error listening to users:", error);
});

let itemActiveTab = 'pos';

// DOM Elements
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('admin-login-form');
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');
const logoutBtn = document.getElementById('logout-btn');

const posInput = document.getElementById('barcode-input');
const posTicketItems = document.getElementById('pos-ticket-items');
const posTotalAmount = document.getElementById('pos-total-amount');
const posCheckoutBtn = document.getElementById('pos-checkout-btn');
const posSearchResults = document.getElementById('pos-search-results');

const invSearch = document.getElementById('inv-search');
const invFilter = document.getElementById('inv-filter');
const invBody = document.getElementById('inventory-body');

// Login Check
const checkAuth = () => {
    const isAuth = sessionStorage.getItem('mariomari_admin_auth');
    if (isAuth) {
        loginModal.classList.remove('open');
        posInput.focus();
    } else {
        loginModal.classList.add('open');
    }
};

const populateUserSelect = () => {
    const select = document.getElementById('admin-user-select');
    if (!select) return;

    // Clear except first option
    select.innerHTML = '<option value="" disabled selected>Seleccione Usuario</option>';

    const activeUsers = adminUsers.filter(u => u.status === 'active');
    if (activeUsers.length === 0 && adminUsers.length > 0) {
        alert("Alerta: Hay usuarios pero ninguno tiene status='active'");
    }

    activeUsers.forEach(user => {
        const option = document.createElement('option');
        option.value = user.email;
        option.textContent = `${user.name} (${user.role.toUpperCase()})`;
        select.appendChild(option);
    });
};

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-user-select').value;
    const password = document.getElementById('admin-password').value;

    const user = adminUsers.find(u => u.email === email && u.password === password && u.status === 'active');

    if (user) {
        sessionStorage.setItem('mariomari_admin_auth', 'true');
        sessionStorage.setItem('mariomari_admin_user', JSON.stringify(user));
        checkAuth();
        alert(`Bienvenido, ${user.name}`);
    } else {
        alert('Contraseña incorrecta.');
    }
});

logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('mariomari_admin_auth');
    window.location.reload();
});




// Tab Switching
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        if (!item.dataset.tab) return;
        e.preventDefault();

        itemActiveTab = item.dataset.tab;

        // UI
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        tabContents.forEach(t => t.classList.remove('active'));
        document.getElementById(item.dataset.tab).classList.add('active');

        // Logic
        if (item.dataset.tab === 'inventory') renderInventory();
        if (item.dataset.tab === 'movements') renderMovementsHistory();
        if (item.dataset.tab === 'pos') posInput.focus();
    });
});


/* --- POS Module --- */

const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(price);
};

// Add to Cart Logic
const addToPosCart = (term) => {
    // Try find by ID first, then loose match by name
    let product = products.find(p => p.id == term);

    if (!product) {
        // Simple predictive search if not ID
        const termLower = term.toLowerCase();
        product = products.find(p => p.name.toLowerCase().includes(termLower));
    }

    if (product) {
        // Check stock
        if (product.stock <= 0) {
            alert('Producto sin stock!');
            return;
        }

        const existingItem = cart.find(i => i.id === product.id);
        if (existingItem) {
            if (existingItem.qty < product.stock) {
                existingItem.qty++;
            } else {
                alert('No hay suficiente stock');
            }
        } else {
            cart.push({ ...product, qty: 1 });
        }
        renderPosCart();
        posInput.value = '';
        posSearchResults.classList.remove('active');
    } else {
        alert('Producto no encontrado');
    }
};

// Render POS Cart
const renderPosCart = () => {
    posTicketItems.innerHTML = '';
    let total = 0;

    cart.forEach(item => {
        const subtotal = item.price * item.qty;
        total += subtotal;

        const row = document.createElement('div');
        row.className = 'ticket-item';
        row.innerHTML = `
            <h4>${item.name}</h4>
            <input type="number" class="pos-qty-input" value="${item.qty}" min="1" onchange="updatePosQty(${item.id}, this)">
            <span>${formatPrice(subtotal)}</span>
            <button class="btn-remove-item" onclick="removePosItem(${item.id})"><i class="fa-solid fa-trash"></i></button>
        `;
        posTicketItems.appendChild(row);
    });

    posTotalAmount.textContent = formatPrice(total);
    posTicketItems.scrollTop = posTicketItems.scrollHeight; // Auto scroll to bottom
};

// Update Qty
window.updatePosQty = (id, input) => {
    const newQty = parseInt(input.value);
    const item = cart.find(i => i.id === id);
    const product = products.find(p => p.id === id);

    if (item && product) {
        if (newQty > 0 && newQty <= product.stock) {
            item.qty = newQty;
            renderPosCart();
        } else {
            alert(`Stock insuficiente (Max: ${product.stock}) o cantidad inválida`);
            input.value = item.qty;
        }
    }
};

// Remove Item
window.removePosItem = (id) => {
    cart = cart.filter(i => i.id !== id);
    renderPosCart();
    posInput.focus(); // Return focus
};

// Scanner Input
posInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const val = posInput.value.trim();
        if (val) addToPosCart(val);
    }
});

posInput.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase().trim();
    if (val.length < 2) {
        posSearchResults.classList.remove('active');
        return;
    }

    const matches = products.filter(p =>
        p.name.toLowerCase().includes(val) ||
        p.id.toString().includes(val)
    ).slice(0, 5); // Limit to 5 results

    if (matches.length > 0) {
        posSearchResults.innerHTML = '';
        matches.forEach(p => {
            const div = document.createElement('div');
            div.className = 'search-item';
            div.innerHTML = `
                <div class="info">
                    <div class="name">${p.name}</div>
                    <div class="stock-info">Stock: ${p.stock} | ID: ${p.id}</div>
                </div>
                <div class="price">${formatPrice(p.price)}</div>
            `;
            div.addEventListener('click', () => {
                addToPosCart(p.id);
                posInput.focus();
            });
            posSearchResults.appendChild(div);
        });
        posSearchResults.classList.add('active');
    } else {
        posSearchResults.classList.remove('active');
    }
});

// Close search if clicking outside
document.addEventListener('click', (e) => {
    if (!posInput.contains(e.target) && !posSearchResults.contains(e.target)) {
        posSearchResults.classList.remove('active');
    }
});

// Checkout
posCheckoutBtn.addEventListener('click', () => {
    if (cart.length === 0) return alert('Por favor, agregue productos al carro.');

    // Validate Invoice Data if selected
    if (currentDocType === 'factura') {
        const rut = document.getElementById('cli-rut').value;
        const name = document.getElementById('cli-name').value;
        if (!rut || !name) {
            alert("Para emitir una Factura, el RUT y la Razón Social son obligatorios.");
            return;
        }
    }

    // Deduct stock in Firestore
    cart.forEach(async item => {
        const product = products.find(p => p.id === item.id);
        if (product && product.docId) {
            const prodRef = doc(db, 'products', product.docId);
            await updateDoc(prodRef, {
                stock: product.stock - item.qty
            });
        }
    });

    // Local Storage fallback removed

    // Simulate SII API Service Call
    console.log("Enviando datos al SII...");
    generateDTE();
});

// Keyboard Shortcut for Checkout (F12)
document.addEventListener('keydown', (e) => {
    if (e.key === 'F12') {
        e.preventDefault();
        posCheckoutBtn.click();
    }
});

/* --- DTE & Document Module (SII Chile) --- */
let currentDocType = 'boleta';

window.setDocType = (type) => {
    currentDocType = type;

    // Update UI toggle buttons
    document.querySelectorAll('.doc-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(type)) {
            btn.classList.add('active');
        }
    });

    const invForm = document.getElementById('invoice-form');
    if (type === 'factura') {
        invForm.style.display = 'block';
    } else {
        invForm.style.display = 'none';
    }
};

window.formatRut = (input) => {
    let rut = input.value.replace(/[^0-9kK]/g, '');
    if (rut.length > 1) {
        const body = rut.slice(0, -1);
        const dv = rut.slice(-1).toUpperCase();
        input.value = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + '-' + dv;
    }
};

const dteModal = document.getElementById('dte-modal');

const generateDTE = () => {
    // Totals calculation
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const dteNumber = Math.floor(Math.random() * 900000) + 100000; // Simulated Folio

    // Update DTE Visualization Content
    document.getElementById('dte-title').textContent = currentDocType === 'factura' ? 'FACTURA ELECTRÓNICA' : 'BOLETA ELECTRÓNICA';
    document.getElementById('dte-number').textContent = 'Nº FOLIO: ' + dteNumber;
    document.getElementById('dte-total').textContent = formatPrice(total);

    // Client Info Section (for Facturas)
    const clientInfoDiv = document.getElementById('dte-client-info');
    if (currentDocType === 'factura') {
        const rut = document.getElementById('cli-rut').value;
        const name = document.getElementById('cli-name').value;
        const address = document.getElementById('cli-address').value || 'SANTIAGO, CHILE';
        const giro = document.getElementById('cli-giro').value || 'COMERCIO AL POR MENOR';

        clientInfoDiv.innerHTML = `
            <div style="text-align: left; margin: 10px 0; font-size: 0.8rem;">
                <p><strong>RUT:</strong> ${rut}</p>
                <p><strong>RAZÓN SOCIAL:</strong> ${name.toUpperCase()}</p>
                <p><strong>GIRO:</strong> ${giro.toUpperCase()}</p>
                <p><strong>DIRECCIÓN:</strong> ${address.toUpperCase()}</p>
            </div>
        `;
        clientInfoDiv.style.display = 'block';
    } else {
        clientInfoDiv.style.display = 'none';
    }

    // Detail Rows
    const dteItemsDiv = document.getElementById('dte-items');
    dteItemsDiv.innerHTML = '';
    cart.forEach(item => {
        const row = document.createElement('div');
        row.className = 'dte-item-row';
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.fontSize = '0.8rem';
        row.innerHTML = `
            <span>${item.qty} x ${item.name.substring(0, 20)}</span>
            <span>${formatPrice(item.price * item.qty)}</span>
        `;
        dteItemsDiv.appendChild(row);
    });

    // Show the visual receipt
    dteModal.classList.add('open');

    // Record into History
    recordMovement({
        type: 'sale',
        docType: currentDocType,
        folio: dteNumber,
        items: cart.map(i => `${i.qty}x ${i.name}`),
        total: total,
        seller: "Admin Principal"
    });
};

const recordMovement = async (data) => {
    const entry = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        type: data.type, // 'sale' or 'entry'
        docType: data.docType || 'INGRESO',
        folio: data.folio || '---',
        items: data.items || [],
        total: data.total || 0,
        seller: data.seller || "Sistema"
    };
    await addDoc(collection(db, 'movements'), entry);
};

window.closeDteModal = () => {
    dteModal.classList.remove('open');
    cart = [];
    renderPosCart();
    posInput.focus();

    // Reset inputs
    document.getElementById('cli-rut').value = '';
    document.getElementById('cli-name').value = '';
    document.getElementById('cli-giro').value = '';
    document.getElementById('cli-address').value = '';
    setDocType('boleta');
};


/* --- Inventory Module --- */

const renderInventory = () => {
    const searchTerm = invSearch.value.toLowerCase();
    const filterCat = invFilter.value;

    let filtered = products;

    if (filterCat !== 'all') {
        filtered = filtered.filter(p => p.category === filterCat);
    }

    if (searchTerm) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm) || p.id.toString().includes(searchTerm));
    }

    invBody.innerHTML = '';

    filtered.forEach(p => {
        if (p.status === 'inactive') {
            row.style.opacity = '0.5';
            row.style.background = '#f0f0f0';
        }

        const isInactive = p.status === 'inactive';

        row.innerHTML = `
            <td>${p.id}</td>
            <td>${p.name} ${isInactive ? '(Inactivo)' : ''}</td>
            <td>${p.category}</td>
            <td>${formatPrice(p.price)}</td>
            <td style="${p.stock <= 5 ? 'color: var(--admin-danger); font-weight: bold;' : ''}">${p.stock}</td>
            <td>
                <!-- Edit button removed -->
                <button class="btn-action btn-history" onclick="openHistory(${p.id})" title="Ver Historial" style="background-color: #607D8B; color: white;"><i class="fa-solid fa-clock-rotate-left"></i></button>
                ${isInactive
                ? `<button class="btn-action btn-restore" onclick="toggleProductStatus(${p.id}, 'active')" title="Reactivar" style="background-color: #4CAF50; color: white;"><i class="fa-solid fa-trash-arrow-up"></i></button>`
                : `<button class="btn-action btn-delete" onclick="toggleProductStatus(${p.id}, 'inactive')" title="Desactivar"><i class="fa-solid fa-trash"></i></button>`
            }
            </td>
        `;
        invBody.appendChild(row);
    });
};

window.toggleProductStatus = async (id, newStatus) => {
    const product = products.find(p => p.id === id);
    if (!product || !product.docId) return;

    if (!confirm(`¿Estás seguro de cambiar el estado de "${product.name}" a ${newStatus === 'active' ? 'ACTIVO' : 'INACTIVO'}?`)) {
        return;
    }

    try {
        const prodRef = doc(db, 'products', product.docId);
        await updateDoc(prodRef, { status: newStatus });
        // No need to alert, UI updates via snapshot
    } catch (err) {
        alert("Error al actualizar estado: " + err.message);
    }
};

window.editStock = async (id) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const newStock = prompt(`Editar Stock para: ${product.name}\nActual: ${product.stock}`, product.stock);
    if (newStock !== null) {
        const stockInt = parseInt(newStock);
        if (!isNaN(stockInt) && stockInt >= 0) {
            const diff = stockInt - product.stock;
            if (diff !== 0) {
                await recordMovement({
                    type: 'entry',
                    docType: diff > 0 ? 'INGRESO' : 'AJUSTE',
                    items: [`${Math.abs(diff)}x ${product.name} (${diff > 0 ? 'Aumento' : 'Baja'})`],
                    total: 0,
                    seller: "Admin (Manual)"
                });
            }
            if (product.docId) {
                const prodRef = doc(db, 'products', product.docId);
                await updateDoc(prodRef, { stock: stockInt });
            }
        } else {
            alert('Valor inválido');
        }
    }
};

invSearch.addEventListener('input', renderInventory);
invFilter.addEventListener('change', renderInventory);

/* --- Product Entry Module --- */
const btnAddProduct = document.getElementById('btn-add-product');
const addProductModal = document.getElementById('add-product-modal');
const closeAddModal = document.getElementById('close-add-modal');
const addProductForm = document.getElementById('add-product-form');

if (btnAddProduct) {
    btnAddProduct.addEventListener('click', () => {
        addProductModal.classList.add('open');
    });
}

if (closeAddModal) {
    closeAddModal.addEventListener('click', () => {
        addProductModal.classList.remove('open');
    });
}

// Global variable for base64 storage
let uploadedImagesList = [];

// Helper to render previews
const renderImagePreviews = () => {
    const container = document.getElementById('image-preview-container');
    if (!container) return;

    container.innerHTML = '';

    if (uploadedImagesList.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';

    uploadedImagesList.forEach((base64, index) => {
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';

        const img = document.createElement('img');
        img.src = base64;
        img.style.width = '100px';
        img.style.height = '100px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '4px';
        img.style.border = '1px solid #ccc';

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        deleteBtn.style.position = 'absolute';
        deleteBtn.style.top = '-5px';
        deleteBtn.style.right = '-5px';
        deleteBtn.style.background = 'red';
        deleteBtn.style.color = 'white';
        deleteBtn.style.border = 'none';
        deleteBtn.style.borderRadius = '50%';
        deleteBtn.style.width = '20px';
        deleteBtn.style.height = '20px';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.display = 'flex';
        deleteBtn.style.alignItems = 'center';
        deleteBtn.style.justifyContent = 'center';
        deleteBtn.style.fontSize = '12px';
        deleteBtn.type = 'button'; // Prevent form submission

        deleteBtn.onclick = () => {
            uploadedImagesList.splice(index, 1);
            renderImagePreviews();
        };

        wrapper.appendChild(img);
        wrapper.appendChild(deleteBtn);
        container.appendChild(wrapper);
    });
};

if (addProductForm) {
    // Add listener for file input
    const fileInput = document.getElementById('new-prod-image-file');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);

            if (files.length > 0) {
                let processedCount = 0;

                files.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        uploadedImagesList.push(event.target.result);
                        processedCount++;
                        if (processedCount === files.length) {
                            renderImagePreviews();
                            fileInput.value = ''; // Reset input to allow adding same files again
                        }
                    };
                    reader.readAsDataURL(file);
                });
            }
        });
    }

    addProductForm.addEventListener('submit', async (e) => {

        e.preventDefault();

        const btnSubmit = e.target.querySelector('button[type="submit"]');
        btnSubmit.disabled = true;
        btnSubmit.textContent = "Guardando...";

        const name = document.getElementById('new-prod-name').value;
        const category = document.getElementById('new-prod-category').value;
        const price = parseInt(document.getElementById('new-prod-price').value);
        const stock = parseInt(document.getElementById('new-prod-stock').value);

        let idParam = document.getElementById('new-prod-id').value;
        const associatedDoc = document.getElementById('new-prod-doc').value;
        const imageUrlParam = document.getElementById('new-prod-image').value;

        let finalImages = [];

        // Upload images to Firebase Storage
        for (let i = 0; i < uploadedImagesList.length; i++) {
            const base64 = uploadedImagesList[i];
            const storagePath = `products/${Date.now()}_${i}.jpg`;
            const storageRef = ref(storage, storagePath);
            try {
                const snapshot = await uploadString(storageRef, base64, 'data_url');
                const downloadURL = await getDownloadURL(snapshot.ref);
                finalImages.push(downloadURL);
            } catch (err) {
                console.error("Error uploading image:", err);
            }
        }

        // Priority 2: URL input
        if (imageUrlParam) {
            finalImages.push(imageUrlParam);
        }

        // Fallback
        if (finalImages.length === 0) {
            finalImages.push('assets/images/products/generador.jpg');
        }

        let finalId;
        if (idParam) {
            finalId = parseInt(idParam);
        } else {
            const maxId = products.reduce((max, p) => p.id > max ? p.id : max, 0);
            finalId = maxId + 1;
        }

        const newProduct = {
            id: finalId,
            name: name,
            category: category,
            price: price,
            oldPrice: null,
            image: finalImages[0],
            images: finalImages,
            stock: stock,
            document: associatedDoc || '---'
        };

        try {
            await addDoc(collection(db, 'products'), newProduct);
            await recordMovement({
                type: 'entry',
                docType: 'NUEVO',
                items: [`Ingreso inicial: ${stock}x ${name}`],
                total: 0,
                seller: "Admin"
            });

            alert(`Producto "${name}" agregado correctamente!`);
            addProductForm.reset();
            document.getElementById('image-preview-container').style.display = 'none';
            document.getElementById('image-preview-container').innerHTML = '';
            uploadedImagesList = [];
            addProductModal.classList.remove('open');
        } catch (err) {
            alert("Error al guardar: " + err.message);
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = "Guardar Producto";
        }
    });
}


/* --- Stock Management Module --- */
const btnManageStock = document.getElementById('btn-manage-stock');
const stockModal = document.getElementById('stock-modal');
const closeStockModal = document.getElementById('close-stock-modal');
const stockForm = document.getElementById('stock-form');
const stockProductSelect = document.getElementById('stock-product-select');
const stockCurrentDisplay = document.getElementById('stock-current-display');
const stockTypeSelect = document.getElementById('stock-type-select');
const stockDocGroup = document.getElementById('stock-doc-group');
const stockJustificationGroup = document.getElementById('stock-justification-group');

if (btnManageStock) {
    btnManageStock.addEventListener('click', () => {
        // Populate Select
        stockProductSelect.innerHTML = '<option value="" disabled selected>Seleccione Producto</option>';
        products.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = `${p.name} (Actual: ${p.stock})`;
            stockProductSelect.appendChild(option);
        });

        // Reset Form
        stockForm.reset();
        stockCurrentDisplay.textContent = '-';
        stockDocGroup.style.display = 'block';
        stockJustificationGroup.style.display = 'none';

        stockModal.classList.add('open');
    });
}

if (closeStockModal) {
    closeStockModal.addEventListener('click', () => {
        stockModal.classList.remove('open');
    });
}

if (stockProductSelect) {
    stockProductSelect.addEventListener('change', (e) => {
        const id = parseInt(e.target.value);
        const product = products.find(p => p.id === id);
        if (product) {
            stockCurrentDisplay.textContent = product.stock;
        }
    });
}

if (stockTypeSelect) {
    stockTypeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'entry') {
            stockDocGroup.style.display = 'block';
            stockJustificationGroup.style.display = 'none';
        } else {
            stockDocGroup.style.display = 'none';
            stockJustificationGroup.style.display = 'block';
        }
    });
}

if (stockForm) {
    stockForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const id = parseInt(stockProductSelect.value);
        const qty = parseInt(document.getElementById('stock-qty').value);
        const type = stockTypeSelect.value;
        const doc = document.getElementById('stock-doc').value;
        const justification = document.getElementById('stock-justification').value;

        if (!id || isNaN(qty) || qty <= 0) {
            alert('Por favor seleccione un producto y una cantidad válida.');
            return;
        }

        const product = products.find(p => p.id === id);
        if (!product) return;

        if (type === 'entry') {
            if (!doc) {
                alert('Debe ingresar un documento de respaldo para ingresos.');
                return;
            }
            product.stock += qty;

            recordMovement({
                type: 'entry',
                docType: 'INGRESO',
                folio: doc,
                items: [`${qty}x ${product.name} (Aumento Stock)`],
                total: 0,
                seller: "Admin"
            });

        } else {
            if (!justification) {
                alert('Debe ingresar una justificación para la salida/ajuste.');
                return;
            }
            if (product.stock < qty) {
                alert('No puede descontar más stock del disponible.');
                return;
            }

            product.stock -= qty;

            recordMovement({
                type: 'entry', // Kept as entry type for logic, but logged as Adjustment
                docType: 'AJUSTE',
                folio: '---',
                items: [`${qty}x ${product.name} (${justification})`],
                total: 0,
                seller: "Admin"
            });
        }

        localStorage.setItem('mariomari_products_v4', JSON.stringify(products));
        alert('Stock actualizado correctamente.');
        stockModal.classList.remove('open');
        renderInventory();
    });
}


/* --- History Module --- */
const historyModal = document.getElementById('history-modal');
const closeHistoryModal = document.getElementById('close-history-modal');
const historyTableBody = document.getElementById('history-table-body');
const historyModalTitle = document.getElementById('history-modal-title');

window.openHistory = (id) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    historyModalTitle.textContent = `Historial: ${product.name}`;
    historyTableBody.innerHTML = '';

    // Filter movements related to this product
    // Note: This is a simple string match on the 'items' array which stores strings like "Qty x Name"
    const relevantMovements = movementsHistory.filter(m => {
        return m.items.some(itemStr => itemStr.includes(product.name));
    });

    if (relevantMovements.length === 0) {
        historyTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay movimientos registrados para este producto.</td></tr>';
    } else {
        relevantMovements.forEach(m => {
            const row = document.createElement('tr');
            // Extract quantity from item string if possible, or just show full string
            const relatedItemStr = m.items.find(i => i.includes(product.name)) || '';

            row.innerHTML = `
                <td>${m.date}</td>
                <td><span class="badge ${m.type === 'entry' ? 'ingreso' : (m.docType === 'boleta' || m.docType === 'factura' ? 'boleta' : 'ajuste')}">${m.type === 'sale' ? 'VENTA' : (m.docType === 'AJUSTE' ? 'AJUSTE' : 'INGRESO')}</span></td>
                <td>${m.folio}</td>
                <td style="font-size: 0.85rem;">${relatedItemStr}</td>
                <td>${extractQty(relatedItemStr)}</td>
                <td>${m.seller}</td>
            `;
            historyTableBody.appendChild(row);
        });
    }

    historyModal.classList.add('open');
};

if (closeHistoryModal) {
    closeHistoryModal.addEventListener('click', () => {
        historyModal.classList.remove('open');
    });
}

const extractQty = (str) => {
    const parts = str.split('x');
    if (parts.length > 0) return parts[0].trim();
    return '-';
};


/* --- Movements & Reports Module --- */
const movementsBody = document.getElementById('movements-body');
const btnDailyReport = document.getElementById('btn-daily-report');

const renderMovementsHistory = () => {
    movementsBody.innerHTML = '';

    movementsHistory.forEach(m => {
        const row = document.createElement('tr');
        const badgeClass = m.type === 'entry' ? 'ingreso' : m.docType;

        row.innerHTML = `
            <td>${m.date}</td>
            <td>${m.folio}</td>
            <td><span class="badge ${badgeClass}">${m.docType.toUpperCase()}</span></td>
            <td><small>${m.items.join(', ').substring(0, 50)}${m.items.join(', ').length > 50 ? '...' : ''}</small></td>
            <td><strong class="${m.type === 'sale' ? 'text-success' : 'text-neutral'}">${m.total > 0 ? formatPrice(m.total) : '---'}</strong></td>
            <td>${m.seller}</td>
        `;
        movementsBody.appendChild(row);
    });
};

if (btnDailyReport) {
    btnDailyReport.addEventListener('click', () => {
        const today = new Date().toLocaleDateString();
        const todaysMovements = movementsHistory.filter(m => new Date(m.date).toLocaleDateString() === today);

        const sales = todaysMovements.filter(m => m.type === 'sale');
        const totalSales = sales.reduce((sum, s) => sum + s.total, 0);

        const entries = todaysMovements.filter(m => m.type === 'entry');
        const totalEntries = entries.length;

        alert(`--- REPORTE GENERAL (${today}) ---\n\n` +
            `VENTAS:\n` +
            `- Total Recaudado: ${formatPrice(totalSales)}\n` +
            `- Documentos: ${sales.length}\n\n` +
            `INVENTARIO:\n` +
            `- Movimientos de Ingreso: ${totalEntries}\n\n` +
            `¡Resumen actualizado!`);
    });
}



// Init
checkAuth();
populateUserSelect();
renderPosCart();
renderInventory();
renderMovementsHistory();
