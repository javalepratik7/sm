import { verifyToken } from "../services/Services";

async function onlyLogin(req,res,next) {
    const {cookie}=req.body
    if(!cookie){
        return res.status(200).json({message:"please login aa"})
    }
    const payload=verifyToken(cookie)
    if (!payload ) {
       return res.status(404).json({message:"please login ok"})
    }
    const email=payload.email;
    console.log(email)
    req.email=email
    next()
}

export {onlyLogin}