export const WIKI_URL = 'https://hypixelskyblock.minecraft.wiki';
export const FANDOM_WIKI_URL = 'https://hypixel-skyblock.fandom.com';

export const EARLIEST_VALID_EDIT_TIMESTAMP = 1_776_701_820_000; // 12:17, April 20, 2026 (EST)

export const REPLACEABLE_FANDOM_LINK_REGEX = /^https?:\/\/(?:hypixel-)?skyblock\.fandom\.com(?:\/wiki)?\/([^&?]+)$/;
export const NON_REPLACEABLE_FANDOM_LINK_REGEX = /\.com(\/wiki)?\/[df]([&/?]|$)/;
export const FANDOM_LINK_REGEX = /^https?:\/\/([\da-z-]+)\.fandom\.com(?:\/wiki)?\/([^&?]+)$/;
export const WIKIPEDIA_WIKIPEDIA_LINK_REGEX = /^https?:\/\/en\.wikipedia\.org(?:\/wiki)?\/([Ww][Pp]|[Ww]ikipedia)([^&?]+)$/;
export const WIKIPEDIA_LINK_REGEX = /^https?:\/\/en\.wikipedia\.org(?:\/wiki)?\/([^&?]+)$/;
export const MEDIAWIKI_LINK_REGEX = /^https?:\/\/(?:www\.)?mediawiki\.org(?:\/wiki)?\/([^&?]+)$/;

export const FANDOM_LINK_PREFIX_REGEX = /https?:\/\/(?:hypixel-)?skyblock\.fandom\.com(?:\/wiki)?\//;

export const NAMESPACES_REQUIRING_COLONS = ['Category', 'File', 'Image'];

export const FANDOM_ONLY_SPECIAL_PAGES = [
    'Special:AllMaps',
    'Special:Announcements',
    'Special:CloseMyAccount',
    'Special:Community',
    'Special:CreateBlogListingPage',
    'Special:DiscussionsAbuseFilter',
    'Special:DiscussionsLog',
    'Special:DownloadYourData',
    'Special:Forum',
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
];

export enum FandomNamespace {
    Main = 0,
    Talk = 1,
    User = 2,
    UserTalk = 3,
    Project = 4,
    ProjectTalk = 5,
    File = 6,
    FileTalk = 7,
    MediaWiki = 8,
    MediaWikiTalk = 9,
    Template = 10,
    TemplateTalk = 11,
    Help = 12,
    HelpTalk = 13,
    Category = 14,
    CategoryTalk = 15,
    Forum = 110,
    ForumTalk = 111,
    Calculator = 112,
    CalculatorTalk = 113,
    Tutorial = 114,
    TutorialTalk = 115,
    Geojson = 420,
    GeojsonTalk = 421,
    UserBlog = 500,
    UserBlogComment = 501,
    Blog = 502,
    BlogTalk = 503,
    Module = 828,
    ModuleTalk = 829,
    MessageWall = 1200,
    Thread = 1201,
    MessageWallGreeting = 1202,
    Board = 2000,
    BoardThread = 2001,
    Topic = 2002,
    Map = 2900,
    MapTalk = 2901,
    Media = -2,
    Special = -1,
}

export enum Namespace {
    Main = 0,
    Talk = 1,
    User = 2,
    UserTalk = 3,
    Project = 4,
    ProjectTalk = 5,
    File = 6,
    FileTalk = 7,
    MediaWiki = 8,
    MediaWikiTalk = 9,
    Template = 10,
    TemplateTalk = 11,
    Help = 12,
    HelpTalk = 13,
    Category = 14,
    CategoryTalk = 15,
    Calculator = 112,
    CalculatorTalk = 113,
    Tutorial = 114,
    TutorialTalk = 115,

    /**
     * Namespace has been removed.
     * @deprecated
     */
    UserBlog = 500,

    /**
     * Namespace has been removed.
     * @deprecated
     */
    UserBlogComment = 501,
    Module = 828,
    ModuleTalk = 829,

    /**
     * Namespace has been removed.
     * @deprecated
     */
    MessageWall = 1200,

    /**
     * Namespace has been removed.
     * @deprecated
     */
    Thread = 1201,
    Bucket = 9592,
    BucketTalk = 9593,
    Media = -2,
    Special = -1,
}
