import { PlaylistItem } from "./playlist-item.model"

export class Box {
    public creator: string
    public description: string
    public lang: string
    public name: string
    public playlist: PlaylistItem[]
    public open: boolean
}
