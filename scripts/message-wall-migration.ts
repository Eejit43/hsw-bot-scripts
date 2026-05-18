/* eslint-disable no-await-in-loop */

import { Mwn } from 'mwn';
import { EARLIEST_VALID_EDIT_TIMESTAMP } from '../constants';
import {
    ContainerType,
    formatPost,
    getAllFandomDiscussionPosts,
    getAllUsers,
    getRenamedFandomUsers,
    type DiscussionPost,
    type FirstPost,
} from '../functions';

interface ForumData<HasFullFirstPost extends boolean = false> {
    username: string;
    threads: Record<
        string,
        HasFullFirstPost extends true
            ? { firstPost: FirstPost; firstPostFull: DiscussionPost; replies: DiscussionPost[] }
            : { firstPost: FirstPost; firstPostFull?: DiscussionPost; replies: DiscussionPost[] }
    >;
}

const MANUAL_USERNAME_OVERRIDES: Record<string, string> = {
    /* eslint-disable @typescript-eslint/naming-convention */
    AaronLao123: 'Tawaru',
    IRXOSM01: 'Iro',
    PerfectPaenut: 'Paenut',
    TheAetherSword: 'AetherSword',
    TheColdSheepIsBad: 'ColdShep',
    Whamikaze: 'Whami',
    /* eslint-disable-enable @typescript-eslint/naming-convention */
};

export const USES_FANDOM_API = true;

/**
 * This script is used to migrate message walls from Fandom to the migrated wiki.
 * @param mwn The Mwn instance.
 * @param fandomMwn The Mwn instance for the Fandom wiki.
 */
export default async function main(mwn: Mwn, fandomMwn: Mwn) {
    const messageWallPosts = await getAllFandomDiscussionPosts(ContainerType.Wall);

    const renamedFandomUsers = await getRenamedFandomUsers(fandomMwn);

    const allUsers = new Set(await getAllUsers(mwn));

    const messageWallThreads: Record<string, ForumData> = {};

    for (const post of messageWallPosts) {
        if (post.creationDate.epochSecond * 1000 > EARLIEST_VALID_EDIT_TIMESTAMP) continue;

        const { forumId, forumName, threadId } = post;

        if (!(forumId in messageWallThreads)) {
            let username = forumName!.replace(' Message Wall', '').replaceAll('_', ' ');
            if (username in renamedFandomUsers) username = renamedFandomUsers[username];
            else if (username in MANUAL_USERNAME_OVERRIDES) username = MANUAL_USERNAME_OVERRIDES[username];

            messageWallThreads[forumId] = { username: username.replaceAll(' ', '_'), threads: {} };
        }

        const forum = messageWallThreads[forumId];

        if (!(threadId in forum.threads)) {
            const { firstPost } = post._embedded.thread[0];

            forum.threads[threadId] = { firstPost, replies: [] };
        }

        const thread = forum.threads[threadId];

        if (thread.firstPost.id === post.id) thread.firstPostFull = post;
        else thread.replies.push(post);
    }

    for (const forumData of Object.values(messageWallThreads))
        for (const threadData of Object.values(forumData.threads))
            if (!threadData.firstPostFull) throw new Error(`Thread ${threadData.firstPost.id} is missing firstPostFull`);

    for (const [index, forumData] of Object.values(messageWallThreads).entries()) {
        if (!allUsers.has(forumData.username.replaceAll('_', ' ')))
            Mwn.log(`[W] User ${forumData.username} does not exist, but has a message wall on Fandom with more than a single thread.`);

        const talkContent = buildTalkContent(forumData as unknown as ForumData<true>, mwn);

        try {
            await mwn.edit(`User talk:${forumData.username}`, (latestRevision) => {
                if (latestRevision.content.includes(talkContent)) {
                    Mwn.log(`[W] Talk page for user ${forumData.username} already contains the message wall content, skipping edit.`);
                    return { text: latestRevision.content, summary: 'Migrating message wall content from Fandom', bot: true };
                }

                return {
                    text: `${talkContent}\n\n${latestRevision.content}`.trim(),
                    summary: 'Migrating message wall content from Fandom',
                    bot: true,
                };
            });
        } catch (error) {
            if (error && typeof error === 'object' && 'code' in error && error.code === 'missingtitle')
                await mwn.create(`User talk:${forumData.username}`, talkContent, 'Migrating message wall content from Fandom', {
                    bot: true,
                });
            else throw new Error(`Failed to edit talk page for user ${forumData.username}: ${(error as Error).message}`, { cause: error });
        }

        Mwn.log(
            `[i] Finished migrating message wall for user ${forumData.username} (${index + 1}/${Object.values(messageWallThreads).length})`,
        );
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

    const sections = sortedThreads.map((thread) => {
        let output = `== ${thread.firstPostFull.title ?? 'Untitled thread'} ==\n${formatPost(thread.firstPostFull, 0, mwn)}`;

        const sortedReplies = thread.replies.toSorted((a, b) => a.creationDate.epochSecond - b.creationDate.epochSecond);

        for (const reply of sortedReplies) output += `\n${formatPost(reply, 1, mwn)}`;

        return output;
    });

    return sections.join('\n\n');
}
