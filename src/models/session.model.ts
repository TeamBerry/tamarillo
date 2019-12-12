export interface IAuthSubject {
    _id: string
    name: string
    settings: {
        theme: 'light' | 'dark',
        picture: string
    }
}

export class Session {
    public bearer: any
    public subject: IAuthSubject
    public expiresIn: number | string
}
