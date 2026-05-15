/* eslint-disable no-await-in-loop */

import { type ApiQueryResponse, type LogEvent, Mwn } from 'mwn';
import { FANDOM_WIKI_URL } from './constants';
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

interface Embedded {
    'count': [{ ARTICLE_COMMENT: number; FORUM: number; WALL: number; total: number }];
    'wallOwners'?: { userId: string; wallContainerId: string }[];
    'contributors': { count: number; userInfo: { id: string; avatarUrl: null | string; name: string; badgePermission: string }[] }[];
    'doc:posts': DiscussionPost[]; // eslint-disable-line @typescript-eslint/naming-convention
}

export interface DiscussionPost {
    _links: { permalink: { href: string }[] }; // eslint-disable-line @typescript-eslint/naming-convention
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
    _embedded: Embedded; // eslint-disable-line @typescript-eslint/naming-convention
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
    FeedsPoll = 'feeds.POLL',
    FeedsText = 'feeds.TEXT',
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

export enum ContainerType {
    Wall = 'WALL',
    ArticleComment = 'ARTICLE_COMMENT',
    Forum = 'FORUM',
}

export interface FirstPost {
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
        attrs?: { href: string; title: null };
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

    return cacheData(cacheKey, result);
}
