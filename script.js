class CrosswordGenerator {
  constructor(rows, cols, entries, rng) {
    this.rows = rows;
    this.cols = cols;
    this.entries = entries.map((entry, index) => ({
      ...entry,
      index,
    }));
    this.rng = typeof rng === 'function' ? rng : Math.random;
    this.grid = this.createEmptyGrid();
    this.placements = Array(this.entries.length).fill(null);
    this.placedCount = 0;
  }

  createEmptyGrid() {
    return Array.from({ length: this.rows }, () => Array(this.cols).fill(''));
  }

  clearState() {
    this.grid = this.createEmptyGrid();
    this.placements = Array(this.entries.length).fill(null);
    this.placedCount = 0;
  }

  random() {
    return this.rng();
  }

  runAttempt() {
    this.clearState();
    const order = this.buildOrder();

    for (const entryIndex of order) {
      const entry = this.entries[entryIndex];
      const placements = this.findPlacements(entry);

      if (!placements.length) {
        continue;
      }

      const bestOverlap = placements[0].overlaps;
      const topChoices = placements.filter((placement) => placement.overlaps === bestOverlap);
      const choice = topChoices[Math.floor(this.random() * topChoices.length)];
      this.placeEntry(entryIndex, choice);
    }

    if (this.placedCount === 0) {
      return null;
    }

    const resultData = this.buildResult();

    return {
      ...resultData,
      placedCount: this.placedCount,
    };
  }

  generate(maxAttempts = 400) {
    let best = null;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const result = this.runAttempt();
      if (!result) {
        continue;
      }

      if (!best || result.placedCount > best.placedCount) {
        best = result;
      } else if (
        result.placedCount === best.placedCount &&
        result.density > best.density
      ) {
        best = result;
      }

      if (best.placedCount === this.entries.length) {
        break;
      }
    }

    return best;
  }

  buildOrder() {
    return this.entries
      .map((entry) => ({
        index: entry.index,
        priority: entry.answer.length + this.random(),
      }))
      .sort((a, b) => b.priority - a.priority)
      .map((item) => item.index);
  }

  findPlacements(entry) {
    const placements = [];

    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        const horizontal = this.evaluatePlacement(entry, row, col, 'across');
        if (horizontal) {
          placements.push(horizontal);
        }
        const vertical = this.evaluatePlacement(entry, row, col, 'down');
        if (vertical) {
          placements.push(vertical);
        }
      }
    }

    placements.sort((a, b) => {
      if (b.overlaps !== a.overlaps) {
        return b.overlaps - a.overlaps;
      }
      return this.random() - 0.5;
    });

    return placements;
  }

  evaluatePlacement(entry, row, col, direction) {
    const length = entry.answer.length;

    if (direction === 'across') {
      if (col + length > this.cols) {
        return null;
      }
      if (col > 0 && this.grid[row][col - 1] !== '') {
        return null;
      }
      if (col + length < this.cols && this.grid[row][col + length] !== '') {
        return null;
      }
    } else {
      if (row + length > this.rows) {
        return null;
      }
      if (row > 0 && this.grid[row - 1][col] !== '') {
        return null;
      }
      if (row + length < this.rows && this.grid[row + length][col] !== '') {
        return null;
      }
    }

    let overlaps = 0;

    for (let i = 0; i < length; i += 1) {
      const r = direction === 'across' ? row : row + i;
      const c = direction === 'across' ? col + i : col;
      const cell = this.grid[r][c];
      const letter = entry.answer[i];

      if (cell !== '' && cell !== letter) {
        return null;
      }

      if (cell === letter) {
        overlaps += 1;
      }

      if (cell === '') {
        if (direction === 'across') {
          if (r > 0 && this.grid[r - 1][c] !== '') {
            return null;
          }
          if (r + 1 < this.rows && this.grid[r + 1][c] !== '') {
            return null;
          }
        } else {
          if (c > 0 && this.grid[r][c - 1] !== '') {
            return null;
          }
          if (c + 1 < this.cols && this.grid[r][c + 1] !== '') {
            return null;
          }
        }
      }
    }

    if (this.placedCount > 0 && overlaps === 0) {
      return null;
    }

    return {
      row,
      col,
      direction,
      overlaps,
    };
  }

  placeEntry(entryIndex, placement) {
    const { answer } = this.entries[entryIndex];
    const { row, col, direction } = placement;
    const filledPositions = [];

    for (let i = 0; i < answer.length; i += 1) {
      const r = direction === 'across' ? row : row + i;
      const c = direction === 'across' ? col + i : col;
      if (this.grid[r][c] === '') {
        this.grid[r][c] = answer[i];
        filledPositions.push({ row: r, col: c });
      }
    }

    this.placements[entryIndex] = {
      ...placement,
      entryIndex,
      filledPositions,
    };
    this.placedCount += 1;
  }

  hasPlacementAt(row, col, direction) {
    return this.placements.some(
      (placement) =>
        placement &&
        placement.row === row &&
        placement.col === col &&
        placement.direction === direction,
    );
  }

  buildResult() {
    const grid = this.grid.map((row) => row.slice());
    const numberGrid = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
    const across = [];
    const down = [];

    let clueNumber = 1;
    let filledCells = 0;

    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        if (grid[row][col] === '') {
          continue;
        }

        filledCells += 1;

        const hasAcross = this.hasPlacementAt(row, col, 'across');
        const hasDown = this.hasPlacementAt(row, col, 'down');

        const startAcross = hasAcross && (col === 0 || grid[row][col - 1] === '');
        const startDown = hasDown && (row === 0 || grid[row - 1][col] === '');

        if (startAcross || startDown) {
          numberGrid[row][col] = clueNumber;
          clueNumber += 1;
        }
      }
    }

    for (const placement of this.placements) {
      if (!placement) {
        continue;
      }
      const entry = this.entries[placement.entryIndex];
      const number = numberGrid[placement.row][placement.col];
      const clueEntry = {
        number,
        clue: entry.clue,
        row: placement.row,
        col: placement.col,
        direction: placement.direction,
        length: entry.answer.length,
      };

      if (placement.direction === 'across') {
        across.push(clueEntry);
      } else {
        down.push(clueEntry);
      }
    }

    across.sort((a, b) => a.number - b.number);
    down.sort((a, b) => a.number - b.number);

    const omitted = this.entries
      .filter((_, index) => !this.placements[index])
      .map((entry) => entry.rawWord || entry.answer);

    const totalCells = this.rows * this.cols;
    const density = totalCells > 0 ? filledCells / totalCells : 0;

    return {
      grid,
      numberGrid,
      across,
      down,
      omitted,
      filledCells,
      density,
    };
  }
}

function normalizeAnswer(rawWord) {
  const normalized = rawWord
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\-\s]+/g, '');
  return normalized.toUpperCase().replace(/[^A-Z]/g, '');
}

function parseEntries(raw, errorElement) {
  const lines = raw.split(/\r?\n/);
  const entries = [];
  const invalid = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    let word = null;
    let clue = null;

    const colonMatch = trimmed.match(/^\s*([^:]+)\s*:\s*(.+)\s*$/);
    if (colonMatch) {
      word = colonMatch[1];
      clue = colonMatch[2];
    } else if (!trimmed.includes(':') && (trimmed.includes('\t') || trimmed.includes(','))) {
      const delimiter = trimmed.includes('\t') ? '\t' : ',';
      const parts = trimmed.split(delimiter);
      if (parts.length >= 2) {
        word = parts.shift();
        clue = parts.join(delimiter).trim();
      }
    }

    if (!word || !clue) {
      invalid.push(index + 1);
      return;
    }

    const answer = normalizeAnswer(word);
    if (!answer) {
      invalid.push(index + 1);
      return;
    }

    entries.push({ answer, clue: clue.trim(), rawWord: word.trim() });
  });

  if (invalid.length) {
    if (errorElement) {
      errorElement.textContent = `Fix lines: ${invalid.join(', ')}. Use "WORD: clue".`;
      errorElement.hidden = false;
    }
    return null;
  }

  if (errorElement) {
    errorElement.textContent = '';
    errorElement.hidden = true;
  }

  return entries;
}

function fnv1a(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(a) {
  return function rng() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createSeededRng(seedInput) {
  let seedText = seedInput.trim();
  let seedValue;

  if (!seedText) {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      seedValue = arr[0] || 1;
      seedText = arr[0].toString(16);
    } else {
      seedValue = Math.floor(Math.random() * 2 ** 32);
      seedText = seedValue.toString(16);
    }
  } else {
    seedValue = fnv1a(seedText);
  }

  if (seedValue === 0) {
    seedValue = 1;
  }

  return {
    rng: mulberry32(seedValue >>> 0),
    seedText,
    seedValue: seedValue >>> 0,
  };
}

function encodeBase64(str) {
  if (typeof btoa === 'function') {
    return btoa(unescape(encodeURIComponent(str)));
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf8').toString('base64');
  }
  return str;
}

function decodeBase64(str) {
  if (!str) {
    return '';
  }
  if (typeof atob === 'function') {
    try {
      return decodeURIComponent(escape(atob(str)));
    } catch (error) {
      return str;
    }
  }
  if (typeof Buffer !== 'undefined') {
    try {
      return Buffer.from(str, 'base64').toString('utf8');
    } catch (error) {
      return str;
    }
  }
  return str;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function buildDisplayGrid(result, mode) {
  const blank = result.grid.map((row) => row.map((cell) => (cell === '' ? '' : '')));

  if (mode === 'blank') {
    return blank;
  }

  if (mode === 'assisted' || mode === 'firstLetter') {
    const assisted = blank.map((row) => row.slice());
    const reveal = (clue) => {
      assisted[clue.row][clue.col] = result.grid[clue.row][clue.col];
    };
    result.across.forEach(reveal);
    result.down.forEach(reveal);
    return assisted;
  }

  return result.grid.map((row) => row.slice());
}

function renderGrid(resultGrid, numberGrid, container, displayGrid) {
  container.innerHTML = '';

  if (!resultGrid || !resultGrid.length || !resultGrid[0]) {
    document.documentElement.style.removeProperty('--cols');
    return;
  }

  document.documentElement.style.setProperty('--cols', String(resultGrid[0].length));
  const table = document.createElement('table');
  const tbody = document.createElement('tbody');

  for (let row = 0; row < resultGrid.length; row += 1) {
    const tr = document.createElement('tr');
    for (let col = 0; col < resultGrid[row].length; col += 1) {
      const td = document.createElement('td');
      const value = resultGrid[row][col];
      td.classList.add('grid__cell');

      if (value === '') {
        td.classList.add('grid__cell--blank');
      } else {
        const shown = displayGrid ? displayGrid[row][col] : value;
        td.textContent = shown || '';
        const number = numberGrid[row][col];
        if (number !== null && number !== undefined) {
          const span = document.createElement('span');
          span.textContent = number;
          span.className = 'grid__number';
          td.appendChild(span);
        }
      }

      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  container.appendChild(table);
}

function renderClues(list, clues) {
  list.innerHTML = '';
  clues.forEach((clue) => {
    const li = document.createElement('li');
    const numberSpan = document.createElement('span');
    numberSpan.className = 'n';
    numberSpan.textContent = `${clue.number}`;
    li.appendChild(numberSpan);
    li.appendChild(document.createTextNode(` ${clue.clue}`));
    list.appendChild(li);
  });
}

function showMessage(element, message, type) {
  element.innerHTML = '';
  element.classList.remove('message--error', 'message--success', 'message--warning');
  if (message) {
    const span = document.createElement('span');
    span.textContent = message;
    element.appendChild(span);
  }
  if (type) {
    element.classList.add(`message--${type}`);
  }
}

function createSearchController({
  rows,
  cols,
  entries,
  rng,
  updateProgress,
  onPause,
  timeWindowMs = 4000,
}) {
  const state = {
    attempts: 0,
    best: null,
    running: false,
    startTime: 0,
    lastUpdate: 0,
    windowDeadline: 0,
    resolve: null,
    cancelled: false,
  };

  const controller = {
    resume(extraWindowMs = timeWindowMs) {
      if (state.cancelled) {
        return;
      }
      state.running = true;
      state.startTime = state.startTime || performance.now();
      state.windowDeadline = performance.now() + extraWindowMs;
      requestAnimationFrame(loop);
    },
    stop() {
      if (state.cancelled) {
        return;
      }
      state.running = false;
      if (state.resolve) {
        state.resolve({
          best: state.best,
          attempts: state.attempts,
          elapsed: (performance.now() - state.startTime) / 1000,
        });
      }
    },
    cancel() {
      state.cancelled = true;
      state.running = false;
    },
    getBest() {
      return state.best;
    },
  };

  controller.promise = new Promise((resolve) => {
    state.resolve = resolve;
  });

  const loop = () => {
    if (!state.running || state.cancelled) {
      return;
    }

    const frameDeadline = performance.now() + 16;
    while (performance.now() < frameDeadline && state.running && !state.cancelled) {
      const generator = new CrosswordGenerator(rows, cols, entries, rng);
      const result = generator.runAttempt();
      state.attempts += 1;

      if (result && (!state.best || result.placedCount > state.best.placedCount)) {
        state.best = result;
      } else if (
        result &&
        state.best &&
        result.placedCount === state.best.placedCount &&
        result.density > state.best.density
      ) {
        state.best = result;
      }
    }

    const now = performance.now();
    if (!state.lastUpdate || now - state.lastUpdate > 100) {
      updateProgress({
        attempts: state.attempts,
        best: state.best,
        elapsed: state.startTime ? (now - state.startTime) / 1000 : 0,
      });
      state.lastUpdate = now;
    }

    if (state.best && state.best.placedCount === entries.length) {
      state.running = false;
      updateProgress({
        attempts: state.attempts,
        best: state.best,
        elapsed: (now - state.startTime) / 1000,
      });
      controller.stop();
      return;
    }

    if (now >= state.windowDeadline) {
      state.running = false;
      onPause({
        attempts: state.attempts,
        best: state.best,
        elapsed: (now - state.startTime) / 1000,
      });
      return;
    }

    requestAnimationFrame(loop);
  };

  return controller;
}

function updateUrlState(state) {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  const params = url.searchParams;

  params.set('rows', String(state.rows));
  params.set('cols', String(state.cols));

  const fillValue = state.fill ?? state.fillMode;
  if (fillValue) {
    params.set('fill', fillValue);
  } else {
    params.delete('fill');
  }

  const seedValue = state.seedText ?? state.seed;
  if (seedValue) {
    params.set('seed', seedValue);
  } else {
    params.delete('seed');
  }

  if (state.entries) {
    params.set('entries', encodeBase64(state.entries));
  }

  const metadata = ['title', 'summary', 'header', 'footer'];
  metadata.forEach((key) => {
    if (state[key]) {
      params.set(key, state[key]);
    } else {
      params.delete(key);
    }
  });

  if (state.mode) {
    params.set('mode', state.mode);
  } else {
    params.delete('mode');
  }

  url.search = params.toString();
  window.history.replaceState(null, '', url.toString());
}

function readUrlState() {
  if (typeof window === 'undefined') {
    return {};
  }
  const params = new URLSearchParams(window.location.search);
  const state = {};
  if (params.has('rows')) {
    state.rows = Number.parseInt(params.get('rows'), 10);
  }
  if (params.has('cols')) {
    state.cols = Number.parseInt(params.get('cols'), 10);
  }
  if (params.has('fill')) {
    state.fill = params.get('fill');
  }
  if (params.has('seed')) {
    state.seed = params.get('seed');
  }
  if (params.has('entries')) {
    state.entries = decodeBase64(params.get('entries'));
  }
  ['title', 'summary', 'header', 'footer', 'mode'].forEach((key) => {
    if (params.has(key)) {
      state[key] = params.get(key) || '';
    }
  });
  return state;
}

function generateAnswerUrl(baseState, mode) {
  if (typeof window === 'undefined') {
    return '';
  }
  const url = new URL(window.location.href);
  const params = url.searchParams;
  params.set('mode', mode);
  url.search = params.toString();
  return url.toString();
}

function updateAnswerKeyElements({ show, url, canvas }) {
  const link = document.getElementById('answer-link');
  const wrapper = document.getElementById('answer-key');
  if (!link || !wrapper) {
    return;
  }

  if (!show) {
    wrapper.hidden = true;
    if (canvas) {
      canvas.hidden = true;
    }
    return;
  }

  link.textContent = url;
  link.href = url;
  wrapper.hidden = false;

  if (canvas) {
    canvas.hidden = true;
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('generator-form');
    const message = document.getElementById('message');
    const gridContainer = document.getElementById('grid');
    const acrossList = document.getElementById('across-list');
    const downList = document.getElementById('down-list');
    const printButton = document.getElementById('print-button');
    const fillModeInputs = Array.from(form.querySelectorAll('input[name="fillMode"]'));
    const resultHeader = document.getElementById('result-header');
    const resultTitle = document.getElementById('result-title');
    const resultSummary = document.getElementById('result-summary');
    const resultFooter = document.getElementById('result-footer');
    const resultLegend = document.getElementById('result-legend');
    const inputErrors = document.getElementById('input-errors');
    const progress = document.getElementById('progress');
    const attemptsNode = document.getElementById('attempts');
    const bestScoreNode = document.getElementById('bestScore');
    const elapsedNode = document.getElementById('elapsed');
    const stopButton = document.getElementById('btn-stop');
    const keepButton = document.getElementById('btn-keep');
    const printDialog = document.getElementById('print-dialog');
    const printConfirm = document.getElementById('print-confirm');
    const printCancel = document.getElementById('print-cancel');
    const printModeInputs = () => Array.from(printDialog.querySelectorAll('input[name="printMode"]'));
    const answerCanvas = document.getElementById('answer-qr');

    let lastResult = null;
    let lastDisplayMode = 'blank';
    let activeController = null;
    let printRestore = null;
    let awaitingResume = false;
    let lastMetadata = { header: '', title: '', summary: '', footer: '' };
    let currentSeedText = '';
    let initialMode = null;
    let activeEntriesCount = 0;

    const updateMetadata = ({ header, title, summary, footer }) => {
      resultHeader.textContent = header || '';
      resultTitle.textContent = title || '';
      resultSummary.textContent = summary || '';
      resultFooter.textContent = footer || '';
      lastMetadata = { header, title, summary, footer };
    };

    const resetResults = () => {
      lastResult = null;
      gridContainer.innerHTML = '';
      acrossList.innerHTML = '';
      downList.innerHTML = '';
      printButton.hidden = true;
      updateMetadata({ header: '', title: '', summary: '', footer: '' });
      updateAnswerKeyElements({ show: false, canvas: answerCanvas });
      resultLegend.hidden = true;
    };

    const startProgress = () => {
      progress.hidden = false;
      stopButton.disabled = true;
      keepButton.disabled = true;
      awaitingResume = false;
      attemptsNode.textContent = '0';
      const totalText = activeEntriesCount > 0 ? `0/${activeEntriesCount}` : '0/0';
      bestScoreNode.textContent = totalText;
      elapsedNode.textContent = '0.0';
    };

    const pauseProgress = () => {
      stopButton.disabled = false;
      keepButton.disabled = false;
      awaitingResume = true;
    };

    const stopProgress = () => {
      progress.hidden = true;
      awaitingResume = false;
    };

    const getFillMode = () => form.fillMode.value;

    const renderCurrent = () => {
      if (!lastResult) {
        return;
      }
      const mode = getFillMode();
      lastDisplayMode = mode;
      const displayGrid = buildDisplayGrid(lastResult, mode);
      renderGrid(lastResult.grid, lastResult.numberGrid, gridContainer, displayGrid);
    };

    const persistState = (seedText, mode) => {
      updateUrlState({
        rows: form.rows.value,
        cols: form.cols.value,
        fill: getFillMode(),
        seedText,
        entries: form.entries.value,
        title: form.title.value,
        summary: form.summary.value,
        header: form.header.value,
        footer: form.footer.value,
        mode,
      });
    };

    const finalizeResult = (result, entriesLength, seedText) => {
      lastResult = result;
      printButton.hidden = false;
      updateMetadata({
        header: form.header.value.trim(),
        title: form.title.value.trim(),
        summary: form.summary.value.trim(),
        footer: form.footer.value.trim(),
      });
      renderCurrent();
      renderClues(acrossList, result.across);
      renderClues(downList, result.down);

      const placedSummary =
        result.placedCount === entriesLength
          ? `all ${result.placedCount}`
          : `${result.placedCount} of ${entriesLength}`;

      showMessage(
        message,
        `Generated a ${form.rows.value} × ${form.cols.value} crossword with ${placedSummary} words placed.`,
        'success',
      );

      const omittedLine = document.createElement('span');
      omittedLine.textContent =
        result.omitted.length > 0
          ? `The following words were omitted: ${result.omitted.join(', ')}`
          : 'The following words were omitted: none.';
      message.appendChild(document.createElement('br'));
      message.appendChild(omittedLine);

      const densityPercent = (result.density * 100).toFixed(1);
      const densityLine = document.createElement('span');
      densityLine.innerHTML = `Word density achieved: <strong>${densityPercent}%</strong>.`;
      message.appendChild(document.createElement('br'));
      message.appendChild(densityLine);

      persistState(seedText, null);
    };

    const handleGeneration = (event, { auto = false } = {}) => {
      event?.preventDefault();

      if (activeController) {
        activeController.cancel();
      }

      const parsedRows = Number.parseInt(form.rows.value, 10);
      const parsedCols = Number.parseInt(form.cols.value, 10);
      const rows = clamp(Number.isFinite(parsedRows) ? parsedRows : 0, 5, 25);
      const cols = clamp(Number.isFinite(parsedCols) ? parsedCols : 0, 5, 25);
      form.rows.value = String(rows);
      form.cols.value = String(cols);

      const entries = parseEntries(form.entries.value, inputErrors);
      if (!entries || entries.length === 0) {
        resetResults();
        showMessage(message, 'Please fix the highlighted issues before generating.', 'error');
        stopProgress();
        return;
      }

      if (entries.length < 6) {
        resetResults();
        showMessage(message, 'Please provide at least 6 valid entries to build a crossword.', 'error');
        stopProgress();
        return;
      }

      activeEntriesCount = entries.length;

      if (entries.length > 60) {
        showMessage(
          message,
          'Large word lists may take longer to place. Consider increasing the time cap or trimming duplicates.',
          'warning',
        );
      } else {
        showMessage(message, 'Searching for the densest layout…');
      }

      const seedInfo = createSeededRng(form.seed.value || '');
      currentSeedText = seedInfo.seedText;
      form.seed.value = seedInfo.seedText;

      persistState(seedInfo.seedText, null);

      const generatorEntries = entries.map((entry) => ({
        answer: entry.answer,
        clue: entry.clue,
        rawWord: entry.rawWord,
      }));

      resetResults();
      startProgress();

      const controller = createSearchController({
        rows,
        cols,
        entries: generatorEntries,
        rng: seedInfo.rng,
        timeWindowMs: 4000,
        updateProgress: ({ attempts, best, elapsed }) => {
          attemptsNode.textContent = String(attempts);
          const percent = activeEntriesCount > 0 && best
            ? ((best.placedCount / activeEntriesCount) * 100).toFixed(1)
            : '0.0';
          bestScoreNode.textContent = best
            ? `${best.placedCount}/${activeEntriesCount} (${percent}%)`
            : `0/${activeEntriesCount}`;
          elapsedNode.textContent = elapsed.toFixed(1);
        },
        onPause: ({ best }) => {
          pauseProgress();
          if (!best || (activeEntriesCount > 0 && best.placedCount / activeEntriesCount < 0.4)) {
            showMessage(
              message,
              'Progress is slow. Consider increasing the grid size or removing duplicate short entries.',
              'warning',
            );
          }
        },
      });

      activeController = controller;

      controller.promise.then(({ best }) => {
        if (controller.cancelled) {
          return;
        }
        stopProgress();
        activeController = null;

        if (!best) {
          showMessage(
            message,
            'Unable to build a crossword with the provided inputs. Try adjusting the grid size or word list.',
            'error',
          );
          resetResults();
          return;
        }

        finalizeResult(best, entries.length, seedInfo.seedText);
      });

      controller.cancel = (() => {
        const original = controller.cancel;
        return () => {
          original.call(controller);
          activeController = null;
        };
      })();

      stopButton.onclick = () => {
        controller.stop();
      };

      keepButton.onclick = () => {
        if (!awaitingResume) {
          return;
        }
        keepButton.disabled = true;
        stopButton.disabled = true;
        awaitingResume = false;
        controller.resume(4000);
      };

      controller.resume();
    };

    fillModeInputs.forEach((input) => {
      input.addEventListener('change', () => {
        if (!lastResult) {
          return;
        }
        renderCurrent();
        persistState(currentSeedText, null);
      });
    });

    printButton.addEventListener('click', () => {
      if (!lastResult) {
        return;
      }
      openPrintDialog();
    });

    const openPrintDialog = () => {
      const previous = document.activeElement;
      printDialog.hidden = false;
      const radios = printModeInputs();
      const modeParam = (initialMode || getFillMode()) === 'answered' ? 'answers' : 'blank';
      radios.forEach((radio) => {
        radio.checked = radio.value === modeParam;
      });
      const firstRadio = radios[0];
      firstRadio && firstRadio.focus();
      printRestore = () => {
        printDialog.hidden = true;
        previous && previous.focus && previous.focus();
      };
    };

    const closePrintDialog = () => {
      if (printRestore) {
        printRestore();
        printRestore = null;
      }
    };

    printCancel.addEventListener('click', closePrintDialog);

    printDialog.addEventListener('click', (event) => {
      if (event.target === printDialog) {
        closePrintDialog();
      }
    });

    printDialog.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePrintDialog();
      }
    });

    const applyPrintMode = (mode) => {
      if (!lastResult) {
        return;
      }

      const displayGrid = buildDisplayGrid(
        lastResult,
        mode === 'blank' ? 'blank' : mode === 'firstLetter' ? 'assisted' : 'answered',
      );
      renderGrid(lastResult.grid, lastResult.numberGrid, gridContainer, displayGrid);

      const legendText =
        mode === 'answers'
          ? 'Mode: Full answers'
          : mode === 'firstLetter'
          ? 'Mode: First letter assist'
          : 'Mode: Blank grid';
      resultLegend.textContent = legendText;
      resultLegend.hidden = false;

      const answerUrl = generateAnswerUrl({}, 'answers');
      updateAnswerKeyElements({
        show: mode !== 'answers',
        url: answerUrl,
        canvas: answerCanvas,
      });
    };

    const restoreDisplayMode = () => {
      if (!lastResult) {
        return;
      }
      const displayGrid = buildDisplayGrid(lastResult, lastDisplayMode);
      renderGrid(lastResult.grid, lastResult.numberGrid, gridContainer, displayGrid);
      resultLegend.hidden = true;
      updateAnswerKeyElements({ show: false, canvas: answerCanvas });
    };

    printConfirm.addEventListener('click', () => {
      const selected = printModeInputs().find((input) => input.checked);
      const mode = selected ? selected.value : 'blank';
      closePrintDialog();
      applyPrintMode(mode);
      persistState(currentSeedText, mode);
      window.print();
    });

    const mediaQuery = window.matchMedia('print');
    const handlePrintChange = (event) => {
      if (!event.matches) {
        restoreDisplayMode();
        persistState(currentSeedText, null);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handlePrintChange);
    } else {
      mediaQuery.addListener(handlePrintChange);
    }

    window.addEventListener('afterprint', () => {
      restoreDisplayMode();
      persistState(currentSeedText, null);
    });

    form.addEventListener('submit', (event) => handleGeneration(event));

    const initialState = readUrlState();
    if (initialState.rows) {
      form.rows.value = clamp(initialState.rows, 5, 25);
    }
    if (initialState.cols) {
      form.cols.value = clamp(initialState.cols, 5, 25);
    }
    if (initialState.title) {
      form.title.value = initialState.title;
    }
    if (initialState.summary) {
      form.summary.value = initialState.summary;
    }
    if (initialState.header) {
      form.header.value = initialState.header;
    }
    if (initialState.footer) {
      form.footer.value = initialState.footer;
    }
    if (initialState.seed) {
      form.seed.value = initialState.seed;
      currentSeedText = initialState.seed;
    }
    if (initialState.fill) {
      const target = fillModeInputs.find((input) => input.value === initialState.fill);
      if (target) {
        target.checked = true;
      }
    }
    if (initialState.entries) {
      form.entries.value = initialState.entries;
    }
    if (initialState.mode) {
      initialMode = initialState.mode;
    }

    if (initialState.entries) {
      handleGeneration(null, { auto: true });
      if (initialMode === 'answers') {
        fillModeInputs.forEach((input) => {
          input.checked = input.value === 'answered';
        });
        persistState(currentSeedText, null);
      }
    }
  });
}

if (typeof module !== 'undefined') {
  module.exports = {
    CrosswordGenerator,
    parseEntries,
  };
}
