class QuakeConsole {
    constructor() {
        this.quakeWindow = null;
        this.loadConfig();

        // Register the global shortcut
        registerShortcut("QuakeTerminalToggle", "Toggle Quake Console", "F12", () => {
            this.toggleWindow();
        });

        // Listen for new windows
        workspace.windowAdded.connect((window) => {
            this.onWindowAdded(window);
        });

        // Listen for window closed
        workspace.windowRemoved.connect((window) => {
            if (this.quakeWindow === window) {
                this.quakeWindow = null;
            }
        });

        // Focus loss behavior
        workspace.windowActivated.connect((window) => {
            if (this.focusLossBehavior && this.quakeWindow) {
                if (window !== this.quakeWindow && !this.quakeWindow.minimized) {
                    this.quakeWindow.minimized = true;
                }
            }
        });

        // React to config changes
        if (typeof options !== 'undefined' && options.configChanged) {
            options.configChanged.connect(() => {
                this.loadConfig();
                if (this.quakeWindow) {
                    this.applyGeometry(this.quakeWindow);
                }
            });
        }

        // Catch an existing terminal on script start
        this.findExistingWindow();
    }

    loadConfig() {
        this.wmClass = KWin.readConfig("wmClass", "konsole");
        this.verticalPosition = KWin.readConfig("verticalPosition", "Top");
        this.heightPercentage = KWin.readConfig("heightPercentage", 40);
        this.monitorSelection = KWin.readConfig("monitorSelection", "Active Monitor");
        this.focusLossBehavior = KWin.readConfig("focusLossBehavior", false);
    }

    findExistingWindow() {
        const windows = workspace.windowList();
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
            return (typeof workspace.primaryOutput !== 'undefined') ? workspace.primaryOutput : 0;
        } else {
            // Active monitor
            if (workspace.activeWindow) {
                if (typeof workspace.activeWindow.output !== 'undefined') {
                    return workspace.activeWindow.output;
                }
                if (typeof workspace.activeWindow.screen !== 'undefined') {
                    return workspace.activeWindow.screen;
                }
            }
            if (typeof workspace.activeOutput !== 'undefined') {
                return workspace.activeOutput;
            }
            if (typeof workspace.activeScreen !== 'undefined') {
                return workspace.activeScreen;
            }
            return 0; // Default fallback
        }
    }

    applyGeometry(window) {
        const screen = this.getTargetScreen();
        // Fallback for desktops
        const desktop = (typeof workspace.currentDesktop !== 'undefined')
            ? workspace.currentDesktop
            : (typeof workspace.currentVirtualDesktop !== 'undefined' ? workspace.currentVirtualDesktop : 1);

        const rect = workspace.clientArea(KWin.MaximizeArea, screen, desktop);

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
            workspace.activeWindow = this.quakeWindow;
        } else {
            // Window is visible
            if (workspace.activeWindow !== this.quakeWindow) {
                // Visible but not focused -> move to config location and activate
                this.applyGeometry(this.quakeWindow);
                workspace.activeWindow = this.quakeWindow;
            } else {
                // Visible and focused -> minimize
                this.quakeWindow.minimized = true;
            }
        }
    }
}

new QuakeConsole();
