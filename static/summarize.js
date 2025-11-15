document.addEventListener("DOMContentLoaded", () => {
  const chatWindow = document.getElementById("chat-window");
  const chatInput = document.getElementById("chat-input");
  const sendBtn = document.getElementById("send-btn");
  const charCount = document.getElementById("char-count");
  const wordCount = document.getElementById("word-count");
  const clearBtn = document.getElementById("clear-btn");

  function updateCounts() {
    const text = chatInput.value;
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    
    if (charCount) charCount.textContent = `${chars.toLocaleString()} characters`;
    if (wordCount) wordCount.textContent = `${words.toLocaleString()} words`;
    
    if (chars > 10000) {
      if (charCount) charCount.style.color = '#4ade80';
    } else if (chars > 5000) {
      if (charCount) charCount.style.color = '#fbbf24';
    } else {
      if (charCount) charCount.style.color = 'rgba(255, 255, 255, 0.8)';
    }
    
    if (clearBtn) clearBtn.style.display = chars > 0 ? 'block' : 'none';
  }

  function appendMessage(text, type, animate = true) {
    if (!chatWindow) return;
    
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", type);
    
    if (animate) {
      msgDiv.style.animation = "slideInUp 0.5s ease";
    }

    const formattedText = formatMessage(text);
    msgDiv.innerHTML = formattedText;

    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  function formatMessage(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/###\s+(.*?)(\n|$)/g, '<h4>$1</h4>')
      .replace(/##\s+(.*?)(\n|$)/g, '<h3>$1</h3>')
      .replace(/#\s+(.*?)(\n|$)/g, '<h2>$1</h2>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>')
      .replace(/^\s*[-•]\s+/gm, '<br>• ')
      .replace(/^\s*\d+\.\s+/gm, (match) => `<br>${match}`)
      .replace(/(📖|📊|⚠️|✅|❌|🎓|🧠|⚡|🔍|💡|✨|🚀|📝|🎯)/g, '<span class="emoji">$&</span>');
  }

  function showTypingIndicator() {
    const existingTyping = document.getElementById("typing-indicator");
    if (existingTyping) return;

    const typingDiv = document.createElement("div");
    typingDiv.classList.add("message", "ai-msg", "typing-indicator");
    typingDiv.innerHTML = `
      <div class="typing">
        <span></span><span></span><span></span>
      </div>
      <span>Gemini is analyzing and generating comprehensive summary...</span>
    `;
    typingDiv.id = "typing-indicator";
    if (chatWindow) {
      chatWindow.appendChild(typingDiv);
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }
  }

  function removeTypingIndicator() {
    const typingIndicator = document.getElementById("typing-indicator");
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  function validateInput(text) {
    if (!text.trim()) {
      appendMessage("⚠️ Please provide some text to analyze.", "ai-msg");
      return false;
    }

    if (text.length < 100) {
      appendMessage("⚠️ Text is too short. Please provide at least 100 characters for meaningful analysis.", "ai-msg");
      return false;
    }

    if (text.length > 50000) {
      appendMessage("⚠️ Text is too long. Please provide text under 50,000 characters for optimal processing.", "ai-msg");
      return false;
    }

    return true;
  }

  async function sendMessage() {
    const text = chatInput.value.trim();
    
    if (!validateInput(text)) {
      return;
    }

    appendMessage(text, "user-msg");
    
    chatInput.value = "";
    updateCounts();
    chatInput.style.height = "auto";
    sendBtn.disabled = true;
    
    const btnText = sendBtn.querySelector('.btn-text');
    const btnIcon = sendBtn.querySelector('.btn-icon');
    
    if (btnIcon) btnIcon.textContent = '⏳';
    if (btnText) btnText.textContent = 'Gemini Processing...';

    showTypingIndicator();

    try {
      const startTime = Date.now();
      
      console.log("Sending request to /summarize");
      
      const res = await fetch("/summarize", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ text })
      });

      console.log("Response received:", res.status);
      
      const data = await res.json();
      console.log("Response data:", data);
      
      removeTypingIndicator();

      const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);

      if (res.ok && data.answer) {
        appendMessage(data.answer, "ai-msg");
        
        setTimeout(() => {
          const modelInfo = data.model || 'Gemini';
          const lengthInfo = data.text_length ? ` (${data.text_length.toLocaleString()} characters processed)` : '';
          appendMessage(`✅ Processing completed in ${processingTime} seconds using ${modelInfo}${lengthInfo}`, "ai-msg");
        }, 800);
        
      } else {
        console.error("API Error:", data);
        appendMessage(`❌ Error: ${data.answer || 'Failed to generate summary'}`, "ai-msg");
      }
      
    } catch (err) {
      console.error("Fetch error:", err);
      removeTypingIndicator();
      
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        appendMessage("❌ Connection Error: Unable to reach the server. Please check if the backend is running on http://localhost:5000", "ai-msg");
      } else {
        appendMessage(`❌ Unexpected Error: ${err.message}. Please try again.`, "ai-msg");
      }
    } finally {
      sendBtn.disabled = false;
      if (btnIcon) btnIcon.textContent = '🧠';
      if (btnText) btnText.textContent = 'Analyze with Gemini';
    }
  }

  function clearInput() {
    chatInput.value = "";
    updateCounts();
    chatInput.focus();
  }

  function handleKeyPress(e) {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        return;
      } else {
        e.preventDefault();
        if (!sendBtn.disabled) {
          sendMessage();
        }
      }
    }
  }

  function autoResize() {
    if (chatInput) {
      chatInput.style.height = "auto";
      const newHeight = Math.min(chatInput.scrollHeight, 300);
      chatInput.style.height = newHeight + "px";
    }
  }

  if (sendBtn) sendBtn.addEventListener("click", sendMessage);
  if (clearBtn) clearBtn.addEventListener("click", clearInput);
  
  if (chatInput) {
    chatInput.addEventListener("keydown", handleKeyPress);
    chatInput.addEventListener("input", () => {
      updateCounts();
      autoResize();
    });
  }

  updateCounts();
  if (chatInput) chatInput.focus();

  const placeholders = [
    "Paste your research paper, article, or documentation here for comprehensive Gemini analysis...",
    "Try academic papers, news articles, technical documentation, or study materials...",
    "Gemini excels at detailed analysis of complex texts - paste your content here...",
    "Upload research materials, textbooks, or reports for thorough analysis..."
  ];

  let placeholderIndex = 0;
  setInterval(() => {
    if (chatInput && chatInput.value === "") {
      chatInput.placeholder = placeholders[placeholderIndex];
      placeholderIndex = (placeholderIndex + 1) % placeholders.length;
    }
  }, 4000);

  async function checkModelStatus() {
    try {
      const response = await fetch('/health');
      const data = await response.json();
      const modelStatus = document.getElementById('model-status');
      
      if (modelStatus && data.model) {
        const statusSpan = modelStatus.querySelector('span:last-child');
        if (statusSpan) {
          statusSpan.textContent = `${data.model} Ready`;
        }
        
        const indicator = modelStatus.querySelector('.status-indicator');
        if (indicator && data.api_configured) {
          indicator.style.background = '#4ade80';
          modelStatus.style.borderColor = 'rgba(74, 222, 128, 0.5)';
          modelStatus.style.background = 'rgba(74, 222, 128, 0.1)';
        }
      }
    } catch (error) {
      console.warn('Could not check model status:', error);
      const modelStatus = document.getElementById('model-status');
      if (modelStatus) {
        const indicator = modelStatus.querySelector('.status-indicator');
        if (indicator) {
          indicator.style.background = '#fbbf24';
        }
        modelStatus.style.borderColor = 'rgba(251, 191, 36, 0.5)';
      }
    }
  }

  checkModelStatus();

  console.log("ScholarAI Gemini Summarizer initialized successfully");
});