import { PlaylistItem } from "./playlist-item.model";

export class Box {
    creator: string;
    description: string;
    lang: string;
    name: string;
    playlist: Array<PlaylistItem>;
    open: boolean;
}