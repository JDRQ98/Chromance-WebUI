// File: /js/components/colorPaletteManager.js
// Reusable color palette component for color swatch management

import { generateRainbowColors, generateRandomColors, generateSimilarColors } from '../colorUtils.js';

export default class ColorPaletteManager {
    constructor(options = {}) {
        this.container = options.container;
        this.maxColors = options.maxColors || 25;
        this.minColors = options.minColors || 1;
        this.onColorsChange = options.onColorsChange || (() => {});
        this.disabled = options.disabled || false;

        // Button references
        this.addButton = options.addButton;
        this.removeButton = options.removeButton;
        this.rainbowButton = options.rainbowButton;
        this.randomButton = options.randomButton;
        this.similarButton = options.similarButton;

        if (this.container) {
            this._bindButtons();
        }
    }

    _bindButtons() {
        if (this.addButton) {
            this.addButton.addEventListener('click', () => this.addColor());
        }
        if (this.removeButton) {
            this.removeButton.addEventListener('click', () => this.removeColor());
        }
        if (this.rainbowButton) {
            this.rainbowButton.addEventListener('click', () => this.setRainbowColors());
        }
        if (this.randomButton) {
            this.randomButton.addEventListener('click', () => this.setRandomColors());
        }
        if (this.similarButton) {
            this.similarButton.addEventListener('click', () => this.setSimilarColors());
        }
    }

    setContainer(container) {
        this.container = container;
    }

    setButtons(buttons) {
        this.addButton = buttons.add;
        this.removeButton = buttons.remove;
        this.rainbowButton = buttons.rainbow;
        this.randomButton = buttons.random;
        this.similarButton = buttons.similar;
        this._bindButtons();
    }

    getColors() {
        if (!this.container) return [];
        return Array.from(this.container.querySelectorAll('input[type="color"]'))
            .map(input => input.value);
    }

    getColorCount() {
        if (!this.container) return 0;
        return this.container.querySelectorAll('input[type="color"]').length;
    }

    setColors(colors) {
        if (!this.container) return;

        this.container.innerHTML = '';

        const colorsArray = Array.isArray(colors) ? colors : [colors];
        colorsArray.forEach(color => {
            this._createColorSwatch(color);
        });

        this.onColorsChange(this.getColors());
    }

    _createColorSwatch(color = '#ffffff') {
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = color;
        colorInput.classList.add('color-swatch');
        colorInput.disabled = this.disabled;

        colorInput.addEventListener('input', () => {
            this.onColorsChange(this.getColors());
        });

        colorInput.addEventListener('click', (event) => {
            if (this.disabled) {
                event.preventDefault();
            }
        });

        this.container.appendChild(colorInput);
        return colorInput;
    }

    addColor(color = '#ffffff') {
        if (!this.container) return;
        if (this.getColorCount() >= this.maxColors) return;
        if (this.disabled) return;

        this._createColorSwatch(color);
        this.onColorsChange(this.getColors());
    }

    removeColor() {
        if (!this.container) return;
        if (this.getColorCount() <= this.minColors) return;
        if (this.disabled) return;

        const lastChild = this.container.lastElementChild;
        if (lastChild) {
            this.container.removeChild(lastChild);
            this.onColorsChange(this.getColors());
        }
    }

    setRainbowColors() {
        if (this.disabled) return;
        const count = this.getColorCount() || 7;
        const colors = generateRainbowColors(count);
        this.setColors(colors);
    }

    setRandomColors() {
        if (this.disabled) return;
        const count = this.getColorCount() || 7;
        const colors = generateRandomColors(count);
        this.setColors(colors);
    }

    setSimilarColors() {
        if (this.disabled) return;
        const count = this.getColorCount() || 7;
        const firstColor = this.container.querySelector('input[type="color"]')?.value;
        const colors = generateSimilarColors(count, firstColor || '#ff0000');
        this.setColors(colors);
    }

    setDisabled(disabled) {
        this.disabled = disabled;

        // Update existing swatches
        if (this.container) {
            this.container.querySelectorAll('input[type="color"]').forEach(input => {
                input.disabled = disabled;
            });
        }

        // Update buttons
        [this.addButton, this.removeButton, this.rainbowButton,
         this.randomButton, this.similarButton].forEach(button => {
            if (button) button.disabled = disabled;
        });
    }

    enable() {
        this.setDisabled(false);
    }

    disable() {
        this.setDisabled(true);
    }
}
