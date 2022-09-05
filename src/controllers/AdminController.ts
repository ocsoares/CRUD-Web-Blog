import { Request, Response, NextFunction } from 'express'
import path from 'path';
import bcrypt from 'bcrypt'
import { AccountRepository } from '../repositories/AccountRepository'
import { LogsAdminRepository } from '../repositories/SaveCommentsAdminRepository';

const __dirname = path.resolve();

const administrationDashboardEJS = path.join(__dirname, '/src/views/admin-layouts/dashboard.ejs');
const createANewUserEJS = path.join(__dirname, 'src/views/admin-layouts/create-new-user.ejs');

// Tentar permitir procurar pelo ID !! <<

// Tentar fazer um jeito para quando for para uma ROTA que NÃO existe, Redirecionar para uma Existente e mostrar Alerta !! << 

// Fazer um jeito de quando ATUALIZAR alguma coisa da Conta, DESCONECTAR automaticamente (se estiver logado) (+ Segurança, óbvio) !! <<

// Fazer o COMENTÁRIO ser OBRIGATÓRIO com NO MÍNIMO 1 CAMPO !! <<

export class AdminController{
    async searchUser(req: Request, res: Response, next: NextFunction){
        const searchReqBody = req.body.search + '%'; // '%' por causa do LIKE do SQL !! <<

        try{
                                                                                // Tive que por o body entre '' por causa do SQL !! <<
        const searchUserDatabase = await AccountRepository.query(`SELECT * FROM accounts WHERE username LIKE '${searchReqBody}' OR email LIKE '${searchReqBody}' OR type LIKE '${searchReqBody}' OR created_date LIKE '${searchReqBody}'`);
        
            // Caso não exista, AUTOMATICAMENTE da Erro e cai no Catch !! <<
        if(!searchUserDatabase){

                // Logo, ISSO aqui NÃO é necessário, Coloquei só por Precaução !! <<
            req.flash('errorFlash', 'Não foi possível encontrar o usuário !');
            return res.redirect('/administration');
        }

        // Fiz essa Variável porque é o NOME da Variável do EJS responsável por MOSTRAR os Usuários !! <<
        const databaseUsers = searchUserDatabase;

        return res.render(administrationDashboardEJS, {databaseUsers});
        }
        catch(error){   
            console.log(error); 
            req.flash('errorFlash', 'Não foi possível encontrar o usuário !');
            return res.redirect('/administration');
        }
    }

    async createANewUser(req: Request, res: Response, next: NextFunction){
        const { username, email, password, confirm_password, comment } = req.body;

        const regexEmail = new RegExp("([!#-'*+/-9=?A-Z^-~-]+(\.[!#-'*+/-9=?A-Z^-~-]+)*|\"\(\[\]!#-[^-~ \t]|(\\[\t -~]))+\")@([!#-'*+/-9=?A-Z^-~-]+(\.[!#-'*+/-9=?A-Z^-~-]+)*|\[[\t -Z^-~]*])");

        const searchUserByUsername = await AccountRepository.findOneBy({username});
        const searchUserByEmail = await AccountRepository.findOneBy({email});

        if(!username || !email || !password || !confirm_password || !comment){
            req.flash('errorFlash', 'Preencha todos os campos !');
            return res.redirect('/createuser');
        }
        
        if(searchUserByUsername){
            req.flash('errorFlash', 'Nome de usuário já cadastrado !');
            return res.redirect('/createuser');
        }

        if(searchUserByEmail){
            req.flash('errorFlash', 'Email já cadastrado !');
            return res.redirect('/createuser');
        }

        if(!email.match(regexEmail)){
            req.flash('errorFlash', 'Digite um email válido !');
            return res.redirect('/createuser');
        }

        if(password !== confirm_password){
            req.flash('errorFlash', 'As senhas não coincidem !');
            return res.redirect('/createuser');
        }

        const encryptPassword = await bcrypt.hash(password, 10);

        if(!encryptPassword){
            req.flash('errorFlash', 'Aconteceu algo inesperado no servidor !');
            return res.redirect('/administration');
        }

        const currentDate = new Date().toLocaleDateString('pt-BR');

        const createNewUser = AccountRepository.create({
            username,
            email,
            password: encryptPassword,
            type: 'user',
            created_date: currentDate
        });

        await AccountRepository.save(createNewUser);

        const saveCommentsThisAccount = LogsAdminRepository.create({
            username,
            email,
            comment: 'createAccount: ' + comment,
            date: currentDate
        });

        await LogsAdminRepository.save(saveCommentsThisAccount);

        req.flash('successFlash', 'Usuário criado com sucesso !');
        return res.redirect('/administration');
    }

        // Deixei tudo Opcional aqui porque o Admin pode querer atualizar apenas UM campo, ou Dois, etc... !! <<
    async editUser(req: Request, res: Response, next: NextFunction){
        const { username, email, password, confirm_password, comment } = req.body;
        const { idAccount } = req.params;

        const regexEmail = new RegExp("([!#-'*+/-9=?A-Z^-~-]+(\.[!#-'*+/-9=?A-Z^-~-]+)*|\"\(\[\]!#-[^-~ \t]|(\\[\t -~]))+\")@([!#-'*+/-9=?A-Z^-~-]+(\.[!#-'*+/-9=?A-Z^-~-]+)*|\[[\t -Z^-~]*])");

        const searchUserByUsername = await AccountRepository.findOneBy({username});
        const searchUserByEmail = await AccountRepository.findOneBy({email});

        const reallyUser = await AccountRepository.findOneBy({id: Number(idAccount)});

        console.log('SENHA ANTES:', reallyUser?.password);

        if(!username && !email && !password && !confirm_password && !comment){
            req.flash('errorFlash', 'Preencha algum campo !');
            return res.redirect(`/edituser/${idAccount}`);
        }

        if(searchUserByUsername){
            req.flash('errorFlash', 'Nome de usuário já cadastrado !');
            return res.redirect(`/edituser/${idAccount}`);
        }

        if(searchUserByEmail){
            req.flash('errorFlash', 'Email já cadastrado !');
            return res.redirect(`/edituser/${idAccount}`);
        }

        if(email){
            if(!email.match(regexEmail)){
                req.flash('errorFlash', 'Digite um email válido !');
                return res.redirect(`/edituser/${idAccount}`);
            }
        }

        if(password){
            if(password !== confirm_password){
                req.flash('errorFlash', 'As senhas não coincidem !');
                return res.redirect(`/edituser/${idAccount}`);
            }

            const encryptPassword = await bcrypt.hash(password, 10);
            req.outCondition = encryptPassword;
            console.log('PASS:', password);
            console.log('TESTE ENCRYPT:', encryptPassword);


            if (!encryptPassword) {
                req.flash('errorFlash', 'Aconteceu um erro inesperado no servidor !');
                return res.redirect('/administration');
            }
        }

        const encryptPassword = req.outCondition

        console.log('TESTE KK:', encryptPassword);


        if(!comment){
            req.flash('errorFlash', 'Escreva algum comentário !');
            return res.redirect(`/edituser/${idAccount}`);
        }

        const currentDate = new Date().toLocaleDateString('pt-BR');

        await AccountRepository.update(idAccount, {
            username: username || reallyUser?.username,
            email: email || reallyUser?.email,
            password: encryptPassword || reallyUser?.password,
            created_date: currentDate            
        });

        console.log('SENHA DEPOIS:', reallyUser?.password);

        const saveCommentsThisAccount = LogsAdminRepository.create({
            username: username || reallyUser?.username,
            email: email || reallyUser?.email,
            date: currentDate,
            comment: 'editAccount: ' + comment
        });

        await LogsAdminRepository.save(saveCommentsThisAccount);

        req.flash('successFlash', 'Conta atualizada com sucesso !');
        return res.redirect('/administration');
    }
}