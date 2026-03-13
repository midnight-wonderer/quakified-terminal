function main() {

    // TODO: read wmClass

    const windows = workspace.windowList();
    let initialWindow = null;
    for (const window of windows) {
        if (window.resourceClass !== this.wmClass) continue;
        initialWindow = window;
        break;
    }
    const tracker = new WindowTracker(initialWindow, this.wmClass, () => null);
    const controller = new QuakifiedController(workspace, KWin);

    // Register the global shortcut
    registerShortcut("QuakeTerminalToggle", "Toggle Quake Console", "F12", () => {
        controller.toggleWindow();
    });

    // Listen for new windows
    workspace.windowAdded.connect((window) => {
        controller.onWindowAdded(window);
    });

    // Listen for window closed
    workspace.windowRemoved.connect((window) => {
        controller.onWindowRemoved(window);
    });

    // Focus loss behavior
    workspace.windowActivated.connect((window) => {
        controller.onWindowActivated(window);
    });

    // React to config changes
    if (typeof options !== 'undefined' && options.configChanged) {
        options.configChanged.connect(() => {
            controller.onConfigChanged();
        });
    }

    // Catch an existing terminal on script start
    controller.findExistingWindow();
}

class WindowTracker {
    constructor(initial = null, wmClass, windowChanged) {
        this.window = initial;
        this.wmClass = wmClass;
        this.fallback = [];
        this.windowChanged = windowChanged;
    }

    addWindow(window) {
        if (window.resourceClass !== this.wmClass) return;
        if (!this.window) {
            this.windowChanged(this.window = window);
        } else {
            this.fallback.push(window);
        }
    }

    removeWindow(window) {
        if (this.window !== window) {
            const index = this.fallback.indexOf(window);
            if (0 <= index) this.fallback.splice(index, 1);
            return;
        }
        if (!this.fallback.length) {
            this.windowChanged(this.window = null);
            return;
        }
        this.windowChanged(this.window = this.fallback.shift());
    }
}

class QuakifiedController {
    constructor(workspaceInstance, kwinInstance) {
        this.workspace = workspaceInstance;
        this.KWin = kwinInstance;
        this.quakeWindow = null;
        this.loadConfig();
    }

    onWindowRemoved(window) {
        if (this.quakeWindow === window) {
            this.quakeWindow = null;
        }
    }

    onWindowActivated(window) {
        if (this.focusLossBehavior && this.quakeWindow) {
            if (window !== this.quakeWindow && !this.quakeWindow.minimized) {
                this.quakeWindow.minimized = true;
            }
        }
    }

    onConfigChanged() {
        this.loadConfig();
        if (this.quakeWindow) {
            this.applyGeometry(this.quakeWindow);
        }
    }

    loadConfig() {
        this.wmClass = this.KWin.readConfig("wmClass", "konsole");
        this.verticalPosition = this.KWin.readConfig("verticalPosition", "Top");
        this.heightPercentage = this.KWin.readConfig("heightPercentage", 40);
        this.monitorSelection = this.KWin.readConfig("monitorSelection", "Active Monitor");
        this.focusLossBehavior = this.KWin.readConfig("focusLossBehavior", false);
    }

    findExistingWindow() {
        const windows = this.workspace.windowList();
        for (let i = 0; i < windows.length; i++) {
            if (windows[i].resourceClass === this.wmClass) {
                this.setupQuakeWindow(windows[i]);
                break;
            }
        }
    }

    onWindowAdded(window) {
        if (!window.normalWindow) return;

        if (window.resourceClass === this.wmClass) {
            if (!this.quakeWindow) {
                this.setupQuakeWindow(window);
            }
        }
    }

    setupQuakeWindow(window) {
        this.quakeWindow = window;

        // Apply properties to make it behavior like a console
        window.onAllDesktops = true;
        window.skipTaskbar = true;
        window.skipSwitcher = true;
        window.skipPager = true;

        // Initial geometry
        this.applyGeometry(window);
    }

    getTargetScreen() {
        if (this.monitorSelection === "Primary Monitor") {
            return (typeof this.workspace.primaryOutput !== 'undefined') ? this.workspace.primaryOutput : 0;
        } else {
            // Active monitor
            if (this.workspace.activeWindow) {
                if (typeof this.workspace.activeWindow.output !== 'undefined') {
                    return this.workspace.activeWindow.output;
                }
                if (typeof this.workspace.activeWindow.screen !== 'undefined') {
                    return this.workspace.activeWindow.screen;
                }
            }
            if (typeof this.workspace.activeOutput !== 'undefined') {
                return this.workspace.activeOutput;
            }
            if (typeof this.workspace.activeScreen !== 'undefined') {
                return this.workspace.activeScreen;
            }
            return 0; // Default fallback
        }
    }

    applyGeometry(window) {
        const screen = this.getTargetScreen();
        // Fallback for desktops
        const desktop = (typeof this.workspace.currentDesktop !== 'undefined')
            ? this.workspace.currentDesktop
            : (typeof this.workspace.currentVirtualDesktop !== 'undefined' ? this.workspace.currentVirtualDesktop : 1);

        const rect = this.workspace.clientArea(this.KWin.MaximizeArea, screen, desktop);

        if (!rect) {
            print("Failed to get clientArea");
            return;
        }

        const targetHeight = Math.round(rect.height * (this.heightPercentage / 100));
        let yPos = rect.y;

        if (this.verticalPosition === "Bottom") {
            yPos = rect.y + rect.height - targetHeight;
        }

        window.frameGeometry = {
            x: rect.x,
            y: yPos,
            width: rect.width,
            height: targetHeight
        };
    }

    toggleWindow() {
        if (!this.quakeWindow) {
            // No window currently tracked, nothing to toggle
            return;
        }

        if (this.quakeWindow.minimized) {
            // Hidden -> restore, re-geometry, and activate
            this.quakeWindow.minimized = false;
            this.applyGeometry(this.quakeWindow);
            this.workspace.activeWindow = this.quakeWindow;
        } else {
            // Window is visible
            if (this.workspace.activeWindow !== this.quakeWindow) {
                // Visible but not focused -> move to config location and activate
                this.applyGeometry(this.quakeWindow);
                this.workspace.activeWindow = this.quakeWindow;
            } else {
                // Visible and focused -> minimize
                this.quakeWindow.minimized = true;
            }
        }
    }
}

main();
