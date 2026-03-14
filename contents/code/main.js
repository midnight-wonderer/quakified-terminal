function main() {
    const state = {
        window: null,
    };
    const config = readConfig(KWin), {
        wmClass,
        heightPercentage,
        verticalPosition,
    } = config, applyConfiguredGeometry = (output, window) => applyGeometry(
        workspace,
        output,
        window,
        heightPercentage,
        verticalPosition,
    );
    const windowTracker = new WindowTracker(workspace, wmClass, (window) => {
        state.window = window;
        setupQuakeWindow(window);
        const { output } = state;
        if (!output) return;
        applyConfiguredGeometry(output, window);
    });
    const outputTracker = new OutputTracker(workspace, (output) => {
        state.output = output;
    });

    registerShortcut("QuakeTerminalToggle", "Toggle Quake Console", "F12", () => {
        const { output, window } = state;
        if (!window) return;
        if (window.minimized) {
            window.minimized = false;
            workspace.activeWindow = window;
            applyConfiguredGeometry(output, window);
            return;
        }
        if (workspace.activeWindow === window) {
            window.minimized = true;
            return;
        }
        workspace.activeWindow = window;
        applyConfiguredGeometry(output, window);
    });

    workspace.windowAdded.connect((window) => {
        windowTracker.addWindow(window);
    });
    workspace.windowRemoved.connect((window) => {
        windowTracker.removeWindow(window);
    });
    workspace.activeOutputChanged.connect(() => {
        outputTracker.refresh();
    });
    workspace.primaryOutputChanged.connect(() => {
        outputTracker.refresh();
    });

    // // Focus loss behavior
    // workspace.windowActivated.connect((window) => {
    //     controller.onWindowActivated(window);
    // });

    // // Catch an existing terminal on script start
    // controller.findExistingWindow();
}

class WindowTracker {
    constructor(workspace, wmClass, windowChanged) {
        const windows = findExistingWindows(
            this.workspace = workspace,
            this.wmClass = wmClass,
        );
        const window = this.window = windows.shift();
        this.fallback = windows;
        this.windowChanged = windowChanged;
        windowChanged(window);
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

class OutputTracker {
    #workspace;
    #outputChanged;
    #output;
    #preferredOutput;

    constructor(workspace, preferredOutput, outputChanged) {
        this.#workspace = workspace;
        this.#outputChanged = outputChanged;
        this.#preferredOutput = preferredOutput;
        this.refresh();
    }

    refresh() {
        const { primaryOutput, activeOutput } = this.#workspace;
        if (this.#preferredOutput === "Primary Monitor") {
            if (typeof primaryOutput === 'undefined')
                return this.#updateOutput(0);
            return this.#updateOutput(primaryOutput);
        }

        if (typeof activeOutput === 'undefined')
            return this.#updateOutput(0);
        return this.#updateOutput(activeOutput);
    }

    #updateOutput(newValue) {
        if (this.#output === newValue)
            return;
        this.#output = newValue;
        this.#outputChanged(newValue);
    }
}


function readConfig(KWin) {
    return {
        wmClass: KWin.readConfig("WmClass"),
        verticalPosition: KWin.readConfig("VerticalPosition"),
        heightPercentage: KWin.readConfig("HeightPercentage"),
        monitorSelection: KWin.readConfig("MonitorSelection"),
        focusLossBehavior: KWin.readConfig("HideOnFocusLoss"),
    };
}

function findExistingWindows(workspace, wmClass) {
    const windows = workspace.windowList();
    return windows.filter((window) => window.resourceClass === wmClass);
}


function setupQuakeWindow(window) {
    window.onAllDesktops = true;
    window.keepAbove = true;
    window.skipTaskbar = true;
    window.skipSwitcher = true;
    window.skipPager = true;
}


function applyGeometry(workspace, output, window, heightPercentage, verticalPosition) {
    const desktop = workspace.currentVirtualDesktop;
    const rect = workspace.clientArea(workspace.MaximizeArea, output, desktop);
    if (!rect) {
        print("Failed to get clientArea");
        return;
    }
    const targetHeight = Math.round(rect.height * (heightPercentage / 100));
    let yPos = rect.y;

    if (verticalPosition === "Bottom") {
        yPos = rect.y + rect.height - targetHeight;
    }

    window.frameGeometry = {
        x: rect.x,
        y: yPos,
        width: rect.width,
        height: targetHeight,
    };
}

main();
