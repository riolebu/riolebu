// Firebase instances are now available globally via window.db and window.storage
// import { db } from './firebase-config.js';
// import { collection, onSnapshot, query, orderBy, addDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

console.log("DEBUG: script.js starting (Compat Mode)...");

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
        id: 2,
        name: "Motor Diésel Estacionario V8",
        category: "motores",
        price: 4500000,
        oldPrice: 5200000,
        image: "assets/images/products/motor_diesel.jpg",
        stock: 5
    },
    {
        id: 3,
        name: "Generador Eléctrico Trifásico",
        category: "generadores",
        price: 2890000,
        oldPrice: null,
        image: "assets/images/products/generador.jpg",
        stock: 10
    },
    {
        id: 4,
        name: "Compresor de Tornillo 10HP",
        category: "maquinaria",
        price: 3590000,
        oldPrice: 3990000,
        image: "assets/images/products/compresor.jpg",
        stock: 4
    },
    {
        id: 5,
        name: "Plancha Compactadora Industrial",
        category: "maquinaria",
        price: 890000,
        oldPrice: 1100000,
        image: "assets/images/products/compactadora.jpg",
        stock: 8
    },
    {
        id: 6,
        name: "Motor Fuera de Borda 25HP",
        category: "motores",
        price: 2450000,
        oldPrice: null,
        image: "assets/images/products/fuera_borda.jpg",
        stock: 6
    },
    {
        id: 7,
        name: "Rotomartillo Industrial HD",
        category: "herramientas",
        price: 189900,
        oldPrice: 220000,
        image: "assets/images/products/rotomartillo.jpg",
        stock: 15
    },
    {
        id: 8,
        name: "Soldadora MIG/MAG Pro",
        category: "herramientas",
        price: 125000,
        oldPrice: 159000,
        image: "assets/images/products/soldadora.jpg",
        stock: 20
    },
    {
        id: 9,
        name: "Nivel Láser Autonivelante 3D",
        category: "herramientas",
        price: 89900,
        oldPrice: null,
        image: "assets/images/products/nivel_laser.jpg",
        stock: 12
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
let products = defaultProducts; // Initialize with defaults as fallback
console.log("DEBUG: Initial products count:", products.length);


// Firestore Listener for Products
// Firestore Listener for Products
const productsRef = db.collection('products');
productsRef.onSnapshot((snapshot) => {
    console.log("DEBUG: Firestore snapshot received. Docs count:", snapshot.docs.length);
    const fetchedProducts = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            docId: doc.id,
            id: data.id || doc.id, // Fallback to docId if id is missing
            ...data
        };
    }).filter(p => p.status !== 'inactive');

    if (fetchedProducts.length > 0) {
        products = fetchedProducts;
        console.log("DEBUG: Loaded", products.length, "active products from Firestore");
    } else {
        console.log("DEBUG: No active products in Firestore, staying with current products.");
        if (snapshot.docs.length === 0) {
            products = defaultProducts;
        }
    }

    renderProducts();
    if (typeof renderAridosProducts === 'function') renderAridosProducts();
}, (error) => {
    console.error("Error getting products from Firestore:", error);
    console.log("Using default products due to error.");
    renderProducts();
    if (typeof renderAridosProducts === 'function') renderAridosProducts();
});


// Helper to save products - used in older logic, now redirects to Firebase in admin
const saveProducts = () => {
    // Products are now saved via Firestore in admin.js
};


// State
let cart = JSON.parse(localStorage.getItem('mariomari_cart')) || [];

// Save Cart Function
const saveCart = () => {
    localStorage.setItem('mariomari_cart', JSON.stringify(cart));
};

// Aridos Calculator Logic
window.calculateAridos = () => {
    const length = parseFloat(document.getElementById('calc-length').value) || 0;
    const width = parseFloat(document.getElementById('calc-width').value) || 0;
    const depthCm = parseFloat(document.getElementById('calc-depth').value) || 0;

    if (length <= 0 || width <= 0 || depthCm <= 0) {
        alert('Por favor ingresa medidas válidas (mayores a 0).');
        return;
    }

    // Convert depth to meters
    const depthM = depthCm / 100;

    // Calculate m3
    const m3 = length * width * depthM;

    // Calculate estimate in 25kg sacks (Approx 1m3 sand = 1500-1600kg. Let's use 1600kg ~ 64 sacks)
    // This is an estimation.
    const sacks = Math.ceil((m3 * 1600) / 25);

    // Display
    document.getElementById('result-m3').textContent = m3.toFixed(2) + ' m³';
    document.getElementById('result-sacos').textContent = sacks;
    document.getElementById('calc-result').style.display = 'block';
};

// DOM Elements
// DOM Elements
let productsContainer = document.getElementById('products-container');
const cartCountElement = document.getElementById('cart-count');
const filterButtons = document.querySelectorAll('.filter-btn');
const searchInput = document.getElementById('search-input');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const navList = document.getElementById('nav-list');
const navLinks = document.querySelectorAll('.nav-list a:not(#mobile-menu-btn)'); // Exclude toggle button

// Format Currency
const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(price);
};

const getCategoryLabel = (cat) => {
    const labels = {
        'maquinaria': 'Maquinaria',
        'motores': 'Motores',
        'motores:electricos': 'Motores Eléctricos',
        'motores:combustion': 'Motores Combustión',
        'desarmaduria:motores_combustion': 'Desarmaduría: Motores Combustión',
        'desarmaduria:excavadora': 'Desarmaduría: Máquina Excavadora',
        'desarmaduria:hidraulica': 'Desarmaduría: Máquina Hidráulica',
        'desarmaduria:chevrolet': 'Desarmaduría: Camión Chevrolet',
        'desarmaduria:scania': 'Desarmaduría: Camión Scania',
        'desarmaduria:caterpillar': 'Desarmaduría: Camión Caterpillar',
        'desarmaduria:renault': 'Desarmaduría: Camión Renault',
        'equipos': 'Equipos',
        'generadores': 'Generadores',
        'herramientas': 'Herramientas',
        'seguridad': 'Seguridad'
    };
    return labels[cat] || cat;
};

// Render Products
// Render Products
// Render Products
const renderProducts = (category = 'all', searchTerm = '') => {
    window.renderProducts = renderProducts; // Ensure it's available globally early if needed

    // Re-verify container if it was missing
    if (!productsContainer) {
        productsContainer = document.getElementById('products-container');
    }

    if (!productsContainer) {
        console.warn("DEBUG: products-container not found in DOM");
        return;
    }

    // Determine if this is a search operation or a category switch
    // We only simulate loading for category switches to be smooth
    const isSearch = searchTerm !== '';

    if (!isSearch) {
        productsContainer.innerHTML = '';
        productsContainer.style.opacity = '0.5';
    }

    const executeRender = () => {
        let filteredProducts = products;

        // Filter by Category
        if (category === 'featured') {
            filteredProducts = filteredProducts.filter(p => p.featured === true);
        } else if (category !== 'all') {
            filteredProducts = filteredProducts.filter(p =>
                p.category === category ||
                p.category.startsWith(category + ':') ||
                (category === 'materiales' && p.category !== 'herramientas' && p.category !== 'aridos' && p.category !== 'jardin')
            );
        } else if (!searchTerm) {
            filteredProducts = filteredProducts.filter(p => p.category !== 'aridos');
        }

        // Filter by Search Term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filteredProducts = filteredProducts.filter(p =>
                p.name.toLowerCase().includes(term) ||
                p.category.toLowerCase().includes(term)
            );
        }

        // Clean container if it wasn't cleaned (search mode)
        if (isSearch) {
            productsContainer.innerHTML = '';
        }

        if (filteredProducts.length === 0) {
            productsContainer.innerHTML = '<div class="no-results"><p>No encontramos productos con esa descripción.</p></div>';
            productsContainer.style.opacity = '1';
            return;
        }

        filteredProducts.forEach(product => {
            const hasDiscount = product.oldPrice != null;
            const discountPercentage = hasDiscount
                ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
                : 0;

            const isPlaceholder = product.image === 'assets/images/products/generador.jpg';

            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <div class="product-image" onclick="showProductObservations('${product.id}')">
                    ${hasDiscount ? `<span class="discount-badge">-${discountPercentage}%</span>` : ''}
                    <img src="${product.image}" alt="${product.name}" id="img-prod-${product.id}" data-img-index="0" style="cursor: pointer;">
                    ${isPlaceholder ? '<div class="no-image-overlay">Sin Imagen</div>' : ''}
                    ${(product.images && product.images.length > 1) ? `
                        <button class="img-nav prev" onclick="changeCardImage('${product.id}', -1, event)" style="position: absolute; left: 0; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: white; border: none; padding: 10px; cursor: pointer; border-radius: 0 4px 4px 0;"><i class="fa-solid fa-chevron-left"></i></button>
                        <button class="img-nav next" onclick="changeCardImage('${product.id}', 1, event)" style="position: absolute; right: 0; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: white; border: none; padding: 10px; cursor: pointer; border-radius: 4px 0 0 4px;"><i class="fa-solid fa-chevron-right"></i></button>
                    ` : ''}
                </div>
                <div class="product-info">
                    <span class="product-cat">${getCategoryLabel(product.category)}</span>
                    <h3 class="product-title">${product.name}</h3>
                    <div class="product-price">
                        <span class="current-price">${formatPrice(product.price)}</span>
                        ${hasDiscount ? `<span class="old-price">${formatPrice(product.oldPrice)}</span>` : ''}
                    </div>
                    
                    <div class="product-stock" style="font-size: 0.85rem; color: #666; margin-bottom: 10px;">
                        <span>Stock: ${product.stock} unidades</span>
                    </div>

                    <div class="product-actions">
                        <div class="qty-selector">
                            <button class="qty-btn minus" onclick="adjustCardQty(this, -1)">-</button>
                            <input type="number" class="qty-input" value="1" min="1" readonly>
                            <button class="qty-btn plus" onclick="adjustCardQty(this, 1)">+</button>
                        </div>
                        <button class="btn btn-add" onclick="addToCart('${product.id}', this)">
                            <i class="fa-solid fa-cart-shopping"></i> Agregar
                        </button>
                    </div>
                </div>
            `;
            productsContainer.appendChild(card);
        });

        productsContainer.style.opacity = '1';
    };

    if (isSearch) {
        executeRender();
    } else {
        setTimeout(executeRender, 300); // Small delay for effect only on categories
    }
};
window.renderProducts = renderProducts; // Assign to window at end of definition

// Add to Cart Logic (Consolidated)
window.addToCart = (productId, btnElement) => {
    // Robust search for product
    const product = products.find(p => String(p.id) === String(productId));
    if (!product) {
        console.error("DEBUG: Product not found to add to cart:", productId);
        return;
    }

    let qtyToAdd = 1;
    let qtyInput = null;

    if (btnElement) {
        // Try to find quantity input in the same card
        const card = btnElement.closest('.product-card');
        if (card) {
            qtyInput = card.querySelector('.qty-input');
            if (qtyInput) qtyToAdd = parseInt(qtyInput.value) || 1;
        } else {
            // Fallback for aridos or other structures
            const actions = btnElement.closest('.product-actions');
            if (actions) {
                qtyInput = actions.querySelector('.qty-input');
                if (qtyInput) qtyToAdd = parseInt(qtyInput.value) || 1;
            }
        }
    }

    // Check stock availability
    if (qtyToAdd > product.stock) {
        alert(`Lo sentimos, solo hay ${product.stock} unidades disponibles de este producto.`);
        return;
    }

    // Check if product already exists in cart
    const existingItem = cart.find(item => String(item.id) === String(productId));

    if (existingItem) {
        // Check if adding more would exceed stock
        if (existingItem.qty + qtyToAdd > product.stock) {
            alert(`No puedes agregar más unidades. Stock disponible: ${product.stock}, ya tienes ${existingItem.qty} en el carrito.`);
            return;
        }
        existingItem.qty += qtyToAdd;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            qty: qtyToAdd,
            stock: product.stock
        });
    }

    updateCartCount();
    saveCart();
    renderCartItems();
    openCart();

    // Visual feedback
    if (btnElement) {
        const originalHTML = btnElement.innerHTML;
        btnElement.innerHTML = '<i class="fa-solid fa-check"></i> Agregado';
        btnElement.style.backgroundColor = '#28a745';
        btnElement.classList.add('btn-success');

        setTimeout(() => {
            btnElement.innerHTML = originalHTML;
            btnElement.style.backgroundColor = '';
            btnElement.classList.remove('btn-success');
        }, 1500);
    }

    // Reset quantity to 1 if input exists
    if (qtyInput) {
        qtyInput.value = 1;
    }
};

// Adjust quantity in product card
window.adjustCardQty = (button, change) => {
    const qtyInput = button.closest('.qty-selector').querySelector('.qty-input');
    let currentQty = parseInt(qtyInput.value) || 1;
    let newQty = currentQty + change;

    if (newQty < 1) newQty = 1;

    qtyInput.value = newQty;
};



// Event Listeners for Filters
const setupFilters = () => {
    if (!filterButtons.length) return;

    // Direct clicks on main filter buttons
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderProducts(btn.dataset.filter);
        });
    });

    // Clicks on sub-category links inside filter group dropdowns
    const filterSubLinks = document.querySelectorAll('.filter-group .dropdown-menu a');
    filterSubLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const category = link.dataset.cat;

            // Find parent group button to set as active
            const parentBtn = link.closest('.filter-group').querySelector('.filter-btn');
            filterButtons.forEach(b => b.classList.remove('active'));
            if (parentBtn) parentBtn.classList.add('active');

            renderProducts(category);
        });
    });
};
setupFilters();

// Search Functionality
if (searchInput) {
    // Search Suggestions
    const suggestionsContainer = document.getElementById('search-suggestions');

    const renderSuggestions = (term) => {
        if (!suggestionsContainer) return;

        if (term.length < 1) {
            suggestionsContainer.classList.remove('show');
            suggestionsContainer.innerHTML = '';
            return;
        }

        const matches = products.filter(p =>
            p.name.toLowerCase().includes(term.toLowerCase()) ||
            p.category.toLowerCase().includes(term.toLowerCase())
        ).slice(0, 5); // Limit to 5 suggestions

        if (matches.length > 0) {
            suggestionsContainer.innerHTML = matches.map(p => `
                <div class="suggestion-item" onclick="selectSuggestion('${p.name.replace(/'/g, "\\'")}')">
                    <img src="${p.image}" alt="${p.name}">
                    <span>${p.name}</span>
                </div>
            `).join('');
            suggestionsContainer.classList.add('show');
        } else {
            suggestionsContainer.classList.remove('show');
        }
    };

    window.selectSuggestion = (name) => {
        searchInput.value = name;
        suggestionsContainer.classList.remove('show');
        if (productsContainer) {
            renderProducts('all', name);
            filterButtons.forEach(b => b.classList.remove('active'));
        } else {
            window.location.href = `index.html?search=${encodeURIComponent(name)}`;
        }
    };

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
            suggestionsContainer.classList.remove('show');
        }
    });

    // Real-time search on input
    searchInput.addEventListener('input', (e) => {
        const term = searchInput.value;
        renderSuggestions(term);

        if (productsContainer) {
            // We are on Index, do realtime
            renderProducts('all', term);
            if (term.length > 0) {
                filterButtons.forEach(b => b.classList.remove('active'));
            }
        }
    });

    // Handle Enter key for redirect if needed (e.g. from other pages)
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const term = searchInput.value;
            suggestionsContainer.classList.remove('show');

            if (productsContainer) {
                // Scroll to products
                const productsSection = document.getElementById('productos');
                if (productsSection) productsSection.scrollIntoView({ behavior: 'smooth' });
            } else {
                window.location.href = `index.html?search=${encodeURIComponent(term)}`;
            }
        }
    });

    // Search button click
    const searchBtn = searchInput.nextElementSibling; // The button next to input
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const term = searchInput.value;
            suggestionsContainer.classList.remove('show');
            if (productsContainer) {
                renderProducts('all', term);
                // Scroll to products
                const productsSection = document.getElementById('productos');
                if (productsSection) productsSection.scrollIntoView({ behavior: 'smooth' });
            } else {
                window.location.href = `index.html?search=${encodeURIComponent(term)}`;
            }
        });
    }
}

// Mobile Menu Toggle
if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', (e) => {
        e.preventDefault();
        navList.classList.toggle('show');
    });
}

// Nav Links as Filters
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href && href !== '#' && !href.startsWith('#')) return;

        e.preventDefault();

        // Use data-cat attribute if exists, else fallback to text matching
        let category = link.dataset.cat;

        if (!category) {
            const text = link.textContent.toLowerCase().trim();
            if (text.includes('maquinaria')) category = 'maquinaria';
            else if (text.includes('motores')) category = 'motores';
            else if (text.includes('desarmaduría')) category = 'desarmaduria';
            else if (text.includes('equipos')) category = 'equipos';
            else if (text.includes('generadores')) category = 'generadores';
            else if (text.includes('herramientas')) category = 'herramientas';
            else if (text.includes('seguridad')) category = 'seguridad';
            else if (text.includes('repuestos')) category = 'aridos';
            else if (text.includes('ofertas del mes')) category = 'featured';
            else category = 'all';
        }

        renderProducts(category);

        // Synchronize filter buttons active state
        filterButtons.forEach(btn => {
            if (btn.dataset.filter === category) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Scroll to products
        const productsSection = document.getElementById('productos');
        if (productsSection) {
            productsSection.scrollIntoView({ behavior: 'smooth' });
        }

        // Close mobile menu if open
        if (navList) navList.classList.remove('show');
    });
});

// PDF Catalog Download
const downloadCatalogBtn = document.getElementById('btn-download-catalog');
if (downloadCatalogBtn) {
    downloadCatalogBtn.addEventListener('click', (e) => {
        e.preventDefault();
        downloadCatalogPDF();
    });
}

function downloadCatalogPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Title
    doc.setFontSize(22);
    doc.setTextColor(243, 112, 33); // #f37021
    doc.text('CATÁLOGO DE PRODUCTOS', 105, 20, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(10, 25, 47); // #0a192f
    doc.text('RIO LEBU - MAQUINARIA & MOTORES', 105, 30, { align: 'center' });

    // Date
    doc.setFontSize(10);
    doc.setTextColor(100);
    const date = new Date().toLocaleDateString();
    doc.text(`Fecha de emisión: ${date}`, 105, 38, { align: 'center' });

    // Table Data
    const tableData = products.map(p => [
        p.id,
        p.name,
        p.category.toUpperCase(),
        p.stock,
        new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(p.price)
    ]);

    // Create Table
    doc.autoTable({
        startY: 45,
        head: [['ID', 'Nombre del Producto', 'Categoría', 'Stock', 'Precio']],
        body: tableData,
        headStyles: {
            fillColor: [10, 25, 47],
            textColor: [255, 255, 255],
            fontSize: 10,
            halign: 'center'
        },
        styles: {
            fontSize: 9,
            cellPadding: 3
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 15 },
            2: { halign: 'center' },
            3: { halign: 'center' },
            4: { halign: 'right' }
        },
        margin: { top: 45 }
    });

    // Save
    doc.save(`Catalogo_RioLebu_${date.replace(/\//g, '-')}.pdf`);
}

// Render Áridos Products (for the dedicated section)
const renderAridosProducts = () => {
    window.renderAridosProducts = renderAridosProducts;
    const aridosContainer = document.getElementById('aridos-products-container');
    if (!aridosContainer) return;

    aridosContainer.innerHTML = '';
    aridosContainer.style.opacity = '0.5';

    setTimeout(() => {
        const aridosProducts = products.filter(p => p.category === 'aridos');

        aridosProducts.forEach(product => {
            const hasDiscount = product.oldPrice != null;
            const discountPercentage = hasDiscount
                ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
                : 0;

            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <div class="product-image" onclick="showProductObservations('${product.id}')" style="cursor: pointer;">
                    ${hasDiscount ? `<span class="discount-badge">-${discountPercentage}%</span>` : ''}
                    <img src="${product.image}" alt="${product.name}">
                    ${product.image === 'assets/images/products/generador.jpg' ? '<div class="no-image-overlay">Sin Imagen</div>' : ''}
                </div>
                <div class="product-info">
                    <span class="product-cat">${product.category}</span>
                    <h3 class="product-title">${product.name}</h3>
                    <div class="product-price">
                        <span class="current-price">${formatPrice(product.price)}</span>
                        ${hasDiscount ? `<span class="old-price">${formatPrice(product.oldPrice)}</span>` : ''}
                    </div>

                    <div class="product-stock" style="font-size: 0.85rem; color: #666; margin-bottom: 10px;">
                        <span>Stock: ${product.stock} unidades</span>
                    </div>

                    <div class="product-actions">
                        <div class="qty-selector">
                            <button class="qty-btn minus" onclick="adjustCardQty(this, -1)">-</button>
                            <input type="number" class="qty-input" value="1" min="1" readonly>
                            <button class="qty-btn plus" onclick="adjustCardQty(this, 1)">+</button>
                        </div>
                        <button class="btn btn-add" onclick="addToCart('${product.id}', this)">
                            <i class="fa-solid fa-cart-shopping"></i> Agregar
                        </button>
                    </div>
                </div>
            `;
            aridosContainer.appendChild(card);
        });

        aridosContainer.style.opacity = '1';
    }, 300);
};

// Initial Render
document.addEventListener('DOMContentLoaded', () => {

    // Check for URL params
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');

    if (searchParam && productsContainer) {
        if (searchInput) searchInput.value = searchParam;
        // Render with search term, overriding default 'all' view which hides aridos
        renderProducts('all', searchParam);
        // Also scroll to products
        setTimeout(() => {
            const productsSection = document.getElementById('productos');
            if (productsSection) productsSection.scrollIntoView({ behavior: 'smooth' });
        }, 500);
    } else {
        renderProducts();
    }

    renderAridosProducts(); // Also render áridos section
});

/* Cart Logic */
const cartDrawer = document.getElementById('cart-drawer');
const cartOverlay = document.getElementById('cart-overlay');
const closeCartBtn = document.getElementById('close-cart');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalAmount = document.getElementById('cart-total-amount');
const cartTrigger = document.querySelector('.cart-trigger'); // Trigger in header

window.toggleCart = () => {
    cartDrawer.classList.toggle('open');
    cartOverlay.classList.toggle('open');
};
const toggleCart = window.toggleCart; // Local alias

window.openCart = () => {
    cartDrawer.classList.add('open');
    cartOverlay.classList.add('open');
};
const openCart = window.openCart; // Local alias

// Close Cart Events
closeCartBtn.addEventListener('click', toggleCart);
cartOverlay.addEventListener('click', toggleCart);
cartTrigger.addEventListener('click', (e) => {
    e.preventDefault();
    toggleCart();
});

// Update renderCart
// Adjust Quantity on Product Card
const adjustCardQty = (btn, delta) => {
    const input = btn.parentElement.querySelector('.qty-input');
    let val = parseInt(input.value) || 1;
    val += delta;
    if (val < 1) val = 1;
    input.value = val;
};
window.adjustCardQty = adjustCardQty;

// Change Product Card Image
const changeCardImage = (id, direction, event) => {
    if (event) event.stopPropagation(); // Prevent clicking on card if card has click event

    const product = products.find(p => p.id === id);
    if (!product || !product.images || product.images.length <= 1) return;

    const imgElement = document.getElementById(`img-prod-${id}`);
    if (!imgElement) return;

    let currentIndex = parseInt(imgElement.dataset.imgIndex) || 0;

    // Calculate new index wrapping around
    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = product.images.length - 1;
    if (newIndex >= product.images.length) newIndex = 0;

    // Update
    imgElement.src = product.images[newIndex];
    imgElement.dataset.imgIndex = newIndex;
};

// Render Cart Items
const renderCartItems = () => {
    window.renderCartItems = renderCartItems;
    cartItemsContainer.innerHTML = '';

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart-msg">
                <i class="fa-solid fa-basket-shopping"></i>
                <p>Tu carro está vacío</p>
                <button class="btn btn-primary" onclick="toggleCart(); document.getElementById('productos').scrollIntoView({behavior: 'smooth'})">Ir a comprar</button>
            </div>
        `;
        cartTotalAmount.textContent = formatPrice(0);
        return;
    }

    let total = 0;

    cart.forEach(item => {
        total += item.price * item.qty;

        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <img src="${item.image}" alt="${item.name}">
            <div class="item-details">
                <h4>${item.name}</h4>
                <div class="cart-qty-controls">
                    <button class="mini-qty-btn" onclick="updateCartQty('${item.id}', ${item.qty - 1})"><i class="fa-solid fa-minus"></i></button>
                    <span class="cart-qty-display">${item.qty}</span>
                    <button class="mini-qty-btn" onclick="updateCartQty('${item.id}', ${item.qty + 1})"><i class="fa-solid fa-plus"></i></button>
                </div>
                <button class="remove-item" onclick="removeFromCart('${item.id}')">Eliminar</button>
            </div>
            <div class="item-total">
                ${formatPrice(item.price * item.qty)}
            </div>
        `;
        cartItemsContainer.appendChild(cartItem);
    });

    cartTotalAmount.textContent = formatPrice(total);
};

// Update Cart Quantity
const updateCartQty = (id, newQty) => {
    window.updateCartQty = updateCartQty;
    if (newQty < 1) {
        removeFromCart(id);
        return;
    }

    const item = cart.find(p => String(p.id) === String(id));
    if (item) {
        item.qty = newQty;
        updateCartCount();
        saveCart();
        renderCartItems();
    }
};

// Remove from Cart
const removeFromCart = (id) => {
    window.removeFromCart = removeFromCart;
    const index = cart.findIndex(item => String(item.id) === String(id));
    if (index > -1) {
        cart.splice(index, 1);
        updateCartCount();
        saveCart();
        renderCartItems();
    }
};

// addToCart is now defined globally above

const updateCartCount = () => {
    const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
    cartCountElement.textContent = totalCount;
    cartCountElement.classList.add('bump');
    setTimeout(() => cartCountElement.classList.remove('bump'), 300);
};

// Checkout via WhatsApp
const checkoutBtn = document.querySelector('.checkout-btn');

// Checkout Modal Logic
let checkoutModalCreated = false;

const createCheckoutModal = () => {
    if (checkoutModalCreated) return;

    // Check if user is logged in
    const currentUser = JSON.parse(localStorage.getItem('mariomari_currentUser'));
    const prefillName = currentUser ? currentUser.name : '';
    const prefillEmail = currentUser ? currentUser.email : ''; // Not used in form currently but good to have context

    const modalHTML = `
        <div id="checkout-modal" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Finalizar Pedido</h3>
                    <button class="close-modal" onclick="closeCheckoutModal()"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="modal-body">
                    <p>Ingresa tus datos para agilizar el despacho.</p>
                    <div class="form-group">
                        <label>Nombre</label>
                        <input type="text" id="cust-name" placeholder="Tu nombre" value="${prefillName}">
                    </div>
                    <div class="form-group">
                        <label>Dirección de Despacho</label>
                        <input type="text" id="cust-address" placeholder="Calle, Número, Comuna">
                    </div>
                    <div class="form-group">
                        <label>Comentarios (Opcional)</label>
                        <textarea id="cust-notes" placeholder="Referencia, horario, etc."></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary btn-block" onclick="submitOrder()">
                        <i class="fa-brands fa-whatsapp"></i> Enviar Pedido por WhatsApp
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    checkoutModalCreated = true;
};

window.closeCheckoutModal = () => {
    const modal = document.getElementById('checkout-modal');
    if (modal) modal.classList.remove('open');
};

window.submitOrder = () => {
    const name = document.getElementById('cust-name').value;
    const address = document.getElementById('cust-address').value;
    const notes = document.getElementById('cust-notes').value;

    if (!name || !address) {
        alert('Por favor ingresa tu nombre y dirección.');
        return;
    }

    const phoneNumber = "56984630759";
    let message = `Hola *Rio Lebu Maquinaria*, soy *${name}*.\nMe gustaría realizar el siguiente pedido con despacho a: *${address}*.\n\n`;

    let total = 0;
    cart.forEach(item => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;
        message += `▪️ ${item.qty}x ${item.name} (${formatPrice(itemTotal)})\n`;
    });

    message += `\n*Total a pagar: ${formatPrice(total)}*`;

    if (notes) {
        message += `\n\n📝 Nota: ${notes}`;
    }

    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    closeCheckoutModal();
};

if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) {
            alert('Tu carro está vacío. Agrega productos antes de comprar.');
            return;
        }
        createCheckoutModal();
        // Recalculate prefill if modal was just hidden and not destroyed? 
        // Actually createCheckouModal returns if created. 
        // We should update the value if currentUser changed.
        const currentUser = JSON.parse(localStorage.getItem('ferreteria_currentUser'));
        if (currentUser && document.getElementById('cust-name')) {
            if (!document.getElementById('cust-name').value) {
                document.getElementById('cust-name').value = currentUser.name;
            }
        }

        setTimeout(() => {
            document.getElementById('checkout-modal').classList.add('open');
        }, 10);
    });
}

const migrateOldUsers = async () => {
    const oldUsers = JSON.parse(localStorage.getItem('mariomari_users'));
    if (!oldUsers || !Array.isArray(oldUsers) || oldUsers.length === 0) return;

    console.log(`DEBUG: Iniciando migración de ${oldUsers.length} usuarios antiguos a Firestore...`);

    for (const user of oldUsers) {
        try {
            // Check if already in Firestore
            const snapshot = await db.collection('users').where('email', '==', user.email.toLowerCase()).get();
            if (snapshot.empty) {
                console.log(`DEBUG: Migrando usuario: ${user.email}`);
                await db.collection('users').add({
                    name: user.name,
                    email: user.email.toLowerCase(),
                    password: user.password,
                    role: 'customer',
                    status: 'active',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    migrated: true
                });
            }
        } catch (err) {
            console.error(`Error migrando usuario ${user.email}:`, err);
        }
    }

    // Once migrated, clear the old key or mark it to avoid repeated heavy checks
    localStorage.removeItem('mariomari_users');
    console.log("DEBUG: Migración completada y datos locales antiguos removidos.");
};



/* AUTH LOGIC - Updated to Firestore for Persistence */
window.handleRegister = async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;

    if (password !== confirmPassword) {
        alert('Las contraseñas no coinciden.');
        return;
    }

    if (password.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres.');
        return;
    }

    try {
        console.log("DEBUG: Intentando registrar usuario en Firestore:", email);
        // Check if user already exists in Firestore
        const snapshot = await db.collection('users').where('email', '==', email).get();
        if (!snapshot.empty) {
            alert('Este correo ya está registrado.');
            return;
        }

        // Add new user to Firestore
        await db.collection('users').add({
            name: name,
            email: email,
            password: password, // Note: In production, use Firebase Auth or hash passwords
            role: 'customer',
            status: 'active',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert('Registro exitoso. Ahora puedes iniciar sesión.');
        if (typeof switchTab === 'function') switchTab('login');
    } catch (error) {
        console.error("Error en registro:", error);
        alert('Error de conexión con la base de datos al registrar: ' + error.message);
    }
};

window.handleLogin = async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;

    try {
        console.log("DEBUG: Intentando login en Firestore para:", email);
        // Query Firestore for user
        const snapshot = await db.collection('users')
            .where('email', '==', email)
            .where('password', '==', password)
            .where('status', '==', 'active')
            .get();

        if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            const userData = userDoc.data();

            // Login success
            const sessionUser = {
                id: userDoc.id,
                name: userData.name,
                email: userData.email,
                role: userData.role || 'customer'
            };

            localStorage.setItem('mariomari_currentUser', JSON.stringify(sessionUser));
            alert(`¡Bienvenido, ${userData.name}!`);
            window.location.href = 'index.html';
        } else {
            alert('Correo o contraseña incorrectos, o usuario inactivo.');
        }
    } catch (error) {
        console.error("Error en login:", error);
        alert('Error al conectar con la base de datos: ' + error.message);
    }
};

window.logout = () => {
    localStorage.removeItem('mariomari_currentUser');
    window.location.reload();
};

const checkSession = () => {
    const currentUser = JSON.parse(localStorage.getItem('mariomari_currentUser'));
    const userActionLinks = document.querySelectorAll('#user-action'); // Use class or ID if unique? I used ID but repeated in diff files. 
    // Actually ID must be unique per page, but querySelectorAll works if multiple accidental IDs or I change to class.

    if (currentUser) {
        userActionLinks.forEach(link => {
            link.innerHTML = `
                <i class="fa-solid fa-user-check"></i>
                <span>${currentUser.name.split(' ')[0]}</span>
            `;
            link.href = "#";
            link.onclick = (e) => {
                e.preventDefault();
                if (confirm('¿Deseas cerrar sesión?')) {
                    logout();
                }
            };
        });
    }
};



/* --- Hero Slider Logic --- */
const initHeroSlider = () => {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.querySelector('.prev-slide');
    const nextBtn = document.querySelector('.next-slide');

    if (!slides.length) return;

    let currentSlide = 0;
    let slideInterval;

    const showSlide = (index) => {
        slides.forEach(s => s.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));

        slides[index].classList.add('active');
        dots[index].classList.add('active');
        currentSlide = index;
    };

    const nextSlide = () => {
        let index = (currentSlide + 1) % slides.length;
        showSlide(index);
    };

    const prevSlide = () => {
        let index = (currentSlide - 1 + slides.length) % slides.length;
        showSlide(index);
    };

    const startAutoSlide = () => {
        slideInterval = setInterval(nextSlide, 5000);
    };

    const resetAutoSlide = () => {
        clearInterval(slideInterval);
        startAutoSlide();
    };

    // Events
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            nextSlide();
            resetAutoSlide();
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            prevSlide();
            resetAutoSlide();
        });
    }

    dots.forEach((dot, idx) => {
        dot.addEventListener('click', () => {
            showSlide(idx);
            resetAutoSlide();
        });
    });

    // Auto start
    startAutoSlide();
};

// Consolidated Initialization
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DEBUG: Rio Lebu system initializing...");

    // 1. Initial renders
    renderProducts();
    if (typeof renderAridosProducts === 'function') renderAridosProducts();
    initHeroSlider();

    // 2. Auth & Sessions
    checkSession();

    // 3. Migration (Wait a bit for Firebase to be ready)
    setTimeout(migrateOldUsers, 1500);
});

// Show Product Observations
window.showProductObservations = (productId) => {
    // Robust search (handle string vs number IDs)
    const product = products.find(p => String(p.id) === String(productId));
    if (!product) {
        console.warn("DEBUG: Product not found for observations:", productId);
        return;
    }

    // Check if product has observations
    const observations = product.observations || 'No hay observaciones disponibles para este producto.';

    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'obs-modal-overlay';

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'obs-modal-content';

    modalContent.innerHTML = `
        <button class="obs-modal-close" onclick="this.closest('.obs-modal-overlay').remove()">
            <i class="fa-solid fa-xmark"></i>
        </button>
        <h3 class="obs-modal-header">
            <i class="fa-solid fa-info-circle"></i>
            ${product.name}
        </h3>
        <div class="obs-modal-body">
            ${observations}
        </div>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // Close on overlay click
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.remove();
        }
    });

    // Add CSS animations
    if (!document.getElementById('obs-modal-animations')) {
        const style = document.createElement('style');
        style.id = 'obs-modal-animations';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideDown {
                from { transform: translateY(-50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
};

