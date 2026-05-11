/* eslint-disable no-await-in-loop */

import { type ApiQueryResponse, Mwn } from 'mwn';

const IS_DRY_RUN = true as boolean;

const USER_BLOG_NAMESPACE = 500;
const USER_BLOG_COMMENT_NAMESPACE = USER_BLOG_NAMESPACE + 1;

/**
 * Gets all pages in a given namespace.
 * @param mwn The Mwn instance.
 * @param namespace The namespace to get pages from.
 */
async function getAllPagesInNamespace(mwn: Mwn, namespace: number) {
    return (
        (await mwn.continuedQuery({
            action: 'query',
            list: 'allpages',
            apnamespace: namespace,
            aplimit: 'max',
            formatversion: 2,
            format: 'json',
        })) as ApiQueryResponse[]
    ).flatMap(({ query }) => query.allpages!);
}

/**
 * Gets the latest revisions for a list of pages.
 * @param mwn The Mwn instance.
 * @param pages The pages to get revisions for.
 */
async function getAllPagesWithLatestRevision(mwn: Mwn, pages: { title: string }[]) {
    return (
        (await mwn.massQuery({
            action: 'query',
            prop: 'revisions',
            titles: pages.map((page) => page.title),
            rvprop: ['timestamp', 'user', 'content'],
            rvslots: 'main',
            formatversion: 2,
            format: 'json',
        })) as ApiQueryResponse[]
    ).flatMap(({ query }) => query.pages!);
}

/**
 * Indents a comment's content based on its depth in the comment tree.
 * @param content The content of the comment to indent.
 * @param depth The depth of the comment in the comment tree (0 for top-level comments, etc.).
 */
function indentComment(content: string, depth: number) {
    const indentPrefix = ':'.repeat(depth);

    return content.replaceAll(/(^|\n)(?=[^\n])/g, `$1${indentPrefix}`);
}

type BlogCommentsMap = Record<string, { fullTitle: string; replies: BlogCommentsMap }>;

const renamedUsers: Record<string, string> = {
    /* eslint-disable @typescript-eslint/naming-convention */
    PizzaAndTacos: 'Mirp839',
    Memelord3648: 'Da Homeboi',
    Southmelon: 'Weslon',
    /* eslint-enable @typescript-eslint/naming-convention */
};

/**
 * This script is used to migrate `User blog:.../...`/`User blog comment:.../...` pages to the new `User:.../blog/...`/`User talk:.../blog/...` format.
 * @param mwn The Mwn instance.
 */
export default async function main(mwn: Mwn) {
    const userBlogPages = await getAllPagesInNamespace(mwn, USER_BLOG_NAMESPACE);

    const userBlogCommentPages = await getAllPagesInNamespace(mwn, USER_BLOG_COMMENT_NAMESPACE);

    const userBlogCommentPagesWithRevisions = await getAllPagesWithLatestRevision(mwn, userBlogCommentPages);

    const userBlogCommentsMap = Object.fromEntries(
        userBlogCommentPagesWithRevisions.map(({ title, revisions }) => {
            const revision = revisions![0];

            return [
                title,
                { timestamp: revision.timestamp, user: revision.user, anon: revision.anon, content: revision.slots!.main.content },
            ];
        }),
    );

    const allMergedBlogComments: Record<string, { allCommentPages: string[]; replies: BlogCommentsMap }> = Object.fromEntries(
        userBlogPages.map(({ title }) => {
            const [namespaceAndUsername, blogTitle] = title.split('/');

            const [namespace, username] = namespaceAndUsername.split(':');

            const newUsername = username in renamedUsers ? renamedUsers[username] : username;

            const normalizedTitle = `${namespace}:${newUsername}/${blogTitle}`;

            return [normalizedTitle, { allCommentPages: [], replies: {} }];
        }),
    );

    for (const { title } of userBlogCommentPagesWithRevisions) {
        const [namespaceAndUsername, blogTitle, ...commentIds] = title.split('/');

        const username = namespaceAndUsername.split(':')[1];

        const newUsername = username in renamedUsers ? renamedUsers[username] : username;

        const oldBlogTitle = 'User blog:' + newUsername + '/' + blogTitle;

        if (!(oldBlogTitle in allMergedBlogComments)) throw new Error(`Blog post "${oldBlogTitle}" not found for comment "${title}"`);

        allMergedBlogComments[oldBlogTitle].allCommentPages.push(title);

        let currentParentCommentObject: { replies: BlogCommentsMap } = allMergedBlogComments[oldBlogTitle];

        for (const commentId of commentIds)
            if (commentId in currentParentCommentObject.replies) currentParentCommentObject = currentParentCommentObject.replies[commentId];
            else {
                currentParentCommentObject.replies[commentId] = { fullTitle: title, replies: {} };
                currentParentCommentObject = currentParentCommentObject.replies[commentId];
            }
    }

    /**
     * Sorts comments by their timestamp.
     * @param comments The comments to sort.
     */
    function sortComments(comments: BlogCommentsMap) {
        return Object.entries(comments).toSorted((a, b) => {
            const aTimestamp = Number.parseInt(a[0].split('-').at(-1)!);
            const bTimestamp = Number.parseInt(b[0].split('-').at(-1)!);

            return aTimestamp - bTimestamp;
        });
    }

    /**
     * Formats a comment signature with the given user and timestamp.
     * @param user The user who made the comment.
     * @param anon Whether the comment was made by an anonymous user.
     * @param timestamp The timestamp of the comment.
     */
    function formatSignature(user: string, anon: true | undefined, timestamp: string) {
        const userLink = anon ? `[[Special:Contributions/${user}|${user}]]` : `[[User:${user}|${user}]]`;
        const talkLink = `[[User talk:${user}|talk]]`;

        const formattedTimestamp = new mwn.Date(timestamp).format('HH:mm, D MMMM YYYY [(UTC)]', 'utc');

        return `${userLink} (${talkLink}) ${formattedTimestamp}`;
    }

    /**
     * Formats a comment and its replies into a string with proper indentation.
     * @param commentData The comment data to format, consisting of the comment ID and the comment object.
     * @param depth The depth of the comment in the comment tree (0 for top-level comments, etc.).
     */
    function formatComment(commentData: [string, BlogCommentsMap[string]], depth: number): string {
        const { fullTitle, replies } = commentData[1];

        const { content, timestamp, user, anon } = userBlogCommentsMap[fullTitle];

        const indentedContent = indentComment(content!, depth);

        const commentContent = `${indentedContent} ${formatSignature(user!, anon, timestamp!)}`;

        const formattedReplies = sortComments(replies).map((reply) => formatComment(reply, depth + 1));

        return [commentContent, ...formattedReplies].join('\n');
    }

    const formattedBlogTalkPages = Object.fromEntries(
        Object.entries(allMergedBlogComments).map(([blogTitle, { replies }]) => {
            const userCommentsCount: Record<string, number> = {};

            return [
                blogTitle,
                sortComments(replies)
                    .map((reply) => {
                        const username = userBlogCommentsMap[reply[1].fullTitle].user!;

                        let title: string;
                        if (username in userCommentsCount) {
                            userCommentsCount[username]++;
                            title = `Comment by ${username} (${userCommentsCount[username]})`;
                        } else {
                            userCommentsCount[username] = 1;
                            title = `Comment by ${username}`;
                        }

                        return `== ${title} ==\n${formatComment(reply, 0)}`;
                    })
                    .join('\n\n'),
            ];
        }),
    );

    let blogsMoved = 0;
    let talkPagesMigrated = 0;
    let oldCommentPagesDeleted = 0;

    for (const blog of userBlogPages.slice(0, 1)) {
        const destination = blog.title.replace('User blog', 'User').replace('/', '/blog/');
        const destinationTalkPage = destination.replace('User', 'User talk');

        const comments = formattedBlogTalkPages[blog.title];

        if (!IS_DRY_RUN) await mwn.move(blog.title, destination, 'Moving deprecated blog post to userspace', { noredirect: true });

        blogsMoved++;

        if (comments) {
            if (!IS_DRY_RUN) await mwn.create(destinationTalkPage, comments, 'Migrating old user blog comments');

            talkPagesMigrated++;

            const oldCommentPages = allMergedBlogComments[blog.title].allCommentPages;

            oldCommentPagesDeleted += oldCommentPages.length;

            if (!IS_DRY_RUN)
                await mwn.batchOperation(oldCommentPages, async (commentPage) => {
                    await mwn.delete(commentPage, 'Deleting old user blog comment page after migrating comments to new talk page');
                });
        }
    }

    Mwn.log(
        `[S] Finished moving ${blogsMoved} blog${blogsMoved === 1 ? '' : 's'}, migrating ${talkPagesMigrated} talk page${talkPagesMigrated === 1 ? '' : 's'}, and deleting ${oldCommentPagesDeleted} old comment page${oldCommentPagesDeleted === 1 ? '' : 's'}.`,
    );
}
