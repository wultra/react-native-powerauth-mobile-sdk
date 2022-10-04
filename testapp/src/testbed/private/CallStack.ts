import { Platform } from "react-native"

interface StackEntry {
    path: string;
    func: string;
}

function parseCallstackLine(line: string): StackEntry | undefined {
    if (line === '@') return undefined;
    const idx = line.indexOf('@', 0);
    if (idx < 0) return undefined;
    const fname = line.substring(0, idx);
    if (fname.length == 0) return undefined;
    let locat = line.substring(idx + 1);
    if (locat === '[native code]') {
        return {path: 'native', func: fname};
    }
    if (locat.startsWith('http://')) {
        const bundleStart = locat.indexOf('/', 7);
        const bundleEnd = locat.indexOf('?', 7);
        locat = locat.substring(bundleStart + 1, bundleEnd);
        if (bundleStart < bundleEnd) {
            return {path: locat, func: fname};
        }
    }
    return undefined;
}

export function parseRnCallStack(stack: string, padding: string = ""): string {
    //console.warn(`Stack = ${stack}`)
    const lines = stack.split('\n');
    if (lines.length == 0) {
        return '';
    }
    let parsedLines = lines.map(line => parseCallstackLine(line)).filter(l => l !== undefined).map(l => l!);
    // Crop to 4 entries. The stack typically doesn't help locate the problem
    if (parsedLines.length > 8) {
        parsedLines.splice(8);
    }
    const maxFuncName = parsedLines.reduce((previous, entry) => Math.max(previous, entry.func.length), 0)
    return parsedLines
                .map(entry => `${padding} ${entry.func.padStart(maxFuncName, ' ')}  @ ${entry.path}`)
                .join('\n');
}