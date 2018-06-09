import { Request, Response, Router } from 'express';

export class AuthApi {
    public router: Router;

    constructor() {
        this.router = Router();
        this.init();
    }

    public init() {
        this.router.post("/", this.login);
    }

    public login(req: Request, res: Response) {

    }
}

const authApi = new AuthApi();
authApi.init();
export default authApi.router;