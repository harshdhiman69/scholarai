document.addEventListener("DOMContentLoaded", () => {

  const quizInput = document.getElementById("quiz-input");
  const generateBtn = document.getElementById("generate-btn");
  const charCount = document.getElementById("char-count");
  const wordCount = document.getElementById("word-count");
  const clearBtn = document.getElementById("clear-btn");
  const numQuestions = document.getElementById("num-questions");
  const difficulty = document.getElementById("difficulty");
  
  const setupSection = document.getElementById("setup-section");
  const quizSection = document.getElementById("quiz-section");
  const resultsSection = document.getElementById("results-section");
  
  const questionNumber = document.getElementById("question-number");
  const questionText = document.getElementById("question-text");
  const optionsContainer = document.getElementById("options-container");
  const explanation = document.getElementById("explanation");
  const explanationText = document.getElementById("explanation-text");
  const quizProgress = document.getElementById("quiz-progress");
  
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const submitBtn = document.getElementById("submit-btn");
  const restartBtn = document.getElementById("restart-btn");
  const reviewBtn = document.getElementById("review-btn");
  const newQuizBtn = document.getElementById("new-quiz-btn");
  
  // Quiz data
  let quizData = null;
  let currentQuestion = 0;
  let userAnswers = [];
  let isReviewMode = false;

  function updateCounts() {
    const text = quizInput.value;
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    
    charCount.textContent = `${chars.toLocaleString()} characters`;
    wordCount.textContent = `${words.toLocaleString()} words`;
    
    if (chars > 15000) charCount.style.color = '#4ade80';
    else if (chars > 5000) charCount.style.color = '#fbbf24';
    else charCount.style.color = 'rgba(255, 255, 255, 0.8)';
    
    clearBtn.style.display = chars > 0 ? 'block' : 'none';
  }

  async function generateQuiz() {
    const text = quizInput.value.trim();
    const numQ = parseInt(numQuestions.value);
    const diff = difficulty.value;
    
    if (!text || text.length < 100) {
      alert("Please provide at least 100 characters of study material.");
      return;
    }
    
    if (text.length > 20000) {
      alert("Text is too long. Please keep it under 20,000 characters.");
      return;
    }
    
    generateBtn.disabled = true;
    const btnText = generateBtn.querySelector('.btn-text');
    const btnIcon = generateBtn.querySelector('.btn-icon');
    btnIcon.textContent = '⏳';
    btnText.textContent = 'Generating Quiz...';
    
    try {
      const response = await fetch('/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          num_questions: numQ,
          difficulty: diff
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        quizData = data.quiz;
        userAnswers = new Array(quizData.questions.length).fill(null);
        currentQuestion = 0;
        isReviewMode = false;
        
        showQuizSection();
        displayQuestion();
      } else {
        alert(data.error || 'Failed to generate quiz. Please try again.');
      }
      
    } catch (error) {
      console.error('Error:', error);
      alert('Error generating quiz. Please check your connection and try again.');
    } finally {
      generateBtn.disabled = false;
      btnIcon.textContent = '🎲';
      btnText.textContent = 'Generate Quiz';
    }
  }

  function showQuizSection() {
    setupSection.classList.add('hidden');
    quizSection.classList.remove('hidden');
    resultsSection.classList.add('hidden');
  }

  function displayQuestion() {
    const questionCard = document.getElementById('question-card');
    if (questionCard) {
        questionCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    const q = quizData.questions[currentQuestion];
    const total = quizData.questions.length;
    
    questionNumber.textContent = `Question ${currentQuestion + 1}`;
    questionText.textContent = q.question;
    quizProgress.textContent = `Question ${currentQuestion + 1} of ${total}`;
    
    optionsContainer.innerHTML = '';
    Object.keys(q.options).forEach(key => {
      const optionDiv = document.createElement('div');
      optionDiv.className = 'option';
      optionDiv.dataset.option = key;
      
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'answer';
      radio.value = key;
      radio.id = `option-${key}`;
      
      if (userAnswers[currentQuestion] === key) {
        radio.checked = true;
      }
      
      if (isReviewMode) {
        radio.disabled = true;
        if (key === q.correct) {
          optionDiv.classList.add('correct');
        } else if (key === userAnswers[currentQuestion]) {
          optionDiv.classList.add('incorrect');
        }
      }
      
      const label = document.createElement('label');
      label.htmlFor = `option-${key}`;
      label.innerHTML = `<span class="option-letter">${key}</span><span class="option-text">${q.options[key]}</span>`;
      
      optionDiv.appendChild(radio);
      optionDiv.appendChild(label);
      
      if (!isReviewMode) {
        optionDiv.addEventListener('click', () => selectOption(key));
      }
      
      optionsContainer.appendChild(optionDiv);
    });
    
    if (isReviewMode && q.explanation) {
      explanation.classList.remove('hidden');
      explanationText.textContent = q.explanation;
    } else {
      explanation.classList.add('hidden');
    }
    
    prevBtn.disabled = currentQuestion === 0;
    
    if (isReviewMode) {
      nextBtn.classList.remove('hidden');
      submitBtn.classList.add('hidden');
      nextBtn.disabled = currentQuestion === total - 1;
    } else {
      if (currentQuestion === total - 1) {
        nextBtn.classList.add('hidden');
        submitBtn.classList.remove('hidden');
      } else {
        nextBtn.classList.remove('hidden');
        submitBtn.classList.add('hidden');
      }
    }
  }

  function selectOption(key) {
    userAnswers[currentQuestion] = key;
    
    const options = optionsContainer.querySelectorAll('.option');
    options.forEach(opt => opt.classList.remove('selected'));
    
    const selected = optionsContainer.querySelector(`[data-option="${key}"]`);
    if (selected) selected.classList.add('selected');
  }

  function nextQuestion() {
    if (currentQuestion < quizData.questions.length - 1) {
      currentQuestion++;
      displayQuestion();
    }
  }

  function prevQuestion() {
    if (currentQuestion > 0) {
      currentQuestion--;
      displayQuestion();
    }
  }

  function submitQuiz() {
    // Check if all answered
    const unanswered = userAnswers.filter(a => a === null).length;
    if (unanswered > 0) {
      if (!confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)) {
        return;
      }
    }
    
    showResults();
  }

  function showResults() {
    let score = 0;
    quizData.questions.forEach((q, i) => {
      if (userAnswers[i] === q.correct) score++;
    });
    
    const total = quizData.questions.length;
    const percentage = Math.round((score / total) * 100);
    
    document.getElementById('score-value').textContent = score;
    document.getElementById('score-total').textContent = `/ ${total}`;
    document.getElementById('score-percentage').textContent = `${percentage}%`;
    
    const resultsIcon = document.getElementById('results-icon');
    const resultsMessage = document.getElementById('results-message');
    
    if (percentage >= 90) {
      resultsIcon.textContent = '🎉';
      resultsMessage.textContent = 'Excellent! You mastered this material!';
    } else if (percentage >= 70) {
      resultsIcon.textContent = '👏';
      resultsMessage.textContent = 'Great job! You have a solid understanding!';
    } else if (percentage >= 50) {
      resultsIcon.textContent = '📚';
      resultsMessage.textContent = 'Good effort! Review the material and try again.';
    } else {
      resultsIcon.textContent = '💪';
      resultsMessage.textContent = 'Keep studying! You\'ll get better with practice.';
    }
    
    setupSection.classList.add('hidden');
    quizSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');
  }

  function reviewAnswers() {
    isReviewMode = true;
    currentQuestion = 0;
    showQuizSection();
    displayQuestion();
  }

  function restart() {
    setupSection.classList.remove('hidden');
    quizSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
    quizInput.value = '';
    updateCounts();
  }

  // Event listeners
  if (generateBtn) generateBtn.addEventListener('click', generateQuiz);
  if (clearBtn) clearBtn.addEventListener('click', () => {
    quizInput.value = '';
    updateCounts();
  });
  if (quizInput) quizInput.addEventListener('input', updateCounts);
  
  if (prevBtn) prevBtn.addEventListener('click', prevQuestion);
  if (nextBtn) nextBtn.addEventListener('click', nextQuestion);
  if (submitBtn) submitBtn.addEventListener('click', submitQuiz);
  if (restartBtn) restartBtn.addEventListener('click', restart);
  if (reviewBtn) reviewBtn.addEventListener('click', reviewAnswers);
  if (newQuizBtn) newQuizBtn.addEventListener('click', restart);
  
  updateCounts();
  
  console.log("Quiz Generator initialized!");
});