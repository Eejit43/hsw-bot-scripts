/* eslint-disable no-await-in-loop, unicorn/no-process-exit */

import { Mwn } from 'mwn';
import { readdirSync } from 'node:fs';
import readline from 'node:readline/promises';
import { styleText } from 'node:util';

const readlineInterface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

readlineInterface.on('SIGINT', () => {
    console.log();

    readlineInterface.close();
    process.exit(0);
});

const availableScripts = readdirSync('scripts').map((file) => file.replace('.ts', ''));

console.log(styleText(['blue', 'underline'], 'Available scripts:'));

console.log(`  ${availableScripts.join(', ')}`);

let loadedMwnInstance: Mwn | undefined;
let loadedFandomMwnInstance: Mwn | undefined;

while (true) {
    const input = await readlineInterface.question(styleText(['green'], '\nScript to run (or "exit"): '));

    if (input === 'exit') break;

    if (!availableScripts.includes(input)) {
        console.log(styleText(['red'], 'Invalid script name. Please try again.'));
        continue;
    }

    let mainFunction: (mwn: Mwn, fandomMwn?: Mwn) => Promise<void>;
    let usesFandomApi: boolean;
    try {
        const exports = (await import(`./scripts/${input}.ts?cb=${Date.now()}`)) as {
            default: (mwn: Mwn) => Promise<void>;
            USES_FANDOM_API?: boolean;
        };
        mainFunction = exports.default;
        usesFandomApi = exports.USES_FANDOM_API ?? false;
    } catch (error) {
        console.error(styleText(['red'], `Failed to load script "${input}": ${error instanceof Error ? error.message : String(error)}`));
        continue;
    }

    loadedMwnInstance ??= await Mwn.init({
        apiUrl: 'https://hypixelskyblock.minecraft.wiki/api.php',
        username: process.env.BOT_USERNAME,
        password: process.env.BOT_PASSWORD,
        defaultParams: { assert: 'user' },
    });

    if (usesFandomApi)
        loadedFandomMwnInstance ??= await Mwn.init({
            apiUrl: 'https://hypixel-skyblock.fandom.com/api.php',
            username: process.env.FANDOM_BOT_USERNAME,
            password: process.env.FANDOM_BOT_PASSWORD,
            defaultParams: { assert: 'user' },
        });

    try {
        await (usesFandomApi ? mainFunction(loadedMwnInstance, loadedFandomMwnInstance) : mainFunction(loadedMwnInstance));
    } catch (error) {
        console.error(styleText(['red'], `Error running script "${input}": ${error instanceof Error ? error.message : String(error)}`));
        continue;
    }

    console.log(styleText(['green'], `Finished running script "${input}".`));
}

readlineInterface.close();
