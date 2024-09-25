export function toHexColorString(color: number): string {
    return "#" + color.toString(16).padStart(6, "0");
}

export function randomHexColor(): string {
    return hsl2hex(Math.random() * 360, 0.8, 0.7);
}

function toHexComponent(component: number): string {
    return Math.floor(component).toString(16).padStart(2, "0");
}

function hsl2hex(hue: number, sat: number, light: number): string {
    const hueFixed = (360 + (hue % 360)) % 360;
    const satFixed = Math.min(1, Math.max(0, sat));
    const lightFixed = Math.min(1, Math.max(0, light));

    let hex = "#";

    for (let i = 0; i < 3; i++) {
        const n = [0, 8, 4][i];
        const k = (n + hueFixed / 30) % 12;
        const a = satFixed * Math.min(lightFixed, 1 - lightFixed);
        hex += toHexComponent((lightFixed - a * Math.max(-1.0, Math.min(k - 3.0, Math.min(9.0 - k, 1.0)))) * 255.0);
    }

    return hex;
}
