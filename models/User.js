const mongoose=require("mongoose")
const {createHmac,randomBytes}=require("crypto")
const {createToken}=require("../services/Services")

const schema=new mongoose.Schema({
    name:{
        type:String,
        requird:true
    },
    email:{
        type:String,
        requird:true,
        unique:true
    },
    phoneNumber:{
        type:String,
        requird:true,
    },
    password:{
        type:String,
        requird:true
    },
    riskAppetite:{
        type:String,
        requird:true
    },
    amount:{
        type:String,
        requird:true
    },
    lastname:{
        type:String,
        requird:true
    },
    salt:{
        type:String
    }
})

schema.pre("save",function (next) {
    
    const thisUser=this
    if (!thisUser.isModified("password")) {
        return
    }
    
    const salt=randomBytes(16).toString()
    const hashedPassword=createHmac("sha256",salt).update(thisUser.password).digest("hex")
    // console.log("pre is calling",salt,hashedPassword,this);
    this.salt=salt
    this.password=hashedPassword
    next()
})

schema.static("matchPassword",
    async function (email ,password) {
        const user=await this.findOne({email})
        if (!user) {return false }
        const userSalt=user.salt
        const userPassword=user.password

        const hashedPassword=createHmac("sha256",userSalt).update(password).digest("hex")
        // console.log("here comes false",user,userSalt,userPassword,hashedPassword)

        if(userPassword !==hashedPassword){
            return false
        }
        const token=createToken(user)
        return token
    }
)

const User=mongoose.model("shareuser",schema)

module.exports=User