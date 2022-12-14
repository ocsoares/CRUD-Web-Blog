import { Request, Response, NextFunction } from 'express';
import path from 'path';
import bcrypt from 'bcrypt';
import { AccountRepository } from '../repositories/AccountRepository';
import { LogsAdminRepository } from '../repositories/LogsAdmin';
import { Account } from '../database/entity/Account';

const __dirname = path.resolve();

const administrationDashboardEJS = path.join(__dirname, '/src/views/admin-layouts/dashboard.ejs');
const createANewUserEJS = path.join(__dirname, 'src/views/admin-layouts/create-new-user.ejs');
export class AdminController {
    async searchUser(req: Request, res: Response, next: NextFunction) {
        const searchReqBody = '%' + req.body.search + '%'; // '%' por causa do LIKE do SQL !! <<

        try {
            // Tive que por o body entre '' por causa do SQL !! <<
            const searchUserDatabase = await AccountRepository.query(`SELECT * FROM accounts WHERE username LIKE '${searchReqBody}' OR email LIKE '${searchReqBody}' OR type LIKE '${searchReqBody}' OR created_date LIKE '${searchReqBody}'`);

            // Lenght NESSE caso, mostra a QUANTIDADE de Resultados achados no Banco de Dados pela Pesquisa !! <<
            // Caso NÃO achar nenhum Resultado no Banco de Dados, RETORNA Erro e Length 0 !! <<
            if (searchUserDatabase.length === 0) {
                req.flash('errorFlash', 'Não foi possível encontrar o usuário !');
                return res.redirect('/administration');
            }

            // Fiz essa Variável porque é o NOME da Variável do EJS responsável por MOSTRAR os Usuários !! <<
            const databaseUsers = searchUserDatabase;

            return res.render(administrationDashboardEJS, { databaseUsers });
        }
        catch (error) {
            console.log(error);
            req.flash('errorFlash', 'Não foi possível encontrar o usuário !');
            return res.redirect('/administration');
        }
    }

    async createANewUser(req: Request, res: Response, next: NextFunction) {
        const { username, email, password, confirm_password, comment } = req.body;
        const { id } = req.JWTLogged;

        const regexEmail = new RegExp("([!#-'*+/-9=?A-Z^-~-]+(\.[!#-'*+/-9=?A-Z^-~-]+)*|\"\(\[\]!#-[^-~ \t]|(\\[\t -~]))+\")@([!#-'*+/-9=?A-Z^-~-]+(\.[!#-'*+/-9=?A-Z^-~-]+)*|\[[\t -Z^-~]*])");

        const searchCurrentAdmin = await AccountRepository.findOneBy({ id, type: 'admin' });

        const searchUserByUsername = await AccountRepository.findOneBy({ username });
        const searchUserByEmail = await AccountRepository.findOneBy({ email });

        if (!username || !email || !password || !confirm_password || !comment) {
            req.flash('errorFlash', 'Preencha todos os campos !');
            return res.redirect('/administration/createuser');
        }

        if (searchUserByUsername) {
            req.flash('errorFlash', 'Nome de usuário já cadastrado !');
            return res.redirect('/administration/createuser');
        }

        if (searchUserByEmail) {
            req.flash('errorFlash', 'Email já cadastrado !');
            return res.redirect('/administration/createuser');
        }

        if (!email.match(regexEmail)) {
            req.flash('errorFlash', 'Digite um email válido !');
            return res.redirect('/administration/createuser');
        }

        if (password !== confirm_password) {
            req.flash('errorFlash', 'As senhas não coincidem !');
            return res.redirect('/administration/createuser');
        }

        const encryptPassword = await bcrypt.hash(password, 10);

        if (!encryptPassword) {
            req.flash('errorFlash', 'Aconteceu algo inesperado no servidor !');
            return res.redirect('/administration');
        }

        const currentDate = new Date().toLocaleDateString('pt-BR');

        const createNewUser = AccountRepository.create({
            username,
            email,
            password: encryptPassword,
            type: 'user', // Um Admin NÃO PODE criar outro ADMIN, pode APENAS criar novos Usuários !! <<
            created_date: currentDate
        });

        await AccountRepository.save(createNewUser);

        const saveCommentsThisAccount = LogsAdminRepository.create({
            username,
            email,
            comment: `createAccount by admin = ${searchCurrentAdmin?.username}: ` + comment,
            date: currentDate
        });

        await LogsAdminRepository.save(saveCommentsThisAccount);

        req.flash('successFlash', 'Usuário criado com sucesso !');
        return res.redirect('/administration');
    }

    // Deixei tudo Opcional aqui porque o Admin pode querer atualizar apenas UM campo, ou Dois, etc... !! <<
    async editUser(req: Request, res: Response, next: NextFunction) {
        const { username, email, password, confirm_password, comment } = req.body;
        console.log('REQ.BODY:', req.body);

        const { idAccount } = req.params;
        const { id } = req.JWTLogged;

        const regexEmail = new RegExp("([!#-'*+/-9=?A-Z^-~-]+(\.[!#-'*+/-9=?A-Z^-~-]+)*|\"\(\[\]!#-[^-~ \t]|(\\[\t -~]))+\")@([!#-'*+/-9=?A-Z^-~-]+(\.[!#-'*+/-9=?A-Z^-~-]+)*|\[[\t -Z^-~]*])");

        const searchCurrentAdmin = await AccountRepository.findOneBy({ id, type: 'admin' });

        const searchUserByUsername = await AccountRepository.findOneBy({ username });
        const searchUserByEmail = await AccountRepository.findOneBy({ email });

        const reallyUser = await AccountRepository.findOneBy({ id: Number(idAccount) });

        // Verificação aqui no Backend (POST) e no Frontend (na Rota - GET) !! << 
        if (reallyUser?.type === 'admin') {
            req.flash('errorFlash', 'Não é possível editar um administrador !');
            return res.redirect('/administration');
        }

        if (!username && !email && !password && !confirm_password && !comment) {
            req.flash('errorFlash', 'Preencha algum campo !');
            return res.redirect(`/administration/edituser/${idAccount}`);
        }

        if (searchUserByUsername?.username) {
            req.flash('errorFlash', 'Nome de usuário já cadastrado !');
            return res.redirect(`/administration/edituser/${idAccount}`);
        }

        if (searchUserByEmail?.email) {
            req.flash('errorFlash', 'Email já cadastrado !');
            return res.redirect(`/administration/edituser/${idAccount}`);
        }

        if (email) {
            if (!email.match(regexEmail)) {
                req.flash('errorFlash', 'Digite um email válido !');
                return res.redirect(`/administration/edituser/${idAccount}`);
            }
        }

        if (password || confirm_password) {
            if (password !== confirm_password || confirm_password !== password) {
                req.flash('errorFlash', 'As senhas não coincidem !');
                return res.redirect(`/administration/edituser/${idAccount}`);
            }

            const encryptPassword = await bcrypt.hash(password, 10);
            req.outCondition = encryptPassword;

            if (!encryptPassword) {
                req.flash('errorFlash', 'Aconteceu um erro inesperado no servidor !');
                return res.redirect('/administration');
            }
        }

        const checkIfPasswordExists = await bcrypt.compare(password, reallyUser?.password as string);

        if (checkIfPasswordExists) {
            req.flash('errorFlash', 'A senha digitada já está cadastrada nessa conta. Tente uma senha diferente !');
            return res.redirect(`/administration/edituser/${idAccount}`);
        }

        const encryptPassword = req.outCondition;

        if (!comment) {
            req.flash('errorFlash', 'Escreva algum comentário !');
            return res.redirect(`/administration/edituser/${idAccount}`);
        }

        if (comment && !username && comment && !email && comment && !password && comment && !confirm_password) {
            req.flash('errorFlash', 'Preencha algum campo !');
            return res.redirect(`/administration/edituser/${idAccount}`);
        }

        const currentDate = new Date().toLocaleDateString('pt-BR');

        await AccountRepository.update(idAccount, {
            username: username || reallyUser?.username,
            email: email || reallyUser?.email,
            password: encryptPassword || reallyUser?.password,
            created_date: currentDate
        });

        const saveCommentsThisAccount = LogsAdminRepository.create({
            id_real_account: Number(idAccount),
            username: username || reallyUser?.username,
            email: email || reallyUser?.email,
            date: currentDate,
            comment: `editAccount by admin = ${searchCurrentAdmin?.username}: ` + comment
        });

        await LogsAdminRepository.save(saveCommentsThisAccount);

        req.flash('successFlash', 'Conta atualizada com sucesso !');
        return res.redirect('/administration');
    }

    async deleteUser(req: Request, res: Response, next: NextFunction) {
        const { idAccount } = req.params;
        const { comment } = req.body;
        const { id } = req.JWTLogged;

        const searchCurrentAdmin = await AccountRepository.findOneBy({ id, type: 'admin' });

        const searchUserByID = await AccountRepository.findOneBy({ id: Number(idAccount) });

        if (searchUserByID?.type === 'admin') {
            req.flash('errorFlash', 'Não é possível deletar um administrador !');
            return res.redirect('/administration');
        }

        if (!comment) {
            req.flash('errorFlash', 'Forneça algum comentário !');
            return res.redirect(`/deleteuser/${idAccount}`);
        }

        await AccountRepository.delete(idAccount);

        const currentDate = new Date().toLocaleDateString('pt-BR');

        const saveLogsAdmin = LogsAdminRepository.create({
            id_real_account: Number(idAccount),
            username: searchUserByID?.username,
            email: searchUserByID?.email,
            date: currentDate,
            comment: `deleteAccount by admin = ${searchCurrentAdmin?.username}: ` + comment
        });

        await LogsAdminRepository.save(saveLogsAdmin);

        req.flash('successFlash', 'Conta deletada com sucesso !');
        return res.redirect('/administration');
    }
}