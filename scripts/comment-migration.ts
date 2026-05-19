/* eslint-disable no-await-in-loop */

import { Mwn } from 'mwn';
import { EARLIEST_VALID_EDIT_TIMESTAMP, Namespace } from '../constants';
import {
    ContainerType,
    formatPost,
    getAllFandomDiscussionPosts,
    getAllForumArticleTitles,
    getAllMovedPages,
    getAllPagesInNamespace,
    getAllRedirects,
    getRenamedFandomUsers,
    type DiscussionPost,
    type FirstPost,
} from '../functions';

interface ForumData<HasFullFirstPost extends boolean = false> {
    article: string;
    talk: string;
    threads: Record<
        string,
        HasFullFirstPost extends true
            ? { firstPost: FirstPost; firstPostFull: DiscussionPost; replies: DiscussionPost[] }
            : { firstPost: FirstPost; firstPostFull?: DiscussionPost; replies: DiscussionPost[] }
    >;
}

export const USES_FANDOM_API = true;

const MANUAL_PAGE_OVERRIDES: Record<string, { article: string; talk: string }> = {
    /* eslint-disable @typescript-eslint/naming-convention */
    'LowPixel GroundBlock Wiki/2021/Fake Articles/Changelog/2021/April 1': {
        article: 'Hypixel SkyBlock Wiki:LowPixel GroundBlock Wiki/2021/Fake Articles/Changelog/2021/April 1',
        talk: 'Hypixel SkyBlock Wiki talk:LowPixel GroundBlock Wiki/2021/Fake Articles/Changelog/2021/April 1',
    },
    'LowPixel GroundBlock Wiki/2021/Fake Articles/Disc': {
        article: 'Hypixel SkyBlock Wiki:LowPixel GroundBlock Wiki/2021/Fake Articles/Disc',
        talk: 'Hypixel SkyBlock Wiki talk:LowPixel GroundBlock Wiki/2021/Fake Articles/Disc',
    },
    /* eslint-enable @typescript-eslint/naming-convention */
};

/**
 * This script is used to migrate article comments from Fandom to the migrated wiki.
 * @param mwn The Mwn instance.
 * @param fandomMwn The Mwn instance for the Fandom wiki.
 */
export default async function main(mwn: Mwn, fandomMwn: Mwn) {
    const comments = await getAllFandomDiscussionPosts(ContainerType.ArticleComment);

    const forumPageMap = await getAllForumArticleTitles([...new Set(comments.map((comment) => comment.forumId))]);

    const allMainspacePages = new Set((await getAllPagesInNamespace(mwn, Namespace.Main)).map((page) => page.title));
    const allTutorialPages = new Set((await getAllPagesInNamespace(mwn, Namespace.Tutorial)).map((page) => page.title));
    const allProjectPages = new Set((await getAllPagesInNamespace(mwn, Namespace.Project)).map((page) => page.title));
    const allUserBlogPages = new Set(
        (await getAllPagesInNamespace(mwn, Namespace.User)).map((page) => page.title).filter((title) => title.includes('/blogs/')),
    );

    const allRedirectPages = new Set(await getAllRedirects(mwn));

    const renamedFandomUsers = await getRenamedFandomUsers(fandomMwn);

    const movedPages = await getAllMovedPages(mwn);

    const articleComments: Record<string, ForumData> = {};

    for (const comment of comments) {
        if (comment.creationDate.epochSecond * 1000 > EARLIEST_VALID_EDIT_TIMESTAMP) continue;

        const { forumId, threadId } = comment;

        if (!(forumId in articleComments)) {
            let title = forumPageMap[forumId];
            if (!title) throw new Error(`No article title found for forum ID ${forumId}`);

            let talkTitle = title.startsWith('Tutorial') ? `Tutorial talk:${title}` : `Talk:${title}`;

            if (!allMainspacePages.has(title))
                if (title in movedPages) {
                    title = movedPages[title];
                    talkTitle = title.startsWith('Tutorial') ? `Tutorial talk:${title}` : `Talk:${title}`;
                } else if (allTutorialPages.has(`Tutorial:${title}`)) {
                    title = `Tutorial:${title}`;
                    talkTitle = `Tutorial talk:${title}`;
                } else if (title in MANUAL_PAGE_OVERRIDES) {
                    talkTitle = MANUAL_PAGE_OVERRIDES[title].talk;
                    title = MANUAL_PAGE_OVERRIDES[title].article;
                } else {
                    const blogTitle = title.replace(
                        /(.+?)\/(.+)/,
                        (match, username: string, blogTitle: string) =>
                            `User:${username in renamedFandomUsers ? renamedFandomUsers[username] : username}/blogs/${blogTitle}`,
                    );
                    if (allUserBlogPages.has(blogTitle)) {
                        title = blogTitle;
                        talkTitle = blogTitle.replace('User', 'User talk');
                    }
                }

            articleComments[forumId] = { article: title, talk: talkTitle, threads: {} };
        }

        const forum = articleComments[forumId];

        if (!(threadId in forum.threads)) {
            const { firstPost } = comment._embedded.thread[0];

            forum.threads[threadId] = { firstPost, replies: [] };
        }

        const thread = forum.threads[threadId];

        if (thread.firstPost.id === comment.id) thread.firstPostFull = comment;
        else thread.replies.push(comment);
    }

    for (const forumData of Object.values(articleComments))
        for (const threadData of Object.values(forumData.threads))
            if (!threadData.firstPostFull) throw new Error(`Thread ${threadData.firstPost.id} is missing firstPostFull`);

    for (const [index, forumData] of [...Object.values(articleComments).entries()].slice(1000)) {
        if (![allMainspacePages, allTutorialPages, allProjectPages, allUserBlogPages].some((pages) => pages.has(forumData.article))) {
            Mwn.log(`[W] ${forumData.article} does not exist, but has article comments on Fandom, skipping.`);
            continue;
        }

        if (allRedirectPages.has(forumData.article))
            Mwn.log(`[W] ${forumData.article} is a redirect, but has article comments on Fandom. Talk will be created anyway.`);

        const talkContent = buildTalkContent(forumData as unknown as ForumData<true>, mwn);

        try {
            await mwn.edit(forumData.talk, (latestRevision) => {
                if (latestRevision.content.includes(talkContent)) {
                    Mwn.log(`[W] ${forumData.talk} already contains the article comments, skipping edit.`);
                    return { text: latestRevision.content, summary: 'Migrating article comments from Fandom', bot: true };
                }

                return {
                    text: `${talkContent}\n\n${latestRevision.content}`.trim(),
                    summary: 'Migrating article comments from Fandom',
                    bot: true,
                };
            });
        } catch (error) {
            if (error && typeof error === 'object' && 'code' in error && error.code === 'missingtitle')
                await mwn.create(forumData.talk, talkContent, 'Migrating article comments from Fandom', { bot: true });
            else throw new Error(`Failed to edit ${forumData.article}: ${(error as Error).message}`, { cause: error });
        }

        Mwn.log(`[i] Finished migrating article comments for ${forumData.article} (${index + 1}/${Object.values(articleComments).length})`);
    }
}

/**
 * Builds the content to be added to the user's talk page from their message wall threads.
 * @param forumData The forum data for the user's message wall.
 * @param mwn The Mwn instance, used for formatting timestamps in signatures.
 */
function buildTalkContent(forumData: ForumData<true>, mwn: Mwn) {
    const sortedThreads = Object.values(forumData.threads).toSorted(
        (a, b) => a.firstPostFull.creationDate.epochSecond - b.firstPostFull.creationDate.epochSecond,
    );

    const commentsByUserCount: Record<string, number> = {};

    const sections = sortedThreads.map((thread) => {
        const creator = thread.firstPostFull.createdBy.name ?? thread.firstPostFull.creatorIp.slice(1);
        if (!(creator in commentsByUserCount)) commentsByUserCount[creator] = 0;
        commentsByUserCount[creator]++;
        let output = `== Comment by ${creator}${commentsByUserCount[creator] > 1 ? ` (${commentsByUserCount[creator]})` : ''} ==\n${formatPost(thread.firstPostFull, 0, mwn)}`;

        const sortedReplies = thread.replies.toSorted((a, b) => a.creationDate.epochSecond - b.creationDate.epochSecond);

        for (const reply of sortedReplies) output += `\n${formatPost(reply, 1, mwn)}`;

        return output;
    });

    return sections.join('\n\n');
}
