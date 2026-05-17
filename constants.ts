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
