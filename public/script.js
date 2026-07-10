const URL_API = 'http://localhost:8000/api/turnos'; 

async function cargarTurnos() {
    try {
        const res = await fetch(URL_API);
        const turnos = await res.json();
        
        const contenedor = document.getElementById('lista-turnos');
        contenedor.innerHTML = ''; 

        if (turnos.length === 0) {
            contenedor.innerHTML = '<p style="grid-column: span 2; text-align: center; color: #777;">lista de turnos vacia.</p>';
            return;
        }

        turnos.forEach(turno => {
            const card = document.createElement('div');
            card.className = 'turno-card';
            card.innerHTML = `
                <h3>👤 ${turno.paciente}</h3>
                <p><strong>Fecha:</strong> ${turno.fecha}</p>
                <p><strong>Hora:</strong> ${turno.hora} hs</p>
                <p style="color: green;"><strong>Estado:</strong> ${turno.estado}</p>
            `;
            contenedor.appendChild(card);
        });
    } catch (error) {
        console.error("Error al cargar los turnos:", error);
    }
}


document.getElementById('form-turno').addEventListener('submit', async (e) => {
    e.preventDefault(); 

    const paciente = document.getElementById('paciente').value;
    const fecha = document.getElementById('fecha').value;
    const hora = document.getElementById('hora').value;

    try {
        
        const res = await fetch(URL_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paciente, fecha, hora })
        });

        const resultado = await res.json();
        
        
        alert(resultado.mensaje);

        if (res.ok) {
            document.getElementById('form-turno').reset(); 
            setTimeout(cargarTurnos, 2500);
        }
    } catch (error) {
        alert("Error al conectar con el servidor.");
    }
});


cargarTurnos();