export interface IAuthSubject {
    _id: string
    name: string
    mail: string
    settings: {
        theme: 'light' | 'dark'
        picture: string
        color: string
        isColorblind: boolean
        badge: string
    }
}

export class Session {
    public bearer: any
    public subject: IAuthSubject
    public expiresIn: number | string
}
