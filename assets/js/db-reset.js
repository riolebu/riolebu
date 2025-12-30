import { db } from './firebase-module.js';
import { collection, getDocs, deleteDoc, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

const resetBtn = document.getElementById('reset-btn');
const logDiv = document.getElementById('log');
const statusDiv = document.getElementById('status');

function addLog(msg) {
    const p = document.createElement('p');
    p.style.margin = '2px 0';
    p.textContent = `> ${msg}`;
    logDiv.appendChild(p);
    logDiv.scrollTop = logDiv.scrollHeight;
}

resetBtn.addEventListener('click', async () => {
    if (!confirm('¿ESTÁS SEGURO? Esta acción borrará TODO excepto el Admin Maestro.')) return;

    resetBtn.disabled = true;
    logDiv.style.display = 'block';
    statusDiv.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Iniciando limpieza...';

    try {
        const collections = ['products', 'movements', 'clients', 'users'];
        const masterEmail = 'admin@mariomari.cl';

        for (const colName of collections) {
            addLog(`Procesando colección: ${colName}...`);
            const colRef = collection(db, colName);
            const snapshot = await getDocs(colRef);

            let deletedCount = 0;
            const deletePromises = snapshot.docs.map(async (d) => {
                const data = d.data();

                // Keep master admin
                if (colName === 'users' && data.email === masterEmail) {
                    addLog(`[SKIP] Manteniendo admin: ${data.email}`);
                    return;
                }

                await deleteDoc(doc(db, colName, d.id));
                deletedCount++;
            });

            await Promise.all(deletePromises);
            addLog(`Eliminados ${deletedCount} documentos de ${colName}.`);
        }

        // Reset Settings (Folio)
        addLog('Reseteando configuración de folio...');
        await setDoc(doc(db, 'settings', 'pos_config'), { currentFolio: 1000 });
        addLog('Folio reseteado a 1000.');

        statusDiv.innerHTML = '<div class="success"><i class="fa-solid fa-circle-check"></i> Base de datos vaciada con éxito.</div>';
        addLog('Operación completada.');

    } catch (err) {
        console.error(err);
        statusDiv.innerHTML = `<div style="color:red"><i class="fa-solid fa-circle-xmark"></i> ERROR: ${err.message}</div>`;
        addLog(`ERROR: ${err.message}`);
    } finally {
        resetBtn.disabled = false;
    }
});
