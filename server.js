
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;
const DB = path.join(__dirname, "db.json");

function readDb(){
  if(!fs.existsSync(DB)){
    fs.writeFileSync(DB, JSON.stringify({users:[],appointments:[]},null,2));
  }
  return JSON.parse(fs.readFileSync(DB,"utf8"));
}

function writeDb(data){
  fs.writeFileSync(DB, JSON.stringify(data,null,2));
}

function hashPassword(password){
  return crypto.createHash("sha256").update(password).digest("hex");
}

function generateToken(){
  return crypto.randomBytes(32).toString("hex");
}

app.post("/api/auth/register",(req,res)=>{
  const {nome,email,cpf,celular,senha} = req.body;

  if(!nome || !email || !cpf || !celular || !senha){
    return res.status(400).json({error:"Preencha todos os campos"});
  }

  const db = readDb();

  const exists = db.users.find(u =>
    u.email.toLowerCase() === email.toLowerCase() ||
    u.cpf.replace(/\D/g,"") === cpf.replace(/\D/g,"")
  );

  if(exists){
    return res.status(409).json({error:"CPF ou e-mail já cadastrado"});
  }

  const user = {
    id: Date.now().toString(),
    nome,
    email,
    cpf,
    celular,
    senha: hashPassword(senha),
    token: generateToken()
  };

  db.users.push(user);
  writeDb(db);

  res.status(201).json({
    success:true,
    user:{
      id:user.id,
      nome:user.nome,
      email:user.email,
      cpf:user.cpf,
      celular:user.celular
    }
  });
});

app.post("/api/auth/login",(req,res)=>{
  const {loginUser,senha} = req.body;

  const db = readDb();

  const user = db.users.find(u =>
    u.email.toLowerCase() === loginUser.toLowerCase() ||
    u.cpf.replace(/\D/g,"") === loginUser.replace(/\D/g,"")
  );

  if(!user){
    return res.status(401).json({error:"Usuário não encontrado"});
  }

  if(user.senha !== hashPassword(senha)){
    return res.status(401).json({error:"Senha inválida"});
  }

  res.json({
    success:true,
    token:user.token,
    user:{
      id:user.id,
      nome:user.nome,
      email:user.email,
      cpf:user.cpf
    }
  });
});

app.listen(PORT,()=>console.log("Servidor ativo na porta "+PORT));
