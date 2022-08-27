import { Request, Response, Router } from "express";
import { AccountController } from "../controllers/AccountController";
import { VerificationAccount } from "../controllers/VerificationsAccount";

const dashboardRoute = Router();

dashboardRoute.get('/dashboard', (req: Request, res: Response) => {
    res.json({message: 'LOGADO !'});
})

export default dashboardRoute;