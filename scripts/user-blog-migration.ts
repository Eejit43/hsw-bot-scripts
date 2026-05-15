/* eslint-disable no-await-in-loop */

import { Mwn } from 'mwn';
import { getAllPagesInNamespace } from '../functions';

const IS_DRY_RUN = true as boolean;

const USER_BLOG_NAMESPACE = 500;

/**
 * This script is used to migrate `User blog:.../...` pages to the new `User:.../blog/...` format.
 * @param mwn The Mwn instance.
 */
export default async function main(mwn: Mwn) {
    const userBlogPages = await getAllPagesInNamespace(mwn, USER_BLOG_NAMESPACE);

    let blogsMoved = 0;

    for (const blog of userBlogPages.slice(0, 1)) {
        const destination = blog.title.replace('User blog', 'User').replace('/', '/blog/');

        if (!IS_DRY_RUN) await mwn.move(blog.title, destination, 'Moving deprecated blog post to userspace', { noredirect: true });

        blogsMoved++;
    }

    Mwn.log(`[S] Finished moving ${blogsMoved} blog${blogsMoved === 1 ? '' : 's'}.`);
}
