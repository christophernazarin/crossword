class CrosswordGenerator {
  constructor(rows, cols, entries) {
    this.rows = rows;
    this.cols = cols;
    this.entries = entries.map((entry, index) => ({
      ...entry,
      index,
    }));
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

  generate(maxAttempts = 400) {
    if (!this.entries.length) {
      return null;
    }

    let best = null;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
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
        const choice = topChoices[Math.floor(Math.random() * topChoices.length)];
        this.placeEntry(entryIndex, choice);
      }

      if (this.placedCount === 0) {
        continue;
      }

      const resultData = this.buildResult();
      const { density, filledCells } = resultData;

      if (
        !best ||
        this.placedCount > best.placedCount ||
        (this.placedCount === best.placedCount &&
          (density > best.density || (density === best.density && filledCells > best.filledCells)))
      ) {
        best = {
          placedCount: this.placedCount,
          density,
          filledCells,
          result: resultData,
        };

        if (best.placedCount === this.entries.length) {
          break;
        }
      }
    }

    if (!best) {
      return null;
    }

    return {
      ...best.result,
      placedCount: best.placedCount,
      density: best.density,
      filledCells: best.filledCells,
    };
  }

  buildOrder() {
    return this.entries
      .map((entry) => ({
        index: entry.index,
        priority: entry.word.length + Math.random(),
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
      return Math.random() - 0.5;
    });

    return placements;
  }

  evaluatePlacement(entry, row, col, direction) {
    const length = entry.word.length;

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
      const letter = entry.word[i];

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
    const { word } = this.entries[entryIndex];
    const { row, col, direction } = placement;
    const filledPositions = [];

    for (let i = 0; i < word.length; i += 1) {
      const r = direction === 'across' ? row : row + i;
      const c = direction === 'across' ? col + i : col;
      if (this.grid[r][c] === '') {
        this.grid[r][c] = word[i];
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
        length: entry.word.length,
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
      .map((entry) => entry.rawWord || entry.word);

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

  hasPlacementAt(row, col, direction) {
    return this.placements.some(
      (placement) =>
        placement &&
        placement.row === row &&
        placement.col === col &&
        placement.direction === direction,
    );
  }
}

function parseEntries(raw) {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const entries = [];
  const errors = [];

  lines.forEach((line, index) => {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      errors.push(`Line ${index + 1}: missing ':' separator.`);
      return;
    }

    const rawWord = line.slice(0, colonIndex).trim();
    const clue = line.slice(colonIndex + 1).trim();

    if (!rawWord) {
      errors.push(`Line ${index + 1}: missing word before ':'`);
      return;
    }
    if (!clue) {
      errors.push(`Line ${index + 1}: missing clue after ':'`);
      return;
    }

    const word = rawWord.toUpperCase().replace(/[^A-Z]/g, '');

    if (word.length === 0) {
      errors.push(`Line ${index + 1}: word must contain at least one letter.`);
      return;
    }

    entries.push({ word, clue, rawWord });
  });

  if (errors.length) {
    const error = new Error(errors.join('\n'));
    error.name = 'ParseError';
    throw error;
  }

  return entries;
}

function renderGrid(grid, numberGrid, container, displayGrid) {
  container.innerHTML = '';
  const table = document.createElement('table');
  const tbody = document.createElement('tbody');

  for (let row = 0; row < grid.length; row += 1) {
    const tr = document.createElement('tr');
    for (let col = 0; col < grid[row].length; col += 1) {
      const td = document.createElement('td');
      const value = grid[row][col];
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
    li.innerHTML = `<strong>${clue.number}.</strong> ${clue.clue}`;
    list.appendChild(li);
  });
}

function buildDisplayGrid(result, mode) {
  const base = result.grid.map((row) => row.map((cell) => (cell === '' ? '' : '')));

  if (mode === 'blank') {
    return base;
  }

  if (mode === 'assisted') {
    const assisted = base.map((row) => row.slice());
    const reveal = (clue) => {
      assisted[clue.row][clue.col] = result.grid[clue.row][clue.col];
    };
    result.across.forEach(reveal);
    result.down.forEach(reveal);
    return assisted;
  }

  return result.grid.map((row) => row.slice());
}

function showMessage(element, message, type) {
  element.textContent = message;
  element.classList.remove('message--error', 'message--success');
  if (type) {
    element.classList.add(`message--${type}`);
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
    let lastResult = null;
    const updateMetadata = ({ header, title, summary, footer }) => {
      resultHeader.textContent = header;
      resultTitle.textContent = title;
      resultSummary.textContent = summary;
      resultFooter.textContent = footer;
    };

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const rawEntries = form.entries.value;
      const rows = Number.parseInt(form.rows.value, 10);
      const cols = Number.parseInt(form.cols.value, 10);
      const fillMode = form.fillMode.value;

      if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows <= 0 || cols <= 0) {
        showMessage(message, 'Please provide valid grid dimensions.', 'error');
        return;
      }

      const metadata = {
        header: form.header.value.trim(),
        title: form.title.value.trim(),
        summary: form.summary.value.trim(),
        footer: form.footer.value.trim(),
      };

      let entries;
      try {
        entries = parseEntries(rawEntries);
      } catch (error) {
        showMessage(message, error.message, 'error');
        gridContainer.innerHTML = '';
        acrossList.innerHTML = '';
        downList.innerHTML = '';
        printButton.hidden = true;
        updateMetadata({ header: '', title: '', summary: '', footer: '' });
        lastResult = null;
        return;
      }

      const generator = new CrosswordGenerator(rows, cols, entries);
      const result = generator.generate();

      if (!result) {
        showMessage(
          message,
          'Unable to build a crossword with the provided inputs. Try adjusting the grid size or word list.',
          'error',
        );
        gridContainer.innerHTML = '';
        acrossList.innerHTML = '';
        downList.innerHTML = '';
        printButton.hidden = true;
        updateMetadata({ header: '', title: '', summary: '', footer: '' });
        lastResult = null;
        return;
      }

      const displayGrid = buildDisplayGrid(result, fillMode);
      renderGrid(result.grid, result.numberGrid, gridContainer, displayGrid);
      renderClues(acrossList, result.across);
      renderClues(downList, result.down);
      printButton.hidden = false;
      updateMetadata(metadata);
      lastResult = result;

      const placedSummary =
        result.placedCount === entries.length
          ? `all ${result.placedCount}`
          : `${result.placedCount} of ${entries.length}`;
      showMessage(
        message,
        `Generated a ${rows} × ${cols} crossword with ${placedSummary} words placed.`,
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
    });

    fillModeInputs.forEach((input) => {
      input.addEventListener('change', () => {
        if (!lastResult) {
          return;
        }
        const displayGrid = buildDisplayGrid(lastResult, form.fillMode.value);
        renderGrid(lastResult.grid, lastResult.numberGrid, gridContainer, displayGrid);
      });
    });

    printButton.addEventListener('click', () => {
      window.print();
    });

    window.addEventListener('beforeprint', () => {
      if (lastResult) {
        renderGrid(lastResult.grid, lastResult.numberGrid, gridContainer, buildDisplayGrid(lastResult, form.fillMode.value));
      }
    });

    window.addEventListener('afterprint', () => {
      if (lastResult) {
        renderGrid(lastResult.grid, lastResult.numberGrid, gridContainer, buildDisplayGrid(lastResult, form.fillMode.value));
      }
    });
  });
}
