# Personal Code Styling Guidelines

This document provides soft guidelines for coding practices to help you write code that integrates naturally with the existing codebase. These are not strict rules—use your judgment, prioritize clarity, and ask questions when uncertain.

The goal is consistency and readability, not rigid enforcement. These conventions apply across all languages in this repository.

---

## Naming Conventions

### Variables and Functions → camelCase

```javascript
let waveHeight = 1.5;
let paddleSpeed = 2.5;
let userInputs = {};

function calculateBuoyancy() {}
function convertLengthToMillimeters(length, unit) {}
```

### Classes → PascalCase

```javascript
class Surfboard {}
class WaveCondition {}
class UnitConversions {}
```

### Private Members → _leadingUnderscore (then camelCase)

```javascript
function _validateInputs() {}
function _calculateAllocation(userPosition) {}
let _privateVariable = 10;
```

### Constants → camelCase

We don't use SCREAMING_CASE for constants.

```javascript
const maxCpuCores = 16;
const sessionTimeout = 300;
const minRailRadius = 0.75e-3;
```

---

## String Conventions

**Use single quotes for all strings.** This is one of the more consistent patterns in the codebase.

```javascript
// Preferred
const foamCore = 'EPS';
const glassing = 'fiberglass';
const message = `Wave height: ${height} m`;

// Avoid double quotes
const foamCore = "EPS";  // not preferred
```

**Exception:** Strings containing single quotes may use double quotes to avoid escaping:

```javascript
const message = "Can't find the file";  // acceptable
```

However, you can still use single quotes with the escape character (`\`) to correctly render quotes inside of single quote strings:

```javascript
const message = 'Can\'t find the file'; // preferred
```

**HTML inside template literals** uses double quotes for attributes (standard HTML convention):

```javascript
const html = `<div class="container">content</div>`;  // acceptable
```

---

## Documentation

### File Headers

Every JavaScript file should start with a descriptive comment block:

```javascript
/* ========================================
   DESCRIPTIVE MODULE NAME
   Brief description of what this file contains.
   Sean Bowman [MM/DD/YYYY]
   ======================================== */
```

Every CSS file should use section headers:

```css
/* ========================================
   SECTION NAME
   ======================================== */
```

### Function Documentation (JSDoc)

Functions should have JSDoc comments that explain purpose, parameters, and usage:

```javascript
/**
 * Brief description of function.
 * @param {number} stationFraction - Normalized position along board length (0 = nose, 1 = tail)
 * @returns {number} The half-width in millimeters
 */
function calculateHalfWidth(stationFraction) {}
```

### Section Break Comments

Use these to organize major sections within files:

```javascript
/* ========================================
   SECTION TITLE
   ======================================== */
```

Or the shorter form for subsections:

```javascript
// -- Rocker Curve Properties -- //
```

### Inline Comments

Add unit annotations when storing physical quantities:

```javascript
this.waveHeight = [];         // [m]
this.liftForce = [];          // [N]
this.dragForce = [];          // [N]
this.waveLength = [];         // [m]
this.surfSpeed = [];          // [m/s]
```

---

## Documentation by Language

The documentation principles above apply across all languages. Here's how they translate:

### Python

```python
'''
Brief description of module/class/function.

Parameters:
-----------
stationFraction : float
    Normalized position along board length (0 = nose, 1 = tail)

Returns:
--------
float : The half-width in millimeters
'''
```

### C# (XML Documentation)

```csharp
/// <summary>
/// Brief description of class/method.
/// </summary>
/// <param name="stationFraction">Normalized position along board length (0 = nose, 1 = tail)</param>
/// <returns>The half-width in millimeters</returns>
```

### C++

```cpp
/*
 * Brief description of function.
 *
 * Parameters:
 *   stationFraction - Normalized position along board length (0 = nose, 1 = tail)
 *
 * Returns:
 *   The half-width in millimeters
 */
```

### Rust

```rust
/// Brief description of function.
///
/// # Arguments
/// * `station_fraction` - Normalized position along board length (0 = nose, 1 = tail)
///
/// # Returns
/// The half-width in millimeters
```

### FORTRAN

```fortran
!------------------------------------------------------------------------------
! Brief description of subroutine/function.
!
! Parameters:
!   station_fraction - Normalized position along board length (0 = nose, 1 = tail)
!
! Returns:
!   The half-width in millimeters
!------------------------------------------------------------------------------
```

### JavaScript (JSDoc)

```javascript
/**
 * Brief description of function.
 * @param {number} stationFraction - Normalized position along board length (0 = nose, 1 = tail)
 * @returns {number} The half-width in millimeters
 */
```

---

## Import Organization

For JavaScript, organize script loading in HTML files in this order:

```html
<!-- Core utilities first, then feature modules -->
<script src="./js/navigation.js"></script>
<script src="./js/main.js"></script>
<script src="./js/github.js"></script>
<script src="./js/projects.js"></script>
```

For Python, organize imports in this order with blank lines between groups:

```python
# Standard library imports
import os
import sys
import copy
import warnings
from typing import Optional, Dict

# Third-party imports
import numpy as np
import pandas as pd
import streamlit as st
from scipy.optimize import fsolve

# Local imports
from myutils import helpers
from mypackage.utils import UnitConversions
```

For modules that may be used both as standalone and as part of a package:

```python
try:
    # Absolute imports - used when running the file directly
    # These work when the module directory is on Python's sys.path
    from myutils import helpers
    from MyClass import MyClass
except ImportError:
    # Relative imports - used when the module is imported as part of a package
    # The dot (.) means 'from the same package/directory as this file'
    # Required when calling the class externally (e.g., from mypackage import MyClass)
    from .myutils import helpers
    from .MyClass import MyClass
```

---

## Code Structure Patterns

### Class Organization

```javascript
class Example {
    // -- Constructor -- //
    constructor() {
        this.prop1 = [];
        this.prop2 = [];
    }

    // -- Private Helper Methods -- //
    _validateInputs() {}

    // -- Public Methods -- //
    setInputs(inputs) {}
    calculate() {}
}
```

### Helper Functions Inside Methods

For complex calculations, define helper functions within the method that uses them:

```javascript
function rockerProfile(tailKickAngle = 'default') {
    function calculateCrossSection(stationFraction) {
        const crossSection = (1 / stationFraction) * (/* ... */);
        return crossSection;
    }

    function calculateHydrodynamics(x, z) {
        // Uses calculateCrossSection internally
    }

    // Main method logic using helpers
    const result = calculateHydrodynamics(xCoords, zCoords);
}
```

---

## Error Handling

Error handling ensures code fails gracefully with informative messages. Use two complementary approaches:

### Input Validation

Validate inputs before expensive operations. Check early in public methods.

```javascript
function processData(data) {
    if (!data || typeof data !== 'object') {
        throw new TypeError(`data must be an object, got ${typeof data}`);
    }

    if (data.value < 0) {
        throw new RangeError(`value must be non-negative, got ${data.value}`);
    }
}
```

### Try-Catch for Runtime Errors

Use try-catch blocks for operations that may fail at runtime (network requests, DOM operations, parsing).

```javascript
try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    return data;
} catch (error) {
    console.error(`Fetch failed: ${error.message}`);
    renderErrorState(container, 'Unable to load data.');
} finally {
    // Always runs - use for cleanup
    restoreLoadingState();
}
```

**Best practices:**

- Catch specific exceptions, not bare `catch`
- Add context to error messages (URLs, parameter values)
- Use `finally` for cleanup that must always run

---

## Formatting

**Line Length:** Aim for 120 characters max, but don't stress about it. Readability matters more.

**Spacing:** Use spaces around assignment operators:

```javascript
// Preferred
const waveHeight = 1.5;
const boardLength = 1828.0;

// Also acceptable for alignment in related variables
this.foamCore = 'EPS';
this.glassing = 'fiberglass';
```

---

## Language-Specific Naming Conventions

While this repository generally follows camelCase naming for consistency, **some languages enforce snake_case through compiler warnings or strong community conventions**. In these cases, we follow the language's idiomatic style to avoid friction.

### Rust → snake_case (Enforced)

Rust enforces snake_case through compiler warnings (`non_snake_case`). Using camelCase generates warnings and goes against the Rust API Guidelines.

**Rationale:**

- The Rust compiler issues warnings for any non-snake_case names
- The entire Rust ecosystem uses snake_case (std library, all crates)
- Fighting this creates unnecessary warning noise
- Rust's official style guide mandates snake_case for functions and variables

**Examples:**

```rust
// Correct (snake_case)
fn calculate_wave_speed(wave_period: f64, water_depth: f64) -> f64 { }
let wave_height = 1.5;

// Incorrect (generates compiler warnings)
fn calculateWaveSpeed(wavePeriod: f64, waterDepth: f64) -> f64 { }  // warning: non_snake_case
let waveHeight = 1.5;  // warning: non_snake_case
```

### FORTRAN → snake_case (Conventional)

FORTRAN is case-insensitive (all names are converted to uppercase internally), but the community convention is snake_case for readability.

**Rationale:**

- FORTRAN compilers treat `MyVariable`, `myvariable`, and `MYVARIABLE` as identical
- Modern FORTRAN code (2003/2008) conventionally uses lowercase snake_case
- This improves readability in a case-insensitive environment
- Mixed-case names serve no functional purpose

**Examples:**

```fortran
! Conventional (lowercase snake_case)
function wave_speed(wave_period) result(speed)
real :: wave_height

! Technically valid but unconventional
function WaveSpeed(WavePeriod) result(Speed)  ! Works, but not idiomatic
REAL :: WAVE_HEIGHT  ! Old FORTRAN 77 style
```

### Other Languages → camelCase

All other languages in this repository (JavaScript, Python, C++, C#) follow the camelCase conventions outlined above.

---

## Quick Reference

| Element    | Convention     | Example                | Exceptions                |
| ---------- | -------------- | ---------------------- | ------------------------- |
| Variables  | camelCase      | `waveHeight`           | Rust, FORTRAN: snake_case |
| Functions  | camelCase      | `calculateBuoyancy()`  | Rust, FORTRAN: snake_case |
| Classes    | PascalCase     | `WaveCondition`        |                           |
| Private    | _camelCase     | `_validateInputs()`    |                           |
| Constants  | camelCase      | `maxCpuCores`          |                           |
| Strings    | single quotes  | `'EPS'`                |                           |
| CSS classes| kebab-case     | `project-card`         |                           |
| CSS vars   | --kebab-case   | `--primary-color`      |                           |
| Units      | inline comment | `// [m]`               |                           |

---

## Philosophy

1. **Clarity over cleverness** — Write code that's easy to read and maintain
2. **Document the "why"** — Comments should explain intent, not repeat what the code does
3. **Consistency within a file** — If you're editing an existing file, match its style
4. **Ask when uncertain** — When patterns are ambiguous, ask the team
