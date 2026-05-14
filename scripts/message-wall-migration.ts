/* eslint-disable no-await-in-loop, jsdoc/require-jsdoc */

import { Mwn, type ApiQueryResponse, type LogEvent } from 'mwn';
import { cacheData, getCache } from '../utilities';

/* eslint-disable @typescript-eslint/naming-convention, unicorn/prevent-abbreviations */
interface WikiaControllerDiscussionPostGetPostsApiResponse {
    _links: Links;
    postCount: string;
    readOnlyMode: boolean;
    _embedded: Embedded;
}

interface Embedded {
    'count': [{ ARTICLE_COMMENT: number; FORUM: number; WALL: number; total: number }];
    'wallOwners'?: { userId: string; wallContainerId: string }[];
    'contributors': { count: number; userInfo: { id: string; avatarUrl: null | string; name: string; badgePermission: string }[] }[];
    'doc:posts': DocPost[];
}

export interface DocPost {
    _links: { permalink: { href: string }[] };
    createdBy: CreatorInformation;
    creationDate: CreationDate;
    creatorId: string;
    creatorIp: string;
    forumId: string;
    forumName: string;
    id: string;
    isContentSuppressed: boolean;
    isDeleted: boolean;
    isEditable: boolean;
    isLocked: boolean;
    isReply: boolean;
    isReported: boolean;
    jsonModel: null | string;
    latestRevisionId: string;
    modificationDate: CreationDate | null;
    position: number;
    rawContent: string;
    renderedContent: null | string;
    requesterId: string;
    siteId: string;
    threadCreatedBy: CreatorInformation;
    threadId: string;
    title: null | string;
    upvoteCount: number;
    _embedded: Embedded;
    lastEditedBy?: CreatorInformation;
}

interface Embedded {
    attachments: Attachment[];
    thread: Thread[];
    latestRevision: LatestRevision[];
    openGraph?: OpenGraph[];
    contentImages?: ContentImage[];
}

interface Attachment {
    atMentions: [];
    contentImages: ContentImage[];
    openGraphs: OpenGraph[];
    polls: [];
    quizzes: [];
}

interface ContentImage {
    id: number;
    position: number;
    url: string;
    width: number;
    height: number;
    mediaType: MediaType;
}

enum MediaType {
    ImageGIF = 'image/gif',
    ImageJPEG = 'image/jpeg',
    ImagePNG = 'image/png',
    ImageWebp = 'image/webp',
}

interface OpenGraph {
    id: string;
    postRevisionId: number;
    siteId: number;
    url: string;
    siteName: string | null;
    title: null | string;
    type: Type;
    imageUrl: null | string;
    description: null | string;
    originalUrl: null | string;
    videoUrl: null | string;
    videoSecureUrl: null | string;
    videoType: null | string;
    videoHeight: number | null;
    videoWidth: number | null;
    imageHeight: number | null;
    imageWidth: number | null;
    dateRetrieved: CreationDate;
}

interface CreationDate {
    epochSecond: number;
    nano: number;
}

enum Type {
    Article = 'article',
    Empty = '',
    FeedsPOLL = 'feeds.POLL',
    FeedsTEXT = 'feeds.TEXT',
    Image = 'image',
    Profile = 'profile',
    Summary = 'summary',
    SummaryLargeImage = 'summary_large_image',
    VideoOther = 'video.other',
    Website = 'website',
}

interface LatestRevision {
    creationDate: CreationDate;
    creatorId: string;
    creatorIp: string;
    id: string;
    jsonModel: null | string;
    postId: string;
    rawContent: string;
    renderedContent: null | string;
}

interface Thread {
    containerId: string;
    containerType: ContainerType;
    creatorId: string;
    firstPost: FirstPost;
    isContentSuppressed: boolean;
    isEditable: boolean;
    isFollowed?: boolean;
    isLocked: boolean;
    isReported: boolean;
    postCount: string;
    tags: [];
    title: null | string;
}

enum ContainerType {
    Wall = 'WALL',
    ArticleComment = 'ARTICLE_COMMENT',
    Forum = 'FORUM',
}

interface FirstPost {
    id: string;
    renderedContent: null | string;
    jsonModel: null | string;
    createdBy: CreatorInformation;
    title: null | string;
    attachments: Attachment;
    threadId: string;
    createdByIp: null | string;
}

interface CreatorInformation {
    id: string;
    avatarUrl: null | string;
    name: null | string;
    badgePermission: string;
}

interface Links {
    first: { href: string }[];
    last: { href: string }[];
    previous?: { href: string }[];
    next?: { href: string }[];
}
/* eslint-enable @typescript-eslint/naming-convention, unicorn/prevent-abbreviations */

interface JsonModel {
    type: string;
    content: JsonModelContent[];
}

interface JsonModelContent {
    type: string;
    content?: Content[];
    attrs?: ContentAttributes;
}

interface ContentAttributes {
    id?: number | null;
    attachment?: null;
    url?: string;
    wasAddedWithInlineLink?: boolean;
    createdWith?: string;
}

interface Content {
    type: string;
    text: string;
    content?: Content[];
    marks?: {
        type: string;
        attrs?: { href: string; title: null };
    }[];
}

async function getAllDiscussionPosts(postContainerType: ContainerType) {
    const apiUrl = new URL('https://hypixel-skyblock.fandom.com/wikia.php');
    apiUrl.searchParams.set('controller', 'DiscussionPost');
    apiUrl.searchParams.set('method', 'getPosts');
    apiUrl.searchParams.set('containerType', postContainerType);
    apiUrl.searchParams.set('limit', '100');

    let currentPage = 0;

    const result = [];

    while (true) {
        Mwn.log(`[i] Getting message wall API page ${currentPage}`);

        apiUrl.searchParams.set('page', currentPage.toString());

        const response = await fetch(apiUrl);

        if (!response.ok) throw new Error(`Wikia controller API request failed with status ${response.status}: ${response.statusText}`);

        const responseData = (await response.json()) as WikiaControllerDiscussionPostGetPostsApiResponse;

        result.push(...responseData._embedded['doc:posts']);

        if (!('next' in responseData._links)) break;

        await new Promise((resolve) => setTimeout(resolve, 200));

        currentPage++;
    }

    return result;
}

interface ForumData<HasFullFirstPost extends boolean = false> {
    username: string;
    threads: Record<
        string,
        HasFullFirstPost extends true
            ? { firstPost: FirstPost; firstPostFull: DocPost; replies: DocPost[] }
            : { firstPost: FirstPost; firstPostFull?: DocPost; replies: DocPost[] }
    >;
}

const LAST_VALID_TIMESTAMP = 1_776_701_820_000; // 12:17, April 20, 2026 (EST)

async function getRenamedFandomUsers(fandomMwn: Mwn) {
    return Object.fromEntries(
        (
            (await fandomMwn.continuedQuery({
                action: 'query',
                list: 'logevents',
                leaction: 'move/move',
                lenamespace: 1200,
                lelimit: 'max',
            })) as (ApiQueryResponse & { query: { logevents: LogEvent[] } })[]
        )
            .flatMap((result) => result.query.logevents)
            .map((logEvent) => [
                logEvent.title.split(':')[1],
                // eslint-disable-next-line @typescript-eslint/naming-convention
                (logEvent as { params: { target_ns: number; target_title: string } }).params.target_title.split(':')[1],
            ]),
    );
}

async function getAllUsers(mwn: Mwn) {
    const users = (
        (await mwn.continuedQuery(
            {
                action: 'query',
                list: 'allusers',
                aulimit: 'max',
            },
            500,
        )) as ApiQueryResponse[]
    ).flatMap(({ query }) => (query as unknown as { allusers: { name: string }[] }).allusers);

    return users.map((user) => user.name);
}

const MANUAL_USERNAME_OVERRIDES: Record<string, string> = {
    /* eslint-disable @typescript-eslint/naming-convention */
    IRXOSM01: 'Iro',
    TheAetherSword: 'AetherSword',
    AaronLao123: 'Tawaru',
    TheColdSheepIsBad: 'ColdShep',
    Whamikaze: 'Whami',
    PerfectPaenut: 'Paenut',
    /* eslint-disable-enable @typescript-eslint/naming-convention */
};

/**
 * This script is used to migrate message walls from Fandom to the migrated wiki.
 * @param mwn The Mwn instance.
 * @param fandomMwn The Mwn instance for the Fandom wiki.
 */
export default async function main(mwn: Mwn, fandomMwn: Mwn) {
    const messageWallPosts =
        getCache<DocPost[]>('message-wall-posts') ?? cacheData('message-wall-posts', await getAllDiscussionPosts(ContainerType.Wall));

    const renamedFandomUsers =
        getCache<Record<string, string>>('renamed-fandom-users') ??
        cacheData('renamed-fandom-users', await getRenamedFandomUsers(fandomMwn));

    const allUsers = new Set(getCache<string[]>('all-users') ?? cacheData('all-users', await getAllUsers(mwn)));

    const messageWallThreads: Record<string, ForumData> = {};

    for (const post of messageWallPosts) {
        if (post.creationDate.epochSecond * 1000 > LAST_VALID_TIMESTAMP) continue;

        const { forumId, forumName, threadId } = post;

        if (!(forumId in messageWallThreads)) {
            let username = forumName.replace(' Message Wall', '').replaceAll('_', ' ');
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

    for (const forumData of Object.values(messageWallThreads)) {
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
                    text: `${talkContent}\n\n${latestRevision.content}`,
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

        Mwn.log(`[i] Finished migrating message wall for user ${forumData.username}`);
    }
}

function getPostLink(post: DocPost) {
    return `https://hypixel-skyblock.fandom.com/wiki/Message_Wall:${post.forumName.replace(' Message Wall', '')}?threadId=${post.threadId}#${post.id}`;
}

function escapeMarkup(string: string, stripHtmlMarkup = true) {
    string = string.replaceAll('~~~', '~~&#126;').replaceAll('{', '&#123;').replaceAll('}', '&#125;');

    if (stripHtmlMarkup) string = string.replaceAll('<', '&lt;').replaceAll('>', '&gt;');

    return string;
}

function formatParagraphContent(content: JsonModelContent, post: DocPost, depth: number) {
    if (!content.content) return '';

    return (
        ':'.repeat(depth) +
        content.content
            .map((content, index) => {
                switch (content.type) {
                    case 'text': {
                        let output = escapeMarkup(content.text);

                        if (index === 0 && output.startsWith(':')) output = output.replace(/^:/, '&#58;');

                        for (const mark of content.marks ?? [])
                            switch (mark.type) {
                                case 'link': {
                                    output = formatLink(mark.attrs!.href, content.text);
                                    break;
                                }
                                case 'em': {
                                    output = `''${output}''`;
                                    break;
                                }
                                case 'strong': {
                                    output = `'''${output}'''`;
                                    break;
                                }
                                case 'code': {
                                    output = `<code>${output}</code>`;
                                    break;
                                }
                                default: {
                                    throw new Error(`Unsupported mark type \`${mark.type}\` in text content: ${getPostLink(post)}`);
                                }
                            }

                        return output;
                    }
                    default: {
                        throw new Error(`Unsupported JSON model paragraph content type \`${content.type}\`: ${getPostLink(post)}`);
                    }
                }
            })
            .join('')
    );
}

function formatJsonModel(jsonModel: JsonModel, post: DocPost, depth: number) {
    const indentation = ':'.repeat(depth);

    return (
        jsonModel.content
            .filter((content) => content.type !== 'openGraph')
            .map((content) => {
                switch (content.type) {
                    case 'paragraph': {
                        return formatParagraphContent(content, post, depth);
                    }
                    case 'image': {
                        if (content.attrs?.url) return `${indentation}[${content.attrs.url} View embedded image]`;
                        else if (content.attrs && 'id' in content.attrs) {
                            const foundImage = post._embedded.attachments[0].contentImages.find(
                                (image) => image.position === content.attrs!.id,
                            );
                            if (!foundImage)
                                throw new Error(
                                    `Could not find image with position ${content.attrs.id} in post attachments: ${getPostLink(post)}`,
                                );

                            return `${indentation}[${foundImage.url} View embedded image]`;
                        } else
                            throw new Error(
                                `Expected image content to have either a url or id attribute in ${content.type}, got none: ${getPostLink(post)}`,
                            );
                    }
                    case 'orderedList':
                    case 'bulletList': {
                        return content
                            .content!.map((listItem) => {
                                if (listItem.type !== 'listItem')
                                    throw new Error(
                                        `Expected listItem content type in ${content.type}, got ${listItem.type}: ${getPostLink(post)}`,
                                    );

                                if (listItem.content?.length !== 1 || listItem.content[0].type !== 'paragraph')
                                    throw new Error(
                                        `Expected listItem in ${content.type} to have exactly one content item of type paragraph in ${content.type}, got ${listItem.content?.length ?? 'no'} item(s) with the first being ${listItem.content?.[0].type ?? 'none'}: ${getPostLink(post)}`,
                                    );

                                return `${indentation}${content.type === 'orderedList' ? '#' : '*'} ${formatParagraphContent(listItem.content[0], post, 0)}`;
                            })
                            .join('\n');
                    }
                    case 'listItem': {
                        if (content.content?.length !== 1 || content.content[0].type !== 'paragraph')
                            throw new Error(
                                `Expected listItem to have exactly one content item of type paragraph, got ${content.content?.length ?? 'no'} item(s) with the first being ${content.content?.[0].type ?? 'none'}: ${getPostLink(post)}`,
                            );

                        return `${indentation}* ${formatParagraphContent(content.content[0], post, 0)}`;
                    }
                    case 'code_block': {
                        if (content.content?.length !== 1 || content.content[0].type !== 'text')
                            throw new Error(
                                `Expected code_block to have exactly one content item of type text, got ${content.content?.length ?? 'no'} item(s) with the first being ${content.content?.[0].type ?? 'none'}: ${getPostLink(post)}`,
                            );

                        if (content.content[0].marks)
                            throw new Error(
                                `Expected code_block content to have no marks, got ${content.content[0].marks.length} mark(s): ${getPostLink(post)}`,
                            );

                        return `${indentation}<pre><code>${content.content[0].text}</code></pre>`;
                    }
                    default: {
                        throw new Error(`Unsupported JSON model content type \`${content.type}\`: ${getPostLink(post)}`);
                    }
                }
            })
            // For adjacent paragraphs with text, add an extra line between them
            .flatMap((content, index, array) => {
                return index > 0 &&
                    content.trim() !== '' &&
                    array[index - 1].trim() !== '' &&
                    !content.startsWith(':') &&
                    !array[index - 1].startsWith(':')
                    ? ['', content]
                    : content;
            })
            .join('\n')
    );
}

/**
 * Formats a comment signature with the given user and timestamp.
 * @param user The user who made the comment.
 * @param anon Whether the comment was made by an anonymous user.
 * @param timestamp The timestamp of the comment.
 * @param mwn The Mwn instance, used for formatting the timestamp.
 */
function formatSignature(user: string, anon: boolean, timestamp: number, mwn: Mwn) {
    const userLink = anon ? `[[Special:Contributions/${user}|${user}]]` : `[[User:${user}|${user}]]`;
    const talkLink = `[[User talk:${user}|talk]]`;

    const formattedTimestamp = new mwn.Date(timestamp).format('HH:mm, D MMMM YYYY [(UTC)]', 'utc');

    return `${userLink} (${talkLink}) ${formattedTimestamp}`;
}

function formatLink(href: string, title: string) {
    if (href.startsWith('/')) href = `https://hypixel-skyblock.fandom.com${href}`;
    if (href.startsWith('Http')) href = href.replace(/^Http/, 'http');

    if (href.includes('youtu.be')) {
        const url = new URL(href);

        const newSearchParameters = new URLSearchParams();
        newSearchParameters.set('v', url.pathname.slice(1));
        for (const [key, value] of url.searchParams) newSearchParameters.set(key, value);

        const newUrl = `https://www.youtube.com/watch?${newSearchParameters.toString()}`;

        href = newUrl;
    }

    if (
        /^https?:\/\/(hypixel-)?skyblock\.fandom\.com(\/wiki)?\/[^&?]+$/.test(href) &&
        ![
            '/f/p/',
            '/f/u/',
            'Special:AllMaps',
            'Special:Announcements',
            'Special:CloseMyAccount',
            'Special:Community',
            'Special:CreateBlogListingPage',
            'Special:DiscussionsAbuseFilter',
            'Special:DiscussionsLog',
            'Special:DownloadYourData',
            'Special:InfoboxBuilder',
            'Special:Insights',
            'Special:JSPages',
            'Special:MapEditor',
            'Special:QuickAnswers',
            'Special:Reports',
            'Special:SearchCommunity',
            'Special:SocialActivity',
            'Special:TagsReport',
            'Special:ThemeDesigner',
            'Special:UserRenameTool',
            'Special:Forum',
        ].some((string) => href.includes(string))
    ) {
        const linkedPageName = /^https?:\/\/(?:hypixel-)?skyblock\.fandom\.com(?:\/wiki)?\/([^&?]+)$/.exec(href)![1];

        let link = decodeURIComponent(linkedPageName).replaceAll('_', ' ');
        if (link.startsWith('Category:') || link.startsWith('File:') || link.startsWith('Image:')) link = `:${link}`;
        const formattedTitle = title.replace(/^https?:\/\/(hypixel-)?skyblock\.fandom\.com(\/wiki)?\//, '');
        return `[[${link === formattedTitle ? link : `${link}|${formattedTitle}`}]]`;
    } else if (/^https?:\/\/[\da-z-]+\.fandom\.com(\/wiki)?\/[^&?]+$/.test(href) && !href.includes('/f/p/') && !href.includes('/f/u/')) {
        const urlData = /^https?:\/\/([\da-z-]+)\.fandom\.com(?:\/wiki)?\/([^&?]+)$/.exec(href)!;
        const [, subdomain, linkedPageName] = urlData;
        return `[[fandom:${subdomain}:${decodeURIComponent(linkedPageName).replaceAll('_', ' ')}|${title}]]`;
    } else if (/^https?:\/\/en\.wikipedia\.org(\/wiki)?\/([Ww][Pp]|[Ww]ikipedia)[^&?]+$/.test(href)) {
        const linkedPageName = /^https?:\/\/en\.wikipedia\.org(?:\/wiki)?\/([Ww][Pp]|[Ww]ikipedia)([^&?]+)$/.exec(href)![1];
        return `[[WP:${decodeURIComponent(linkedPageName).replaceAll('_', ' ')}|${title}]]`;
    } else if (/^https?:\/\/en\.wikipedia\.org(\/wiki)?\/[^&?]+$/.test(href)) {
        const linkedPageName = /^https?:\/\/en\.wikipedia\.org(?:\/wiki)?\/([^&?]+)$/.exec(href)![1];
        return `[[w:${decodeURIComponent(linkedPageName).replaceAll('_', ' ')}|${title}]]`;
    } else if (/^https?:\/\/(www\.)mediawiki\.org(\/wiki)?\/[^&?]+$/.test(href)) {
        const linkedPageName = /^https?:\/\/(www\.)mediawiki\.org(?:\/wiki)?\/([^&?]+)$/.exec(href)![1];
        return `[[mw:${decodeURIComponent(linkedPageName).replaceAll('_', ' ')}|${title}]]`;
    } else {
        if (
            href.includes('skyblock.fandom.com') &&
            !['replyId', 'commentId', 'threadId', 'Message_Wall', 'User_blog', 'f/p/', 'f/u/'].some((string) => href.includes(string))
        )
            href = href.replaceAll(
                /https?:\/\/(?:hypixel-)?skyblock\.fandom\.com(?:\/wiki)?\//g,
                'https://hypixel-skyblock.minecraft.wiki/',
            );

        return `[${href} ${title}]`;
    }
}

function formatImage(content: string) {
    const imageName = /<img.+?data-image-name="(.+?)".*?\/>/.exec(content)![1];
    const imageCaption = /<p class="caption">(.*?)<\/p>/.exec(content)?.[1];

    return `[[File:${imageName}|thumb${imageCaption ? `|${imageCaption}` : ''}]]`;
}

function formatRenderedContent(renderedContent: string, depth: number) {
    const indentation = ':'.repeat(depth);

    renderedContent = renderedContent
        .replaceAll(/^:/g, '&#58;')
        .replaceAll(/^==/g, '&#61;=')
        .replaceAll(/<p(?: class="mw-empty-elt")?>(.*?)\n?<\/p>/gs, (_, paragraphContent: string) =>
            paragraphContent
                .split('\n')
                .map((line) => `${line ? indentation : ''}${line}\n`)
                .join(''),
        )
        .replaceAll(/<i>(.*?)<\/i>/g, "''$1''")
        .replaceAll(/<b>(.*?)<\/b>/g, "'''$1'''")
        .replaceAll(/<a.*?href="(.*?)".*?>(.*?)<\/a>/g, (fullMatch, href: string, linkText: string) =>
            formatLink(href.replaceAll('&#39;', "'"), linkText),
        )
        .replaceAll(/<a.*?title="(.*?) \(page does not exist\)".*?>(.*?)<\/a>/g, (fullMatch, title: string, linkText: string) =>
            formatLink(`/wiki/${title}`, linkText),
        )
        .replaceAll(/<figure.*?>(.*?)<\/figure>/g, (fullMatch, figureContent: string) => {
            return formatImage(figureContent);
        })
        .replaceAll(/<(h\d.*?)>/g, '&lt;$1&gt;')
        .replaceAll('<br />', '')
        .replaceAll(/<(\/)?font/g, '<$1span')
        .replaceAll(/<([ou]l)>(.*?)<\/\1>/gs, (fullMatch, listType: string, listContent: string) => {
            return listContent.replaceAll(/<li>(.*?)<\/li>/g, `${indentation}${listType === 'ol' ? '#' : '*'} $1`);
        })
        .replaceAll(/<\/?(li|ul)>/g, '') // Strip any leftover list elements
        .replaceAll(/<img(.*?)\/>/g, '&lt;img$1/&gt;'); // Escape any images that weren't created normally

    if (/<(?!center|big|span|div|svg|use|code|pre|abbr|sup|sub|s|dl|dd|dt|hr|table|tbody|th|tr|td)[a-z]/.test(renderedContent)) {
        console.log(renderedContent);
        throw new Error(
            `A post contains unsupported HTML tags: ${renderedContent
                .match(/<(?!center|big|span|div|svg|use|code|pre|abbr|sup|sub|s|dl|dd|dt|hr|table|tbody|th|tr|td)([a-z]+)/g)!
                .map((fullMatch) => fullMatch.slice(1))
                .join(', ')}`,
        );
    }

    return escapeMarkup(renderedContent, false);
}

function formatPost(post: DocPost, depth: number, mwn: Mwn) {
    const { jsonModel, renderedContent } = post;

    if (!jsonModel && !renderedContent) throw new Error(`Post missing both jsonModel and renderedContent: ${getPostLink(post)}`);

    let content = jsonModel
        ? formatJsonModel(JSON.parse(jsonModel) as JsonModel, post, depth)
        : formatRenderedContent(renderedContent!, depth);

    const signature = formatSignature(
        post.creatorIp ? post.creatorIp.replace(/^\//, '') : post.createdBy.name!,
        !!post.creatorIp,
        post.creationDate.epochSecond * 1000,
        mwn,
    );

    content += content.length > 0 && !content.endsWith('\n') ? ` ${signature}` : `${':'.repeat(depth)}${signature}`;

    return content;
}

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

export const USES_FANDOM_API = true;
