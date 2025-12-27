import { db } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy, addDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

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
let products = [];

// Firestore Listener for Products
const productsRef = collection(db, 'products');
onSnapshot(productsRef, (snapshot) => {
    products = snapshot.docs.map(doc => ({
        docId: doc.id,
        ...doc.data()
    })).filter(p => p.status !== 'inactive'); // Filter out inactive products

    // If first time and empty?
    if (products.length === 0) {
        console.log("No hay productos en Firestore.");
        productsContainer.innerHTML = '<div class="no-results"><p>No hay productos disponibles.</p></div>';
    }

    renderProducts();
    renderAridosProducts();
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
const productsContainer = document.getElementById('products-container');
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

// Render Products
// Render Products
window.renderProducts = (category = 'all', searchTerm = '') => {
    if (!productsContainer) return;

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
        if (category !== 'all') {
            filteredProducts = filteredProducts.filter(p => p.category === category || (category === 'materiales' && p.category !== 'herramientas' && p.category !== 'aridos' && p.category !== 'jardin'));
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

            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <div class="product-image">
                    ${hasDiscount ? `<span class="discount-badge">-${discountPercentage}%</span>` : ''}
                    <img src="${product.image}" alt="${product.name}" id="img-prod-${product.id}" data-img-index="0">
                    ${(product.images && product.images.length > 1) ? `
                        <button class="img-nav prev" onclick="changeCardImage(${product.id}, -1, event)" style="position: absolute; left: 0; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: white; border: none; padding: 10px; cursor: pointer; border-radius: 0 4px 4px 0;"><i class="fa-solid fa-chevron-left"></i></button>
                        <button class="img-nav next" onclick="changeCardImage(${product.id}, 1, event)" style="position: absolute; right: 0; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: white; border: none; padding: 10px; cursor: pointer; border-radius: 4px 0 0 4px;"><i class="fa-solid fa-chevron-right"></i></button>
                    ` : ''}
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
                        <button class="btn btn-add" onclick="addToCart(${product.id}, this)">
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

// Add to Cart Function





// Event Listeners for Filters
filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all
        filterButtons.forEach(b => b.classList.remove('active'));
        // Add active to clicked
        btn.classList.add('active');
        // Render
        renderProducts(btn.dataset.filter);
    });
});

// Search Functionality
if (searchInput) {
    // Real-time search on input
    searchInput.addEventListener('input', (e) => {
        const term = searchInput.value;
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
            // If we are NOT on index, redirect
            if (!productsContainer) {
                window.location.href = `index.html?search=${encodeURIComponent(term)}`;
            }
        }
    });

    // Search button click
    const searchBtn = searchInput.nextElementSibling; // The button next to input
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const term = searchInput.value;
            if (productsContainer) {
                renderProducts('all', term);
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
        // Do not intercept if it's a real link (not #) and not an in-page anchor
        if (href && href !== '#' && !href.startsWith('#')) return;

        e.preventDefault();
        const text = link.textContent.toLowerCase().trim();

        // Map nav text to standard categories
        let category = 'all';
        if (text.includes('maquinaria')) category = 'maquinaria';
        else if (text.includes('motores')) category = 'motores';
        else if (text.includes('generadores')) category = 'generadores';
        else if (text.includes('herramientas')) category = 'herramientas';
        else if (text.includes('seguridad')) category = 'seguridad';
        else if (text.includes('repuestos')) category = 'aridos'; // Mapped to aridos for compatibility with Repuestos/Aridos page logic

        renderProducts(category);

        // Scroll to products
        const productsSection = document.getElementById('productos');
        productsSection.scrollIntoView({ behavior: 'smooth' });

        // Close mobile menu if open
        navList.classList.remove('show');
    });
});

// Render Áridos Products (for the dedicated section)
window.renderAridosProducts = () => {
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
                <div class="product-image">
                    ${hasDiscount ? `<span class="discount-badge">-${discountPercentage}%</span>` : ''}
                    <img src="${product.image}" alt="${product.name}">
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
                        <button class="btn btn-add" onclick="addToCart(${product.id}, this)">
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

window.openCart = () => {
    cartDrawer.classList.add('open');
    cartOverlay.classList.add('open');
};

// Close Cart Events
closeCartBtn.addEventListener('click', toggleCart);
cartOverlay.addEventListener('click', toggleCart);
cartTrigger.addEventListener('click', (e) => {
    e.preventDefault();
    toggleCart();
});

// Update renderCart
// Adjust Quantity on Product Card
window.adjustCardQty = (btn, delta) => {
    const input = btn.parentElement.querySelector('.qty-input');
    let val = parseInt(input.value) || 1;
    val += delta;
    if (val < 1) val = 1;
    input.value = val;
};

// Change Product Card Image
window.changeCardImage = (id, direction, event) => {
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
window.renderCartItems = () => {
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
                    <button class="mini-qty-btn" onclick="updateCartQty(${item.id}, ${item.qty - 1})"><i class="fa-solid fa-minus"></i></button>
                    <span class="cart-qty-display">${item.qty}</span>
                    <button class="mini-qty-btn" onclick="updateCartQty(${item.id}, ${item.qty + 1})"><i class="fa-solid fa-plus"></i></button>
                </div>
                <button class="remove-item" onclick="removeFromCart(${item.id})">Eliminar</button>
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
window.updateCartQty = (id, newQty) => {
    if (newQty < 1) {
        // Optional: Ask to remove or just remove
        removeFromCart(id);
        return;
    }

    const item = cart.find(p => p.id === id);
    if (item) {
        item.qty = newQty;
        updateCartCount();
        saveCart();
        renderCartItems();
    }
};

// Remove from Cart
window.removeFromCart = (id) => {
    const index = cart.findIndex(item => item.id === id);
    if (index > -1) {
        cart.splice(index, 1);
        updateCartCount();
        saveCart();
        renderCartItems();
    }
};

// Add to Cart
window.addToCart = (id, btnElement) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    let qtyToAdd = 1;
    if (btnElement) {
        // Find the input in the same container
        // Traverse up to .product-actions or just sibling search
        const container = btnElement.closest('.product-actions');
        // Note: I will update HTML to have product-actions wrapper. 
        // If wrapper not there (old HTML), fallback to 1.
        if (container) {
            const input = container.querySelector('.qty-input');
            if (input) qtyToAdd = parseInt(input.value) || 1;
        }
    }

    // Check if exists
    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
        existingItem.qty += qtyToAdd;
    } else {
        cart.push({ ...product, qty: qtyToAdd });
    }

    updateCartCount();
    saveCart();
    renderCartItems();
    openCart();

    // Visual feedback
    if (btnElement) {
        const originalHTML = btnElement.innerHTML;
        btnElement.innerHTML = '<i class="fa-solid fa-check"></i>';
        btnElement.style.backgroundColor = 'var(--success)';
        setTimeout(() => {
            btnElement.innerHTML = originalHTML;
            btnElement.style.backgroundColor = '';
        }, 1500);
    }
};

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

    const phoneNumber = "56978589090";
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

/* AUTH LOGIC */
window.handleRegister = (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;

    if (password !== confirmPassword) {
        alert('Las contraseñas no coinciden.');
        return;
    }

    let users = JSON.parse(localStorage.getItem('mariomari_users')) || [];

    // Check if email exists
    if (users.find(u => u.email === email)) {
        alert('Este correo ya está registrado.');
        return;
    }

    const newUser = { name, email, password }; // Note: In production never store passwords in plain text!
    users.push(newUser);
    localStorage.setItem('mariomari_users', JSON.stringify(users));

    alert('Registro exitoso. Ahora puedes iniciar sesión.');
    switchTab('login');
};

window.handleLogin = (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    let users = JSON.parse(localStorage.getItem('mariomari_users')) || [];
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        // Login success
        const sessionUser = { name: user.name, email: user.email };
        localStorage.setItem('mariomari_currentUser', JSON.stringify(sessionUser));
        alert(`Bienvenido, ${user.name}!`);
        window.location.href = 'index.html';
    } else {
        alert('Correo o contraseña incorrectos.');
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

// Run check session on load
checkSession();

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

// Initialize Slider
initHeroSlider();
