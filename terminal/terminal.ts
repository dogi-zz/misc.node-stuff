
// http://ascii-table.com/ansi-escape-sequences.php

// console.log('\x1b[36m%s\x1b[0m', 'I am cyan');  //cyan
// console.log('\x1b[33m%s\x1b[0m', stringToMakeYellow);  //yellow

// - Position the Cursor:
//   \033[<L>;<C>H
//      Or
//   \033[<L>;<C>f
//   puts the cursor at line L and column C.
// - Move the cursor up N lines:
//   \033[<N>A
// - Move the cursor down N lines:
//   \033[<N>B
// - Move the cursor forward N columns:
//   \033[<N>C
// - Move the cursor backward N columns:
//   \033[<N>D

// - Clear the screen, move to (0,0):
//   \033[2J
// - Erase to end of line:
//   \033[K

// - Save cursor position:
//   \033[s
// - Restore cursor position:
//   \033[u


// TO HEX:
// console.log('\033c'); // Clear screen
// console.log('\x1Bc'); // Clear screen 1B = 33


const Reset = "\x1b[0m"
const Bright = "\x1b[1m"
const Dim = "\x1b[2m"
const Underscore = "\x1b[4m"
const Blink = "\x1b[5m"
const Reverse = "\x1b[7m"
const Hidden = "\x1b[8m"

const FgBlack = "\x1b[30m"
const FgRed = "\x1b[31m"
const FgGreen = "\x1b[32m"
const FgYellow = "\x1b[33m"
const FgBlue = "\x1b[34m"
const FgMagenta = "\x1b[35m"
const FgCyan = "\x1b[36m"
const FgWhite = "\x1b[37m"

const BgBlack = "\x1b[40m"
const BgRed = "\x1b[41m"
const BgGreen = "\x1b[42m"
const BgYellow = "\x1b[43m"
const BgBlue = "\x1b[44m"
const BgMagenta = "\x1b[45m"
const BgCyan = "\x1b[46m"
const BgWhite = "\x1b[47m"

// console.info(FgGreen);
// console.info("FgGreen");
// console.info(Reset);
// console.log('Terminal size: ' + process.stdout.columns + 'x' + process.stdout.rows);

// setTimeout(() => {
//     process.stdout.write('\n\033[1A');
//     console.info('Your text here');

// }, 2000);




const maxLen = (data: string[]) => {
    let max = 0;
    data.forEach(item => max = Math.max(max, item.length));
    return max;
}
const sum = (data: number[]) => {
    let sum = 0;
    data.forEach(item => sum += item);
    return sum;
}
const padRight = (item: string, len: number) => {
    while (item.length < len) { item += ' ' }
    return item;
}





interface KeyCallback {
    println: (text: string) => void;
}


export class TerminalTools {

    public static selectArray(options: string[]) {
        return new Promise<string>((res, rej) => {
            var len = maxLen(options);
            var lines = options.map(line => padRight(line, len));
            var index = 0;

            var printHeight = 0;
            var print = () => {
                TerminalTools.backLine(printHeight);
                console.info(lines.map((line, idx) => {
                    if (idx == index) {
                        return ' [' + line + ']';
                    } else {
                        return '  ' + line + ' ';
                    }
                }).join('\n'));
                printHeight = lines.length;
            }

            var stdin = process.stdin;
            var stdout = process.stdout;
            stdin.setRawMode(true);
            stdin.resume();

            var callback = function (key) {

                if (key[0] == 13) {
                    stdin.pause();
                    stdin.removeListener('data', callback);
                    TerminalTools.backLine(printHeight);
                    res(options[index]);
                    return;
                }
                if (key[0] == 3) {
                    stdin.pause();
                    stdin.removeListener('data', callback);
                    TerminalTools.backLine(printHeight);
                    //process.exit();
                    rej();
                    return;
                }

                // UP 
                if (key.length == 3 && key[0] == 27 && key[1] == 91 && key[2] == 65) {
                    index = Math.max(0, index - 1);
                }
                // DOWN
                if (key.length == 3 && key[0] == 27 && key[1] == 91 && key[2] == 66) {
                    index = Math.min(options.length - 1, index + 1);
                }

                print();
            }
            stdin.on('data', callback);


            print();
        });
    }

    public static readLine(prompt: string, callabck?: (line: string, action: KeyCallback) => void) {
        return new Promise<string>((res, rej) => {
            var stdin = process.stdin;
            var stdout = process.stdout;
            stdin.setRawMode(true);
            stdin.resume();
            ///stdin.setEncoding('utf8');

            stdout.write('\n\x1B[1A' + prompt);
            var line = '';
            var callback = function (key) {
                if (key[0] == 13) {
                    stdin.pause();
                    stdin.removeListener('data', callback);
                    stdout.write('\n');
                    res(line);
                    return;
                }
                if (key[0] == 3) {
                    stdin.pause();
                    stdin.removeListener('data', callback);
                    stdout.write('\n');
                    //process.exit();
                    rej();
                    return;
                }
                if (key[0] == 127) {
                    line = line.substr(0, Math.max(0, line.length - 1))
                } else {
                    line += key.toString('UTF-8');
                }

                if (callabck) {
                    callabck(line, {
                        println: (text: string) => {
                            stdout.write('\n\x1B[1A\x1B[K');
                            stdout.write(prompt + text + '');
                        }
                    });
                } else {
                    stdout.write('\n\x1B[1A\x1B[K');
                    stdout.write(prompt + line + '');
                }

            }

            stdin.on('data', callback);
        });
    }

    public static backLine(count: number = 1) {
        var stdout = process.stdout;
        for (let i = 0; i < count; i++) {
            stdout.write('\x1B[1A\x1B[K');
        }
    }

    public static printArray(data: string[]) {
        let width = process.stdout.columns;
        for (var height = 1; height <= data.length; height++) {
            let widths = [];
            for (var chunkIndex = 0; chunkIndex < data.length; chunkIndex += height) {
                widths.push(maxLen(data.slice(chunkIndex, chunkIndex + height)));
            }
            if (sum(widths) + (widths.length - 1) * 2 < width) {
                // print out 
                let chunks = [];
                for (var chunkIndex = 0; chunkIndex < data.length; chunkIndex += height) {
                    chunks.push(data.slice(chunkIndex, chunkIndex + height));
                }
                let lines = [];
                for (var i = 0; i < height; i++) {
                    let line = [];
                    chunks.forEach((chunk, col) => {
                        if (chunk.length > i) { line.push(padRight(chunk[i], widths[col])); }
                    });
                    lines.push(line);
                }
                console.info(lines.map(line => line.join('  ')).join('\n'));
                return lines.length;
            }
        }
    }

    public static printObject(obj: any) {
        let width = process.stdout.columns;
        let data = Object.entries(obj).map(entry => [entry[0], '' + entry[1]]);
        let keys = data.map(entry => entry[0]);
        let values = data.map(entry => entry[1]);

        for (var height = 1; height <= data.length; height++) {
            let keyWidths = [];
            let valueWidths = [];
            for (var chunkIndex = 0; chunkIndex < data.length; chunkIndex += height) {
                keyWidths.push(maxLen(keys.slice(chunkIndex, chunkIndex + height)));
                valueWidths.push(maxLen(values.slice(chunkIndex, chunkIndex + height)));
            }
            if (sum(keyWidths) + sum(valueWidths) + (keyWidths.length * 2) + (valueWidths.length) - 1 < width) {
                // print out 
                let chunks = [];
                for (var chunkIndex = 0; chunkIndex < data.length; chunkIndex += height) {
                    chunks.push(data.slice(chunkIndex, chunkIndex + height));
                }
                let lines = [];
                for (var i = 0; i < height; i++) {
                    let line = [];
                    chunks.forEach((chunk, col) => {
                        if (chunk.length > i) {
                            line.push(padRight(chunk[i][0], keyWidths[col]) + ' ' + padRight(chunk[i][1], valueWidths[col]));
                        }
                    });
                    lines.push(line);
                }
                console.info(lines.map(line => line.join('  ')).join('\n'));
                return lines.length;
            }
        }
    }

}




