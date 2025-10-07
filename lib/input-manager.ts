
export class InputManager {
    private keys: { [key: string]: boolean } = {};
    private mousePosition: { x: number; y: number } = { x: 0, y: 0 };
    private mouseButtons: { [button: number]: boolean } = {};

    constructor() {
        if (typeof window !== 'undefined') {
            window.addEventListener('keydown', this.handleKeyDown);
            window.addEventListener('keyup', this.handleKeyUp);
            window.addEventListener('mousemove', this.handleMouseMove);
            window.addEventListener('mousedown', this.handleMouseDown);
            window.addEventListener('mouseup', this.handleMouseUp);
        }
    }

    public destroy() {
        if (typeof window !== 'undefined') {
            window.removeEventListener('keydown', this.handleKeyDown);
            window.removeEventListener('keyup', this.handleKeyUp);
            window.removeEventListener('mousemove', this.handleMouseMove);
            window.removeEventListener('mousedown', this.handleMouseDown);
            window.removeEventListener('mouseup', this.handleMouseUp);
        }
    }

    private handleKeyDown = (event: KeyboardEvent) => {
        this.keys[event.code] = true;
    };

    private handleKeyUp = (event: KeyboardEvent) => {
        this.keys[event.code] = false;
    };

    private handleMouseMove = (event: MouseEvent) => {
        this.mousePosition = { x: event.clientX, y: event.clientY };
    };

    private handleMouseDown = (event: MouseEvent) => {
        this.mouseButtons[event.button] = true;
    };

    private handleMouseUp = (event: MouseEvent) => {
        this.mouseButtons[event.button] = false;
    };

    public isKeyPressed(code: string): boolean {
        return this.keys[code] || false;
    }

    public getMousePosition(): { x: number; y: number } {
        return this.mousePosition;
    }

    public isMouseButtonPressed(button: number): boolean {
        return this.mouseButtons[button] || false;
    }
}

export const inputManager = new InputManager();
