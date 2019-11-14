import { PlaylistItem } from "./playlist-item.model"

/**
 * Packet sent to clients for video sync
 */
export class SyncPacket {
    /**
     * The box Document ID
     *
     * @type {string}
     * @memberof SyncPacket
     */
    public box: string

    /**
     * The video to play to ensure sync
     *
     * @type {PlaylistItem}
     * @memberof SyncPacket
     */
    public item: PlaylistItem
}
