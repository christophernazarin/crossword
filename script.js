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

  generate(maxAttempts = 200) {
    if (!this.entries.length) {
      return null;
    }

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      this.clearState();
      const order = this.buildOrder(attempt);
      if (this.backtrack(order, 0)) {
        return this.buildResult();
      }
    }

    return null;
  }

  buildOrder(seed) {
    const indices = this.entries.map((entry) => entry.index);
    indices.sort((a, b) => {
      const diff = this.entries[b].word.length - this.entries[a].word.length;
      if (diff !== 0) {
        return diff;
      }
      // deterministic shuffle based on seed
      return Math.sin(seed + a * 13 + b * 17);
    });
    return indices;
  }

  backtrack(order, depth) {
    if (depth === order.length) {
      return true;
    }

    const entryIndex = order[depth];
    const entry = this.entries[entryIndex];
    const placements = this.findPlacements(entry);

    if (!placements.length) {
      return false;
    }

    placements.sort((a, b) => b.overlaps - a.overlaps);

    for (const placement of placements) {
      this.placeEntry(entryIndex, placement);
      if (this.backtrack(order, depth + 1)) {
        return true;
      }
      this.removeEntry(entryIndex);
    }

    return false;
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

  removeEntry(entryIndex) {
    const placement = this.placements[entryIndex];
    if (!placement) {
      return;
    }

    for (const pos of placement.filledPositions) {
      this.grid[pos.row][pos.col] = '';
    }

    this.placements[entryIndex] = null;
    this.placedCount -= 1;
  }

  buildResult() {
    const grid = this.grid.map((row) => row.slice());
    const numberGrid = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
    const across = [];
    const down = [];

    let clueNumber = 1;

    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        if (grid[row][col] === '') {
          continue;
        }

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
        answer: entry.word,
        row: placement.row,
        col: placement.col,
      };

      if (placement.direction === 'across') {
        across.push(clueEntry);
      } else {
        down.push(clueEntry);
      }
    }

    across.sort((a, b) => a.number - b.number);
    down.sort((a, b) => a.number - b.number);

    return {
      grid,
      numberGrid,
      across,
      down,
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

function renderGrid(grid, numberGrid, container) {
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
        td.textContent = value;
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
    li.innerHTML = `<strong>${clue.number}.</strong> ${clue.clue}<span class="clues__answer">${clue.answer}</span>`;
    list.appendChild(li);
  });
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

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const rawEntries = form.entries.value;
      const rows = Number.parseInt(form.rows.value, 10);
      const cols = Number.parseInt(form.cols.value, 10);

      if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows <= 0 || cols <= 0) {
        showMessage(message, 'Please provide valid grid dimensions.', 'error');
        return;
      }

      let entries;
      try {
        entries = parseEntries(rawEntries);
      } catch (error) {
        showMessage(message, error.message, 'error');
        gridContainer.innerHTML = '';
        acrossList.innerHTML = '';
        downList.innerHTML = '';
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
        return;
      }

      renderGrid(result.grid, result.numberGrid, gridContainer);
      renderClues(acrossList, result.across);
      renderClues(downList, result.down);
      showMessage(
        message,
        `Generated a ${rows} × ${cols} crossword with ${entries.length} entries.`,
        'success',
      );
    });
  });
}
