/* eslint-disable no-await-in-loop */

import { type ApiQueryResponse, type LogEvent, Mwn } from 'mwn';
import {
    FANDOM_LINK_PREFIX_REGEX,
    FANDOM_LINK_REGEX,
    FANDOM_WIKI_URL,
    MEDIAWIKI_LINK_REGEX,
    NAMESPACES_REQUIRING_COLONS,
    NON_REPLACEABLE_FANDOM_LINK_REGEX,
    REPLACEABLE_FANDOM_LINK_REGEX,
    WIKI_URL,
    WIKIPEDIA_LINK_REGEX,
    WIKIPEDIA_WIKIPEDIA_LINK_REGEX,
} from './constants';
import { cacheData, getCache } from './utilities';

/**
 * Gets all pages in a given namespace.
 * @param mwn The Mwn instance.
 * @param namespace The namespace to get pages from.
 */
export async function getAllPagesInNamespace(mwn: Mwn, namespace: number) {
    return (
        (await mwn.continuedQuery({
            action: 'query',
            list: 'allpages',
            apnamespace: namespace,
            aplimit: 'max',
        })) as ApiQueryResponse[]
    ).flatMap(({ query }) => query.allpages!);
}

/**
 * Gets the latest revisions for a list of pages.
 * @param mwn The Mwn instance.
 * @param pages The pages to get revisions for.
 */
export async function getAllPagesWithLatestRevision(mwn: Mwn, pages: { title: string }[]) {
    return (
        (await mwn.massQuery({
            action: 'query',
            prop: 'revisions',
            titles: pages.map((page) => page.title),
            rvprop: ['timestamp', 'user', 'content'],
            rvslots: 'main',
        })) as ApiQueryResponse[]
    ).flatMap(({ query }) => query.pages!);
}

/**
 * Gets a mapping of renamed users on the Fandom wiki. This is determined by Message Wall moves, thus it may not catch all renamed users.
 * @param mwn The Mwn instance.
 */
export async function getRenamedFandomUsers(mwn: Mwn) {
    return (
        getCache<Record<string, string>>('renamed-fandom-users') ??
        cacheData(
            'renamed-fandom-users',
            Object.fromEntries(
                (
                    (await mwn.continuedQuery({
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
            ),
        )
    );
}

/**
 * Gets all users on the wiki.
 * @param mwn The Mwn instance.
 */
export async function getAllUsers(mwn: Mwn) {
    return (
        getCache<string[]>('all-users') ??
        cacheData(
            'all-users',
            (
                (await mwn.continuedQuery(
                    {
                        action: 'query',
                        list: 'allusers',
                        aulimit: 'max',
                    },
                    500,
                )) as ApiQueryResponse[]
            )
                .flatMap(({ query }) => (query as unknown as { allusers: { name: string }[] }).allusers)
                .map((user) => user.name),
        )
    );
}

interface WikiaControllerDiscussionPostGetPostsApiResponse {
    _links: Links; // eslint-disable-line @typescript-eslint/naming-convention
    postCount: string;
    readOnlyMode: boolean;
    _embedded: Embedded; // eslint-disable-line @typescript-eslint/naming-convention
}

interface Links {
    first: Link[];
    last: Link[];
    previous?: Link[];
    next?: Link[];
}

interface Link {
    href: string;
}

interface Embedded {
    'count': [{ ARTICLE_COMMENT: number; FORUM: number; WALL: number; total: number }];
    'wallOwners'?: { userId: string; wallContainerId: string }[];
    'contributors': { count: number; userInfo: UserInformation[] }[];
    'doc:posts': DiscussionPost[]; // eslint-disable-line @typescript-eslint/naming-convention
}

export interface DiscussionPost {
    _links: { permalink: Link[] }; // eslint-disable-line @typescript-eslint/naming-convention
    createdBy: UserInformation;
    creationDate: CreationDate;
    creatorId: string;
    creatorIp: string;
    forumId: string;
    forumName: string | null;
    id: string;
    isContentSuppressed: boolean;
    isDeleted: boolean;
    isEditable: boolean;
    isLocked: boolean;
    isReply: boolean;
    isReported: boolean;
    jsonModel: string | null;
    latestRevisionId: string;
    modificationDate: CreationDate | null;
    position: number;
    rawContent: string;
    renderedContent: string | null;
    requesterId: string;
    siteId: string;
    threadCreatedBy: UserInformation;
    threadId: string;
    title: string | null;
    upvoteCount: number;
    _embedded: Embedded; // eslint-disable-line @typescript-eslint/naming-convention
    funnel?: 'TEXT';
    lastEditedBy?: UserInformation;
}

interface Embedded {
    attachments: Attachment[];
    thread: Thread[];
    latestRevision: LatestRevision[];
    openGraph?: OpenGraph[];
    contentImages?: ContentImage[];
}

interface Attachment {
    atMentions: UserInformation[];
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
    mediaType: MediaType | null;
}

enum MediaType {
    ImageGif = 'image/gif',
    ImageJpeg = 'image/jpeg',
    ImagePng = 'image/png',
    ImageWebp = 'image/webp',
}

interface OpenGraph {
    id: string;
    postRevisionId: number;
    siteId: number;
    url: string;
    siteName: string | null;
    title: string | null;
    type: Type;
    imageUrl: string | null;
    description: string | null;
    originalUrl: string | null;
    videoUrl: string | null;
    videoSecureUrl: string | null;
    videoType: string | null;
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
    FeedsPoll = 'feeds.POLL',
    FeedsText = 'feeds.TEXT',
    Image = 'image',
    Object = 'object',
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
    jsonModel: string | null;
    postId: string;
    rawContent: string;
    renderedContent: string | null;
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
    title: string | null;
}

export enum ContainerType {
    Wall = 'WALL',
    ArticleComment = 'ARTICLE_COMMENT',
    Forum = 'FORUM',
}

export interface FirstPost {
    id: string;
    renderedContent: string | null;
    jsonModel: string | null;
    createdBy: UserInformation;
    title: string | null;
    attachments: Attachment;
    threadId: string;
    createdByIp: string | null;
}

interface UserInformation {
    id: string;
    avatarUrl: string | null;
    name: string | null;
    badgePermission: string;
}

export interface JsonModel {
    type: string;
    content: JsonModelContent[];
}

export interface JsonModelContent {
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
        attrs?: { href: string | null; title?: string | null; userId?: string; userName?: string };
    }[];
}

/**
 * Gets all discussion posts in a given container type on the Fandom wiki using the Wikia controller API.
 * @param postContainerType The container type to get discussion posts from.
 */
export async function getAllFandomDiscussionPosts(postContainerType: ContainerType) {
    const cacheKey = `fandom-discussion-posts-${postContainerType}`;

    const cachedData = getCache<DiscussionPost[]>(cacheKey);

    if (cachedData) return cachedData;

    const apiUrl = new URL(`${FANDOM_WIKI_URL}/wikia.php`);
    apiUrl.searchParams.set('controller', 'DiscussionPost');
    apiUrl.searchParams.set('method', 'getPosts');
    apiUrl.searchParams.set('containerType', postContainerType);
    apiUrl.searchParams.set('limit', '100');

    let currentPage = 0;

    const result = [];

    while (true) {
        Mwn.log(`[i] Getting ${postContainerType} discussion post API page ${currentPage}`);

        apiUrl.searchParams.set('page', currentPage.toString());

        const response = await fetch(apiUrl);

        if (!response.ok) throw new Error(`Wikia controller API request failed with status ${response.status}: ${response.statusText}`);

        const responseData = (await response.json()) as WikiaControllerDiscussionPostGetPostsApiResponse;

        result.push(...responseData._embedded['doc:posts']);

        if (!('next' in responseData._links)) break;

        await new Promise((resolve) => setTimeout(resolve, 200));

        currentPage++;
    }

    return cacheData(cacheKey, result);
}

/**
 * Formats a link to a discussion post for use in error messages.
 * @param post The discussion post to format a link for.
 */
function getPostLink(post: DiscussionPost) {
    return post.forumName?.includes('Message Wall')
        ? `${FANDOM_WIKI_URL}/wiki/Message_Wall:${post.forumName.replace(' Message Wall', '')}?threadId=${post.threadId}#${post.id}`
        : `forumId: ${post.forumId}, threadId: ${post.threadId}, commentId: ${post.id}`;
}

/**
 * Escapes wikitext markup in a string, and optionally also escapes some HTML markup.
 * @param string The string to escape.
 * @param stripHtmlMarkup Whether to escape HTML markup in addition to wikitext markup. Defaults to `true`.
 */
function escapeMarkup(string: string, stripHtmlMarkup = true) {
    string = string.replaceAll('~~~', '~~&#126;').replaceAll('{', '&#123;').replaceAll('}', '&#125;');

    if (stripHtmlMarkup) string = string.replaceAll('<', '&lt;').replaceAll('>', '&gt;');

    return string;
}

/**
 * Formats the content of a paragraph in the JSON model into wikitext.
 * @param content The JSON model content of the paragraph to format.
 * @param post The discussion post the paragraph belongs to, used for error messages.
 * @param depth The depth of the post in the thread, used for indentation.
 */
function formatParagraphContent(content: JsonModelContent, post: DiscussionPost, depth: number) {
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
                                    output = formatLink(mark.attrs!.href!, content.text);
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
                                case 'mention': {
                                    output = `@[[User:${mark.attrs!.userName!}|${mark.attrs!.userName!}]]`;
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

/**
 * Formats the JSON model of a post into wikitext.
 * @param jsonModel The JSON model to format.
 * @param post The discussion post the JSON model belongs to, used for error messages.
 * @param depth The depth of the post in the thread, used for indentation.
 */
function formatJsonModel(jsonModel: JsonModel, post: DiscussionPost, depth: number) {
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

/**
 * Formats a link and its title into appropriate wikitext.
 * @param href The URL of the link.
 * @param title The title of the link, used as the link text.
 */
function formatLink(href: string, title: string) {
    if (href.startsWith('/')) href = `${FANDOM_WIKI_URL}${href}`;
    if (href.startsWith('Http')) href = href.replace(/^Http/, 'http');

    if (href.includes('youtu.be')) {
        const url = new URL(href);

        const newSearchParameters = new URLSearchParams();
        newSearchParameters.set('v', url.pathname.slice(1));
        for (const [key, value] of url.searchParams) newSearchParameters.set(key, value);

        const newUrl = `https://www.youtube.com/watch?${newSearchParameters.toString()}`;

        href = newUrl;
    }

    if (REPLACEABLE_FANDOM_LINK_REGEX.test(href) && !NON_REPLACEABLE_FANDOM_LINK_REGEX.test(href)) {
        const linkedPageName = REPLACEABLE_FANDOM_LINK_REGEX.exec(href)![1];

        let link = decodeURIComponent(linkedPageName).replaceAll('_', ' ');
        if (NAMESPACES_REQUIRING_COLONS.some((namespace) => link.startsWith(`${namespace}:`))) link = `:${link}`;
        else if (link.startsWith('Message Wall:')) link = link.replace('Message Wall', 'User talk');
        else if (link.startsWith('User blog:')) link = link.replace(/User[ _]blog:(.+?)\/(.+?)([\]|])/, 'User:$1/blogs/$2$3');

        const formattedTitle = title.replace(FANDOM_LINK_PREFIX_REGEX, '');

        return `[[${link === formattedTitle ? link : `${link}|${formattedTitle}`}]]`;
    } else if (FANDOM_LINK_REGEX.test(href) && !NON_REPLACEABLE_FANDOM_LINK_REGEX.test(href)) {
        const urlData = FANDOM_LINK_REGEX.exec(href)!;
        const [, subdomain, linkedPageName] = urlData;
        return `[[fandom:${subdomain}:${decodeURIComponent(linkedPageName).replaceAll('_', ' ')}|${title}]]`;
    } else if (WIKIPEDIA_WIKIPEDIA_LINK_REGEX.test(href)) {
        const linkedPageName = WIKIPEDIA_WIKIPEDIA_LINK_REGEX.exec(href)![1];
        return `[[WP:${decodeURIComponent(linkedPageName).replaceAll('_', ' ')}|${title}]]`;
    } else if (WIKIPEDIA_LINK_REGEX.test(href)) {
        const linkedPageName = WIKIPEDIA_LINK_REGEX.exec(href)![1];
        return `[[w:${decodeURIComponent(linkedPageName).replaceAll('_', ' ')}|${title}]]`;
    } else if (MEDIAWIKI_LINK_REGEX.test(href)) {
        const linkedPageName = MEDIAWIKI_LINK_REGEX.exec(href)![1];
        return `[[mw:${decodeURIComponent(linkedPageName).replaceAll('_', ' ')}|${title}]]`;
    } else {
        if (
            href.includes('skyblock.fandom.com') &&
            !['replyId', 'commentId', 'threadId'].some((string) => href.includes(string)) &&
            !NON_REPLACEABLE_FANDOM_LINK_REGEX.test(href)
        )
            href = href.replaceAll(FANDOM_LINK_PREFIX_REGEX, `${WIKI_URL}/`);

        return `[${href} ${title}]`;
    }
}

/**
 * Formats an HTML image from renderedContent into wikitext.
 * @param content The HTML content containing the image tag and optionally a caption.
 */
function formatImage(content: string) {
    const imageName = /<img.+?data-image-name="(.+?)".*?\/>/.exec(content)![1];
    const imageCaption = /<p class="caption">(.*?)<\/p>/.exec(content)?.[1];

    return `[[File:${imageName}|thumb${imageCaption ? `|${imageCaption}` : ''}]]`;
}

/**
 * Formats the renderedContent of a post into wikitext.
 * @param renderedContent The renderedContent to format.
 * @param depth The depth of the post in the thread, used for indentation.
 */
function formatRenderedContent(renderedContent: string, depth: number) {
    const indentation = ':'.repeat(depth);

    renderedContent = renderedContent
        .replaceAll(/^:/g, '&#58;')
        .replaceAll(/^==/g, '&#61;=')
        .replaceAll(/<p(?: class="mw-empty-elt")?>(.*?)\n?<\/p>/gs, (fullMatch, paragraphContent: string) =>
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

/**
 * Formats a discussion post into wikitext.
 * @param post The discussion post to format.
 * @param depth The depth of the post in the thread, used for indentation.
 * @param mwn The Mwn instance, used for formatting timestamps in signatures.
 */
export function formatPost(post: DiscussionPost, depth: number, mwn: Mwn) {
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
