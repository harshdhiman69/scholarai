document.addEventListener("DOMContentLoaded", () => {

  const flowchartInput = document.getElementById("flowchart-input");
  const generateBtn = document.getElementById("generate-flowchart-btn");
  const charCount = document.getElementById("char-count");
  const wordCount = document.getElementById("word-count");
  const clearBtn = document.getElementById("clear-btn");
  const chartStyle = document.getElementById("chart-style");
  
  const inputSection = document.getElementById("input-section");
  const displaySection = document.getElementById("display-section");
  
  const flowchartDisplay = document.getElementById("flowchart-display");
  const dotCode = document.getElementById("dot-code");
  const codeContainer = document.getElementById("code-container");
  const codeToggle = document.getElementById("code-toggle");
  
  const downloadPngBtn = document.getElementById("download-png-btn");
  const downloadSvgBtn = document.getElementById("download-svg-btn");
  const copyCodeBtn = document.getElementById("copy-code-btn");
  const newFlowchartBtn = document.getElementById("new-flowchart-btn");
  
  let currentDotCode = '';
  let currentSvgData = '';
  let currentPngBase64 = '';
  
  
  // Example tag clicks
  document.querySelectorAll('.example-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const exampleType = tag.dataset.example;
      flowchartInput.value = examples[exampleType];
      updateCounts();
      flowchartInput.focus();
      
      // Highlight the clicked tag
      document.querySelectorAll('.example-tag').forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
    });
  });
  
  function updateCounts() {
    const text = flowchartInput.value;
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    
    charCount.textContent = `${chars.toLocaleString()} characters`;
    wordCount.textContent = `${words.toLocaleString()} words`;
    
    if (chars > 10000) charCount.style.color = '#4ade80';
    else if (chars > 5000) charCount.style.color = '#fbbf24';
    else charCount.style.color = 'rgba(255, 255, 255, 0.8)';
    
    clearBtn.style.display = chars > 0 ? 'block' : 'none';
  }
  
  async function generateFlowchart() {
    const text = flowchartInput.value.trim();
    const style = chartStyle.value;
    
    if (!text || text.length < 50) {
      alert("Please provide at least 50 characters describing your process.\n\nTip: Break down your process into clear steps, like:\n1. Start\n2. Do something\n3. Make a decision\n4. End");
      return;
    }
    
    if (text.length > 15000) {
      alert("Text is too long. Please keep it under 15,000 characters.");
      return;
    }
    
    generateBtn.disabled = true;
    const btnText = generateBtn.querySelector('.btn-text');
    const btnIcon = generateBtn.querySelector('.btn-icon');
    const originalIcon = btnIcon.textContent;
    const originalText = btnText.textContent;
    
    btnIcon.textContent = '⏳';
    btnText.textContent = 'Generating Diagram...';
    
    try {
      console.log('Sending request to generate flowchart...');
      console.log('Text length:', text.length);
      console.log('Chart style:', style);
      
      const response = await fetch('/generate-flowchart', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          chart_style: style
        })
      });
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response received');
      
      if (response.ok && data.success) {
        currentDotCode = data.dot_code;
        currentSvgData = data.svg_data;
        currentPngBase64 = data.png_base64;
        
        displayFlowchart(currentSvgData);
        dotCode.textContent = currentDotCode;
        
        showDisplaySection();
        
        console.log('✅ Flowchart generated successfully');
      } else {
        console.error('Error:', data.error);
        
        let errorMsg = data.error || 'Failed to generate flowchart.';
        
        // Add helpful suggestions
        errorMsg += '\n\n💡 Try these tips:\n';
        errorMsg += '• Use simpler, clearer descriptions\n';
        errorMsg += '• Break complex processes into steps\n';
        errorMsg += '• Avoid special characters and symbols\n';
        errorMsg += '• Try one of the example templates\n';
        
        alert(errorMsg);
      }
      
    } catch (error) {
      console.error('Fetch error:', error);
      alert('Connection error. Please check:\n\n' +
            '1. Your internet connection\n' +
            '2. The server is running (python app.py)\n' +
            '3. Graphviz is installed on your system\n\n' +
            'Error: ' + error.message);
    } finally {
      generateBtn.disabled = false;
      btnIcon.textContent = originalIcon;
      btnText.textContent = originalText;
    }
  }
  
  function displayFlowchart(svgData) {
    flowchartDisplay.innerHTML = svgData;
    
    const svg = flowchartDisplay.querySelector('svg');
    if (svg) {
      svg.style.maxWidth = '100%';
      svg.style.height = 'auto';
      svg.style.display = 'block';
      svg.style.margin = '0 auto';
    }
  }
  
  function showDisplaySection() {
    inputSection.classList.add('hidden');
    displaySection.classList.remove('hidden');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  
  function showInputSection() {
    inputSection.classList.remove('hidden');
    displaySection.classList.add('hidden');
    
    // Reset active tags
    document.querySelectorAll('.example-tag').forEach(t => t.classList.remove('active'));
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  
  function toggleCode() {
    if (codeContainer.classList.contains('hidden')) {
      codeContainer.classList.remove('hidden');
      codeToggle.textContent = 'Hide Code';
    } else {
      codeContainer.classList.add('hidden');
      codeToggle.textContent = 'Show Code';
    }
  }
  
  function downloadPNG() {
    if (!currentPngBase64) {
      alert('No flowchart to download');
      return;
    }
    
    try {
      const link = document.createElement('a');
      link.href = 'data:image/png;base64,' + currentPngBase64;
      link.download = 'scholarai-flowchart.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ PNG downloaded');
    } catch (error) {
      console.error('Download error:', error);
      alert('Error downloading PNG. Please try again.');
    }
  }
  
  function downloadSVG() {
    if (!currentSvgData) {
      alert('No flowchart to download');
      return;
    }
    
    try {
      const blob = new Blob([currentSvgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'scholarai-flowchart.svg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('✅ SVG downloaded');
    } catch (error) {
      console.error('Download error:', error);
      alert('Error downloading SVG. Please try again.');
    }
  }
  
  function copyCode() {
    if (!currentDotCode) {
      alert('No code to copy');
      return;
    }
    
    navigator.clipboard.writeText(currentDotCode).then(() => {
      const originalText = copyCodeBtn.querySelector('span').textContent;
      copyCodeBtn.querySelector('span').textContent = '✅ Copied!';
      copyCodeBtn.classList.add('success');
      
      setTimeout(() => {
        copyCodeBtn.querySelector('span').textContent = originalText;
        copyCodeBtn.classList.remove('success');
      }, 2000);
      
      console.log('✅ Code copied to clipboard');
    }).catch(err => {
      console.error('Copy error:', err);
      alert('Failed to copy code. Please try manually selecting the code.');
    });
  }
  
  function clearInput() {
    flowchartInput.value = "";
    updateCounts();
    flowchartInput.focus();
    document.querySelectorAll('.example-tag').forEach(t => t.classList.remove('active'));
  }
  
  if (generateBtn) generateBtn.addEventListener('click', generateFlowchart);
  if (clearBtn) clearBtn.addEventListener('click', clearInput);
  if (flowchartInput) flowchartInput.addEventListener('input', updateCounts);
  if (codeToggle) codeToggle.addEventListener('click', toggleCode);
  if (downloadPngBtn) downloadPngBtn.addEventListener('click', downloadPNG);
  if (downloadSvgBtn) downloadSvgBtn.addEventListener('click', downloadSVG);
  if (copyCodeBtn) copyCodeBtn.addEventListener('click', copyCode);
  if (newFlowchartBtn) newFlowchartBtn.addEventListener('click', showInputSection);
  
  if (flowchartInput) {
    flowchartInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!generateBtn.disabled) {
          generateFlowchart();
        }
      }
    });
  }
  
  if (flowchartInput) {
    flowchartInput.addEventListener('input', () => {
      flowchartInput.style.height = 'auto';
      flowchartInput.style.height = Math.min(flowchartInput.scrollHeight, 450) + 'px';
    });
  }
  
  updateCounts();
  
  console.log("✅ Flowchart Generator with Graphviz initialized!");
});