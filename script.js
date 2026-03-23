// Configuración de la API (Con la llave proporcionada)
const API_KEY = "AIzaSyAx9iIoJMSaJKNfe__W33FmYc5dEOLV8tE"; 
const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

let voiceEnabled = true;

// Historial y Persistencia
let chatHistory = JSON.parse(localStorage.getItem('vmax_history')) || [];

window.onload = () => {
    const chatBox = document.getElementById('chat-box');
    if (chatHistory.length > 0) {
        chatHistory.forEach(msg => {
            renderMessageToUI(msg.parts[0].text, msg.role === 'user' ? 'user' : 'bot');
        });
    } else {
        renderMessageToUI("SISTEMA V-MAX ON. <br>Bienvenido al portal de consulta diagnóstica. ¿Qué parámetros médicos o resultados de laboratorio desea analizar hoy?", 'bot');
    }
};

// Controles de UI
document.getElementById('toggle-theme').addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
    this.innerHTML = document.body.classList.contains('dark-mode') ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
});

const voiceBtn = document.getElementById('toggle-voice');
voiceBtn.addEventListener('click', () => {
    voiceEnabled = !voiceEnabled;
    window.speechSynthesis.cancel();
    voiceBtn.innerHTML = voiceEnabled ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>';
    voiceBtn.style.color = voiceEnabled ? '#8e8ea0' : '#e74c3c';
});

document.getElementById('clear-chat').addEventListener('click', () => {
    if(confirm("¿Desea iniciar una nueva consulta médica y borrar el historial actual?")) {
        chatHistory = [];
        localStorage.removeItem('vmax_history');
        location.reload(); 
    }
});

function speak(text) {
    if (!voiceEnabled || !text) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[#*`|_]/g, '').replace(/V-MAX PRO/g, 'Vemax Pro');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'es-ES';
    window.speechSynthesis.speak(utterance);
}

// Conexión con V-MAX AI (Memoria Inyectada)
async function callVMAX(prompt) {
    chatHistory.push({ role: "user", parts: [{ text: prompt }] });

    const config = {
        systemInstruction: {
            parts: [{ text: `Actúa como V-MAX, una Unidad de Diagnóstico Clínico Avanzado. 
            Tu tono es técnico, preciso y profesional.
            REGLAS:
            1. Si hay valores de referencia médicos, usa tablas Markdown obligatoriamente.
            2. Analiza el significado clínico de los parámetros.
            3. Considera el contexto de la conversación anterior.
            4. Mensaje final de advertencia legal corto: "V-MAX: Consulte a su médico."` }]
        },
        contents: chatHistory 
    };

    try {
        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        
        if (!response.ok) throw new Error(`Error de red: ${response.status}`);
        
        const data = await response.json();
        const botResponse = data.candidates[0].content.parts[0].text;
        
        chatHistory.push({ role: "model", parts: [{ text: botResponse }] });
        localStorage.setItem('vmax_history', JSON.stringify(chatHistory));
        
        return botResponse;
    } catch (error) {
        console.error("API Error:", error);
        chatHistory.pop(); // Revertir historial si falla
        return "ERROR DEL SISTEMA: Fallo de conexión o la API Key excedió su cuota.";
    }
}

// Lógica del Input y Bloqueo
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text) return;

    window.speechSynthesis.cancel();
    
    // Bloquear UI
    userInput.disabled = true;
    sendBtn.disabled = true;
    userInput.value = '';

    renderMessageToUI(text, 'user');
    const loadingId = renderMessageToUI('<i class="fas fa-sync fa-spin"></i> Procesando datos clínicos...', 'bot loading');

    // Llamada a API
    const response = await callVMAX(text);

    // Desbloquear UI
    document.getElementById(loadingId).remove();
    renderMessageToUI(response, 'bot');
    speak(response);

    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.focus();
});

// Renderizado de UI
function renderMessageToUI(text, sender) {
    const chatBox = document.getElementById('chat-box');
    const id = Date.now() + Math.random().toString(16).slice(2); 
    
    const messageWrapper = document.createElement('div');
    messageWrapper.className = `message-wrapper ${sender}`;
    messageWrapper.id = id;

    const avatarHtml = sender.includes('bot') ? '<div class="avatar"><i class="fas fa-robot"></i></div>' : '';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message';
    messageContent.innerHTML = sender.includes('bot') ? marked.parse(text) : text;

    messageWrapper.innerHTML = avatarHtml;
    messageWrapper.appendChild(messageContent);
    chatBox.appendChild(messageWrapper);
    
    const chatContainer = document.querySelector('.chat-container');
    chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
    
    return id;
}

// Exportación a PDF (Ajustado a Tema Claro)
document.getElementById('download-pdf').addEventListener('click', () => {
    const chatBox = document.getElementById('chat-box').cloneNode(true);
    chatBox.style.padding = "20px";
    chatBox.style.background = "white";
    chatBox.style.color = "black";
    chatBox.style.width = "100%";
    
    chatBox.querySelectorAll('.message-wrapper').forEach(w => w.style.gap = "10px");
    chatBox.querySelectorAll('.message').forEach(m => {
        m.style.background = "#fff";
        m.style.color = "black";
        m.style.border = "1px solid #ddd";
    });
    chatBox.querySelectorAll('.user .message').forEach(m => m.style.background = "#eef2f7");
    
    const opt = {
        margin: 10,
        filename: 'Informe_Clinico_V-MAX.pdf',
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().from(chatBox).set(opt).save();
});
