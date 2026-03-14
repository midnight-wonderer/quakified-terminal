function main() {
    const state = {
        window: null,
        initialized: false,
    };
    const config = readAllConfig(), {
        wmClass,
        heightPercentage,
        verticalPosition,
        opacity,
        hideOnStart,
    } = config, applyConfiguredGeometry = (output, window) => applyGeometry(
        workspace,
        output,
        window,
        heightPercentage,
        verticalPosition,
    );

    const windowTracker = new WindowTracker(workspace, wmClass, (window) => {
        state.window = window;
        setupQuakeWindow(window, state, opacity, hideOnStart);
        const { output } = state;
        if (isNil(output)) return;
        applyConfiguredGeometry(output, window);
    });
    workspace.windowAdded.connect((window) => {
        windowTracker.addWindow(window);
    });
    workspace.windowRemoved.connect((window) => {
        windowTracker.removeWindow(window);
    });

    const outputTracker = new OutputTracker(workspace, (output) => {
        state.output = output;
        const { window } = state;
        if (isNil(window)) return;
        applyConfiguredGeometry(output, window);
    });
    workspace.screensChanged.connect(() => {
        outputTracker.refresh();
    });

    // kick start
    outputTracker.refresh();
    return { state, workspace, applyConfiguredGeometry };
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

    constructor(workspace, outputChanged) {
        this._workspace = workspace;
        this._outputChanged = outputChanged;
        this.refresh();
    }

    refresh() {
        const { activeScreen } = this._workspace;
        this._updateOutput(activeScreen);
    }

    _updateOutput(newValue) {
        if (this._output === newValue)
            return;
        this._output = newValue;
        this._outputChanged(newValue);
    }
}

function readAllConfig() {
    return {
        wmClass: readConfig("WmClass", "konsole"),
        verticalPosition: readConfig("VerticalPosition", "Top"),
        heightPercentage: readConfig("HeightPercentage", 50),
        opacity: readConfig("Opacity", 100) / 100,
        hideOnStart: readConfig("HideOnStart", true),
    };
}

function findExistingWindows(workspace, wmClass) {
    const windows = workspace.windowList();
    return windows.filter((window) => window.resourceClass === wmClass);
}

function setupQuakeWindow(window, state, opacity, hideOnStart) {
    if (!window) return;
    if (!state.initialized) {
        state.initialized = true;
        if (hideOnStart) {
            window.minimized = true;
        }
    }
    window.onAllDesktops = true;
    window.keepAbove = true;
    window.skipTaskbar = true;
    window.skipSwitcher = true;
    window.skipPager = true;
    if (typeof opacity !== 'undefined') {
        window.opacity = opacity;
    }
}

function applyGeometry(workspace, output, window, heightPercentage, verticalPosition) {
    const desktop = workspace.currentDesktop;
    const rect = workspace.clientArea(KWin.MaximizeArea, output, desktop);
    if (!rect) {
        console.error("Failed to get clientArea");
        return;
    }
    const { x, y, width, height } = rect;
    const targetHeight = Math.round(height * (heightPercentage / 100));
    let yPos = y;

    if (verticalPosition === "Bottom") {
        yPos += height - targetHeight;
    }

    window.frameGeometry = {
        x,
        y: yPos,
        width,
        height: targetHeight,
    };
}

function isNil(value) {
    return typeof value === 'undefined' || value === null;
}

// create outer scope variables to support `registerShortcut`
const {
    state: oState,
    workspace: oWorkspace,
    applyConfiguredGeometry: oApplyConfiguredGeometry,
} = main();

// Quirk: `registerShortcut` must be outside of `main`, or it will be garbage collected
registerShortcut("QuakeTerminalToggle", "Toggle Quake Console", "F12", () => {
    const { output, window } = oState;
    if (isNil(window)) return;
    if (window.minimized) {
        window.minimized = false;
        if (window.output !== output)
            oWorkspace.sendClientToScreen(window, output);
        oWorkspace.activeWindow = window;
        oApplyConfiguredGeometry(output, window);
        return;
    }
    if (oWorkspace.activeWindow === window) {
        window.minimized = true;
        return;
    }
    if (window.output !== output)
        oWorkspace.sendClientToScreen(window, output);
    oWorkspace.activeWindow = window;
    oApplyConfiguredGeometry(output, window);
});
