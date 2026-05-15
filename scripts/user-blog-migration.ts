/* eslint-disable no-await-in-loop */

import { Mwn } from 'mwn';
import { getAllPagesInNamespace, getAllUsers } from '../functions';

const USER_BLOG_NAMESPACE = 500;

/**
 * This script is used to migrate `User blog:.../...` pages to the new `User:.../blogs/...` format.
 * @param mwn The Mwn instance.
 */
export default async function main(mwn: Mwn) {
    const userBlogPages = await getAllPagesInNamespace(mwn, USER_BLOG_NAMESPACE);

    const allUsers = new Set(await getAllUsers(mwn));

    const usersWithBlogs = new Set<string>();

    const parsedBlogPages = userBlogPages.map((blogPage) => {
        const username = blogPage.title.split('/')[0].split(':').slice(1).join(':');
        const blogTitle = blogPage.title.split('/').slice(1).join('/');

        console.log({ username, blogTitle });

        if (!allUsers.has(username)) throw new Error(`User ${username} does not exist on the wiki!`);

        if (!usersWithBlogs.has(username)) usersWithBlogs.add(username);

        const destination = `User:${username}/blogs/${blogTitle}`;

        return { oldLocation: blogPage.title, newLocation: destination };
    });

    for (const blogPage of parsedBlogPages) {
        Mwn.log(`[i] Moving ${blogPage.oldLocation} to ${blogPage.newLocation}...`);

        await mwn.move(blogPage.oldLocation, blogPage.newLocation, 'Moving deprecated blog post to userspace', { noredirect: true });
    }

    for (const username of usersWithBlogs) {
        const blogListingTitle = `User:${username}/blogs`;

        const content = `{{Special:PrefixIndex/${blogListingTitle}/|stripprefix=yes}}`;

        Mwn.log(`[i] Creating blog listing page ${blogListingTitle}...`);

        await mwn.create(blogListingTitle, content, 'Creating blog listing page');
    }

    Mwn.log(`[S] Finished moving ${parsedBlogPages.length} blogs to userspace and creating ${usersWithBlogs.size} blog listing pages.`);
}
