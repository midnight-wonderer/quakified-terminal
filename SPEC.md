# KWin Quake Script Specification

A KWin script to transform any terminal (matched by WM Class) into a Quake-style dropdown console.

## 1. User Settings

The following settings should be configurable via the KWin Script configuration interface:

*   **WM Class**: The resource class of the terminal window to manage (e.g., `konsole`, `Alacritty`).
*   **Vertical Position**: `Top` (default) or `Bottom`.
*   **Height Percentage**: Target height of the terminal relative to the work area (default: `40%`).
*   **Monitor Selection**:
    *   `Active Monitor`: Follow the monitor where the cursor or active window is.
    *   `Primary Monitor`: Always open on the primary screen.
*   **Focus Loss Behavior**: (Optional) Automatically minimize the terminal when it loses focus.

## 2. Behavioral Logic

### 2.1 Window Management
The script identifies the "Quake Window" by its WM Class. To avoid complexity, it tracks only one instance at a time based on the first detection, falling back to others if the first instance is closed.

### 2.2 Hotkey Actions (Toggle Logic)
A single global shortcut (default to `F12`) performs the following state-based actions:

1.  **Terminal Hidden (Minimized)**:
    *   Untoggle minimization.
    *   Move to the configured monitor/position/size.
    *   Activate (focus) the window.
2.  **Terminal Visible but Not Focused**:
    *   Move to the current configured monitor/position.
    *   Activate (focus) the window.
3.  **Terminal Visible and Focused**:
    *   Minimize the window.

### 2.3 Automatic Rules (On Window Added)
When a window matching the WM Class is detected:
*   Apply Quake properties:
    *   Set `onAllDesktops = true`.
    *   Set `skipTaskbar = true`.
    *   Set `skipSwitcher = true`.
    *   Set `skipPager = true`.
*   Apply initial geometry (depending on current settings).

## 3. Technical Implementation Details

*   **Target Engine**: Plasma 6 (JavaScript KWin API).
*   **Area Calculation**: Use `workspace.clientArea(KWin.MaximizeArea, screen, desktop)` to respect panels/docks.
*   **Geometry Manipulation**: Use `window.frameGeometry` (Plasma 6 compatibility).
*   **Signals**:
    *   `workspace.windowAdded`: To catch the terminal when it starts.
    *   `KWin.readConfig()`: To handle dynamic settings updates without script restarts.

## 4. Preferred Window Properties (Window Rules)
While the script can set most properties, it is recommended to use KWin Window Rules for:
*   **No Titlebar / Borders**: To maximize the "console" aesthetics.
