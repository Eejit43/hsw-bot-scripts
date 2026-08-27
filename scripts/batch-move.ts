/* eslint-disable no-await-in-loop */

import { Mwn } from 'mwn';
import { getAllProvidedPages } from '../functions';
import { getInput } from '../utilities';

interface Input {
    summary: string;
    redirect?: boolean;
    pageMoves: { from: string; to: string }[];
}

/**
 * This script is used to batch move a list of pages to new titles, leaving redirects.
 * @param mwn The Mwn instance.
 */
export default async function main(mwn: Mwn) {
    const { summary, redirect = true, pageMoves } = getInput<Input>('batch-move', { summary: '', pageMoves: [] });

    if (pageMoves.length === 0) {
        Mwn.log('[W] No page moves specified. Exiting.');
        return;
    }

    // Validate page existence
    const pages = await getAllProvidedPages(
        mwn,
        pageMoves.map(({ from }) => ({ title: from })),
    );

    const missingPages = pages.filter((page) => page.missing).map((page) => page.title);

    if (missingPages.length > 0) {
        Mwn.log(`[E] The following pages do not exist and cannot be moved: ${missingPages.join(', ')}. Exiting.`);
        return;
    }

    for (const { from, to } of pageMoves)
        try {
            await mwn.move(from, to, summary, { noredirect: !redirect });
            Mwn.log(`[i] Moved "${from}" to "${to}".`);
        } catch (error) {
            throw new Error(`Failed to move "${from}" to "${to}": ${(error as Error).message}`, { cause: error });
        }

    Mwn.log(`[S] Successfully moved ${pageMoves.length} pages with summary "${summary}" and ${redirect ? '' : 'not '}leaving redirects.`);
}
