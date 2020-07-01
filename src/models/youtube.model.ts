export interface YoutubeResponse {
    kind: string
    etag: string
    pageInfo: {
        totalResults: number
        resultsPerPage: number
    }
}

export interface YoutubeSearchListResponse extends YoutubeResponse {
    kind: 'youtube#searchListResponse'
    nextPageToken: string
    regionCode: string
    items: Array<SearchListResponseItem>
}

export interface YoutubeVideoListResponse extends YoutubeResponse {
    kind: 'youtube#videoListResponse'
    items: Array<VideoListResponseItem>
}

export interface SearchListResponseItem {
    kind: 'youtube#searchResult'
    etag: string
    id: {
        kind: 'youtube#video'
        videoId: string
    }
    snippet: {
        publishedAt: Date
        channelId: string
        title: string
        description: string
        thumbnails: VideoThumbnails
        channelTitle: string
        liveBroadcastContent: string
    }
}

export interface VideoListResponseItem {
    kind: 'youtube#video'
    etag: string
    id: string
    snippet?: {
        publishedAt: Date
        channelId: string
        title: string
        description: string
        thumbnails: VideoThumbnails
        channelTitle: string
        tags: Array<string>
        categoryId: string
        liveBroadcastContent: string
        defaultLanguage: string
        localized: {
            title: string
            description: string
        }
    }
    contentDetails?: {
        duration: string
        dimension: string
        definintion: string
        caption: string
        licensedContent: boolean
        projection: string
    }
    status?: {
        uploadStatus: 'deleted' | 'failed' | 'processed' | 'rejected' | 'uploaded'
        privacyStatus: 'private' | 'public' | 'unlisted'
        /**
         * This value indicates whether the video can be embedded on another website.
         *
         * @type {boolean}
         */
        embeddable: boolean
        /**
         * This value indicates whether the extended video statistics on the video's watch page are publicly viewable.
         * By default, those statistics are viewable, and statistics like a video's viewcount and ratings will still be
         * publicly visible even if this property's value is set to false.
         *
         * @type {boolean}
         */
        publicStatsViewable: boolean
        madeForKids: boolean
    }
}

export interface VideoThumbnails {
    default: {
        url: string
        width: number
        height: number
    }
    medium: {
        url: string
        width: number
        height: number
    }
    high: {
        url: string
        width: number
        height: number
    }
}
