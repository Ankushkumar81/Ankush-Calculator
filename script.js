document.addEventListener('DOMContentLoaded', () => {
  /* --- State Variables --- */
  let currentInput = '0';
  let previousInput = '';
  let activeOperator = '';
  let secondaryFormula = '';
  let isCalculated = false;
  let soundEnabled = true;
  let calculationHistory = [];

  /* --- DOM Elements --- */
  const displayMain = document.getElementById('calc-display-main');
  const displayFormula = document.getElementById('calc-display-formula');
  const buttonsGrid = document.getElementById('calc-buttons-grid');
  
  // Theme & Control buttons
  const btnToggleTheme = document.getElementById('btn-toggle-theme');
  const sunIcon = btnToggleTheme.querySelector('.sun-icon');
  const moonIcon = btnToggleTheme.querySelector('.moon-icon');
  
  const btnToggleSound = document.getElementById('btn-toggle-sound');
  const soundOnIcon = btnToggleSound.querySelector('.sound-on-icon');
  const soundOffIcon = btnToggleSound.querySelector('.sound-off-icon');
  
  const btnToggleHistory = document.getElementById('btn-toggle-history');
  const btnCloseHistory = document.getElementById('btn-close-history');
  const historyPanel = document.getElementById('history-panel');
  const historyContentList = document.getElementById('history-content-list');
  const btnClearHistory = document.getElementById('btn-clear-history');
  
  const spotlight = document.getElementById('spotlight');

  /* --- Initialize App --- */
  initTheme();
  initSound();
  loadHistoryFromStorage();
  updateDisplay();

  /* --- Spotlight Cursor Tracking --- */
  window.addEventListener('mousemove', (e) => {
    if (spotlight) {
      spotlight.style.background = `radial-gradient(400px circle at ${e.clientX}px ${e.clientY}px, var(--glow-color) 0%, transparent 80%)`;
    }
  });

  /* --- Web Audio Click Synthesizer --- */
  function playClickSound() {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(750, ctx.currentTime); // Pitch of click
      osc.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 0.04);
      
      gain.gain.setValueAtTime(0.04, ctx.currentTime); // Volume
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04); // Fast decay
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      console.warn("AudioContext blocked or failed to initialize:", e);
    }
  }

  /* --- Theme Toggler Logic --- */
  function initTheme() {
    const savedTheme = localStorage.getItem('calc-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeUI(savedTheme);
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('calc-theme', newTheme);
    updateThemeUI(newTheme);
  }

  function updateThemeUI(theme) {
    if (theme === 'dark') {
      sunIcon.classList.remove('hidden');
      moonIcon.classList.add('hidden');
    } else {
      sunIcon.classList.add('hidden');
      moonIcon.classList.remove('hidden');
    }
  }

  btnToggleTheme.addEventListener('click', () => {
    playClickSound();
    toggleTheme();
  });

  /* --- Sound Control Logic --- */
  function initSound() {
    const savedSoundSetting = localStorage.getItem('calc-sound');
    if (savedSoundSetting !== null) {
      soundEnabled = savedSoundSetting === 'true';
    }
    updateSoundUI();
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('calc-sound', soundEnabled);
    updateSoundUI();
  }

  function updateSoundUI() {
    if (soundEnabled) {
      soundOnIcon.classList.remove('hidden');
      soundOffIcon.classList.add('hidden');
    } else {
      soundOnIcon.classList.add('hidden');
      soundOffIcon.classList.remove('hidden');
    }
  }

  btnToggleSound.addEventListener('click', () => {
    toggleSound();
    playClickSound(); // Play click sound as it was toggled on or to confirm it still works
  });

  /* --- Display Logic --- */
  function updateDisplay() {
    // Format display for readability (e.g. handle exponential notation or long strings)
    if (currentInput === 'Error' || currentInput.includes('Zero')) {
      displayMain.textContent = currentInput;
      displayMain.style.fontSize = '28px'; // Scale down error message
    } else {
      displayMain.textContent = formatDisplayNumber(currentInput);
      
      // Auto-scale font size depending on number length
      const length = currentInput.length;
      if (length > 12) {
        displayMain.style.fontSize = '22px';
      } else if (length > 8) {
        displayMain.style.fontSize = '30px';
      } else {
        displayMain.style.fontSize = '38px';
      }
    }

    // Build the secondary formula display representation
    let formulaString = '';
    if (previousInput !== '') {
      formulaString = `${formatDisplayNumber(previousInput)} ${getOperatorSymbol(activeOperator)}`;
    }
    if (secondaryFormula !== '') {
      formulaString = secondaryFormula;
    }
    displayFormula.textContent = formulaString;
  }

  function formatDisplayNumber(numStr) {
    if (numStr === '' || numStr === '-') return numStr;
    if (numStr === 'Error' || numStr.includes('Zero')) return numStr;
    
    // Check if it has a decimal point
    const parts = numStr.split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1];
    
    // Add thousands commas
    const formattedInteger = parseFloat(integerPart).toLocaleString('en-US', {
      maximumFractionDigits: 0
    });
    
    // Handle minus sign formatting issues with toLocaleString
    let result = integerPart.startsWith('-') && !formattedInteger.startsWith('-') 
      ? '-' + formattedInteger 
      : formattedInteger;

    // Special case for sole 0 under minus (e.g., -0)
    if (integerPart === '-0') result = '-0';
    if (integerPart === '0') result = '0';
    
    if (numStr.includes('.')) {
      return result + '.' + (decimalPart !== undefined ? decimalPart : '');
    }
    
    return result;
  }

  function getOperatorSymbol(op) {
    switch (op) {
      case '+': return '+';
      case '-': return '−';
      case '*': return '×';
      case '/': return '÷';
      default: return '';
    }
  }

  /* --- Mathematical Operations Logic --- */
  function calculate(a, b, op) {
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    
    if (isNaN(numA) || isNaN(numB)) return 'Error';
    
    let result = 0;
    switch (op) {
      case '+':
        result = numA + numB;
        break;
      case '-':
        result = numA - numB;
        break;
      case '*':
        result = numA * numB;
        break;
      case '/':
        if (numB === 0) {
          return 'Error: Division by Zero';
        }
        result = numA / numB;
        break;
      default:
        return b;
    }
    
    return formatMathResult(result);
  }

  // Prevents long decimal outputs like 0.1 + 0.2 = 0.300000004
  function formatMathResult(val) {
    if (!isFinite(val)) return 'Error';
    
    let str = val.toString();
    // Round to 10 decimal digits to eliminate floating point noise
    if (str.includes('.') && str.length > 12) {
      const fixedValue = parseFloat(val.toFixed(10));
      return fixedValue.toString();
    }
    return str;
  }

  /* --- Button Event Listeners & State Machine --- */
  buttonsGrid.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button) return;
    
    playClickSound();
    handleButtonInput(button);
  });

  function handleButtonInput(button) {
    const number = button.dataset.number;
    const operator = button.dataset.operator;
    const action = button.dataset.action;

    // Remove active highlight from any operator button
    clearOperatorHighlights();

    if (number !== undefined) {
      inputNumber(number);
    } else if (operator !== undefined) {
      inputOperator(operator);
    } else if (action !== undefined) {
      handleAction(action);
    }

    updateDisplay();
    highlightActiveOperator();
  }

  function inputNumber(num) {
    if (isCalculated) {
      // Start a fresh number after equals calculation
      currentInput = num;
      secondaryFormula = '';
      isCalculated = false;
    } else {
      // Append number, overwrite default '0'
      if (currentInput === '0') {
        currentInput = num;
      } else if (currentInput === '-0') {
        currentInput = '-' + num;
      } else {
        // Enforce maximum input digits limit to prevent rendering breaks
        if (currentInput.replace(/[.-]/g, '').length < 15) {
          currentInput += num;
        }
      }
    }
  }

  function inputOperator(op) {
    if (currentInput === 'Error' || currentInput.includes('Zero')) return;

    if (isCalculated) {
      // Continue calculating with the previous result
      previousInput = currentInput;
      currentInput = '';
      activeOperator = op;
      secondaryFormula = '';
      isCalculated = false;
    } else if (currentInput === '' && previousInput !== '') {
      // Changed operator selection mid-formula
      activeOperator = op;
    } else if (previousInput === '') {
      // Set the first operand and the operator
      previousInput = currentInput;
      currentInput = '';
      activeOperator = op;
    } else {
      // Perform intermediate calculation
      const res = calculate(previousInput, currentInput, activeOperator);
      if (res.startsWith('Error')) {
        currentInput = res;
        previousInput = '';
        activeOperator = '';
      } else {
        previousInput = res;
        currentInput = '';
        activeOperator = op;
      }
    }
  }

  function handleAction(action) {
    switch (action) {
      case 'clear':
        // AC Reset State
        currentInput = '0';
        previousInput = '';
        activeOperator = '';
        secondaryFormula = '';
        isCalculated = false;
        break;
        
      case 'backspace':
        if (isCalculated) {
          secondaryFormula = '';
        } else {
          if (currentInput.length > 1) {
            currentInput = currentInput.slice(0, -1);
            if (currentInput === '-') currentInput = '0';
          } else {
            currentInput = '0';
          }
        }
        break;
        
      case 'decimal':
        if (isCalculated) {
          currentInput = '0.';
          secondaryFormula = '';
          isCalculated = false;
        } else {
          if (!currentInput.includes('.')) {
            if (currentInput === '') {
              currentInput = '0.';
            } else {
              currentInput += '.';
            }
          }
        }
        break;
        
      case 'toggle-sign':
        if (currentInput === 'Error' || currentInput.includes('Zero')) return;
        
        if (currentInput !== '' && currentInput !== '0') {
          if (currentInput.startsWith('-')) {
            currentInput = currentInput.substring(1);
          } else {
            currentInput = '-' + currentInput;
          }
        }
        break;
        
      case 'percent':
        if (currentInput === 'Error' || currentInput.includes('Zero')) return;
        
        if (currentInput !== '') {
          const val = parseFloat(currentInput);
          currentInput = formatMathResult(val / 100);
        }
        break;
        
      case 'equals':
        if (previousInput !== '' && currentInput !== '' && activeOperator !== '') {
          const expression = `${previousInput} ${activeOperator} ${currentInput}`;
          const result = calculate(previousInput, currentInput, activeOperator);
          
          if (!result.startsWith('Error')) {
            // Store successful calculations to history
            saveToHistory(`${previousInput} ${getOperatorSymbol(activeOperator)} ${currentInput}`, result);
            secondaryFormula = `${formatDisplayNumber(previousInput)} ${getOperatorSymbol(activeOperator)} ${formatDisplayNumber(currentInput)} =`;
            currentInput = result;
          } else {
            secondaryFormula = '';
            currentInput = result;
          }
          
          previousInput = '';
          activeOperator = '';
          isCalculated = true;
        }
        break;
    }
  }

  function clearOperatorHighlights() {
    const operatorBtns = buttonsGrid.querySelectorAll('.btn-operator');
    operatorBtns.forEach(btn => btn.classList.remove('op-active'));
  }

  function highlightActiveOperator() {
    if (activeOperator !== '' && currentInput === '') {
      const button = buttonsGrid.querySelector(`[data-operator="${activeOperator}"]`);
      if (button) {
        button.classList.add('op-active');
      }
    }
  }

  /* --- History Drawer Implementation --- */
  btnToggleHistory.addEventListener('click', () => {
    playClickSound();
    historyPanel.classList.add('open');
  });

  btnCloseHistory.addEventListener('click', () => {
    playClickSound();
    historyPanel.classList.remove('open');
  });

  function saveToHistory(formula, result) {
    const record = {
      id: Date.now(),
      formula: formula,
      result: result
    };
    
    // Add to start of array, keep last 20 records
    calculationHistory.unshift(record);
    if (calculationHistory.length > 20) {
      calculationHistory.pop();
    }
    
    saveHistoryToStorage();
    renderHistoryList();
  }

  function loadHistoryFromStorage() {
    try {
      const data = localStorage.getItem('calc-history');
      if (data) {
        calculationHistory = JSON.parse(data);
      }
    } catch (e) {
      console.error("Failed to load calculation history:", e);
    }
    renderHistoryList();
  }

  function saveHistoryToStorage() {
    try {
      localStorage.setItem('calc-history', JSON.stringify(calculationHistory));
    } catch (e) {
      console.error("Failed to save calculation history:", e);
    }
  }

  function renderHistoryList() {
    historyContentList.innerHTML = '';
    
    if (calculationHistory.length === 0) {
      historyContentList.innerHTML = '<div class="empty-history-msg">No history yet. Perform some calculations!</div>';
      return;
    }
    
    // Loop through history list to build elements
    for (let i = 0; i < calculationHistory.length; i++) {
      const item = calculationHistory[i];
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      historyItem.dataset.result = item.result;
      historyItem.dataset.formula = item.formula;
      
      historyItem.innerHTML = `
        <div class="history-item-formula">${item.formula}</div>
        <div class="history-item-result">${formatDisplayNumber(item.result)}</div>
      `;
      
      historyItem.addEventListener('click', () => {
        playClickSound();
        loadHistoryItem(item);
        historyPanel.classList.remove('open');
      });
      
      historyContentList.appendChild(historyItem);
    }
  }

  function loadHistoryItem(item) {
    currentInput = item.result;
    previousInput = '';
    activeOperator = '';
    secondaryFormula = item.formula + ' =';
    isCalculated = true;
    updateDisplay();
    clearOperatorHighlights();
  }

  btnClearHistory.addEventListener('click', () => {
    playClickSound();
    calculationHistory = [];
    saveHistoryToStorage();
    renderHistoryList();
  });

  /* --- Keyboard Interface Bindings --- */
  window.addEventListener('keydown', (e) => {
    let key = e.key;
    
    // Normalize keys
    if (key === 'Enter') key = '=';
    if (key === 'Escape') key = 'Escape'; // clear
    if (key === 'c' || key === 'C') key = 'Escape'; // clear shortcuts
    if (key === 'x' || key === 'X') key = '*'; // multiplication shortcut
    
    let targetButton = null;
    
    // Search corresponding DOM button
    if (/[0-9]/.test(key)) {
      targetButton = buttonsGrid.querySelector(`[data-number="${key}"]`);
    } else if (['+', '-', '*', '/'].includes(key)) {
      targetButton = buttonsGrid.querySelector(`[data-operator="${key}"]`);
    } else if (key === '.') {
      targetButton = buttonsGrid.querySelector('[data-action="decimal"]');
    } else if (key === '=') {
      targetButton = buttonsGrid.querySelector('[data-action="equals"]');
    } else if (key === 'Backspace') {
      targetButton = buttonsGrid.querySelector('[data-action="backspace"]');
    } else if (key === 'Escape') {
      targetButton = buttonsGrid.querySelector('[data-action="clear"]');
    } else if (key === '%') {
      targetButton = buttonsGrid.querySelector('[data-action="percent"]');
    }

    if (targetButton) {
      // Prevent default browser operations (e.g. Backspace going back a page)
      e.preventDefault();
      
      // Simulate button click visually
      targetButton.classList.add('keyboard-active');
      setTimeout(() => {
        targetButton.classList.remove('keyboard-active');
      }, 100);
      
      // Execute operation
      playClickSound();
      handleButtonInput(targetButton);
    }
  });
});