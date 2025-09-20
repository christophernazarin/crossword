# Crossword generator

This project provides a lightweight crossword puzzle generator inspired by
[papauschek.github.io/crossword-puzzle-maker](https://papauschek.github.io/crossword-puzzle-maker/).

## Getting started

1. Open `index.html` in any modern web browser.
2. Enter words with their clues using the format `WORD: clue` (one per line).
3. Choose the number of rows and columns for the crossword grid.
4. Select whether you want a blank, first-letter assisted, or fully answered grid.
5. Click **Generate crossword** to create a puzzle. You can switch between fill styles after generation without rebuilding.
6. Use the **Print crossword** button to open a one-page print/PDF view once you are happy with the layout.

If a crossword cannot be constructed with the given configuration the app will
suggest trying different dimensions or a new word list.

Behind the scenes the generator runs many randomized attempts and keeps the
layout that fits the greatest number of words into the requested grid, helping
ensure dense puzzles even when every word cannot be placed.
